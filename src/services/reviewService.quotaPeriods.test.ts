import { describe, expect, it } from "vitest";
import type { Area, CheckIn, Task } from "../types";
import { buildReviewModel, type ReviewSources } from "./reviewService";

const stamp = "2026-01-01T12:00:00.000Z";
const area: Area = { id: "area-health", name: "Health", color: "#2a9d8f", sortOrder: 0, archived: false, createdAt: stamp, updatedAt: stamp };
const quota: Task = {
  id: "quota", title: "Swim", kind: "habit", areaId: area.id, starred: false, archived: false, startDate: "2025-01-01",
  schedule: { mode: "quota", period: "week", targetCount: 2, availableFrom: "2026-01-01" }, stopReminderAtTarget: false, createdAt: stamp, updatedAt: stamp,
};
const check = (id: string, taskId: string, date: string, status: CheckIn["status"] = "done"): CheckIn => ({ id, taskId, date, status, updatedAt: stamp });
const sources = (overrides: Partial<ReviewSources> = {}): ReviewSources => ({ tasks: [quota], areas: [area], checkIns: [], reflections: [], emotions: [], experiences: [], rewards: [], ...overrides });

// Weeks (Mon start): 2026-01-05..01-11 (week A), 2026-01-12..01-18 (week B), 2026-01-19..01-25 (week C).
describe("Issue #14: Review quota period classification", () => {
  it("marks the true current period (today inside it) as provisional/in-progress, never a future one", () => {
    // today = 2026-01-08 falls inside week A (01-05..01-11): week A is current, week B is pure future.
    const model = buildReviewModel(sources({ checkIns: [check("a", "quota", "2026-01-06")] }), { start: "2026-01-05", end: "2026-01-18" }, {}, 1, new Date("2026-01-08T12:00:00"));
    const periodsFound = model.quotaFacts.map((fact) => fact.period.start);
    expect(periodsFound).toContain("2026-01-05");
    expect(periodsFound).not.toContain("2026-01-12");
    const current = model.quotaFacts.find((fact) => fact.period.start === "2026-01-05")!;
    expect(current.provisional).toBe(true);
    expect(current.outcome).toBe("partial");
  });

  it("marks a past period (today after period.end) with its factual completed/missed outcome, not provisional", () => {
    // today = 2026-01-20 is after week A (ends 01-11): week A is past and achieved (2 check-ins met target 2).
    const model = buildReviewModel(sources({ checkIns: [check("a", "quota", "2026-01-05"), check("b", "quota", "2026-01-06")] }), { start: "2026-01-05", end: "2026-01-05" }, {}, 1, new Date("2026-01-20T12:00:00"));
    expect(model.quotaFacts).toHaveLength(1);
    expect(model.quotaFacts[0]).toMatchObject({ outcome: "achieved", provisional: false });
  });

  it("marks a past period that missed its target as not-achieved, not provisional", () => {
    const model = buildReviewModel(sources({ checkIns: [check("a", "quota", "2026-01-05")] }), { start: "2026-01-05", end: "2026-01-05" }, {}, 1, new Date("2026-01-20T12:00:00"));
    expect(model.quotaFacts[0]).toMatchObject({ outcome: "not-achieved", provisional: false });
  });

  it("excludes pure-future quota periods (today before period.start) from quotaFacts entirely", () => {
    // today = 2026-01-08 (inside week A). Reviewing a range that only spans future week C (01-19..01-25).
    const model = buildReviewModel(sources(), { start: "2026-01-19", end: "2026-01-25" }, {}, 1, new Date("2026-01-08T12:00:00"));
    expect(model.quotaFacts).toHaveLength(0);
  });
});
