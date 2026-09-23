import { describe, expect, it, vi } from "vitest";
import { reflectionToMarkdown, reviewToMarkdown } from "./exportService";
import { buildReviewModel, type ReviewSources } from "./reviewService";
import type { Area, DailyReflection, Task } from "../types";

vi.mock("../desktop/desktopAdapter", () => ({ saveBlob: vi.fn() }));

const emptySources: ReviewSources = { tasks: [], areas: [], checkIns: [], reflections: [], emotions: [], experiences: [], rewards: [] };
const noNames = { areas: [] as Pick<Area, "id" | "name">[], tasks: [] as Pick<Task, "id" | "title">[] };

describe("exportService", () => {
  it("produces deterministic Reflection Markdown from the same input", () => {
    const reflection: DailyReflection = { date: "2026-09-23", emotionIds: [], note: "Today was calm.", intensity: 3, templateId: "gratitude", createdAt: "x", updatedAt: "x" };
    const a = reflectionToMarkdown(reflection, "en");
    const b = reflectionToMarkdown(reflection, "en");
    expect(a).toBe(b);
    expect(a).toContain("2026-09-23");
    expect(a).toContain("Today was calm.");
    expect(a).toContain("3 / 5");
  });

  it("never rewrites the user's own note text", () => {
    const reflection: DailyReflection = { date: "2026-09-23", emotionIds: [], note: "exact original wording, unchanged", createdAt: "x", updatedAt: "x" };
    expect(reflectionToMarkdown(reflection, "en")).toContain("exact original wording, unchanged");
  });

  it("handles a Free Write reflection with no template and no intensity", () => {
    const reflection: DailyReflection = { date: "2026-09-23", emotionIds: [], note: "just writing", createdAt: "x", updatedAt: "x" };
    const md = reflectionToMarkdown(reflection, "en");
    expect(md).not.toContain("Template");
    expect(md).toContain("just writing");
  });

  it("produces deterministic Review Markdown for the same period and filters", () => {
    const model = buildReviewModel(emptySources, { start: "2026-09-01", end: "2026-09-23" }, {}, 1, new Date("2026-09-23"));
    const a = reviewToMarkdown(model, {}, "en", noNames);
    const b = reviewToMarkdown(model, {}, "en", noNames);
    expect(a).toBe(b);
    expect(a).toContain("2026-09-01");
    expect(a).toContain("2026-09-23");
  });

  it("includes the active filter selection as metadata, without inventing new filter dimensions", () => {
    const model = buildReviewModel(emptySources, { start: "2026-09-01", end: "2026-09-23" }, { taskKind: "habit" }, 1, new Date("2026-09-23"));
    const md = reviewToMarkdown(model, { taskKind: "habit" }, "en", noNames);
    expect(md).toContain("habit");
  });

  it("resolves a real display name for the Reflection template, never the raw i18n key", () => {
    const reflection: DailyReflection = { date: "2026-09-23", emotionIds: [], note: "check-in note", templateId: "daily-checkin", createdAt: "x", updatedAt: "x" };
    const en = reflectionToMarkdown(reflection, "en");
    expect(en).toContain("Daily Check-in");
    expect(en).not.toContain("template_dailyCheckin");
    const zh = reflectionToMarkdown(reflection, "zh-CN");
    expect(zh).toContain("每日回顾");
    expect(zh).not.toContain("template_dailyCheckin");
  });

  it("resolves the Review filter's Area/Task id to its current human-readable name, never the raw id", () => {
    const model = buildReviewModel(emptySources, { start: "2026-09-01", end: "2026-09-23" }, { areaId: "area-1", taskId: "task-1" }, 1, new Date("2026-09-23"));
    const names = { areas: [{ id: "area-1", name: "Health" }], tasks: [{ id: "task-1", title: "Morning run" }] };
    const md = reviewToMarkdown(model, { areaId: "area-1", taskId: "task-1" }, "en", names);
    expect(md).toContain("Area: Health");
    expect(md).toContain("Task: Morning run");
    expect(md).not.toContain("area-1");
    expect(md).not.toContain("task-1");
  });

  it("omits the filter metadata line entirely when the id cannot be resolved to a name, rather than printing the raw id", () => {
    const model = buildReviewModel(emptySources, { start: "2026-09-01", end: "2026-09-23" }, { areaId: "dangling-area" }, 1, new Date("2026-09-23"));
    const md = reviewToMarkdown(model, { areaId: "dangling-area" }, "en", noNames);
    expect(md).not.toContain("dangling-area");
    expect(md).not.toContain("Area:");
    expect(md).not.toContain("Filters:");
  });
});
