import { describe, expect, it } from "vitest";
import { isFixedOccurrenceOn } from "./scheduleService";
import type { Task } from "../types";

const fixedTask = (recurrence: { type: string; intervalWeeks?: number; weekdays?: number[]; dayOfMonth?: number }): Task => ({
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
});
