import { describe, expect, it } from "vitest";
import { isFixedOccurrenceOn } from "./scheduleService";
import type { Task } from "../types";

const fixedTask = (recurrence: { type: string; intervalDays?: number; intervalWeeks?: number; weekdays?: number[]; dayOfMonth?: number }): Task => ({
  id: "habit", title: "Practice", kind: "habit", starred: false, archived: false,
  startDate: "2026-01-05", schedule: { mode: "fixed", recurrence } as Task["schedule"],
  stopReminderAtTarget: false, createdAt: "", updatedAt: "",
});

describe("Milestone 11 richer recurrence", () => {
  it("supports every N weeks on selected weekdays, anchored to the start week", () => {
    const value = fixedTask({ type: "weeklyInterval", intervalWeeks: 2, weekdays: [1, 3] });
    expect(isFixedOccurrenceOn(value, new Date("2026-01-05T12:00:00"))).toBe(true);
    expect(isFixedOccurrenceOn(value, new Date("2026-01-07T12:00:00"))).toBe(true);
    expect(isFixedOccurrenceOn(value, new Date("2026-01-12T12:00:00"))).toBe(false);
    expect(isFixedOccurrenceOn(value, new Date("2026-01-19T12:00:00"))).toBe(true);
  });

  it("uses the final day when a monthly day-of-month does not exist", () => {
    const value = fixedTask({ type: "monthlyDay", dayOfMonth: 31 });
    expect(isFixedOccurrenceOn(value, new Date("2026-02-27T12:00:00"))).toBe(false);
    expect(isFixedOccurrenceOn(value, new Date("2026-02-28T12:00:00"))).toBe(true);
    expect(isFixedOccurrenceOn(value, new Date("2026-04-30T12:00:00"))).toBe(true);
    expect(isFixedOccurrenceOn(value, new Date("2026-05-31T12:00:00"))).toBe(true);
  });

  it("handles replanned daily tasks by preserving history, creating a hiatus gap, and running on new anchor", () => {
    const task: Task = {
      ...fixedTask({ type: "daily" }),
      startDate: "2026-09-01",
      replannedStartDate: "2026-09-15",
      replanHistory: [
        { replannedAt: "2026-09-10T08:00:00.000Z", previousStartDate: "2026-09-01", nextStartDate: "2026-09-15" },
      ],
    };
    // Pre-replan history is preserved
    expect(isFixedOccurrenceOn(task, new Date("2026-09-01T12:00:00"))).toBe(true);
    expect(isFixedOccurrenceOn(task, new Date("2026-09-09T12:00:00"))).toBe(true);
    // Gap between replan date (2026-09-10) and nextStartDate (2026-09-15) has no occurrences
    expect(isFixedOccurrenceOn(task, new Date("2026-09-10T12:00:00"))).toBe(false);
    expect(isFixedOccurrenceOn(task, new Date("2026-09-12T12:00:00"))).toBe(false);
    expect(isFixedOccurrenceOn(task, new Date("2026-09-14T12:00:00"))).toBe(false);
    // On and after nextStartDate, occurrences resume
    expect(isFixedOccurrenceOn(task, new Date("2026-09-15T12:00:00"))).toBe(true);
    expect(isFixedOccurrenceOn(task, new Date("2026-09-16T12:00:00"))).toBe(true);
  });

  it("handles replanned every-N-days interval tasks without exposing old anchor or gap occurrences", () => {
    const task: Task = {
      ...fixedTask({ type: "interval", intervalDays: 3 }),
      startDate: "2026-09-01",
      replannedStartDate: "2026-09-15",
      replanHistory: [
        { replannedAt: "2026-09-10T08:00:00.000Z", previousStartDate: "2026-09-01", nextStartDate: "2026-09-15" },
      ],
    };
    // Old anchor 2026-09-01 occurrences before 09-10
    expect(isFixedOccurrenceOn(task, new Date("2026-09-01T12:00:00"))).toBe(true);
    expect(isFixedOccurrenceOn(task, new Date("2026-09-04T12:00:00"))).toBe(true);
    expect(isFixedOccurrenceOn(task, new Date("2026-09-07T12:00:00"))).toBe(true);
    // Gap: 09-10 to 09-14 should NOT have occurrences (even though 09-13 would match old anchor)
    expect(isFixedOccurrenceOn(task, new Date("2026-09-10T12:00:00"))).toBe(false);
    expect(isFixedOccurrenceOn(task, new Date("2026-09-13T12:00:00"))).toBe(false);
    // New anchor starting 09-15
    expect(isFixedOccurrenceOn(task, new Date("2026-09-15T12:00:00"))).toBe(true);
    expect(isFixedOccurrenceOn(task, new Date("2026-09-16T12:00:00"))).toBe(false);
    expect(isFixedOccurrenceOn(task, new Date("2026-09-18T12:00:00"))).toBe(true);
    expect(isFixedOccurrenceOn(task, new Date("2026-09-21T12:00:00"))).toBe(true);
  });

  it("handles replanned weeklyInterval tasks with proper week anchoring", () => {
    // 2026-09-07 is Monday. Every 2 weeks on Mondays ([1]).
    const task: Task = {
      ...fixedTask({ type: "weeklyInterval", intervalWeeks: 2, weekdays: [1] }),
      startDate: "2026-09-07",
      replannedStartDate: "2026-09-28",
      replanHistory: [
        { replannedAt: "2026-09-16T08:00:00.000Z", previousStartDate: "2026-09-07", nextStartDate: "2026-09-28" },
      ],
    };
    // 2026-09-07: Week 0 -> true
    expect(isFixedOccurrenceOn(task, new Date("2026-09-07T12:00:00"))).toBe(true);
    // 2026-09-14: Week 1 -> false
    expect(isFixedOccurrenceOn(task, new Date("2026-09-14T12:00:00"))).toBe(false);
    // 2026-09-21: In gap (between 09-16 and 09-28) -> false
    expect(isFixedOccurrenceOn(task, new Date("2026-09-21T12:00:00"))).toBe(false);
    // 2026-09-28: New anchor Week 0 -> true
    expect(isFixedOccurrenceOn(task, new Date("2026-09-28T12:00:00"))).toBe(true);
    // 2026-10-05: New anchor Week 1 -> false
    expect(isFixedOccurrenceOn(task, new Date("2026-10-05T12:00:00"))).toBe(false);
    // 2026-10-12: New anchor Week 2 -> true
    expect(isFixedOccurrenceOn(task, new Date("2026-10-12T12:00:00"))).toBe(true);
  });

  it("preserves history across consecutive multiple replans", () => {
    const task: Task = {
      ...fixedTask({ type: "daily" }),
      startDate: "2026-09-01",
      replannedStartDate: "2026-09-25",
      replanHistory: [
        { replannedAt: "2026-09-10T08:00:00.000Z", previousStartDate: "2026-09-01", nextStartDate: "2026-09-15" },
        { replannedAt: "2026-09-20T08:00:00.000Z", previousStartDate: "2026-09-15", nextStartDate: "2026-09-25" },
      ],
    };
    // Segment 1 (2026-09-01 to 2026-09-09)
    expect(isFixedOccurrenceOn(task, new Date("2026-09-05T12:00:00"))).toBe(true);
    // Gap 1 (2026-09-10 to 2026-09-14)
    expect(isFixedOccurrenceOn(task, new Date("2026-09-12T12:00:00"))).toBe(false);
    // Segment 2 (2026-09-15 to 2026-09-19)
    expect(isFixedOccurrenceOn(task, new Date("2026-09-17T12:00:00"))).toBe(true);
    // Gap 2 (2026-09-20 to 2026-09-24)
    expect(isFixedOccurrenceOn(task, new Date("2026-09-22T12:00:00"))).toBe(false);
    // Segment 3 (2026-09-25 onwards)
    expect(isFixedOccurrenceOn(task, new Date("2026-09-25T12:00:00"))).toBe(true);
    expect(isFixedOccurrenceOn(task, new Date("2026-09-26T12:00:00"))).toBe(true);
  });
});
