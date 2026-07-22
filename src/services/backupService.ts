import { db, defaultSettings, initializeDb } from "../db";
import type { AppSettings, Area, BackupPayload, BackupPayloadV1, BackupPayloadV2, LegacyTask, RestorePreview, Task } from "../types";

type UnknownRecord = Record<string, unknown>;
const tables = [db.areas, db.tasks, db.checkIns, db.dailyOrders, db.journalEntries, db.rewards, db.settings] as const;
const isRecord = (value: unknown): value is UnknownRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value);
function requireArray(record: UnknownRecord, key: string): unknown[] { if (!Array.isArray(record[key])) throw new Error(`Backup field '${key}' must be an array.`); return record[key]; }
function validateItems(items: unknown[], label: string, required: string[]): void { items.forEach((item, index) => { if (!isRecord(item) || required.some((key) => typeof item[key] !== "string")) throw new Error(`${label} entry ${index + 1} is malformed.`); }); }

function validateCore(record: UnknownRecord): void {
  if (record.format !== "daily-canvas-backup") throw new Error("This is not a Daily Canvas backup.");
  if (![1, 2, 3].includes(Number(record.version))) throw new Error("This backup version is not supported.");
  const tasks = requireArray(record, "tasks"), checkIns = requireArray(record, "checkIns"), dailyOrders = requireArray(record, "dailyOrders"), journalEntries = requireArray(record, "journalEntries"), rewards = requireArray(record, "rewards"), settings = requireArray(record, "settings");
  const areas = record.version === 3 ? requireArray(record, "areas") : [];
  validateItems(areas, "Area", ["id", "name", "color"]); validateItems(tasks, "Task", ["id", "title", "kind", "startDate"]); validateItems(checkIns, "Check-in", ["id", "taskId", "date", "status"]); validateItems(dailyOrders, "Daily order", ["date"]); validateItems(journalEntries, "Journal", ["date", "content"]); validateItems(rewards, "Reward", ["id", "title", "trigger"]); validateItems(settings, "Settings", ["id", "language", "theme"]);
  tasks.forEach((item) => {
    const task = item as UnknownRecord;
    if (!["task", "habit", "avoidance"].includes(String(task.kind))) throw new Error("A task has an unsupported type.");
    if (record.version === 3) {
      if (!isRecord(task.schedule) || !["fixed", "floating", "quota"].includes(String(task.schedule.mode))) throw new Error("A task has an unsupported schedule.");
    } else if (!isRecord(task.recurrence) || !["once", "daily", "weekdays", "interval"].includes(String(task.recurrence.type))) throw new Error("A task has an unsupported schedule.");
  });
  checkIns.forEach((item) => { if (!["done", "lapse", "skipped"].includes(String((item as UnknownRecord).status))) throw new Error("A check-in has an unsupported status."); });
  const unique = (items: unknown[], key: string) => new Set(items.map((item) => String((item as UnknownRecord)[key]))).size === items.length;
  if (!unique(areas, "id") || !unique(tasks, "id") || !unique(checkIns, "id") || !unique(dailyOrders, "date") || !unique(journalEntries, "date") || !unique(rewards, "id")) throw new Error("Backup collections contain duplicate identifiers.");
}

const areaIdFor = (name: string, index: number) => `area-${name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "legacy"}-${index + 1}`;
function migrateLegacyTasks(tasks: LegacyTask[], exportedAt: string): { areas: Area[]; tasks: Task[] } {
  const groups = new Map<string, { name: string; color: string }>();
  for (const task of tasks) { const name = task.category?.trim(); if (name && !groups.has(name.toLocaleLowerCase())) groups.set(name.toLocaleLowerCase(), { name, color: task.color || "#f4a261" }); }
  const areas = [...groups.values()].map((item, index): Area => ({ id: areaIdFor(item.name, index), name: item.name, color: item.color, sortOrder: index, archived: false, createdAt: exportedAt, updatedAt: exportedAt }));
  const byName = new Map(areas.map((area) => [area.name.toLocaleLowerCase(), area]));
  return { areas, tasks: tasks.map((old) => { const { category, color, recurrence, ...task } = old; return { ...task, areaId: category?.trim() ? byName.get(category.trim().toLocaleLowerCase())?.id : undefined, colorOverride: color || undefined, schedule: { mode: "fixed", recurrence } }; }) };
}

