import { describe, expect, it } from "vitest";
import type { Area, CheckIn, DailyReflection, EmotionDefinition, ExperienceLog, Reward, Task } from "../types";
import { buildReviewModel, rangeForPreset, reviewSentences, type ReviewSources } from "./reviewService";

const stamp = "2026-01-01T12:00:00.000Z";
const area: Area = { id: "area-health", name: "Health", color: "#2a9d8f", sortOrder: 0, archived: false, createdAt: stamp, updatedAt: stamp };
const fixed: Task = { id: "fixed", title: "Walk", kind: "habit", areaId: area.id, starred: false, archived: false, startDate: "2025-01-01", schedule: { mode: "fixed", recurrence: { type: "daily" } }, stopReminderAtTarget: false, createdAt: stamp, updatedAt: stamp };
const floating: Task = { ...fixed, id: "floating", title: "Book appointment", kind: "task", schedule: { mode: "floating", availableFrom: "2026-01-01" } };
const quota: Task = { ...fixed, id: "quota", title: "Swim", schedule: { mode: "quota", period: "week", targetCount: 2, availableFrom: "2026-01-01" } };
const check = (id: string, taskId: string, date: string, status: CheckIn["status"] = "done"): CheckIn => ({ id, taskId, date, status, updatedAt: stamp });
const sources = (overrides: Partial<ReviewSources> = {}): ReviewSources => ({ tasks: [fixed, floating, quota], areas: [area], checkIns: [], reflections: [], emotions: [], experiences: [], rewards: [], ...overrides });

describe("Milestone 5 date ranges", () => {
  it("uses inclusive custom ranges", () => {
    const model = buildReviewModel(sources({ checkIns: [check("a", "fixed", "2026-01-01"), check("b", "fixed", "2026-01-03"), check("c", "fixed", "2026-01-04")] }), { start: "2026-01-01", end: "2026-01-03" });
    expect(model.completedItems.map((item) => item.recordId)).toEqual(["b", "a"]);
  });

  it("respects Monday and Sunday week starts", () => {
    const date = new Date("2026-01-07T12:00:00");
    expect(rangeForPreset("this-week", date, 1)).toEqual({ start: "2026-01-05", end: "2026-01-11" });
    expect(rangeForPreset("this-week", date, 0)).toEqual({ start: "2026-01-04", end: "2026-01-10" });
  });

  it("handles month and year boundaries", () => {
    expect(rangeForPreset("last-month", new Date("2026-01-15T12:00:00"), 1)).toEqual({ start: "2025-12-01", end: "2025-12-31" });
  });
});

describe("Milestone 5 structured facts", () => {
  it("keeps fixed, Floating, and Quota completion semantics distinct", () => {
    const model = buildReviewModel(sources({ checkIns: [check("f1", "fixed", "2026-01-05"), check("f2", "fixed", "2026-01-06"), check("fl", "floating", "2026-01-06"), check("q1", "quota", "2026-01-05"), check("q2", "quota", "2026-01-06")] }), { start: "2026-01-05", end: "2026-01-11" }, {}, 1, new Date("2026-01-12T12:00:00"));
    expect([model.fixedCount, model.floatingCount, model.quotaCreditCount]).toEqual([2, 1, 2]);
    expect(model.quotaFacts[0]).toMatchObject({ count: 2, target: 2, outcome: "achieved", provisional: false });
    expect(model.achievedQuotaPeriods).toBe(1);
  });

  it("aggregates repeated habits and preserves record/date traceability", () => {
    const model = buildReviewModel(sources({ checkIns: [check("one", "fixed", "2026-01-05"), check("two", "fixed", "2026-01-06")] }), { start: "2026-01-05", end: "2026-01-06" });
    expect(model.completionGroups[0]).toMatchObject({ taskId: "fixed", count: 2, dates: ["2026-01-06", "2026-01-05"] });
    expect(model.completedItems[0].recordId).toBe("two");
  });

  it("groups by Area and applies task filters", () => {
    const otherArea: Area = { ...area, id: "area-study", name: "Study" }; const other: Task = { ...fixed, id: "study", title: "Read", areaId: otherArea.id };
    const model = buildReviewModel(sources({ tasks: [fixed, other], areas: [area, otherArea], checkIns: [check("a", "fixed", "2026-01-05"), check("b", "study", "2026-01-05")] }), { start: "2026-01-05", end: "2026-01-05" }, { areaId: otherArea.id });
    expect(model.areaBreakdown).toEqual([{ areaId: otherArea.id, name: "Study", count: 1 }]);
  });

  it("suppresses weak emotion and Area statements while keeping missing data factual", () => {
    const emotions: EmotionDefinition[] = [{ id: "calm", label: "Calm", normalizedLabel: "calm", isSystem: false, archived: false, createdAt: stamp, updatedAt: stamp }];
    const reflections: DailyReflection[] = [{ date: "2026-01-05", emotionIds: ["calm"], note: "", createdAt: stamp, updatedAt: stamp }];
    const model = buildReviewModel(sources({ checkIns: [check("a", "fixed", "2026-01-05")], emotions, reflections }), { start: "2026-01-05", end: "2026-01-05" });
    expect(model.emotionCounts).toEqual([]);
    expect(model.summaryKeys).not.toContain("areas");
    expect(model.reflectionDates).toEqual(["2026-01-05"]);
    expect(model.experienceRecords).toEqual([]);
  });

  it("includes optional reflection, emotion, experience, and reward context without inference", () => {
    const emotion: EmotionDefinition = { id: "calm", label: "Calm", normalizedLabel: "calm", isSystem: false, archived: false, createdAt: stamp, updatedAt: stamp };
    const reflections: DailyReflection[] = ["05", "06"].map((day) => ({ date: `2026-01-${day}`, emotionIds: ["calm"], note: "Private note", createdAt: stamp, updatedAt: stamp }));
    const experiences: ExperienceLog[] = [{ id: "x", taskId: "fixed", date: "2026-01-05", comparison: "easier", updatedAt: stamp }];
    const rewards: Reward[] = [{ id: "r", title: "Tea", trigger: "date", rewardDate: "2026-01-06", createdAt: stamp }];
    const model = buildReviewModel(sources({ emotions: [emotion], reflections, experiences, rewards }), { start: "2026-01-05", end: "2026-01-06" });
    expect(model.emotionCounts).toEqual([{ emotionId: "calm", label: "Calm", count: 2 }]);
    expect(model.experienceCounts.easier).toBe(1); expect(model.rewardEvents[0].title).toBe("Tea");
  });

  it("produces bilingual factual language without causal or prescriptive wording", () => {
    const model = buildReviewModel(sources({ checkIns: [check("a", "fixed", "2026-01-05")] }), { start: "2026-01-05", end: "2026-01-05" });
    const english = reviewSentences(model, "en").join(" "); const chinese = reviewSentences(model, "zh-CN").join(" ");
    expect(english).toContain("You completed 1 check-in across 1 active day"); expect(chinese).toContain("完成了 1 次行动");
    expect(`${english} ${chinese}`).not.toMatch(/you should|try to|focus on|need to improve|caused|你应该|建议你|需要改进/i);
  });
});
