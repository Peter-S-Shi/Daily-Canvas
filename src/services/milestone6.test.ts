/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, defaultSettings, initializeDb } from "../db";
import type { CheckIn, PausePeriod, Task } from "../types";
import { chooseMilestoneAction, ensureTaskLifecycle, evaluateTaskLifecycle } from "./lifecycleService";
import { effectivePauseStart } from "./pauseService";
import { calculateTaskStats } from "./statisticsService";
import { migrateBackup } from "./backupService";

const stamp = "2026-07-10T12:00:00.000Z";
const task: Task = { id: "habit", title: "Walk", kind: "habit", starred: false, archived: false, startDate: "2026-07-01", schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 3, stopReminderAtTarget: false, createdAt: stamp, updatedAt: stamp };
const check = (date: string, status: CheckIn["status"] = "done"): CheckIn => ({ id: `habit:${date}`, taskId: "habit", date, status, updatedAt: stamp });

beforeEach(async () => { await initializeDb(); await db.transaction("rw", [db.tasks, db.checkIns, db.taskLifecycles, db.pausePeriods, db.milestoneEvents, db.settings], async () => { await Promise.all([db.tasks.clear(), db.checkIns.clear(), db.taskLifecycles.clear(), db.pausePeriods.clear(), db.milestoneEvents.clear(), db.settings.clear()]); await db.settings.put({ ...defaultSettings(), onboardingComplete: true }); }); });

describe("Milestone 6 pause and streak semantics", () => {
  it("freezes a streak across a planned break and excludes paused dates from the denominator", () => {
    const pause: PausePeriod = { id: "p", taskId: task.id, startDate: "2026-07-03", endDate: "2026-07-05", type: "planned-break", createdAt: "2026-07-01T10:00:00.000Z", updatedAt: stamp };
    const stats = calculateTaskStats(task, [check("2026-07-01"), check("2026-07-02"), check("2026-07-06")], new Date("2026-07-06T12:00:00"), [pause]);
    expect(stats.currentStreak).toBe(3); expect(stats.completed).toBe(3); expect(stats.scheduled).toBe(3); expect(stats.completionRate).toBe(100);
  });

  it("does not let a retroactive pause repair misses before it was created", () => {
    const pause: PausePeriod = { id: "p", taskId: task.id, startDate: "2026-07-03", endDate: "2026-07-06", type: "retroactive", createdAt: "2026-07-05T10:00:00.000Z", updatedAt: stamp };
    expect(effectivePauseStart(pause)).toBe("2026-07-05");
    const stats = calculateTaskStats(task, [check("2026-07-01"), check("2026-07-02")], new Date("2026-07-06T12:00:00"), [pause], 2);
    expect(stats.currentStreak).toBe(0); expect(stats.personalBest).toBe(2); expect(stats.scheduled).toBe(4);
  });

  it("preserves a stored personal best even after the current streak ends", () => {
    const stats = calculateTaskStats(task, [check("2026-07-01"), check("2026-07-02")], new Date("2026-07-04T12:00:00"), [], 8);
    expect(stats.currentStreak).toBe(0); expect(stats.personalBest).toBe(8); expect(stats.longestStreak).toBe(8);
  });
});

describe("Milestone 6 lifecycle decisions", () => {
  it("celebrates a reached target before accepting a user choice and preserves the event", async () => {
    await db.tasks.put(task); await db.checkIns.bulkPut([check("2026-07-01"), check("2026-07-02"), check("2026-07-03")]); await ensureTaskLifecycle(task);
    expect(await evaluateTaskLifecycle(task.id, new Date("2026-07-03T12:00:00"))).toMatchObject({ state: "milestone-reached", celebrationPending: true, personalBest: 3 });
    expect(await db.milestoneEvents.where("type").equals("target-reached").count()).toBe(1);
    await chooseMilestoneAction(task.id, "maintenance"); expect(await db.taskLifecycles.get(task.id)).toMatchObject({ state: "maintenance", celebrationPending: false });
    expect((await db.milestoneEvents.toArray()).map((item) => item.type)).toEqual(expect.arrayContaining(["target-reached", "maintenance"]));
  });

  it("upgrades a v4 backup with lifecycle defaults while retaining all source records", () => {
    const result = migrateBackup({ format: "daily-canvas-backup", version: 4, exportedAt: stamp, areas: [], tasks: [task], checkIns: [check("2026-07-01")], experienceLogs: [], dailyOrders: [], dailyReflections: [], emotionDefinitions: [], rewards: [], appearanceAssets: [], settings: [{ ...defaultSettings(), dataVersion: 4 }] });
    expect(result.payload.version).toBe(5); expect(result.payload.checkIns).toHaveLength(1); expect(result.payload.taskLifecycles).toEqual([expect.objectContaining({ taskId: task.id, personalBest: 1 })]); expect(result.payload.pausePeriods).toEqual([]);
  });
});
