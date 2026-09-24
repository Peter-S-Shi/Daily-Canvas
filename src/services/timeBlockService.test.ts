import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../db";
import { saveTask } from "./taskService";
import { createTimeBlock, deleteTimeBlock, flagBlocksNeedingReview, MINUTE_STEP, TimeBlockOverlapError, updateTimeBlock, validateTimeBlockInput } from "./timeBlockService";
import type { Task } from "../types";

const fixedTask = (overrides: Partial<Task> = {}): Omit<Task, "id" | "createdAt" | "updatedAt"> => ({
  title: "Write report", kind: "task", starred: false, archived: false, startDate: "2026-01-05",
  schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false, ...overrides,
});

beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); });

describe("timeBlockService", () => {
  it("defaults duration to the task's estimatedMinutes, else 30", async () => {
    const withEstimate = await saveTask(fixedTask({ title: "Estimated", estimatedMinutes: 45 }));
    const withoutEstimate = await saveTask(fixedTask({ title: "Unestimated" }));
    const a = await createTimeBlock({ taskId: withEstimate.id, date: "2026-01-05", startMinutes: 9 * 60 });
    const b = await createTimeBlock({ taskId: withoutEstimate.id, date: "2026-01-05", startMinutes: 11 * 60 });
    expect(a.durationMinutes).toBe(45);
    expect(b.durationMinutes).toBe(30);
  });

  it("takes a Task duration estimate at exact 1-minute precision instead of rounding it onto the 15-minute grid (M14-B blocker fix)", async () => {
    // Duration is any positive whole number of minutes; only the start-time grid is 15-minute.
    const twenty = await saveTask(fixedTask({ title: "Twenty", estimatedMinutes: 20 }));
    const seven = await saveTask(fixedTask({ title: "Seven", estimatedMinutes: 7 }));
    const fortyOne = await saveTask(fixedTask({ title: "FortyOne", estimatedMinutes: 41 }));
    const a = await createTimeBlock({ taskId: twenty.id, date: "2026-01-05", startMinutes: 9 * 60 });
    const b = await createTimeBlock({ taskId: seven.id, date: "2026-01-05", startMinutes: 11 * 60 });
    const c = await createTimeBlock({ taskId: fortyOne.id, date: "2026-01-05", startMinutes: 13 * 60 });
    expect(a.durationMinutes).toBe(20);
    expect(b.durationMinutes).toBe(7);
    expect(c.durationMinutes).toBe(41);
  });

  it("rejects placement off the 15-minute grid, while allowing an on-grid start with a non-15-multiple duration", async () => {
    const task = await saveTask(fixedTask());
    await expect(createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60 + 7, durationMinutes: 30 })).rejects.toThrow(/15-minute/);
    const block = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 20 });
    expect(block.durationMinutes).toBe(20);
  });

  it("accepts any positive whole-minute duration, including 1 minute, and rejects zero/negative/fractional durations", async () => {
    const task = await saveTask(fixedTask());
    const oneMinute = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 1 });
    expect(oneMinute.durationMinutes).toBe(1);
    const other = await saveTask(fixedTask({ title: "Other" }));
    await expect(createTimeBlock({ taskId: other.id, date: "2026-01-05", startMinutes: 11 * 60, durationMinutes: 0 })).rejects.toThrow(/positive whole number/i);
    await expect(createTimeBlock({ taskId: other.id, date: "2026-01-05", startMinutes: 11 * 60, durationMinutes: -5 })).rejects.toThrow(/positive whole number/i);
    await expect(createTimeBlock({ taskId: other.id, date: "2026-01-05", startMinutes: 11 * 60, durationMinutes: 12.5 })).rejects.toThrow(/positive whole number/i);
  });

  it("still rejects a duration that would extend a block past the end of its day, even at 1-minute precision", async () => {
    const task = await saveTask(fixedTask());
    await expect(createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 23 * 60 + 45, durationMinutes: 16 })).rejects.toThrow(/end of/i);
    const fits = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 23 * 60 + 45, durationMinutes: 15 });
    expect(fits.durationMinutes).toBe(15);
  });

  it("rejects Avoidance habits as Time Block work (frozen Decision D2)", async () => {
    const avoidance = await saveTask({ title: "No sugar", kind: "avoidance", starred: false, archived: false, startDate: "2026-01-05", schedule: { mode: "fixed", recurrence: { type: "daily" } }, stopReminderAtTarget: false });
    await expect(createTimeBlock({ taskId: avoidance.id, date: "2026-01-05", startMinutes: 9 * 60 })).rejects.toThrow(/Avoidance/);
  });

  it("warns (does not hard-reject) an overlapping block by default, via a typed TimeBlockOverlapError carrying the conflicting blocks (Issue #21)", async () => {
    const task = await saveTask(fixedTask());
    const other = await saveTask(fixedTask({ title: "Other" }));
    const first = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 60 });
    let caught: unknown;
    try { await createTimeBlock({ taskId: other.id, date: "2026-01-05", startMinutes: 9 * 60 + 30, durationMinutes: 30 }); } catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(TimeBlockOverlapError);
    expect((caught as InstanceType<typeof TimeBlockOverlapError>).overlapping.map((b) => b.id)).toEqual([first.id]);
    // The rejected save must not have written anything, nor touched the existing block.
    expect((await db.timeBlocks.where("taskId").equals(other.id).toArray())).toHaveLength(0);
    expect(await db.timeBlocks.get(first.id)).toEqual(first);
    // Touching but not overlapping (ends exactly when the next starts) is allowed.
    const adjacent = await createTimeBlock({ taskId: other.id, date: "2026-01-05", startMinutes: 10 * 60, durationMinutes: 30 });
    expect(adjacent.startMinutes).toBe(600);
  });

  it("saves an overlapping block when the caller explicitly opts in (allowOverlap), without mutating the other block (Issue #21)", async () => {
    const task = await saveTask(fixedTask());
    const other = await saveTask(fixedTask({ title: "Other" }));
    const first = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 60 });
    const second = await createTimeBlock({ taskId: other.id, date: "2026-01-05", startMinutes: 9 * 60 + 30, durationMinutes: 30 }, { allowOverlap: true });
    expect(second.startMinutes).toBe(9 * 60 + 30);
    const reloadedFirst = await db.timeBlocks.get(first.id);
    expect(reloadedFirst).toEqual(first);
  });

  it("warns on overlap when moving a block too (update path), and allows Save-anyway via allowOverlap without touching the other block", async () => {
    const task = await saveTask(fixedTask());
    const other = await saveTask(fixedTask({ title: "Other" }));
    const anchor = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 60 });
    const movable = await createTimeBlock({ taskId: other.id, date: "2026-01-05", startMinutes: 12 * 60, durationMinutes: 30 });
    await expect(updateTimeBlock(movable.id, { startMinutes: 9 * 60 + 15 })).rejects.toBeInstanceOf(TimeBlockOverlapError);
    expect(await db.timeBlocks.get(anchor.id)).toEqual(anchor);
    const saved = await updateTimeBlock(movable.id, { startMinutes: 9 * 60 + 15 }, { allowOverlap: true });
    expect(saved.startMinutes).toBe(9 * 60 + 15);
    expect(await db.timeBlocks.get(anchor.id)).toEqual(anchor);
  });

  it("allows reminder-only updates on an already-accepted overlapping block without requiring another overlap decision", async () => {
    const task = await saveTask(fixedTask());
    const other = await saveTask(fixedTask({ title: "Other" }));
    const anchor = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 60 });
    const overlapping = await createTimeBlock({ taskId: other.id, date: "2026-01-05", startMinutes: 9 * 60 + 15, durationMinutes: 30 }, { allowOverlap: true });

    const updated = await updateTimeBlock(overlapping.id, { reminder: "10" });

    expect(updated.reminder).toBe("10");
    expect(updated.date).toBe(overlapping.date);
    expect(updated.startMinutes).toBe(overlapping.startMinutes);
    expect(updated.durationMinutes).toBe(overlapping.durationMinutes);
    expect(await db.timeBlocks.get(anchor.id)).toEqual(anchor);
  });

  it("allows a task to hold multiple blocks on different times/dates", async () => {
    const task = await saveTask(fixedTask());
    await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 30 });
    const second = await createTimeBlock({ taskId: task.id, date: "2026-01-06", startMinutes: 9 * 60, durationMinutes: 30 });
    expect((await db.timeBlocks.where("taskId").equals(task.id).toArray()).length).toBe(2);
    expect(second.date).toBe("2026-01-06");
  });

  it("clears a stale reminderFiredAt when Date, Start time, or Reminder is explicitly edited, so a new future reminder is not silently suppressed (regression)", async () => {
    const task = await saveTask(fixedTask());
    const block = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, reminder: "at-start" });
    await db.timeBlocks.update(block.id, { reminderFiredAt: "2026-01-05T09:00:00.000Z" });
    const movedInTime = await updateTimeBlock(block.id, { startMinutes: 14 * 60 });
    expect(movedInTime.reminderFiredAt).toBeUndefined();
    await db.timeBlocks.update(block.id, { reminderFiredAt: "2026-01-05T14:00:00.000Z" });
    const movedInDate = await updateTimeBlock(block.id, { date: "2026-01-06" });
    expect(movedInDate.reminderFiredAt).toBeUndefined();
    await db.timeBlocks.update(block.id, { reminderFiredAt: "2026-01-06T14:00:00.000Z" });
    const reReminded = await updateTimeBlock(block.id, { reminder: "10" });
    expect(reReminded.reminderFiredAt).toBeUndefined();
  });

  it("moving a block re-validates the grid and overlap invariants but never touches the task", async () => {
    const task = await saveTask(fixedTask());
    const block = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 30 });
    const moved = await updateTimeBlock(block.id, { startMinutes: 14 * 60 });
    expect(moved.startMinutes).toBe(14 * 60);
    const reloaded = await db.tasks.get(task.id);
    expect(reloaded?.schedule).toEqual(task.schedule);
    expect(reloaded?.updatedAt).toBe(task.updatedAt);
  });

  it("deleting a block never deletes the Task", async () => {
    const task = await saveTask(fixedTask());
    const block = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60 });
    await deleteTimeBlock(block.id);
    expect(await db.timeBlocks.get(block.id)).toBeUndefined();
    expect(await db.tasks.get(task.id)).toBeDefined();
  });

  it("MINUTE_STEP is 15 and validateTimeBlockInput surfaces the same start-grid rule used by createTimeBlock, independent of duration", () => {
    expect(MINUTE_STEP).toBe(15);
    expect(() => validateTimeBlockInput({ startMinutes: 5, durationMinutes: 30 })).toThrow(/15-minute/);
    expect(() => validateTimeBlockInput({ startMinutes: 0, durationMinutes: 20 })).not.toThrow();
  });

  it("marks a future block needsReview when Replan makes it no longer plausible, without moving or deleting it", async () => {
    const task = await saveTask(fixedTask({ startDate: "2026-01-05", schedule: { mode: "fixed", recurrence: { type: "weekdays", weekdays: [1, 2, 3, 4, 5] } }, kind: "habit", targetDays: 21 }));
    // 2026-01-10 is a Saturday: not a weekday occurrence, so a block placed there is already implausible once we check it explicitly.
    const block = await createTimeBlock({ taskId: task.id, date: "2026-01-10", startMinutes: 9 * 60 });
    await flagBlocksNeedingReview(task.id, "2026-01-01");
    const reloaded = await db.timeBlocks.get(block.id);
    expect(reloaded?.needsReview).toBe(true);
    expect(reloaded?.date).toBe(block.date);
    expect(reloaded?.startMinutes).toBe(block.startMinutes);
  });
});
