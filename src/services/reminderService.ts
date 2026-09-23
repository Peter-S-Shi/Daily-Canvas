import { parseISO } from "date-fns";
import { db } from "../db";
import { notify } from "../desktop/desktopAdapter";
import type { ReminderOffset, TimeBlock } from "../types";

const OFFSETS: Record<Exclude<ReminderOffset, "off">, number> = { "at-start": 0, "5": 5, "10": 10, "15": 15, "30": 30, "60": 60 };

export function offsetMinutesFor(reminder: ReminderOffset): number | undefined {
  return reminder === "off" ? undefined : OFFSETS[reminder];
}

function blockStart(block: TimeBlock): Date {
  const day = parseISO(block.date);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, block.startMinutes, 0, 0);
}

/** The trigger time always derives from the block itself -- there is no separate recurrence engine. */
export function notifyAtFor(block: TimeBlock): Date | undefined {
  const offset = offsetMinutesFor(block.reminder);
  if (offset === undefined) return undefined;
  return new Date(blockStart(block).getTime() - offset * 60_000);
}

function blockEnd(block: TimeBlock): Date {
  return new Date(blockStart(block).getTime() + block.durationMinutes * 60_000);
}

/** Reminders due for live, in-app firing: notify time has passed and this block has not already fired. */
export function dueReminders(blocks: TimeBlock[], now: Date): TimeBlock[] {
  return blocks.filter((block) => !block.reminderFiredAt).filter((block) => { const at = notifyAtFor(block); return at !== undefined && at <= now; });
}

/**
 * Restrained startup catch-up: a missed reminder is only worth surfacing while the block it
 * belongs to has not already ended (still real-world-actionable). Daily Canvas never wakes up
 * in the background to catch these -- this only runs once, on the next time the app is opened.
 */
export function isDueForCatchUp(block: TimeBlock, now: Date): boolean {
  const at = notifyAtFor(block);
  return at !== undefined && at <= now && blockEnd(block) >= now;
}

async function fire(block: TimeBlock, now: Date): Promise<void> {
  const task = await db.tasks.get(block.taskId);
  await notify(task?.title ?? "Daily Canvas", `Planned ${String(Math.floor(block.startMinutes / 60)).padStart(2, "0")}:${String(block.startMinutes % 60).padStart(2, "0")}`);
  await db.timeBlocks.update(block.id, { reminderFiredAt: now.toISOString() });
}

/** Runs on an interval while the app is open. Daily Canvas promises reliable in-app triggering, not a resident background service. */
export async function checkDueReminders(now = new Date()): Promise<void> {
  const blocks = await db.timeBlocks.filter((block) => !block.reminderFiredAt).toArray();
  for (const block of dueReminders(blocks, now)) await fire(block, now);
}

/** Runs once at startup: a restrained, non-repeating catch-up for reminders missed while the app was closed. */
export async function catchUpMissedReminders(now = new Date()): Promise<void> {
  const blocks = await db.timeBlocks.filter((block) => !block.reminderFiredAt).toArray();
  for (const block of blocks.filter((item) => isDueForCatchUp(item, now))) await fire(block, now);
}
