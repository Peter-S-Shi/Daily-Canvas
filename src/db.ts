import Dexie, { type EntityTable, type Transaction } from "dexie";
import type { AppSettings, CheckIn, DailyOrder, JournalEntry, Reward, Task } from "./types";

export const db = new Dexie("DailyCanvas") as Dexie & {
  tasks: EntityTable<Task, "id">;
  checkIns: EntityTable<CheckIn, "id">;
  dailyOrders: EntityTable<DailyOrder, "date">;
  journalEntries: EntityTable<JournalEntry, "date">;
  rewards: EntityTable<Reward, "id">;
  settings: EntityTable<AppSettings, "id">;
};

db.version(1).stores({
  tasks: "id, kind, category, startDate, endDate, updatedAt",
  checkIns: "id, taskId, date, [taskId+date], status, updatedAt",
  dailyOrders: "date",
  journalEntries: "date, updatedAt",
  rewards: "id, taskId, trigger, rewardDate, claimedAt",
  settings: "id",
});

export async function upgradeSettingsToV2(transaction: Transaction): Promise<void> {
  const settingsTable = transaction.table<AppSettings>("settings");
  const current = await settingsTable.get("app");
  const taskCount = await transaction.table<Task>("tasks").count();
  if (current) {
    await settingsTable.put({
      ...current,
      dataVersion: 2,
      onboardingComplete: (current as Partial<AppSettings>).onboardingComplete ?? taskCount > 0,
    });
  }
}

db.version(2).stores({
  tasks: "id, kind, category, startDate, endDate, updatedAt",
  checkIns: "id, taskId, date, [taskId+date], status, updatedAt",
  dailyOrders: "date",
  journalEntries: "date, updatedAt",
  rewards: "id, taskId, trigger, rewardDate, claimedAt",
  settings: "id",
}).upgrade(upgradeSettingsToV2);

export const defaultSettings = (): AppSettings => ({
  id: "app",
  dataVersion: 2,
  language: "en",
  theme: "system",
  weekStartsOn: 1,
  reduceMotion: false,
  onboardingComplete: false,
});

export async function initializeDb(): Promise<void> {
  await db.open();
  const settings = await db.settings.get("app");
  if (!settings) {
    await db.settings.put(defaultSettings());
  }
}

export async function resetDatabase(): Promise<void> {
  db.close();
  await Dexie.delete("DailyCanvas");
  await initializeDb();
}
