import Dexie, { type EntityTable, type Transaction } from "dexie";
import type { AppSettings, AppearanceAsset, Area, CheckIn, DailyOrder, DailyReflection, EmotionDefinition, ExperienceLog, JournalEntry, LegacyTask, MilestoneEvent, PausePeriod, Reward, Task, TaskLifecycle } from "./types";
import { calculateTaskStats } from "./services/statisticsService";

export const db = new Dexie("DailyCanvas") as Dexie & {
  areas: EntityTable<Area, "id">;
  tasks: EntityTable<Task, "id">;
  checkIns: EntityTable<CheckIn, "id">;
  experienceLogs: EntityTable<ExperienceLog, "id">;
  taskLifecycles: EntityTable<TaskLifecycle, "taskId">;
  pausePeriods: EntityTable<PausePeriod, "id">;
  milestoneEvents: EntityTable<MilestoneEvent, "id">;
  dailyOrders: EntityTable<DailyOrder, "date">;
  dailyReflections: EntityTable<DailyReflection, "date">;
  emotionDefinitions: EntityTable<EmotionDefinition, "id">;
  appearanceAssets: EntityTable<AppearanceAsset, "id">;
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

export const storesV4 = {
  areas: "id, name, sortOrder, archived, updatedAt",
  tasks: "id, kind, areaId, archived, startDate, endDate, updatedAt",
  checkIns: "id, taskId, date, [taskId+date], status, updatedAt",
  experienceLogs: "id, taskId, date, [taskId+date], updatedAt",
  dailyOrders: "date", dailyReflections: "date, updatedAt",
  emotionDefinitions: "id, normalizedLabel, isSystem, archived, updatedAt",
  rewards: "id, taskId, trigger, rewardDate, claimedAt",
  appearanceAssets: "id, kind, createdAt", settings: "id",
};
export const storesV5 = { ...storesV4, taskLifecycles: "taskId, state, celebrationPending, updatedAt", pausePeriods: "id, taskId, startDate, endDate, type, createdAt", milestoneEvents: "id, taskId, date, type, sequence, createdAt" };
const lifecycleTask = (task: Task) => task.kind !== "task" && task.schedule.mode !== "floating";
const migratedLifecycle = (task: Task, personalBest = 0, at = new Date().toISOString()): TaskLifecycle => ({ taskId: task.id, state: "building", milestoneSequence: 1, personalBest, celebrationPending: false, createdAt: at, updatedAt: at });

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
  if (settings) await transaction.table("settings").put({ ...settings, dataVersion: 3 } as unknown as AppSettings);
}

db.version(3).stores(storesV3).upgrade(upgradeDataToV3);

export const SYSTEM_EMOTIONS = [
  ["joyful", "Joyful"], ["content", "Content"], ["calm", "Calm"], ["energized", "Energized"],
  ["hopeful", "Hopeful"], ["tired", "Tired"], ["sad", "Sad"], ["frustrated", "Frustrated"],
  ["anxious", "Anxious"], ["uncertain", "Uncertain"], ["mixed", "Mixed"], ["neutral", "Neutral"],
] as const;

export async function upgradeDataToV4(transaction: Transaction): Promise<void> {
  const now = new Date().toISOString();
  const journalTable = transaction.table<JournalEntry>("journalEntries");
  const reflectionTable = transaction.table<DailyReflection>("dailyReflections");
  for (const journal of await journalTable.toArray()) {
    await reflectionTable.put({ date: journal.date, emotionIds: [], note: journal.content, createdAt: journal.updatedAt || now, updatedAt: journal.updatedAt || now });
  }
  const emotions = SYSTEM_EMOTIONS.map(([systemKey, label]) => ({ id: `system-${systemKey}`, label, normalizedLabel: label.toLocaleLowerCase(), systemKey, isSystem: true, archived: false, createdAt: now, updatedAt: now }));
  await transaction.table<EmotionDefinition>("emotionDefinitions").bulkPut(emotions);
  const settingsTable = transaction.table<AppSettings & { backgroundDataUrl?: string }>("settings");
  const current = await settingsTable.get("app");
  if (current) {
    const backgroundPreferences: AppSettings["backgroundPreferences"] = (["app", "today", "calendar", "reflection"] as const).map((slot) => ({ slot, fit: "cover", position: "center", overlayOpacity: 0.48, blurPx: 0 }));
    if (current.backgroundDataUrl) {
      const assetId = "migrated-app-background";
      await transaction.table<AppearanceAsset>("appearanceAssets").put({ id: assetId, kind: "background", mimeType: current.backgroundDataUrl.slice(5, current.backgroundDataUrl.indexOf(";")) || "image/jpeg", dataUrl: current.backgroundDataUrl, createdAt: now });
      backgroundPreferences[0].assetId = assetId;
    }
    const { backgroundDataUrl: _removed, ...rest } = current;
    await settingsTable.put({ ...rest, dataVersion: 4, reflectionPromptsEnabled: true, backgroundPreferences } as unknown as AppSettings);
  }
}

db.version(4).stores(storesV4).upgrade(upgradeDataToV4);

export async function upgradeDataToV5(transaction: Transaction): Promise<void> {
  const now = new Date().toISOString(); const tasks = await transaction.table<Task>("tasks").toArray(); const checkIns = await transaction.table<CheckIn>("checkIns").toArray();
  const lifecycles = tasks.filter(lifecycleTask).map((task) => migratedLifecycle(task, calculateTaskStats(task, checkIns.filter((item) => item.taskId === task.id)).personalBest, now));
  if (lifecycles.length) await transaction.table<TaskLifecycle>("taskLifecycles").bulkPut(lifecycles);
  const settings = await transaction.table<AppSettings>("settings").get("app"); if (settings) await transaction.table<AppSettings>("settings").put({ ...settings, dataVersion: 5 });
}
db.version(5).stores(storesV5).upgrade(upgradeDataToV5);

export const defaultBackgroundPreferences = (): AppSettings["backgroundPreferences"] => (["app", "today", "calendar", "reflection"] as const).map((slot) => ({ slot, fit: "cover", position: "center", overlayOpacity: 0.48, blurPx: 0 }));
export const defaultSettings = (): AppSettings => ({ id: "app", dataVersion: 5, language: "en", theme: "system", weekStartsOn: 1, reduceMotion: false, onboardingComplete: false, reflectionPromptsEnabled: true, backgroundPreferences: defaultBackgroundPreferences() });

export async function initializeDb(): Promise<void> {
  await db.open();
  const settings = await db.settings.get("app");
  if (!settings) await db.settings.put(defaultSettings());
  const tasks = await db.tasks.toArray(); for (const task of tasks.filter(lifecycleTask)) if (!(await db.taskLifecycles.get(task.id))) await db.taskLifecycles.put(migratedLifecycle(task));
  if (await db.emotionDefinitions.where("isSystem").equals(1).count() === 0) {
    const now = new Date().toISOString();
    await db.emotionDefinitions.bulkPut(SYSTEM_EMOTIONS.map(([systemKey, label]) => ({ id: `system-${systemKey}`, label, normalizedLabel: label.toLocaleLowerCase(), systemKey, isSystem: true, archived: false, createdAt: now, updatedAt: now })));
  }
}

export async function resetDatabase(): Promise<void> { db.close(); await Dexie.delete("DailyCanvas"); await initializeDb(); }
