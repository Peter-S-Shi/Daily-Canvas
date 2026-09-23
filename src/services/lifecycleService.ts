import { db } from "../db";
import { todayKey } from "../lib/dates";
import type { LifecycleState, MilestoneEvent, MilestoneEventType, PausePeriod, PauseType, Task, TaskLifecycle } from "../types";
import { calculateTaskStats } from "./statisticsService";
import { effectivePauseStart, isPausedOn } from "./pauseService";

const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const now = () => new Date().toISOString();
export const supportsLifecycle = (task: Task) => task.kind !== "task" && task.schedule.mode !== "floating";
export const targetFor = (task: Task) => task.schedule.mode === "quota" ? task.targetPeriods ?? 4 : task.targetDays ?? 21;
export const milestoneTargetFor = (task: Task, lifecycle: TaskLifecycle) => lifecycle.nextMilestoneTarget ?? targetFor(task);

export function initialLifecycle(task: Task, personalBest = 0, at = now()): TaskLifecycle {
  return { taskId: task.id, state: "building", milestoneSequence: 1, personalBest, celebrationPending: false, createdAt: at, updatedAt: at };
}

async function event(taskId: string, type: MilestoneEventType, lifecycle: TaskLifecycle, note?: string, targetValue?: number): Promise<void> {
  const createdAt = now(); await db.milestoneEvents.add({ id: id(), taskId, date: todayKey(), type, sequence: lifecycle.milestoneSequence, targetValue, note, createdAt });
}

export async function ensureTaskLifecycle(task: Task): Promise<TaskLifecycle | undefined> {
  if (!supportsLifecycle(task)) return undefined; const existing = await db.taskLifecycles.get(task.id); if (existing) return existing;
  const record = initialLifecycle(task); await db.taskLifecycles.put(record); return record;
}

export async function evaluateTaskLifecycle(taskId: string, through = new Date(), weekStartsOn: 0 | 1 = 1): Promise<TaskLifecycle | undefined> {
  const task = await db.tasks.get(taskId); if (!task || !supportsLifecycle(task)) return undefined;
  const lifecycle = await ensureTaskLifecycle(task); if (!lifecycle) return undefined;
  const [checkIns, pauses] = await Promise.all([db.checkIns.where("taskId").equals(taskId).toArray(), db.pausePeriods.where("taskId").equals(taskId).toArray()]);
  const stats = calculateTaskStats(task, checkIns, through, pauses, lifecycle.personalBest, weekStartsOn); const updated = { ...lifecycle, personalBest: Math.max(lifecycle.personalBest, stats.personalBest), updatedAt: now() };
  const milestoneTarget = milestoneTargetFor(task, lifecycle);
  if (stats.currentStreak >= milestoneTarget && ["starting", "building"].includes(lifecycle.state)) {
    updated.state = "milestone-reached"; updated.celebrationPending = true;
    await db.taskLifecycles.put(updated); await event(taskId, "target-reached", updated, undefined, milestoneTarget); return updated;
  }
  await db.taskLifecycles.put(updated); return updated;
}

export async function chooseMilestoneAction(taskId: string, action: "continue" | "maintenance" | "extend" | "complete" | "archive", extension?: number): Promise<void> {
  const [task, lifecycle] = await Promise.all([db.tasks.get(taskId), db.taskLifecycles.get(taskId)]); if (!task || !lifecycle) return;
  let state: LifecycleState = lifecycle.state; let type: MilestoneEventType = "continued"; let sequence = lifecycle.milestoneSequence;
  let nextMilestoneTarget = lifecycle.nextMilestoneTarget;
  if (action === "continue") { const reachedTarget = milestoneTargetFor(task, lifecycle); state = "building"; sequence += 1; nextMilestoneTarget = Math.max(reachedTarget, lifecycle.personalBest) + targetFor(task); }
  if (action === "maintenance") { state = "maintenance"; type = "maintenance"; }
  if (action === "extend") { state = "building"; type = "extended"; sequence += 1; const value = Math.max(lifecycle.personalBest + 1, extension ?? targetFor(task)); nextMilestoneTarget = value; await db.tasks.update(taskId, task.schedule.mode === "quota" ? { targetPeriods: value, updatedAt: now() } : { targetDays: value, updatedAt: now() }); }
  if (action === "complete") { state = "completed"; type = "completed"; }
  if (action === "archive") { state = "archived"; type = "archived"; await db.tasks.update(taskId, { archived: true, updatedAt: now() }); }
  const updated = { ...lifecycle, state, milestoneSequence: sequence, nextMilestoneTarget, celebrationPending: false, updatedAt: now() }; await db.taskLifecycles.put(updated); await event(taskId, type, updated, undefined, action === "continue" || action === "extend" ? nextMilestoneTarget : targetFor(task));
}

export async function addPause(taskId: string, startDate: string, endDate: string | undefined, type: PauseType, note?: string): Promise<PausePeriod> {
  const lifecycle = await db.taskLifecycles.get(taskId); if (!lifecycle) throw new Error("Lifecycle record not found."); const createdAt = now();
  const pause: PausePeriod = { id: id(), taskId, startDate, endDate, type, note: note?.trim() || undefined, createdAt, updatedAt: createdAt };
  await db.transaction("rw", db.pausePeriods, db.taskLifecycles, db.milestoneEvents, async () => { await db.pausePeriods.add(pause); const activeNow = effectivePauseStart(pause) <= todayKey() && (!pause.endDate || pause.endDate >= todayKey()); const updated: TaskLifecycle = activeNow ? { ...lifecycle, resumeState: lifecycle.state === "paused" ? lifecycle.resumeState ?? "building" : lifecycle.state as TaskLifecycle["resumeState"], state: "paused", celebrationPending: false, updatedAt: createdAt } : { ...lifecycle, updatedAt: createdAt }; await db.taskLifecycles.put(updated); await event(taskId, "paused", updated, note); }); return pause;
}

export async function resumeTask(taskId: string): Promise<void> {
  const lifecycle = await db.taskLifecycles.get(taskId); if (!lifecycle || lifecycle.state !== "paused") return; const resumedAt = now(); const resumeDate = todayKey();
  await db.transaction("rw", db.pausePeriods, db.taskLifecycles, db.milestoneEvents, async () => {
    const pauses = await db.pausePeriods.where("taskId").equals(taskId).toArray();
    await Promise.all(pauses.filter((pause) => isPausedOn([pause], resumeDate)).map((pause) => db.pausePeriods.update(pause.id, { resumedAt, updatedAt: resumedAt })));
    const updated: TaskLifecycle = { ...lifecycle, state: lifecycle.resumeState ?? "building", resumeState: undefined, updatedAt: resumedAt }; await db.taskLifecycles.put(updated); await event(taskId, "resumed", updated);
  });
}
export async function resumeExpiredPauses(): Promise<void> { const today = todayKey(); for (const lifecycle of await db.taskLifecycles.where("state").equals("paused").toArray()) { const pauses = await db.pausePeriods.where("taskId").equals(lifecycle.taskId).toArray(); if (!isPausedOn(pauses, today)) await resumeTask(lifecycle.taskId); } }
export async function recordRecoveryChoice(taskId: string, choice: "continue" | "adjust"): Promise<void> { const lifecycle = await db.taskLifecycles.get(taskId); if (!lifecycle) return; await event(taskId, choice === "continue" ? "recovery-continued" : "plan-adjusted", lifecycle); }
