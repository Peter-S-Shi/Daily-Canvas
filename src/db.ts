import Dexie, { type EntityTable } from "dexie";
import type {
  AppSettings,
  BackupPayload,
  CheckIn,
  DailyOrder,
  JournalEntry,
  Reward,
  Task,
} from "./types";

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

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export async function initializeDb(): Promise<void> {
  const settings = await db.settings.get("app");
  if (!settings) {
    await db.settings.put({
      id: "app",
      language: "en",
      theme: "system",
      weekStartsOn: 1,
      reduceMotion: false,
    });
  }

  if ((await db.tasks.count()) === 0) {
    const today = new Date();
    const date = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
    const now = new Date().toISOString();
    await db.tasks.bulkAdd([
      {
        id: makeId(),
        title: "Read for 20 minutes",
        kind: "habit",
        category: "Growth",
        color: "#f4a261",
        starred: true,
        archived: false,
        startDate: date,
        recurrence: { type: "daily" },
        targetDays: 21,
        stopReminderAtTarget: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: makeId(),
        title: "No late-night snacks",
        kind: "avoidance",
        category: "Health",
        color: "#2a9d8f",
        starred: false,
        archived: false,
        startDate: date,
        recurrence: { type: "daily" },
        targetDays: 21,
        stopReminderAtTarget: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }
}

export async function setCheckIn(taskId: string, date: string, status?: CheckIn["status"]): Promise<void> {
  const id = `${taskId}:${date}`;
  if (!status) {
    await db.checkIns.delete(id);
    return;
  }
  await db.checkIns.put({ id, taskId, date, status, updatedAt: new Date().toISOString() });
}

export async function createBackup(): Promise<BackupPayload> {
  const [tasks, checkIns, dailyOrders, journalEntries, rewards, settings] = await Promise.all([
    db.tasks.toArray(),
    db.checkIns.toArray(),
    db.dailyOrders.toArray(),
    db.journalEntries.toArray(),
    db.rewards.toArray(),
    db.settings.toArray(),
  ]);
  return {
    format: "daily-canvas-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    checkIns,
    dailyOrders,
    journalEntries,
    rewards,
    settings,
  };
}

export function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<BackupPayload>;
  return item.format === "daily-canvas-backup" && item.version === 1 && Array.isArray(item.tasks) && Array.isArray(item.checkIns);
}

export async function restoreBackup(payload: BackupPayload): Promise<void> {
  await db.transaction("rw", [db.tasks, db.checkIns, db.dailyOrders, db.journalEntries, db.rewards, db.settings], async () => {
    await Promise.all([
      db.tasks.clear(),
      db.checkIns.clear(),
      db.dailyOrders.clear(),
      db.journalEntries.clear(),
      db.rewards.clear(),
      db.settings.clear(),
    ]);
    await Promise.all([
      db.tasks.bulkPut(payload.tasks),
      db.checkIns.bulkPut(payload.checkIns),
      db.dailyOrders.bulkPut(payload.dailyOrders ?? []),
      db.journalEntries.bulkPut(payload.journalEntries ?? []),
      db.rewards.bulkPut(payload.rewards ?? []),
      db.settings.bulkPut(payload.settings ?? []),
    ]);
  });
  await initializeDb();
}
