import { parseISO } from "date-fns";
import { db } from "../db";
import type { ReminderOffset, Task, TimeBlock } from "../types";
import { isFixedOccurrenceOn, isQuotaAvailableOn } from "./scheduleService";

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const now = () => new Date().toISOString();

export const MINUTE_STEP = 15;
export const DEFAULT_DURATION_MINUTES = 30;
export const MINUTES_PER_DAY = 24 * 60;

export const isEligibleForTimeBlock = (task: Task) => task.kind !== "avoidance";
/** Duration takes the Task's estimate verbatim (any positive whole minute), preserving estimate intent exactly; only start placement is grid-snapped. */
export const defaultDurationFor = (task: Task) => task.estimatedMinutes || DEFAULT_DURATION_MINUTES;
const onGrid = (value: number) => Number.isInteger(value) && value % MINUTE_STEP === 0;

export interface TimeBlockInput { startMinutes: number; durationMinutes: number }

/** Start placement snaps to the 15-minute grid; duration is any positive whole number of minutes (M14-B blocker fix). */
export function validateTimeBlockInput({ startMinutes, durationMinutes }: TimeBlockInput): void {
  if (!onGrid(startMinutes) || startMinutes < 0 || startMinutes >= MINUTES_PER_DAY) throw new Error("Time Blocks must start on a 15-minute grid line.");
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1) throw new Error("Time Block duration must be a positive whole number of minutes.");
  if (startMinutes + durationMinutes > MINUTES_PER_DAY) throw new Error("A Time Block cannot extend past the end of its day.");
}

function overlaps(a: TimeBlockInput, b: TimeBlockInput): boolean {
  return a.startMinutes < b.startMinutes + b.durationMinutes && b.startMinutes < a.startMinutes + a.durationMinutes;
}

/**
 * An overlap is a warned choice, not a hard block (Issue #21): the caller is given the
 * conflicting blocks so the UI can offer "Adjust time" or "Save anyway" rather than a bare
 * thrown validation error.
 */
export class TimeBlockOverlapError extends Error {
  constructor(public readonly overlapping: TimeBlock[]) {
    super("This time overlaps an existing Time Block.");
    this.name = "TimeBlockOverlapError";
  }
}

async function findOverlaps(date: string, candidate: TimeBlockInput, excludeId?: string): Promise<TimeBlock[]> {
  const sameDay = await db.timeBlocks.where("date").equals(date).toArray();
  return sameDay.filter((block) => block.id !== excludeId && overlaps(block, candidate));
}

export interface SaveTimeBlockOptions { allowOverlap?: boolean }
export interface CreateTimeBlockInput { taskId: string; date: string; startMinutes: number; durationMinutes?: number; reminder?: ReminderOffset }

export async function createTimeBlock(input: CreateTimeBlockInput, options: SaveTimeBlockOptions = {}): Promise<TimeBlock> {
  const task = await db.tasks.get(input.taskId);
  if (!task) throw new Error("Task not found.");
  if (!isEligibleForTimeBlock(task)) throw new Error("Avoidance habits are not offered as ordinary Time Block work.");
  const durationMinutes = input.durationMinutes ?? defaultDurationFor(task);
  validateTimeBlockInput({ startMinutes: input.startMinutes, durationMinutes });
  if (!options.allowOverlap) {
    const overlapping = await findOverlaps(input.date, { startMinutes: input.startMinutes, durationMinutes });
    if (overlapping.length) throw new TimeBlockOverlapError(overlapping);
  }
  const at = now();
  const block: TimeBlock = { id: makeId(), taskId: input.taskId, date: input.date, startMinutes: input.startMinutes, durationMinutes, reminder: input.reminder ?? "off", needsReview: false, createdAt: at, updatedAt: at };
  await db.timeBlocks.add(block);
  return block;
}

export interface UpdateTimeBlockInput { date?: string; startMinutes?: number; durationMinutes?: number; reminder?: ReminderOffset }

/** Moving/resizing/re-reminding a block never changes the linked Task's recurrence, quota, or schedule. */
export async function updateTimeBlock(id: string, changes: UpdateTimeBlockInput, options: SaveTimeBlockOptions = {}): Promise<TimeBlock> {
  const existing = await db.timeBlocks.get(id);
  if (!existing) throw new Error("Time Block not found.");
  const next = { date: changes.date ?? existing.date, startMinutes: changes.startMinutes ?? existing.startMinutes, durationMinutes: changes.durationMinutes ?? existing.durationMinutes };
  validateTimeBlockInput(next);
  const placementChanged = next.date !== existing.date || next.startMinutes !== existing.startMinutes || next.durationMinutes !== existing.durationMinutes;
  if (placementChanged && !options.allowOverlap) {
    const overlapping = await findOverlaps(next.date, next, id);
    if (overlapping.length) throw new TimeBlockOverlapError(overlapping);
  }
  // Date, Start time, and Reminder all change when the next notification should fire; a past firing must never suppress a newly-relevant future one.
  const reminderTimingChanged = changes.date !== undefined || changes.startMinutes !== undefined || changes.reminder !== undefined;
  const updated: TimeBlock = { ...existing, ...next, reminder: changes.reminder ?? existing.reminder, needsReview: placementChanged ? false : existing.needsReview, reminderFiredAt: reminderTimingChanged ? undefined : existing.reminderFiredAt, updatedAt: now() };
  await db.timeBlocks.put(updated);
  return updated;
}

/** Deleting a Time Block never deletes its linked Task, and a Task ending its block is not an automatic completion. */
export async function deleteTimeBlock(id: string): Promise<void> {
  await db.timeBlocks.delete(id);
}

function isPlausibleOn(task: Task, dateKey: string): boolean {
  const date = parseISO(dateKey);
  if (task.schedule.mode === "fixed") return isFixedOccurrenceOn(task, date);
  if (task.schedule.mode === "floating") return dateKey >= task.schedule.availableFrom;
  return isQuotaAvailableOn(task, date);
}

/**
 * Called after Replan changes a Task's future plan. Existing future blocks are never moved or
 * deleted here (behavior spec: Replan must not rewrite history or silently repair the plan) --
 * a block that no longer fits the new plan is only flagged for the user to adjust explicitly.
 */
export async function flagBlocksNeedingReview(taskId: string, fromDateInclusive: string): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) return;
  const futureBlocks = (await db.timeBlocks.where("taskId").equals(taskId).toArray()).filter((block) => block.date >= fromDateInclusive);
  await Promise.all(futureBlocks.filter((block) => !isPlausibleOn(task, block.date)).map((block) => db.timeBlocks.put({ ...block, needsReview: true, updatedAt: now() })));
}
