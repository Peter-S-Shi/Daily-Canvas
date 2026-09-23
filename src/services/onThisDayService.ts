import { db } from "../db";
import { toDateKey } from "../lib/dates";
import type { DailyReflection, MeditationEntry } from "../types";

/**
 * On This Day (frozen M13 scope): a read-only lens over existing Daily Reflections and
 * Meditations, restricted to exact month+day matches from prior years only. It never modifies or
 * duplicates a source record, never extends to other record types, and never produces growth,
 * emotion, personality, meaning, or causal analysis -- grouping and ordering are the entire model.
 */
export type OnThisDayEntry =
  | { source: "reflection"; year: number; date: string; reflection: DailyReflection }
  | { source: "meditation"; year: number; date: string; meditation: MeditationEntry };

export interface OnThisDayGroup { year: number; entries: OnThisDayEntry[] }

function monthDay(dateKey: string): string { return dateKey.slice(5, 10); }
function yearOf(dateKey: string): number { return Number(dateKey.slice(0, 4)); }

export function selectOnThisDay(reflections: DailyReflection[], meditations: MeditationEntry[], todayKey: string): OnThisDayGroup[] {
  const targetMonthDay = monthDay(todayKey);
  const currentYear = yearOf(todayKey);
  const entries: OnThisDayEntry[] = [];
  for (const reflection of reflections) {
    if (monthDay(reflection.date) !== targetMonthDay) continue;
    const year = yearOf(reflection.date);
    if (year >= currentYear) continue; // past years only -- never the current year, never the future
    entries.push({ source: "reflection", year, date: reflection.date, reflection });
  }
  for (const meditation of meditations) {
    // Meditations only store a UTC creation instant (no local-day field), so the local calendar
    // day must be derived the same way Daily Canvas derives it everywhere else -- never by slicing
    // the UTC ISO string, which misfiles evening entries into the next UTC day.
    const createdKey = toDateKey(new Date(meditation.createdAt));
    if (monthDay(createdKey) !== targetMonthDay) continue;
    const year = yearOf(createdKey);
    if (year >= currentYear) continue;
    entries.push({ source: "meditation", year, date: createdKey, meditation });
  }
  const byYear = new Map<number, OnThisDayEntry[]>();
  for (const entry of entries) byYear.set(entry.year, [...(byYear.get(entry.year) ?? []), entry]);
  return [...byYear.entries()].sort(([a], [b]) => b - a).map(([year, group]) => ({ year, entries: group.sort((a, b) => a.date.localeCompare(b.date)) }));
}

export async function loadOnThisDay(todayKey: string): Promise<OnThisDayGroup[]> {
  const [reflections, meditations] = await Promise.all([db.dailyReflections.toArray(), db.meditationEntries.toArray()]);
  return selectOnThisDay(reflections, meditations, todayKey);
}
