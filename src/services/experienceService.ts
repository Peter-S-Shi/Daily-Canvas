import { db } from "../db";
import type { ExperienceLog } from "../types";

export type ExperienceInput = Omit<ExperienceLog, "id" | "updatedAt">;
const hasContent = (value: ExperienceInput) => Boolean(value.comparison || value.effort || value.urgeIntensity || value.note?.trim());

export async function saveExperience(input: ExperienceInput): Promise<ExperienceLog | undefined> {
  if (!hasContent(input)) return undefined;
  if (input.effort !== undefined && (!Number.isInteger(input.effort) || input.effort < 1 || input.effort > 5)) throw new Error("Effort must be between 1 and 5.");
  if (input.urgeIntensity !== undefined && (!Number.isInteger(input.urgeIntensity) || input.urgeIntensity < 1 || input.urgeIntensity > 5)) throw new Error("Urge intensity must be between 1 and 5.");
  if (input.comparison && !["easier", "similar", "harder"].includes(input.comparison)) throw new Error("Unsupported comparison.");
  const record: ExperienceLog = { ...input, note: input.note?.trim() || undefined, id: `${input.taskId}:${input.date}`, updatedAt: new Date().toISOString() };
  await db.experienceLogs.put(record);
  return record;
}

export async function previousExperience(taskId: string, beforeDate: string): Promise<ExperienceLog | undefined> {
  return (await db.experienceLogs.where("taskId").equals(taskId).and((item) => item.date < beforeDate).sortBy("date")).at(-1);
}
