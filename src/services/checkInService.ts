import { db } from "../db";
import type { CheckIn } from "../types";

export async function setCheckIn(taskId: string, date: string, status?: CheckIn["status"]): Promise<void> {
  const id = `${taskId}:${date}`;
  if (!status) return void await db.checkIns.delete(id);
  await db.checkIns.put({ id, taskId, date, status, updatedAt: new Date().toISOString() });
}
