import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../db";
import { createCapture, triageCapture } from "./inboxService";
import { globalSearch } from "./searchService";
import { replanTask } from "./replanService";
import { saveTask } from "./taskService";
import { createBackup, restoreBackup } from "./backupService";

beforeEach(async () => { await db.delete(); await initializeDb(); });
afterEach(async () => { await db.delete(); });

describe("Milestone 11 capture, search, and replan", () => {
  it("keeps a capture unresolved until real Task creation succeeds", async () => {
    const capture = await createCapture("Prepare workshop");
    expect(await db.inboxCaptures.get(capture.id)).toMatchObject({ title: "Prepare workshop" });
    const task = await triageCapture(capture.id, {
      title: capture.title, kind: "task", starred: false, archived: false,
      startDate: "2026-09-23", schedule: { mode: "floating", availableFrom: "2026-09-23" }, stopReminderAtTarget: false,
    });
    expect(task.schedule.mode).toBe("floating");
    expect(await db.inboxCaptures.get(capture.id)).toBeUndefined();
  });

  it("searches approved authoritative content but excludes Inbox captures", async () => {
    await createCapture("Private unresolved needle");
    await db.tasks.put({ id: "task", title: "Needle task", notes: "Workshop outline", checklist: [], kind: "task", starred: false, archived: false, startDate: "2026-09-23", schedule: { mode: "floating", availableFrom: "2026-09-23" }, stopReminderAtTarget: false, createdAt: "", updatedAt: "" });
    await db.dailyReflections.put({ date: "2026-09-22", emotionIds: [], note: "Needle reflection", createdAt: "", updatedAt: "" });
    const results = await globalSearch("needle");
    expect(results.map((item) => item.type)).toEqual(["task", "reflection"]);
    expect(results.some((item) => item.title.includes("unresolved"))).toBe(false);
  });

  it("replans forward without modifying earlier check-ins", async () => {
    await db.tasks.put({ id: "habit", title: "Practice", kind: "habit", starred: false, archived: false, startDate: "2026-09-01", schedule: { mode: "fixed", recurrence: { type: "daily" } }, stopReminderAtTarget: false, createdAt: "", updatedAt: "" });
    await db.checkIns.put({ id: "habit:2026-09-21", taskId: "habit", date: "2026-09-21", status: "skipped", updatedAt: "" });
    await replanTask("habit", "2026-09-23", "Move the next plan forward");
    expect(await db.checkIns.get("habit:2026-09-21")).toMatchObject({ status: "skipped" });
    expect(await db.tasks.get("habit")).toMatchObject({ startDate: "2026-09-01", replannedStartDate: "2026-09-23" });
    expect(await db.replanEvents.where("taskId").equals("habit").first()).toMatchObject({ previousStartDate: "2026-09-01", nextStartDate: "2026-09-23" });
  });

  it("round-trips every new authoritative M11 field through backup v7", async () => {
    const capture = await createCapture("Unresolved capture");
    await db.tasks.put({ id: "task", title: "Enriched", notes: "Searchable notes", estimatedMinutes: 45, checklist: [{ id: "step", title: "First step", completed: true, createdAt: "created", updatedAt: "updated" }], kind: "habit", starred: false, archived: false, startDate: "2026-09-01", schedule: { mode: "fixed", recurrence: { type: "monthlyDay", dayOfMonth: 31 } }, stopReminderAtTarget: false, createdAt: "", updatedAt: "" });
    await replanTask("task", "2026-10-01", "Forward only");
    const backup = await createBackup();
    expect(backup).toMatchObject({ version: 9, inboxCaptures: [{ id: capture.id }], tasks: [expect.objectContaining({ notes: "Searchable notes", estimatedMinutes: 45, checklist: [expect.objectContaining({ id: "step" })] })], replanEvents: [expect.objectContaining({ taskId: "task" })] });
    await db.inboxCaptures.clear(); await db.replanEvents.clear(); await db.tasks.clear();
    await restoreBackup(backup);
    expect(await db.inboxCaptures.get(capture.id)).toBeTruthy();
    expect(await db.tasks.get("task")).toMatchObject({ notes: "Searchable notes", estimatedMinutes: 45, checklist: [{ id: "step", completed: true }] });
    expect(await db.replanEvents.where("taskId").equals("task").count()).toBe(1);
  });

  it("records genuine previousStartDate across consecutive replans and floating/quota tasks", async () => {
    await db.tasks.put({
      id: "fixed-habit", title: "Reading", kind: "habit", starred: false, archived: false,
      startDate: "2026-09-01", schedule: { mode: "fixed", recurrence: { type: "daily" } },
      stopReminderAtTarget: false, createdAt: "", updatedAt: "",
    });
    // First replan: previousStartDate is original startDate (2026-09-01)
    const event1 = await replanTask("fixed-habit", "2026-09-25", "First forward move");
    expect(event1.previousStartDate).toBe("2026-09-01");
    expect(event1.nextStartDate).toBe("2026-09-25");

    // Second replan: previousStartDate is the genuinely effective start (2026-09-25), not original (2026-09-01)
    const event2 = await replanTask("fixed-habit", "2026-10-05", "Second forward move");
    expect(event2.previousStartDate).toBe("2026-09-25");
    expect(event2.nextStartDate).toBe("2026-10-05");

    // Floating task replan: tracks availableFrom
    await db.tasks.put({
      id: "floating-task", title: "File taxes", kind: "task", starred: false, archived: false,
      startDate: "2026-09-01", schedule: { mode: "floating", availableFrom: "2026-09-01" },
      stopReminderAtTarget: false, createdAt: "", updatedAt: "",
    });
    const floatEvent1 = await replanTask("floating-task", "2026-09-26");
    expect(floatEvent1.previousStartDate).toBe("2026-09-01");
    expect(floatEvent1.nextStartDate).toBe("2026-09-26");
    const floatEvent2 = await replanTask("floating-task", "2026-10-01");
    expect(floatEvent2.previousStartDate).toBe("2026-09-26");
    expect(floatEvent2.nextStartDate).toBe("2026-10-01");
  });

  it("does not allow completed one-time tasks or completed floating tasks to be replanned", async () => {
    // Completed one-time fixed task
    await db.tasks.put({
      id: "once-done", title: "One-time finished", kind: "task", starred: false, archived: false,
      startDate: "2026-09-20", schedule: { mode: "fixed", recurrence: { type: "once" } },
      stopReminderAtTarget: false, createdAt: "", updatedAt: "",
    });
    await db.checkIns.put({ id: "once-done:2026-09-20", taskId: "once-done", date: "2026-09-20", status: "done", updatedAt: "" });
    await expect(replanTask("once-done", "2026-09-25")).rejects.toThrow(/cannot be replanned/i);

    // Completed floating task
    await db.tasks.put({
      id: "float-done", title: "Floating finished", kind: "task", starred: false, archived: false,
      startDate: "2026-09-20", schedule: { mode: "floating", availableFrom: "2026-09-20" },
      stopReminderAtTarget: false, createdAt: "", updatedAt: "",
    });
    await db.checkIns.put({ id: "float-done:2026-09-20", taskId: "float-done", date: "2026-09-20", status: "done", updatedAt: "" });
    await expect(replanTask("float-done", "2026-09-25")).rejects.toThrow(/cannot be replanned/i);

    // Unfinished one-time task (e.g. skipped or not done) CAN be replanned
    await db.tasks.put({
      id: "once-skipped", title: "One-time missed", kind: "task", starred: false, archived: false,
      startDate: "2026-09-20", schedule: { mode: "fixed", recurrence: { type: "once" } },
      stopReminderAtTarget: false, createdAt: "", updatedAt: "",
    });
    await db.checkIns.put({ id: "once-skipped:2026-09-20", taskId: "once-skipped", date: "2026-09-20", status: "skipped", updatedAt: "" });
    const replanned = await replanTask("once-skipped", "2026-09-25");
    expect(replanned.nextStartDate).toBe("2026-09-25");
  });

  it("preserves replanned availableFrom and startDate when saving task edits", async () => {
    await db.tasks.put({
      id: "floating-replan", title: "Original floating", kind: "task", starred: false, archived: false,
      startDate: "2026-09-01", schedule: { mode: "floating", availableFrom: "2026-09-01" },
      stopReminderAtTarget: false, createdAt: "", updatedAt: "",
    });
    await replanTask("floating-replan", "2026-09-25");
    const replanned = await db.tasks.get("floating-replan");
    expect(replanned?.schedule).toMatchObject({ mode: "floating", availableFrom: "2026-09-25" });
    expect(replanned?.startDate).toBe("2026-09-01");

    // Saving an edit with unchanged schedule should not revert availableFrom
    const updated = await saveTask({
      title: "Updated floating title", kind: "task", starred: true, archived: false,
      startDate: replanned!.startDate, replannedStartDate: replanned!.replannedStartDate,
      replanHistory: replanned!.replanHistory,
      schedule: replanned!.schedule, stopReminderAtTarget: false, notes: "New note",
    }, replanned);

    expect(updated.title).toBe("Updated floating title");
    expect(updated.startDate).toBe("2026-09-01");
    expect(updated.schedule).toMatchObject({ mode: "floating", availableFrom: "2026-09-25" });
    expect(updated.replanHistory).toHaveLength(1);
  });
});
