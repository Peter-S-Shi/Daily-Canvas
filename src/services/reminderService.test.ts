import { describe, expect, it } from "vitest";
import { dueReminders, isDueForCatchUp, notifyAtFor, offsetMinutesFor } from "./reminderService";
import type { TimeBlock } from "../types";

const block = (overrides: Partial<TimeBlock> = {}): TimeBlock => ({
  id: "b1", taskId: "t1", date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 30, reminder: "10", needsReview: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...overrides,
});

describe("reminderService", () => {
  it("only allows the frozen reminder grammar's offsets", () => {
    expect(offsetMinutesFor("off")).toBeUndefined();
    expect(offsetMinutesFor("at-start")).toBe(0);
    expect(offsetMinutesFor("5")).toBe(5);
    expect(offsetMinutesFor("60")).toBe(60);
  });

  it("computes notify time from the block's own start, never a separate recurrence engine", () => {
    const at = notifyAtFor(block({ reminder: "15" }));
    expect(at?.toISOString()).toBe(new Date("2026-01-05T08:45:00").toISOString());
    expect(notifyAtFor(block({ reminder: "off" }))).toBeUndefined();
  });

  it("dueReminders fires once a block's notify time has passed and skips already-fired or off blocks", () => {
    const due = block({ reminder: "at-start", startMinutes: 9 * 60 });
    const notDue = block({ id: "b2", reminder: "at-start", startMinutes: 15 * 60 });
    const off = block({ id: "b3", reminder: "off" });
    const fired = block({ id: "b4", reminder: "at-start", reminderFiredAt: "2026-01-05T09:00:00.000Z" });
    const now = new Date("2026-01-05T09:05:00");
    expect(dueReminders([due, notDue, off, fired], now).map((item) => item.id)).toEqual(["b1"]);
  });

  it("never fires the live checker for a stale block whose window ended days ago (regression: PR #8 CI caught a synthetic fixture block mutating during a long-running smoke run)", () => {
    const staleFromDaysAgo = block({ reminder: "at-start", date: "2026-01-01", startMinutes: 9 * 60, durationMinutes: 30 });
    const now = new Date("2026-01-05T10:00:00");
    expect(dueReminders([staleFromDaysAgo], now)).toEqual([]);
  });

  it("restrained catch-up fires only while the block has not already ended", () => {
    const stillRunning = block({ reminder: "at-start", startMinutes: 9 * 60, durationMinutes: 60 });
    const alreadyEnded = block({ id: "b5", reminder: "at-start", startMinutes: 6 * 60, durationMinutes: 30 });
    const now = new Date("2026-01-05T09:30:00");
    expect(isDueForCatchUp(stillRunning, now)).toBe(true);
    expect(isDueForCatchUp(alreadyEnded, now)).toBe(false);
  });
});
