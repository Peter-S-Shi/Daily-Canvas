import { describe, expect, it } from "vitest";
import { selectOnThisDay } from "./onThisDayService";
import type { DailyReflection, MeditationEntry } from "../types";

const reflection = (date: string, overrides: Partial<DailyReflection> = {}): DailyReflection => ({ date, emotionIds: [], note: `note ${date}`, createdAt: date, updatedAt: date, ...overrides });
const meditation = (createdAt: string, id = createdAt): MeditationEntry => ({ id, content: `thought ${createdAt}`, sortOrder: 0, createdAt, updatedAt: createdAt });

describe("onThisDayService", () => {
  it("matches only exact month+day from past years, never the current year or other days", () => {
    const reflections = [reflection("2024-09-23"), reflection("2025-09-23"), reflection("2026-09-23"), reflection("2025-09-22"), reflection("2025-10-23")];
    const groups = selectOnThisDay(reflections, [], "2026-09-23");
    expect(groups.map((g) => g.year)).toEqual([2025, 2024]);
    expect(groups.every((g) => g.entries.every((e) => e.date.endsWith("09-23")))).toBe(true);
  });

  it("groups by year, most recent year first", () => {
    const reflections = [reflection("2022-09-23"), reflection("2024-09-23"), reflection("2023-09-23")];
    const groups = selectOnThisDay(reflections, [], "2026-09-23");
    expect(groups.map((g) => g.year)).toEqual([2024, 2023, 2022]);
  });

  it("includes Meditations by creation date alongside Reflections, restricted to the same rule", () => {
    const groups = selectOnThisDay([reflection("2025-09-23")], [meditation("2025-09-23T10:00:00.000Z"), meditation("2025-09-24T10:00:00.000Z", "other")], "2026-09-23");
    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[0].entries.some((e) => e.source === "meditation")).toBe(true);
    expect(groups[0].entries.some((e) => e.source === "reflection")).toBe(true);
  });

  it("returns an empty array (neutral empty state, no entries) when nothing matches", () => {
    expect(selectOnThisDay([reflection("2025-01-01")], [], "2026-09-23")).toEqual([]);
  });

  it("never includes the current year even if the month+day matches (e.g. earlier today)", () => {
    expect(selectOnThisDay([reflection("2026-09-23")], [], "2026-09-23")).toEqual([]);
  });
});
