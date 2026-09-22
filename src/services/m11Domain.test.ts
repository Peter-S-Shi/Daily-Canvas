import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../db";
import { createCapture, triageCapture } from "./inboxService";
import { globalSearch } from "./searchService";
import { replanTask } from "./replanService";
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
    expect(backup).toMatchObject({ version: 7, inboxCaptures: [{ id: capture.id }], tasks: [expect.objectContaining({ notes: "Searchable notes", estimatedMinutes: 45, checklist: [expect.objectContaining({ id: "step" })] })], replanEvents: [expect.objectContaining({ taskId: "task" })] });
    await db.inboxCaptures.clear(); await db.replanEvents.clear(); await db.tasks.clear();
    await restoreBackup(backup);
    expect(await db.inboxCaptures.get(capture.id)).toBeTruthy();
    expect(await db.tasks.get("task")).toMatchObject({ notes: "Searchable notes", estimatedMinutes: 45, checklist: [{ id: "step", completed: true }] });
    expect(await db.replanEvents.where("taskId").equals("task").count()).toBe(1);
  });
});
