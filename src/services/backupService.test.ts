import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createBackup, migrateBackup, restoreBackup } from "./backupService";
import { db, initializeDb } from "../db";
import { saveTask } from "./taskService";
import { createTimeBlock } from "./timeBlockService";

beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); });

const task = {
  id: "example-task", title: "Example", kind: "habit", category: "", color: "#f4a261", starred: false, archived: false,
  startDate: "2026-07-01", recurrence: { type: "daily" }, targetDays: 21, stopReminderAtTarget: true,
  createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
};

const v1 = {
  format: "daily-canvas-backup", version: 1, exportedAt: "2026-07-01T00:00:00.000Z", tasks: [task], checkIns: [], dailyOrders: [], journalEntries: [], rewards: [],
  settings: [{ id: "app", language: "en", theme: "system", weekStartsOn: 1, reduceMotion: false }],
};

describe("backup migration", () => {
  it("upgrades a version 1 backup into Areas and fixed schedules without mutating task identity", () => {
    const result = migrateBackup(v1);
    expect(result.migrated).toBe(true);
    expect(result.payload.version).toBe(9);
    expect(result.payload.timeBlocks).toEqual([]);
    expect(result.payload.tasks[0].title).toBe("Example");
    expect(result.payload.tasks[0]).toMatchObject({ id: "example-task", colorOverride: "#f4a261", schedule: { mode: "fixed", recurrence: { type: "daily" } } });
    expect(result.payload.settings[0]).toMatchObject({ dataVersion: 9, onboardingComplete: true, autoBackupEnabled: true });
  });

  it("migrates shared categories to one editable Area and preserves its visual color", () => {
    const result = migrateBackup({ ...v1, tasks: [{ ...task, category: "Health" }, { ...task, id: "second", category: "Health", color: "#2a9d8f" }] });
    expect(result.payload.areas).toHaveLength(1);
    expect(result.payload.areas[0]).toMatchObject({ name: "Health", color: "#f4a261" });
    expect(result.payload.tasks.every((item) => item.areaId === result.payload.areas[0].id)).toBe(true);
    expect(result.counts.areas).toBe(1);
  });

  it("rejects unsupported versions and malformed collections", () => {
    expect(() => migrateBackup({ ...v1, version: 99 })).toThrow(/not supported/i);
    expect(() => migrateBackup({ ...v1, tasks: "nope" })).toThrow(/tasks.*array/i);
  });

  it("drops orphan check-ins and reports a warning", () => {
    const result = migrateBackup({ ...v1, checkIns: [{ id: "orphan", taskId: "missing", date: "2026-07-01", status: "done", updatedAt: "" }] });
    expect(result.payload.checkIns).toHaveLength(0);
    expect(result.warnings.some((warning) => warning.includes("missing tasks"))).toBe(true);
  });

  it("upgrades a version 7 backup all the way to the current format, adding an empty Time Block collection along the way", () => {
    const v7 = { format: "daily-canvas-backup", version: 7, exportedAt: "2026-09-01T00:00:00.000Z", areas: [], tasks: [], inboxCaptures: [], replanEvents: [], checkIns: [], experienceLogs: [], taskLifecycles: [], pausePeriods: [], milestoneEvents: [], dailyOrders: [], dailyReflections: [], meditationEntries: [], emotionDefinitions: [], rewards: [], appearanceAssets: [], settings: [{ id: "app", dataVersion: 7, language: "en", theme: "system", weekStartsOn: 1, reduceMotion: false, onboardingComplete: true, reflectionPromptsEnabled: true, backgroundPreferences: [] }] };
    const result = migrateBackup(v7);
    expect(result.migrated).toBe(true);
    expect(result.payload.version).toBe(9);
    expect(result.payload.timeBlocks).toEqual([]);
    expect(result.payload.settings[0].dataVersion).toBe(9);
    expect(result.payload.settings[0].autoBackupEnabled).toBe(true);
  });

  it("upgrades a version 8 backup to version 9, defaulting autoBackupEnabled and preserving every v8 field (Milestone 13)", () => {
    const v8 = { format: "daily-canvas-backup", version: 8, exportedAt: "2026-09-01T00:00:00.000Z", areas: [], tasks: [], inboxCaptures: [], replanEvents: [], checkIns: [], experienceLogs: [], taskLifecycles: [], pausePeriods: [], milestoneEvents: [], dailyOrders: [], dailyReflections: [{ date: "2026-09-01", emotionIds: [], note: "kept", createdAt: "x", updatedAt: "x" }], meditationEntries: [], emotionDefinitions: [], rewards: [], appearanceAssets: [], timeBlocks: [], settings: [{ id: "app", dataVersion: 8, language: "en", theme: "system", weekStartsOn: 1, reduceMotion: false, onboardingComplete: true, reflectionPromptsEnabled: true, backgroundPreferences: [] }] };
    const result = migrateBackup(v8);
    expect(result.migrated).toBe(true);
    expect(result.payload.version).toBe(9);
    expect(result.payload.dailyReflections).toEqual([{ date: "2026-09-01", emotionIds: [], note: "kept", createdAt: "x", updatedAt: "x" }]);
    expect(result.payload.settings[0]).toMatchObject({ dataVersion: 9, autoBackupEnabled: true });
    expect(result.warnings.some((warning) => warning.includes("Milestone 13"))).toBe(true);
  });

  it("rejects a v8 backup whose Time Block is off the 15-minute grid, instead of silently importing a domain-invalid placement", () => {
    const v8 = { format: "daily-canvas-backup", version: 8, exportedAt: "2026-09-01T00:00:00.000Z", areas: [], tasks: [{ id: "t1", title: "Task", kind: "task", starred: false, archived: false, startDate: "2026-09-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false, createdAt: "", updatedAt: "" }], inboxCaptures: [], replanEvents: [], timeBlocks: [{ id: "b1", taskId: "t1", date: "2026-09-01", startMinutes: 541, durationMinutes: 30, reminder: "off", needsReview: false, createdAt: "", updatedAt: "" }], checkIns: [], experienceLogs: [], taskLifecycles: [], pausePeriods: [], milestoneEvents: [], dailyOrders: [], dailyReflections: [], meditationEntries: [], emotionDefinitions: [], rewards: [], appearanceAssets: [], settings: [] };
    expect(() => migrateBackup(v8)).toThrow(/15-minute/);
  });

  it("rejects a v8 backup whose Time Block extends past the end of its day", () => {
    const v8 = { format: "daily-canvas-backup", version: 8, exportedAt: "2026-09-01T00:00:00.000Z", areas: [], tasks: [{ id: "t1", title: "Task", kind: "task", starred: false, archived: false, startDate: "2026-09-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false, createdAt: "", updatedAt: "" }], inboxCaptures: [], replanEvents: [], timeBlocks: [{ id: "b1", taskId: "t1", date: "2026-09-01", startMinutes: 1425, durationMinutes: 30, reminder: "off", needsReview: false, createdAt: "", updatedAt: "" }], checkIns: [], experienceLogs: [], taskLifecycles: [], pausePeriods: [], milestoneEvents: [], dailyOrders: [], dailyReflections: [], meditationEntries: [], emotionDefinitions: [], rewards: [], appearanceAssets: [], settings: [] };
    expect(() => migrateBackup(v8)).toThrow(/end of/i);
  });

  it("rejects a v8 backup with two overlapping Time Blocks on the same date", () => {
    const base = { date: "2026-09-01", durationMinutes: 60, reminder: "off" as const, needsReview: false, createdAt: "", updatedAt: "" };
    const v8 = { format: "daily-canvas-backup", version: 8, exportedAt: "2026-09-01T00:00:00.000Z", areas: [], tasks: [{ id: "t1", title: "One", kind: "task", starred: false, archived: false, startDate: "2026-09-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false, createdAt: "", updatedAt: "" }, { id: "t2", title: "Two", kind: "task", starred: false, archived: false, startDate: "2026-09-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false, createdAt: "", updatedAt: "" }], inboxCaptures: [], replanEvents: [], timeBlocks: [{ id: "b1", taskId: "t1", startMinutes: 540, ...base }, { id: "b2", taskId: "t2", startMinutes: 570, ...base }], checkIns: [], experienceLogs: [], taskLifecycles: [], pausePeriods: [], milestoneEvents: [], dailyOrders: [], dailyReflections: [], meditationEntries: [], emotionDefinitions: [], rewards: [], appearanceAssets: [], settings: [] };
    expect(() => migrateBackup(v8)).toThrow(/overlap/i);
  });

  it("drops orphan Time Blocks that reference a missing task and reports a warning", () => {
    const v8 = { format: "daily-canvas-backup", version: 8, exportedAt: "2026-09-01T00:00:00.000Z", areas: [], tasks: [], inboxCaptures: [], replanEvents: [], timeBlocks: [{ id: "b1", taskId: "missing", date: "2026-09-01", startMinutes: 540, durationMinutes: 30, reminder: "off", needsReview: false, createdAt: "", updatedAt: "" }], checkIns: [], experienceLogs: [], taskLifecycles: [], pausePeriods: [], milestoneEvents: [], dailyOrders: [], dailyReflections: [], meditationEntries: [], emotionDefinitions: [], rewards: [], appearanceAssets: [], settings: [] };
    const result = migrateBackup(v8);
    expect(result.payload.timeBlocks).toHaveLength(0);
    expect(result.warnings.some((warning) => warning.includes("Time Block"))).toBe(true);
  });

  it("round-trips a Time Block through export and restore without loss", async () => {
    const task = await saveTask({ title: "Write report", kind: "task", starred: false, archived: false, startDate: "2026-01-05", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    const block = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 45, reminder: "10" });
    const backup = await createBackup();
    expect(backup.version).toBe(9);
    expect(backup.timeBlocks).toHaveLength(1);
    await db.delete(); await db.open(); await initializeDb();
    await restoreBackup(backup);
    expect(await db.timeBlocks.get(block.id)).toMatchObject({ taskId: task.id, date: "2026-01-05", startMinutes: 540, durationMinutes: 45, reminder: "10" });
  });
});