export function migrateBackup(value: unknown): RestorePreview {
  if (!isRecord(value)) throw new Error("Backup content must be a JSON object."); validateCore(value);
  const sourceVersion = value.version as 1 | 2 | 3; const warnings: string[] = [];
  let payload: BackupPayload;
  if (sourceVersion < 3) {
    const old = value as unknown as BackupPayloadV1 | BackupPayloadV2;
    const migrated = migrateLegacyTasks(old.tasks, old.exportedAt);
    const settings: AppSettings[] = old.settings.length ? old.settings.map((item) => ({ ...defaultSettings(), ...item, dataVersion: 3, onboardingComplete: "onboardingComplete" in item ? Boolean(item.onboardingComplete) : true })) : [{ ...defaultSettings(), onboardingComplete: old.tasks.length > 0 }];
    payload = { format: "daily-canvas-backup", version: 3, exportedAt: old.exportedAt, areas: migrated.areas, tasks: migrated.tasks, checkIns: old.checkIns, dailyOrders: old.dailyOrders ?? [], journalEntries: old.journalEntries ?? [], rewards: old.rewards ?? [], settings };
    warnings.push(`This version ${sourceVersion} backup will be upgraded to the Milestone 3 data format before restore.`);
  } else {
    const current = value as unknown as BackupPayload;
    payload = { ...current, settings: current.settings.length ? current.settings.map((item) => ({ ...defaultSettings(), ...item, dataVersion: 3 })) : [{ ...defaultSettings(), onboardingComplete: current.tasks.length > 0 }] };
  }
  const taskIds = new Set(payload.tasks.map((task) => task.id)); const areaIds = new Set(payload.areas.map((area) => area.id));
  const orphanCheckIns = payload.checkIns.filter((item) => !taskIds.has(item.taskId)).length; if (orphanCheckIns) warnings.push(`${orphanCheckIns} check-in(s) reference missing tasks and will be ignored.`);
  const orphanAreas = payload.tasks.filter((task) => task.areaId && !areaIds.has(task.areaId)).length; if (orphanAreas) warnings.push(`${orphanAreas} task(s) reference missing Areas and will be left unassigned.`);
  payload = { ...payload, checkIns: payload.checkIns.filter((item) => taskIds.has(item.taskId)), tasks: payload.tasks.map((task) => task.areaId && !areaIds.has(task.areaId) ? { ...task, areaId: undefined } : task) };
  return { payload, sourceVersion, migrated: sourceVersion !== 3, warnings, counts: { areas: payload.areas.length, tasks: payload.tasks.length, checkIns: payload.checkIns.length, dailyOrders: payload.dailyOrders.length, journalEntries: payload.journalEntries.length, rewards: payload.rewards.length } };
}

export async function createBackup(): Promise<BackupPayload> {
  const [areas, tasks, checkIns, dailyOrders, journalEntries, rewards, settings] = await Promise.all([db.areas.toArray(), db.tasks.toArray(), db.checkIns.toArray(), db.dailyOrders.toArray(), db.journalEntries.toArray(), db.rewards.toArray(), db.settings.toArray()]);
  return { format: "daily-canvas-backup", version: 3, exportedAt: new Date().toISOString(), areas, tasks, checkIns, dailyOrders, journalEntries, rewards, settings };
}
export function downloadBackup(payload: BackupPayload, prefix = "daily-canvas-backup"): void { const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${prefix}-${payload.exportedAt.slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url); }
export async function restoreBackup(payload: BackupPayload): Promise<void> {
  await db.transaction("rw", [...tables], async () => { await Promise.all(tables.map((table) => table.clear())); await db.areas.bulkPut(payload.areas); await db.tasks.bulkPut(payload.tasks); await db.checkIns.bulkPut(payload.checkIns); await db.dailyOrders.bulkPut(payload.dailyOrders); await db.journalEntries.bulkPut(payload.journalEntries); await db.rewards.bulkPut(payload.rewards); await db.settings.bulkPut(payload.settings); const [areaCount, taskCount, checkInCount] = await Promise.all([db.areas.count(), db.tasks.count(), db.checkIns.count()]); if (areaCount !== payload.areas.length || taskCount !== payload.tasks.length || checkInCount !== payload.checkIns.length) throw new Error("Restore integrity check failed."); }); await initializeDb();
}
