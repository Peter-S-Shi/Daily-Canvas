/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../db";
import { deleteTask, saveTask } from "./taskService";
import { saveExperience } from "./experienceService";

beforeEach(async () => {
  await initializeDb();
  await db.transaction("rw", [db.tasks, db.checkIns, db.dailyOrders, db.taskLifecycles, db.pausePeriods, db.milestoneEvents, db.replanEvents, db.timeBlocks, db.experienceLogs, db.rewards], async () => {
    await Promise.all([db.tasks.clear(), db.checkIns.clear(), db.dailyOrders.clear(), db.taskLifecycles.clear(), db.pausePeriods.clear(), db.milestoneEvents.clear(), db.replanEvents.clear(), db.timeBlocks.clear(), db.experienceLogs.clear(), db.rewards.clear()]);
  });
});

describe("deleteTask orphan cleanup", () => {
  it("removes rewards and experience logs referencing the deleted task, not just check-ins/blocks/lifecycle", async () => {
    const task = await saveTask({ title: "Evening walk", kind: "habit", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21, stopReminderAtTarget: true });
    await saveExperience({ taskId: task.id, date: "2026-01-02", comparison: "easier" });
    await db.rewards.put({ id: "reward-1", title: "Treat", taskId: task.id, trigger: "streak", streakDays: 7, createdAt: "2026-01-01T00:00:00.000Z" });
    await db.dailyOrders.put({ date: "2026-01-02", taskIds: [task.id, "other-task"] });

    expect(await db.experienceLogs.where("taskId").equals(task.id).count()).toBe(1);
    expect(await db.rewards.where("taskId").equals(task.id).count()).toBe(1);

    await deleteTask(task.id);

    expect(await db.tasks.get(task.id)).toBeUndefined();
    expect(await db.experienceLogs.where("taskId").equals(task.id).count()).toBe(0);
    expect(await db.rewards.where("taskId").equals(task.id).count()).toBe(0);
    const order = await db.dailyOrders.get("2026-01-02");
    expect(order?.taskIds).toEqual(["other-task"]);
  });
});
