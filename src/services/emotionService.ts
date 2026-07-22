import { db } from "../db";
import type { EmotionDefinition } from "../types";

export const normalizeEmotionLabel = (label: string) => label.trim().normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase();

export async function createCustomEmotion(label: string): Promise<EmotionDefinition> {
  const displayLabel = label.trim().normalize("NFKC").replace(/\s+/g, " ");
  const normalizedLabel = normalizeEmotionLabel(displayLabel);
  if (!normalizedLabel) throw new Error("Emotion label is required.");
  const existing = await db.emotionDefinitions.where("normalizedLabel").equals(normalizedLabel).first();
  if (existing) {
    if (existing.archived) await db.emotionDefinitions.update(existing.id, { archived: false, updatedAt: new Date().toISOString() });
    return { ...existing, archived: false };
  }
  const now = new Date().toISOString();
  const emotion: EmotionDefinition = { id: crypto.randomUUID(), label: displayLabel, normalizedLabel, isSystem: false, archived: false, createdAt: now, updatedAt: now };
  await db.emotionDefinitions.add(emotion);
  return emotion;
}

export async function setEmotionArchived(id: string, archived: boolean): Promise<void> {
  const emotion = await db.emotionDefinitions.get(id);
  if (!emotion || emotion.isSystem) return;
  await db.emotionDefinitions.update(id, { archived, updatedAt: new Date().toISOString() });
}
