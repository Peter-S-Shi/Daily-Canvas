import { describe, expect, it } from "vitest";
import type { Task, TaskLifecycle } from "../types";
import { calendarRecordVisibility, calendarTaskSets } from "./calendarEvidenceService";

const stamp = "2026-01-01T12:00:00.000Z";
const task = (id: string, archived = false): Task => ({ id, title: id, kind: "habit", starred: false, archived, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "daily" } }, stopReminderAtTarget: false, createdAt: stamp, updatedAt: stamp });
const lifecycle = (taskId: string, state: TaskLifecycle["state"]): TaskLifecycle => ({ taskId, state, milestoneSequence: 1, personalBest: 3, celebrationPending: false, createdAt: stamp, updatedAt: stamp });
const filters = { mode: "aggregate" as const, taskId: "", areaId: "", scheduleMode: "" as const, taskKind: "" as const };

describe("Calendar historical evidence boundaries", () => {
  it("keeps archived, completed, and paused tasks in the evidence set while excluding them from active selectors", () => {
    const tasks = [task("active"), task("archived", true), task("completed"), task("paused")];
    const sets = calendarTaskSets(tasks, [lifecycle("active", "building"), lifecycle("archived", "archived"), lifecycle("completed", "completed"), lifecycle("paused", "paused")], filters);
    expect(sets.matching.map((item) => item.id)).toEqual(["active", "archived", "completed", "paused"]);
    expect(sets.selectable.map((item) => item.id)).toEqual(["active"]);
  });

  it("keeps CheckIn, Floating, Quota, Reflection, and Experience visibility semantically distinct", () => {
    expect(calendarRecordVisibility("quota")).toEqual({ fixed: false, floating: false, quota: true, reflection: false, experience: false, pause: false });
    expect(calendarRecordVisibility("check-in")).toMatchObject({ fixed: true, floating: false, quota: false });
    expect(calendarRecordVisibility("floating")).toMatchObject({ fixed: false, floating: true, quota: false });
    expect(calendarRecordVisibility("reflection")).toMatchObject({ reflection: true, experience: false });
    expect(calendarRecordVisibility("experience")).toMatchObject({ reflection: false, experience: true });
  });
});
