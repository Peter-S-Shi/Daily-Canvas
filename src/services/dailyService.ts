import { db } from "../db";

export async function saveDailyOrder(date: string, taskIds: string[]): Promise<void> {
  await db.dailyOrders.put({ date, taskIds });
}

export async function saveJournal(date: string, content: string): Promise<void> {
  const existing = await db.dailyReflections.get(date);
  const now = new Date().toISOString();
  await db.dailyReflections.put({ date, emotionIds: existing?.emotionIds ?? [], intensity: existing?.intensity, note: content, promptId: existing?.promptId, createdAt: existing?.createdAt ?? now, updatedAt: now });
}
