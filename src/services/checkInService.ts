import { db } from "../db";
import type { CheckIn } from "../types";
import { evaluateTaskLifecycle } from "./lifecycleService";

export async function setCheckIn(taskId: string, date: string, status?: CheckIn["status"]): Promise<void> {
  const id = `${taskId}:${date}`;
  if (!status) { await db.checkIns.delete(id); await evaluateTaskLifecycle(taskId); return; }
  await db.checkIns.put({ id, taskId, date, status, updatedAt: new Date().toISOString() }); await evaluateTaskLifecycle(taskId);
}
