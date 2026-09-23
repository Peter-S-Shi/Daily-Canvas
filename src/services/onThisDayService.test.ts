import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

  describe("Meditation date derivation uses the local calendar day, not the UTC slice", () => {
    const originalTz = process.env.TZ;
    beforeAll(() => { process.env.TZ = "America/New_York"; });
    afterAll(() => { process.env.TZ = originalTz; });

    it("buckets a late-evening local Meditation under its local day, even when that rolls the UTC date (and year) forward", () => {
      // 2025-01-01T04:30:00.000Z is 2024-12-31 23:30 local time in America/New_York (UTC-5 in
      // January): a Meditation "created" late in the evening of Dec 31, local time, but whose UTC
      // instant already reads Jan 1 of the following year. `createdAt.slice(0, 10)` -- the old, buggy
      // derivation -- would read this as "2025-01-01" and file it under the wrong month+day and the
      // wrong (following) year. The local-day derivation must read it as 2024-12-31.
      const lateEveningLocal = meditation("2025-01-01T04:30:00.000Z");
      const groups = selectOnThisDay([], [lateEveningLocal], "2026-12-31");
      expect(groups).toHaveLength(1);
      expect(groups[0].year).toBe(2024); // local year, not the UTC-rolled 2025
      expect(groups[0].entries).toHaveLength(1);
      expect(groups[0].entries[0].date).toBe("2024-12-31"); // local day, not the UTC-rolled 2025-01-01
    });
  });
});
