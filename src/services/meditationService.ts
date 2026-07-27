import { db } from "../db";
import type { MeditationEntry } from "../types";

const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const now = () => new Date().toISOString();
const hanPattern = /\p{Script=Han}/u;
const emojiPattern = /\p{Extended_Pictographic}/u;

export interface MeditationValidation {
  content: string;
  units: number;
  valid: boolean;
  error?: "empty" | "too-long";
}

export function countMeditationUnits(content: string): number {
  let han = 0;
  let withoutHan = "";
  for (const character of content) {
    if (hanPattern.test(character)) han += 1;
    else withoutHan += character;
  }
  const WordSegmenter = Intl.Segmenter;
  const words = [...new WordSegmenter(undefined, { granularity: "word" }).segment(withoutHan)].filter((item) => item.isWordLike).length;
  const emoji = [...new WordSegmenter(undefined, { granularity: "grapheme" }).segment(withoutHan)].filter((item) => emojiPattern.test(item.segment)).length;
  return han + words + emoji;
}

export function validateMeditationContent(value: string): MeditationValidation {
  const content = value.trim();
  const units = countMeditationUnits(content);
  if (!content) return { content, units, valid: false, error: "empty" };
  if (units > 150) return { content, units, valid: false, error: "too-long" };
  return { content, units, valid: true };
}

function requireValid(value: string): string {
  const result = validateMeditationContent(value);
  if (!result.valid) throw new Error(result.error === "empty" ? "Meditation content cannot be empty." : "Meditation content exceeds 150 semantic units.");
  return result.content;
}

export async function listMeditations(): Promise<MeditationEntry[]> {
  return db.meditationEntries.orderBy("sortOrder").toArray();
}

export async function getMeditation(entryId: string): Promise<MeditationEntry | undefined> {
  return db.meditationEntries.get(entryId);
}

export async function createMeditation(value: string): Promise<MeditationEntry> {
  const content = requireValid(value);
  const last = await db.meditationEntries.orderBy("sortOrder").last();
  const createdAt = now();
  const entry: MeditationEntry = { id: id(), content, sortOrder: (last?.sortOrder ?? -1) + 1, createdAt, updatedAt: createdAt };
  await db.meditationEntries.add(entry);
  return entry;
}

export async function updateMeditation(entryId: string, value: string): Promise<MeditationEntry> {
  const content = requireValid(value);
  const existing = await db.meditationEntries.get(entryId);
  if (!existing) throw new Error("Meditation entry not found.");
  const updated: MeditationEntry = { ...existing, content, updatedAt: now() };
  await db.meditationEntries.put(updated);
  return updated;
}

export async function deleteMeditation(entryId: string): Promise<void> {
  await db.transaction("rw", db.meditationEntries, async () => {
    await db.meditationEntries.delete(entryId);
    await normalizeMeditationOrder();
  });
}

export async function normalizeMeditationOrder(): Promise<void> {
  const entries = await db.meditationEntries.orderBy("sortOrder").toArray();
  await db.meditationEntries.bulkPut(entries.map((entry, sortOrder) => ({ ...entry, sortOrder })));
}

export async function reorderMeditations(orderedIds: string[]): Promise<void> {
  await db.transaction("rw", db.meditationEntries, async () => {
    const entries = await db.meditationEntries.toArray();
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const known = orderedIds.filter((entryId, index) => byId.has(entryId) && orderedIds.indexOf(entryId) === index);
    const remaining = entries.filter((entry) => !known.includes(entry.id)).sort((a, b) => a.sortOrder - b.sortOrder).map((entry) => entry.id);
    const normalized = [...known, ...remaining].map((entryId, sortOrder) => ({ ...byId.get(entryId)!, sortOrder }));
    await db.meditationEntries.bulkPut(normalized);
  });
}
