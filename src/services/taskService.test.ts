/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../db";
import { addChecklistItem, bulkChangeArea, deleteTask, removeChecklistItem, renameChecklistItem, saveTask } from "./taskService";
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

describe("bulkChangeArea (Issue #16 bulk organization)", () => {
  it("moves every given task id to the target Area and leaves other tasks untouched", async () => {
    const a = await saveTask({ title: "A", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    const b = await saveTask({ title: "B", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    const c = await saveTask({ title: "C", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });

    await bulkChangeArea([a.id, b.id], "area-1");

    expect((await db.tasks.get(a.id))?.areaId).toBe("area-1");
    expect((await db.tasks.get(b.id))?.areaId).toBe("area-1");
    expect((await db.tasks.get(c.id))?.areaId).toBeUndefined();
  });

  it("clears the Area when given undefined, so bulk move to No Area is possible", async () => {
    const a = await saveTask({ title: "A", kind: "task", areaId: "area-1", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    await bulkChangeArea([a.id], undefined);
    expect((await db.tasks.get(a.id))?.areaId).toBeUndefined();
  });
});

describe("checklist item CRUD helpers (Issue #18 local checklist editing)", () => {
  it("addChecklistItem appends a new incomplete item with a trimmed title", async () => {
    const task = await saveTask({ title: "Trip", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    await addChecklistItem(task.id, "  Pack bags  ");
    const saved = await db.tasks.get(task.id);
    expect(saved?.checklist).toHaveLength(1);
    expect(saved?.checklist?.[0]).toMatchObject({ title: "Pack bags", completed: false });
  });

  it("renameChecklistItem updates only the targeted item's title, preserving its completed state", async () => {
    const task = await saveTask({ title: "Trip", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    await addChecklistItem(task.id, "Pack bags");
    await addChecklistItem(task.id, "Book taxi");
    const [first, second] = (await db.tasks.get(task.id))!.checklist!;
    await db.tasks.update(task.id, { checklist: [{ ...first, completed: true }, second] });
    await renameChecklistItem(task.id, first.id, "Pack bags for trip");
    const saved = await db.tasks.get(task.id);
    const renamed = saved?.checklist?.find((item) => item.id === first.id);
    expect(renamed?.title).toBe("Pack bags for trip");
    expect(renamed?.completed).toBe(true);
    expect(saved?.checklist?.find((item) => item.id === second.id)?.title).toBe("Book taxi");
  });

  it("removeChecklistItem deletes only the targeted item", async () => {
    const task = await saveTask({ title: "Trip", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    await addChecklistItem(task.id, "Pack bags");
    await addChecklistItem(task.id, "Book taxi");
    const [first] = (await db.tasks.get(task.id))!.checklist!;
    await removeChecklistItem(task.id, first.id);
    const saved = await db.tasks.get(task.id);
    expect(saved?.checklist).toHaveLength(1);
    expect(saved?.checklist?.[0].title).toBe("Book taxi");
  });

  it("rejects a blank checklist item title (validateTask's named-step rule)", async () => {
    const task = await saveTask({ title: "Trip", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    await expect(addChecklistItem(task.id, "   ")).rejects.toThrow();
  });
});
