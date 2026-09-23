import { db } from "../db";
import type { CheckIn, ReplanEvent, Task } from "../types";
import { todayKey } from "../lib/dates";
import { flagBlocksNeedingReview } from "./timeBlockService";

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function canReplanTask(task: Task, checkIns: CheckIn[] = []): boolean {
  if (task.archived) return false;
  const isOneTime = (task.schedule.mode === "fixed" && task.schedule.recurrence.type === "once") || task.schedule.mode === "floating";
  if (isOneTime && checkIns.some((item) => item.status === "done")) return false;
  return true;
}

export async function replanTask(taskId: string, nextStartDate: string, note?: string): Promise<ReplanEvent> {
  if (nextStartDate < todayKey()) throw new Error("Replan date must be today or later.");
  return db.transaction("rw", [db.tasks, db.replanEvents, db.checkIns, db.timeBlocks], async () => {
    const task = await db.tasks.get(taskId);
    if (!task) throw new Error("Task not found.");
    const checkIns = await db.checkIns.where("taskId").equals(taskId).toArray();
    if (!canReplanTask(task, checkIns)) throw new Error("This task cannot be replanned.");
    const replannedAt = new Date().toISOString();
    const previousStartDate = task.schedule.mode === "floating" || task.schedule.mode === "quota"
      ? task.schedule.availableFrom
      : (task.replannedStartDate ?? task.startDate);
    const historyEntry = { replannedAt, previousStartDate, nextStartDate, note: note?.trim() || undefined };
    const event: ReplanEvent = { id: makeId(), taskId, ...historyEntry };
    const replanHistory = [...(task.replanHistory ?? []), historyEntry];
    const schedule = task.schedule.mode === "floating" ? { ...task.schedule, availableFrom: nextStartDate } : task.schedule.mode === "quota" ? { ...task.schedule, availableFrom: nextStartDate } : task.schedule;
    await db.tasks.update(taskId, { replannedStartDate: nextStartDate, replanHistory, schedule, updatedAt: replannedAt });
    await db.replanEvents.add(event);
    await flagBlocksNeedingReview(taskId, todayKey());
    return event;
  });
}
