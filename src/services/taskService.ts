import { db } from "../db";
import { todayKey } from "../lib/dates";
import type { Language, Task } from "../types";
import { ensureTaskLifecycle } from "./lifecycleService";

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
export function validateTask(task: Omit<Task, "id" | "createdAt" | "updatedAt"> | Task): void {
  if (!task.title.trim()) throw new Error("Task title is required.");
  if (task.kind === "task" && task.schedule.mode === "fixed" && task.schedule.recurrence.type !== "once") throw new Error("Regular Tasks are one-time only.");
  if (task.schedule.mode === "floating" && task.kind !== "task") throw new Error("Floating work must be a regular Task.");
  if (task.schedule.mode === "quota" && task.kind === "task") throw new Error("Quota goals must be a Habit or Avoidance.");
  if (task.estimatedMinutes !== undefined && (!Number.isInteger(task.estimatedMinutes) || task.estimatedMinutes < 1)) throw new Error("Duration estimate must be whole minutes.");
  if (task.schedule.mode === "fixed" && task.schedule.recurrence.type === "weeklyInterval" && (!(task.schedule.recurrence.intervalWeeks && task.schedule.recurrence.intervalWeeks >= 1) || !(task.schedule.recurrence.weekdays?.length))) throw new Error("Weekly interval recurrence requires an interval and selected weekdays.");
  if (task.schedule.mode === "fixed" && task.schedule.recurrence.type === "monthlyDay" && (!(task.schedule.recurrence.dayOfMonth) || task.schedule.recurrence.dayOfMonth < 1 || task.schedule.recurrence.dayOfMonth > 31)) throw new Error("Monthly recurrence requires a day from 1 to 31.");
  for (const item of task.checklist ?? []) if (!item.id || !item.title.trim() || typeof item.completed !== "boolean") throw new Error("Checklist items must be one-level named steps.");
}
export const taskTemplates = (language: Language): Array<Omit<Task, "id" | "createdAt" | "updatedAt">> => {
  const english = language === "en";
  return [
    { title: english ? "Read for 20 minutes" : "阅读 20 分钟", kind: "habit", colorOverride: "#f4a261", starred: true, archived: false, startDate: todayKey(), schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21, stopReminderAtTarget: true },
    { title: english ? "Take a short walk" : "散步一会儿", kind: "habit", colorOverride: "#457b9d", starred: false, archived: false, startDate: todayKey(), schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21, stopReminderAtTarget: true },
    { title: english ? "No late-night snacks" : "不吃夜宵", kind: "avoidance", colorOverride: "#2a9d8f", starred: false, archived: false, startDate: todayKey(), schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21, stopReminderAtTarget: true },
  ];
};

export async function saveTask(input: Omit<Task, "id" | "createdAt" | "updatedAt">, existing?: Task): Promise<Task> {
  validateTask(input);
  const now = new Date().toISOString();
  const task: Task = { ...input, id: existing?.id ?? makeId(), createdAt: existing?.createdAt ?? now, updatedAt: now };
  await db.tasks.put(task); await ensureTaskLifecycle(task); return task;
}
export async function createTasksFromTemplates(language: Language, indexes: number[]): Promise<void> { for (const template of taskTemplates(language).filter((_, index) => indexes.includes(index))) await saveTask(template); }
export async function updateTask(id: string, changes: Partial<Task>): Promise<void> { const current = await db.tasks.get(id); if (!current) throw new Error("Task not found."); validateTask({ ...current, ...changes }); await db.tasks.update(id, { ...changes, updatedAt: new Date().toISOString() }); }
export async function deleteTask(id: string): Promise<void> {
  await db.transaction("rw", [db.tasks, db.checkIns, db.dailyOrders, db.taskLifecycles, db.pausePeriods, db.milestoneEvents, db.replanEvents, db.timeBlocks], async () => {
    await db.tasks.delete(id); await db.checkIns.where("taskId").equals(id).delete();
    await db.taskLifecycles.delete(id); await db.pausePeriods.where("taskId").equals(id).delete(); await db.milestoneEvents.where("taskId").equals(id).delete();
    await db.replanEvents.where("taskId").equals(id).delete(); await db.timeBlocks.where("taskId").equals(id).delete();
    const orders = await db.dailyOrders.toArray();
    await db.dailyOrders.bulkPut(orders.map((order) => ({ ...order, taskIds: order.taskIds.filter((taskId) => taskId !== id) })));
  });
}
