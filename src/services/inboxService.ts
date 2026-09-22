import { db } from "../db";
import type { InboxCapture, Task } from "../types";
import { saveTask } from "./taskService";

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export async function createCapture(title: string): Promise<InboxCapture> {
  const value = title.trim();
  if (!value) throw new Error("Capture title is required.");
  const now = new Date().toISOString();
  const capture = { id: makeId(), title: value, createdAt: now, updatedAt: now };
  await db.inboxCaptures.add(capture);
  return capture;
}

export async function triageCapture(id: string, input: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<Task> {
  return db.transaction("rw", [db.inboxCaptures, db.tasks, db.taskLifecycles], async () => {
    const capture = await db.inboxCaptures.get(id);
    if (!capture) throw new Error("Inbox capture not found.");
    const task = await saveTask(input);
    await db.inboxCaptures.delete(id);
    return task;
  });
}

export async function deleteCapture(id: string): Promise<void> { await db.inboxCaptures.delete(id); }
