import { db } from "../db";

export async function saveDailyOrder(date: string, taskIds: string[]): Promise<void> {
  await db.dailyOrders.put({ date, taskIds });
}

export async function saveJournal(date: string, content: string): Promise<void> {
  const limited = Array.from(content).slice(0, 500).join("");
  await db.journalEntries.put({ date, content: limited, updatedAt: new Date().toISOString() });
}
