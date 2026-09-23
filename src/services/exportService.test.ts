import { describe, expect, it, vi } from "vitest";
import { reflectionToMarkdown, reviewToMarkdown } from "./exportService";
import { buildReviewModel, type ReviewSources } from "./reviewService";
import type { DailyReflection } from "../types";

vi.mock("../desktop/desktopAdapter", () => ({ saveBlob: vi.fn() }));

const emptySources: ReviewSources = { tasks: [], areas: [], checkIns: [], reflections: [], emotions: [], experiences: [], rewards: [] };

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
    const a = reviewToMarkdown(model, {}, "en");
    const b = reviewToMarkdown(model, {}, "en");
    expect(a).toBe(b);
    expect(a).toContain("2026-09-01");
    expect(a).toContain("2026-09-23");
  });

  it("includes the active filter selection as metadata, without inventing new filter dimensions", () => {
    const model = buildReviewModel(emptySources, { start: "2026-09-01", end: "2026-09-23" }, { taskKind: "habit" }, 1, new Date("2026-09-23"));
    const md = reviewToMarkdown(model, { taskKind: "habit" }, "en");
    expect(md).toContain("habit");
  });
});
