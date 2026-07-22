import { db, defaultSettings, initializeDb } from "../db";
import type { AppSettings, BackupPayload, BackupPayloadV1, RestorePreview } from "../types";

type UnknownRecord = Record<string, unknown>;
const tables = [db.tasks, db.checkIns, db.dailyOrders, db.journalEntries, db.rewards, db.settings] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireArray(record: UnknownRecord, key: string): unknown[] {
  if (!Array.isArray(record[key])) throw new Error(`Backup field '${key}' must be an array.`);
  return record[key];
}

function validateItems(items: unknown[], label: string, required: string[]): void {
  items.forEach((item, index) => {
    if (!isRecord(item) || required.some((key) => typeof item[key] !== "string")) {
      throw new Error(`${label} entry ${index + 1} is malformed.`);
    }
  });
}

function validateCore(record: UnknownRecord): void {
  if (record.format !== "daily-canvas-backup") throw new Error("This is not a Daily Canvas backup.");
  if (record.version !== 1 && record.version !== 2) throw new Error("This backup version is not supported.");
  const tasks = requireArray(record, "tasks");
  const checkIns = requireArray(record, "checkIns");
  const dailyOrders = requireArray(record, "dailyOrders");
  const journalEntries = requireArray(record, "journalEntries");
  const rewards = requireArray(record, "rewards");
  const settings = requireArray(record, "settings");
  validateItems(tasks, "Task", ["id", "title", "kind", "startDate"]);
  validateItems(checkIns, "Check-in", ["id", "taskId", "date", "status"]);
  validateItems(dailyOrders, "Daily order", ["date"]);
  validateItems(journalEntries, "Journal", ["date", "content"]);
  validateItems(rewards, "Reward", ["id", "title", "trigger"]);
  validateItems(settings, "Settings", ["id", "language", "theme"]);
  tasks.forEach((item) => {
    const task = item as UnknownRecord;
    if (!["task", "habit", "avoidance"].includes(String(task.kind)) || !isRecord(task.recurrence) || !["once", "daily", "weekdays", "interval"].includes(String(task.recurrence.type))) {
      throw new Error("A task has an unsupported type or schedule.");
    }
  });
  checkIns.forEach((item) => {
    if (!["done", "lapse", "skipped"].includes(String((item as UnknownRecord).status))) throw new Error("A check-in has an unsupported status.");
  });
  settings.forEach((item) => {
    const setting = item as UnknownRecord;
    if (!["en", "zh-CN"].includes(String(setting.language)) || !["light", "dark", "system"].includes(String(setting.theme))) throw new Error("Settings contain an unsupported language or theme.");
  });
  const unique = (items: unknown[], key: string) => new Set(items.map((item) => String((item as UnknownRecord)[key]))).size === items.length;
  if (!unique(tasks, "id") || !unique(checkIns, "id") || !unique(dailyOrders, "date") || !unique(journalEntries, "date") || !unique(rewards, "id")) {
    throw new Error("Backup collections contain duplicate identifiers.");
  }
}

export function migrateBackup(value: unknown): RestorePreview {
  if (!isRecord(value)) throw new Error("Backup content must be a JSON object.");
  validateCore(value);
  const sourceVersion = value.version as 1 | 2;
  const warnings: string[] = [];
  let payload: BackupPayload;

  if (sourceVersion === 1) {
    const old = value as unknown as BackupPayloadV1;
    warnings.push("This version 1 backup will be upgraded to the current data format before restore.");
    const settings: AppSettings[] = old.settings.length
      ? old.settings.map((item) => ({ ...item, dataVersion: 2, onboardingComplete: true }))
      : [{ ...defaultSettings(), onboardingComplete: old.tasks.length > 0 }];
    payload = { ...old, version: 2, dailyOrders: old.dailyOrders ?? [], journalEntries: old.journalEntries ?? [], rewards: old.rewards ?? [], settings };
  } else {
    const current = value as unknown as BackupPayload;
    payload = {
      ...current,
      settings: current.settings.length ? current.settings.map((item) => ({ ...defaultSettings(), ...item, dataVersion: 2, onboardingComplete: item.onboardingComplete ?? current.tasks.length > 0 })) : [{ ...defaultSettings(), onboardingComplete: current.tasks.length > 0 }],
    };
  }

  const taskIds = new Set(payload.tasks.map((task) => task.id));
  const orphanCheckIns = payload.checkIns.filter((item) => !taskIds.has(item.taskId)).length;
  if (orphanCheckIns) warnings.push(`${orphanCheckIns} check-in(s) reference missing tasks and will be ignored.`);
  payload = { ...payload, checkIns: payload.checkIns.filter((item) => taskIds.has(item.taskId)) };

  return {
    payload,
    sourceVersion,
    migrated: sourceVersion !== 2,
    warnings,
    counts: {
      tasks: payload.tasks.length,
      checkIns: payload.checkIns.length,
      dailyOrders: payload.dailyOrders.length,
      journalEntries: payload.journalEntries.length,
      rewards: payload.rewards.length,
    },
  };
}

export async function createBackup(): Promise<BackupPayload> {
  const [tasks, checkIns, dailyOrders, journalEntries, rewards, settings] = await Promise.all([
    db.tasks.toArray(), db.checkIns.toArray(), db.dailyOrders.toArray(), db.journalEntries.toArray(), db.rewards.toArray(), db.settings.toArray(),
  ]);
  return { format: "daily-canvas-backup", version: 2, exportedAt: new Date().toISOString(), tasks, checkIns, dailyOrders, journalEntries, rewards, settings };
}

export function downloadBackup(payload: BackupPayload, prefix = "daily-canvas-backup"): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${prefix}-${payload.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function restoreBackup(payload: BackupPayload): Promise<void> {
  await db.transaction("rw", [...tables], async () => {
    await Promise.all(tables.map((table) => table.clear()));
    await db.tasks.bulkPut(payload.tasks);
    await db.checkIns.bulkPut(payload.checkIns);
    await db.dailyOrders.bulkPut(payload.dailyOrders);
    await db.journalEntries.bulkPut(payload.journalEntries);
    await db.rewards.bulkPut(payload.rewards);
    await db.settings.bulkPut(payload.settings);
    const [taskCount, checkInCount] = await Promise.all([db.tasks.count(), db.checkIns.count()]);
    if (taskCount !== payload.tasks.length || checkInCount !== payload.checkIns.length) throw new Error("Restore integrity check failed.");
  });
  await initializeDb();
}
