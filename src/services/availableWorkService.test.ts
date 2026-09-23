import { describe, expect, it } from "vitest";
import { availableWorkOn } from "./availableWorkService";
import type { CheckIn, PausePeriod, Task, TaskLifecycle } from "../types";

const base: Omit<Task, "id" | "createdAt" | "updatedAt"> = { title: "", kind: "task", starred: false, archived: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "daily" } }, stopReminderAtTarget: false };
const task = (id: string, overrides: Partial<Task> = {}): Task => ({ ...base, id, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...overrides });

describe("availableWorkOn", () => {
  it("derives eligible work from existing Fixed/Floating/Quota data -- no second authoritative task list", () => {
    const fixed = task("fixed", { schedule: { mode: "fixed", recurrence: { type: "daily" } } });
    const floating = task("floating", { schedule: { mode: "floating", availableFrom: "2026-01-01" } });
    const quota = task("quota", { kind: "habit", schedule: { mode: "quota", period: "week", targetCount: 3, availableFrom: "2026-01-01" } });
    const result = availableWorkOn("2026-01-10", [fixed, floating, quota], [], [], []);
    expect(result.map((item) => item.id).sort()).toEqual(["fixed", "floating", "quota"]);
  });

  it("excludes Avoidance habits (frozen Decision D2), archived, paused, and lifecycle-completed/archived tasks", () => {
    const avoidance = task("avoid", { kind: "avoidance", schedule: { mode: "fixed", recurrence: { type: "daily" } } });
    const archived = task("archived", { archived: true });
    const pausedTask = task("paused", {});
    const completedHabit = task("completed", { kind: "habit", schedule: { mode: "fixed", recurrence: { type: "daily" } } });
    const lifecycles: TaskLifecycle[] = [{ taskId: "completed", state: "completed", milestoneSequence: 1, personalBest: 0, celebrationPending: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }];
    const pauses: PausePeriod[] = [{ id: "p1", taskId: "paused", startDate: "2026-01-01", type: "planned-break", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }];
    const result = availableWorkOn("2026-01-10", [avoidance, archived, pausedTask, completedHabit], [], lifecycles, pauses);
    expect(result).toHaveLength(0);
  });

  it("excludes a Floating task already completed", () => {
    const floating = task("floating", { schedule: { mode: "floating", availableFrom: "2026-01-01" } });
    const checkIns: CheckIn[] = [{ id: "c1", taskId: "floating", date: "2026-01-05", status: "done", updatedAt: "2026-01-05T00:00:00.000Z" }];
    expect(availableWorkOn("2026-01-10", [floating], checkIns, [], [])).toHaveLength(0);
  });
});
