import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { upgradeSettingsToV2 } from "./db";

const databaseName = "DailyCanvasMigrationTest";
const stores = {
  tasks: "id, kind, category, startDate, endDate, updatedAt",
  checkIns: "id, taskId, date, [taskId+date], status, updatedAt",
  dailyOrders: "date",
  journalEntries: "date, updatedAt",
  rewards: "id, taskId, trigger, rewardDate, claimedAt",
  settings: "id",
};

afterEach(async () => { await Dexie.delete(databaseName); });

describe("Dexie schema migration", () => {
  it("preserves version 1 data and marks existing users as onboarded", async () => {
    const oldDb = new Dexie(databaseName);
    oldDb.version(1).stores(stores);
    await oldDb.table("settings").put({ id: "app", language: "en", theme: "system", weekStartsOn: 1, reduceMotion: false });
    await oldDb.table("tasks").put({ id: "old-task", title: "Existing task", kind: "habit", category: "", color: "#f4a261", starred: false, archived: false, startDate: "2026-07-01", recurrence: { type: "daily" }, stopReminderAtTarget: false, createdAt: "", updatedAt: "" });
    oldDb.close();

    const newDb = new Dexie(databaseName);
    newDb.version(1).stores(stores);
    newDb.version(2).stores(stores).upgrade(upgradeSettingsToV2);
    await newDb.open();
    expect(await newDb.table("tasks").get("old-task")).toMatchObject({ title: "Existing task" });
    expect(await newDb.table("settings").get("app")).toMatchObject({ dataVersion: 2, onboardingComplete: true });
    newDb.close();
  });
});
