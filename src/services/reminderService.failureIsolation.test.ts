import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, initializeDb } from "../db";
import { saveTask } from "./taskService";
import { createTimeBlock } from "./timeBlockService";
import { catchUpMissedReminders, checkDueReminders } from "./reminderService";

vi.mock("../desktop/desktopAdapter", () => ({ notify: vi.fn().mockRejectedValue(new Error("native notification command failed")) }));

beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); vi.clearAllMocks(); });

describe("reminderService failure isolation", () => {
  it("checkDueReminders never rejects when the native notification command fails, and leaves the block retryable", async () => {
    const task = await saveTask({ title: "Write report", kind: "task", starred: false, archived: false, startDate: "2026-01-05", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    const block = await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 60, reminder: "at-start" });
    await expect(checkDueReminders(new Date("2026-01-05T09:05:00"))).resolves.toBeUndefined();
    expect((await db.timeBlocks.get(block.id))?.reminderFiredAt).toBeUndefined();
  });

  it("catchUpMissedReminders never rejects when the native notification command fails", async () => {
    const task = await saveTask({ title: "Write report", kind: "task", starred: false, archived: false, startDate: "2026-01-05", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 60, reminder: "at-start" });
    await expect(catchUpMissedReminders(new Date("2026-01-05T09:05:00"))).resolves.toBeUndefined();
  });
});
