import Dexie, { type EntityTable, type Transaction } from "dexie";
import type { AppSettings, Area, CheckIn, DailyOrder, JournalEntry, LegacyTask, Reward, Task } from "./types";

export const db = new Dexie("DailyCanvas") as Dexie & {
  areas: EntityTable<Area, "id">;
  tasks: EntityTable<Task, "id">;
  checkIns: EntityTable<CheckIn, "id">;
  dailyOrders: EntityTable<DailyOrder, "date">;
  journalEntries: EntityTable<JournalEntry, "date">;
  rewards: EntityTable<Reward, "id">;
  settings: EntityTable<AppSettings, "id">;
};

export const storesV2 = {
  tasks: "id, kind, category, startDate, endDate, updatedAt",
  checkIns: "id, taskId, date, [taskId+date], status, updatedAt",
  dailyOrders: "date", journalEntries: "date, updatedAt",
  rewards: "id, taskId, trigger, rewardDate, claimedAt", settings: "id",
};

export const storesV3 = {
  areas: "id, name, sortOrder, archived, updatedAt",
  tasks: "id, kind, areaId, archived, startDate, endDate, updatedAt",
  checkIns: "id, taskId, date, [taskId+date], status, updatedAt",
  dailyOrders: "date", journalEntries: "date, updatedAt",
  rewards: "id, taskId, trigger, rewardDate, claimedAt", settings: "id",
};

db.version(1).stores(storesV2);

export async function upgradeSettingsToV2(transaction: Transaction): Promise<void> {
  const settingsTable = transaction.table<AppSettings>("settings");
  const current = await settingsTable.get("app");
  const taskCount = await transaction.table<LegacyTask>("tasks").count();
  if (current) await settingsTable.put({ ...current, dataVersion: 2, onboardingComplete: (current as Partial<AppSettings>).onboardingComplete ?? taskCount > 0 } as unknown as AppSettings);
}

db.version(2).stores(storesV2).upgrade(upgradeSettingsToV2);

const areaIdFor = (name: string, index: number) => `area-${name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "legacy"}-${index + 1}`;

export async function upgradeDataToV3(transaction: Transaction): Promise<void> {
  const taskTable = transaction.table<LegacyTask | Task>("tasks");
  const areaTable = transaction.table<Area>("areas");
  const oldTasks = await taskTable.toArray();
  const legacyTasks = oldTasks.filter((task): task is LegacyTask => !("schedule" in task));
  const groups = new Map<string, { name: string; color: string }>();
  for (const task of legacyTasks) {
    const name = task.category?.trim();
    if (name && !groups.has(name.toLocaleLowerCase())) groups.set(name.toLocaleLowerCase(), { name, color: task.color || "#f4a261" });
  }
  const now = new Date().toISOString();
  const areas = [...groups.values()].map((item, index): Area => ({ id: areaIdFor(item.name, index), name: item.name, color: item.color, sortOrder: index, archived: false, createdAt: now, updatedAt: now }));
  if (areas.length) await areaTable.bulkPut(areas);
  const areaByName = new Map(areas.map((area) => [area.name.toLocaleLowerCase(), area]));
  for (const task of legacyTasks) {
    const { category, color, recurrence, ...rest } = task;
    const area = category?.trim() ? areaByName.get(category.trim().toLocaleLowerCase()) : undefined;
    const migrated: Task = { ...rest, areaId: area?.id, colorOverride: color || undefined, schedule: { mode: "fixed", recurrence } };
    await taskTable.put(migrated);
  }
  const settings = await transaction.table<AppSettings>("settings").get("app");
  if (settings) await transaction.table<AppSettings>("settings").put({ ...settings, dataVersion: 3 });
}

db.version(3).stores(storesV3).upgrade(upgradeDataToV3);

export const defaultSettings = (): AppSettings => ({ id: "app", dataVersion: 3, language: "en", theme: "system", weekStartsOn: 1, reduceMotion: false, onboardingComplete: false });

export async function initializeDb(): Promise<void> {
  await db.open();
  const settings = await db.settings.get("app");
  if (!settings) await db.settings.put(defaultSettings());
}

export async function resetDatabase(): Promise<void> { db.close(); await Dexie.delete("DailyCanvas"); await initializeDb(); }
