import { db } from "../db";
import { todayKey } from "../lib/dates";
import type { Language, Task } from "../types";

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
export const taskTemplates = (language: Language): Array<Omit<Task, "id" | "createdAt" | "updatedAt">> => {
  const english = language === "en";
  return [
    { title: english ? "Read for 20 minutes" : "阅读 20 分钟", kind: "habit", colorOverride: "#f4a261", starred: true, archived: false, startDate: todayKey(), schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21, stopReminderAtTarget: true },
    { title: english ? "Take a short walk" : "散步一会儿", kind: "habit", colorOverride: "#457b9d", starred: false, archived: false, startDate: todayKey(), schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21, stopReminderAtTarget: true },
    { title: english ? "No late-night snacks" : "不吃夜宵", kind: "avoidance", colorOverride: "#2a9d8f", starred: false, archived: false, startDate: todayKey(), schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21, stopReminderAtTarget: true },
  ];
};

export async function saveTask(input: Omit<Task, "id" | "createdAt" | "updatedAt">, existing?: Task): Promise<Task> {
  const now = new Date().toISOString();
  const task: Task = { ...input, id: existing?.id ?? makeId(), createdAt: existing?.createdAt ?? now, updatedAt: now };
  await db.tasks.put(task); return task;
}
export async function createTasksFromTemplates(language: Language, indexes: number[]): Promise<void> { for (const template of taskTemplates(language).filter((_, index) => indexes.includes(index))) await saveTask(template); }
export async function updateTask(id: string, changes: Partial<Task>): Promise<void> { await db.tasks.update(id, { ...changes, updatedAt: new Date().toISOString() }); }
export async function deleteTask(id: string): Promise<void> {
  await db.transaction("rw", db.tasks, db.checkIns, db.dailyOrders, async () => {
    await db.tasks.delete(id); await db.checkIns.where("taskId").equals(id).delete();
    const orders = await db.dailyOrders.toArray();
    await db.dailyOrders.bulkPut(orders.map((order) => ({ ...order, taskIds: order.taskIds.filter((taskId) => taskId !== id) })));
  });
}
