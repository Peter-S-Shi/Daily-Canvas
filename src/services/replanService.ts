import { db } from "../db";
import type { ReplanEvent } from "../types";
import { todayKey } from "../lib/dates";

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export async function replanTask(taskId: string, nextStartDate: string, note?: string): Promise<ReplanEvent> {
  if (nextStartDate < todayKey()) throw new Error("Replan date must be today or later.");
  return db.transaction("rw", [db.tasks, db.replanEvents], async () => {
    const task = await db.tasks.get(taskId);
    if (!task) throw new Error("Task not found.");
    const replannedAt = new Date().toISOString();
    const event = { id: makeId(), taskId, replannedAt, previousStartDate: task.startDate, nextStartDate, note: note?.trim() || undefined };
    const schedule = task.schedule.mode === "floating" ? { ...task.schedule, availableFrom: nextStartDate } : task.schedule.mode === "quota" ? { ...task.schedule, availableFrom: nextStartDate } : task.schedule;
    await db.tasks.update(taskId, { startDate: nextStartDate, schedule, updatedAt: replannedAt });
    await db.replanEvents.add(event);
    return event;
  });
}
