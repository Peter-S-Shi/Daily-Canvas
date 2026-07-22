import { db } from "../db";
import type { DailyReflection } from "../types";

export async function saveReflection(input: Omit<DailyReflection, "createdAt" | "updatedAt">): Promise<DailyReflection> {
  if (input.intensity !== undefined && (!Number.isInteger(input.intensity) || input.intensity < 1 || input.intensity > 5)) throw new Error("Reflection intensity must be between 1 and 5.");
  const existing = await db.dailyReflections.get(input.date);
  const now = new Date().toISOString();
  const reflection: DailyReflection = { ...input, emotionIds: [...new Set(input.emotionIds)], createdAt: existing?.createdAt ?? now, updatedAt: now };
  await db.dailyReflections.put(reflection);
  return reflection;
}

export async function getReflection(date: string): Promise<DailyReflection | undefined> { return db.dailyReflections.get(date); }
