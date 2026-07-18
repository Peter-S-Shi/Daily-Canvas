import { describe, expect, it } from "vitest";
import type { CheckIn, Task } from "../types";
import { calculateTaskStats, isTaskScheduledOn } from "./dates";

const baseTask: Task = {
  id: "task-1",
  title: "Read",
  kind: "habit",
  category: "Growth",
  color: "#f4a261",
  starred: false,
  archived: false,
  startDate: "2026-07-01",
  recurrence: { type: "daily" },
  targetDays: 21,
  stopReminderAtTarget: true,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("recurrence", () => {
  it("supports interval schedules", () => {
    const task = { ...baseTask, recurrence: { type: "interval" as const, intervalDays: 3 } };
    expect(isTaskScheduledOn(task, new Date("2026-07-04T12:00:00"))).toBe(true);
    expect(isTaskScheduledOn(task, new Date("2026-07-05T12:00:00"))).toBe(false);
  });

  it("supports selected weekdays", () => {
    const task = { ...baseTask, recurrence: { type: "weekdays" as const, weekdays: [1, 3, 5] } };
    expect(isTaskScheduledOn(task, new Date("2026-07-17T12:00:00"))).toBe(true);
    expect(isTaskScheduledOn(task, new Date("2026-07-18T12:00:00"))).toBe(false);
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
});
