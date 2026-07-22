import { describe, expect, it } from "vitest";
import { migrateBackup } from "./backupService";

const task = {
  id: "example-task", title: "Example", kind: "habit", category: "", color: "#f4a261", starred: false, archived: false,
  startDate: "2026-07-01", recurrence: { type: "daily" }, targetDays: 21, stopReminderAtTarget: true,
  createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
};

const v1 = {
  format: "daily-canvas-backup", version: 1, exportedAt: "2026-07-01T00:00:00.000Z", tasks: [task], checkIns: [], dailyOrders: [], journalEntries: [], rewards: [],
  settings: [{ id: "app", language: "en", theme: "system", weekStartsOn: 1, reduceMotion: false }],
};

describe("backup migration", () => {
  it("upgrades a version 1 backup without mutating its task data", () => {
    const result = migrateBackup(v1);
    expect(result.migrated).toBe(true);
    expect(result.payload.version).toBe(2);
    expect(result.payload.tasks[0].title).toBe("Example");
    expect(result.payload.settings[0]).toMatchObject({ dataVersion: 2, onboardingComplete: true });
  });

  it("rejects unsupported versions and malformed collections", () => {
    expect(() => migrateBackup({ ...v1, version: 99 })).toThrow(/not supported/i);
    expect(() => migrateBackup({ ...v1, tasks: "nope" })).toThrow(/tasks.*array/i);
  });

  it("drops orphan check-ins and reports a warning", () => {
    const result = migrateBackup({ ...v1, checkIns: [{ id: "orphan", taskId: "missing", date: "2026-07-01", status: "done", updatedAt: "" }] });
    expect(result.payload.checkIns).toHaveLength(0);
    expect(result.warnings.some((warning) => warning.includes("missing tasks"))).toBe(true);
  });
});
