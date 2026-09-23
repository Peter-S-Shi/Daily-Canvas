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

/**
 * A reminder is only worth surfacing while its block has not already ended -- otherwise it is
 * stale, not "due" (this applies equally to the live 20-second checker and the startup catch-up:
 * an old, unfired block from days ago must never suddenly notify just because the app is open).
 */
function isActionable(block: TimeBlock, now: Date): boolean {
  const at = notifyAtFor(block);
  return at !== undefined && at <= now && blockEnd(block) >= now;
}

/** Reminders due for live, in-app firing: notify time has passed, the block has not ended, and it has not already fired. */
export function dueReminders(blocks: TimeBlock[], now: Date): TimeBlock[] {
  return blocks.filter((block) => !block.reminderFiredAt && isActionable(block, now));
}

/**
 * Restrained startup catch-up: a missed reminder is only worth surfacing while the block it
 * belongs to has not already ended (still real-world-actionable). Daily Canvas never wakes up
 * in the background to catch these -- this only runs once, on the next time the app is opened.
 */
export const isDueForCatchUp = isActionable;

/**
 * A failed notification (e.g. the native command errors) must never crash the checker or block
 * other reminders: reminders are an in-app-only assistive feature, and the app's core (including
 * startup) must stay usable regardless of notification delivery. A block whose notify attempt
 * failed is left unfired so the next check retries it while it remains actionable.
 */
async function fire(block: TimeBlock, now: Date): Promise<void> {
  try {
    const task = await db.tasks.get(block.taskId);
    await notify(task?.title ?? "Daily Canvas", `Planned ${String(Math.floor(block.startMinutes / 60)).padStart(2, "0")}:${String(block.startMinutes % 60).padStart(2, "0")}`);
    await db.timeBlocks.update(block.id, { reminderFiredAt: now.toISOString() });
  } catch (error) {
    console.warn("Daily Canvas: a Time Block reminder could not be delivered; it will retry.", error);
  }
}

/** Runs on an interval while the app is open. Daily Canvas promises reliable in-app triggering, not a resident background service. */
export async function checkDueReminders(now = new Date()): Promise<void> {
  try {
    const blocks = await db.timeBlocks.filter((block) => !block.reminderFiredAt).toArray();
    for (const block of dueReminders(blocks, now)) await fire(block, now);
  } catch (error) {
    console.warn("Daily Canvas: the reminder check could not complete.", error);
  }
}

/** Runs once at startup: a restrained, non-repeating catch-up for reminders missed while the app was closed. */
export async function catchUpMissedReminders(now = new Date()): Promise<void> {
  try {
    const blocks = await db.timeBlocks.filter((block) => !block.reminderFiredAt).toArray();
    for (const block of blocks.filter((item) => isDueForCatchUp(item, now))) await fire(block, now);
  } catch (error) {
    console.warn("Daily Canvas: the startup reminder catch-up could not complete.", error);
  }
}
