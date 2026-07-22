import { describe, expect, it } from "vitest";
import type { CheckIn, Task } from "../types";
import { calculateTaskStats, isTaskScheduledOn } from "./dates";

const baseTask: Task = {
  id: "task-1",
  title: "Read",
  kind: "habit",
  areaId: "growth",
  colorOverride: "#f4a261",
  starred: false,
  archived: false,
  startDate: "2026-07-01",
  schedule: { mode: "fixed", recurrence: { type: "daily" } },
  targetDays: 21,
  stopReminderAtTarget: true,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("recurrence", () => {
  it("supports interval schedules", () => {
    const task: Task = { ...baseTask, schedule: { mode: "fixed", recurrence: { type: "interval", intervalDays: 3 } } };
    expect(isTaskScheduledOn(task, new Date("2026-07-04T12:00:00"))).toBe(true);
    expect(isTaskScheduledOn(task, new Date("2026-07-05T12:00:00"))).toBe(false);
  });

  it("supports selected weekdays", () => {
    const task: Task = { ...baseTask, schedule: { mode: "fixed", recurrence: { type: "weekdays", weekdays: [1, 3, 5] } } };
    expect(isTaskScheduledOn(task, new Date("2026-07-17T12:00:00"))).toBe(true);
    expect(isTaskScheduledOn(task, new Date("2026-07-18T12:00:00"))).toBe(false);
  });

  it("includes start and end dates but excludes dates outside the range", () => {
    const task = { ...baseTask, endDate: "2026-07-03" };
    expect(isTaskScheduledOn(task, new Date("2026-06-30T23:59:00"))).toBe(false);
    expect(isTaskScheduledOn(task, new Date("2026-07-01T00:01:00"))).toBe(true);
    expect(isTaskScheduledOn(task, new Date("2026-07-03T23:59:00"))).toBe(true);
    expect(isTaskScheduledOn(task, new Date("2026-07-04T00:01:00"))).toBe(false);
  });

  it("does not schedule archived tasks", () => {
    expect(isTaskScheduledOn({ ...baseTask, archived: true }, new Date("2026-07-01T12:00:00"))).toBe(false);
  });

  it("uses calendar days across a daylight-saving boundary", () => {
    const task: Task = { ...baseTask, startDate: "2026-03-07", schedule: { mode: "fixed", recurrence: { type: "interval", intervalDays: 1 } } };
    expect(isTaskScheduledOn(task, new Date("2026-03-08T12:00:00"))).toBe(true);
    expect(isTaskScheduledOn(task, new Date("2026-03-09T12:00:00"))).toBe(true);
  });
});

describe("statistics", () => {
  it("counts streaks and excludes skipped days from the denominator", () => {
    const checkIns: CheckIn[] = [
      { id: "1", taskId: "task-1", date: "2026-07-01", status: "done", updatedAt: "" },
      { id: "2", taskId: "task-1", date: "2026-07-02", status: "skipped", updatedAt: "" },
      { id: "3", taskId: "task-1", date: "2026-07-03", status: "done", updatedAt: "" },
    ];
    const stats = calculateTaskStats(baseTask, checkIns, new Date("2026-07-03T12:00:00"));
    expect(stats.currentStreak).toBe(2);
    expect(stats.longestStreak).toBe(2);
    expect(stats.completionRate).toBe(100);
  });

  it("does not treat a missing avoidance record as success", () => {
    const task = { ...baseTask, kind: "avoidance" as const };
    const stats = calculateTaskStats(task, [], new Date("2026-07-02T12:00:00"));
    expect(stats.completed).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.completionRate).toBe(0);
  });

  it("breaks a streak on a lapse but not on a skipped day", () => {
    const task = { ...baseTask, kind: "avoidance" as const };
    const checkIns: CheckIn[] = [
      { id: "1", taskId: task.id, date: "2026-07-01", status: "done", updatedAt: "" },
      { id: "2", taskId: task.id, date: "2026-07-02", status: "lapse", updatedAt: "" },
      { id: "3", taskId: task.id, date: "2026-07-03", status: "skipped", updatedAt: "" },
      { id: "4", taskId: task.id, date: "2026-07-04", status: "done", updatedAt: "" },
    ];
    const stats = calculateTaskStats(task, checkIns, new Date("2026-07-04T12:00:00"));
    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(1);
    expect(stats.scheduled).toBe(3);
  });

  it("marks a milestone only when the current streak reaches its target", () => {
    const task = { ...baseTask, targetDays: 2 };
    const checkIns: CheckIn[] = [
      { id: "1", taskId: task.id, date: "2026-07-01", status: "done", updatedAt: "" },
      { id: "2", taskId: task.id, date: "2026-07-02", status: "done", updatedAt: "" },
    ];
    expect(calculateTaskStats(task, checkIns, new Date("2026-07-02T12:00:00")).targetReached).toBe(true);
  });
});
