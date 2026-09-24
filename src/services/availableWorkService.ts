import { parseISO } from "date-fns";
import type { CheckIn, PausePeriod, Task, TaskLifecycle } from "../types";
import { isPausedOn } from "./pauseService";
import { isFixedOccurrenceOn, isFloatingAvailableOn, isQuotaAvailableOn } from "./scheduleService";
import { isEligibleForTimeBlock } from "./timeBlockService";

/**
 * Available Work is a planning source list derived from existing Task data (behavior spec §7.5),
 * never a second authoritative task database. Completed, archived, and paused items never appear.
 */
export function availableWorkOn(dateKey: string, tasks: Task[], checkIns: CheckIn[], lifecycles: TaskLifecycle[], pauses: PausePeriod[]): Task[] {
  const date = parseISO(dateKey);
  const lifecycleByTask = new Map(lifecycles.map((item) => [item.taskId, item]));
  const completedFloatingByTask = new Map(checkIns.filter((item) => item.status === "done").map((item) => [item.taskId, item.date]));
  return tasks.filter((task) => {
    if (task.archived || !isEligibleForTimeBlock(task)) return false;
    const lifecycleState = lifecycleByTask.get(task.id)?.state;
    if (lifecycleState && ["paused", "completed", "archived"].includes(lifecycleState)) return false;
    if (isPausedOn(pauses.filter((item) => item.taskId === task.id), dateKey)) return false;
    if (task.schedule.mode === "fixed") return isFixedOccurrenceOn(task, date);
    if (task.schedule.mode === "floating") return isFloatingAvailableOn(task, date, completedFloatingByTask.get(task.id));
    return isQuotaAvailableOn(task, date);
  });
}

/**
 * Floating slice of availableWorkOn, for Today's discoverability affordance (Issue #19 / behavior
 * spec §7.5): "Available ≠ committed today" -- this only counts/links to what is already
 * derivable, it never inserts Floating work into Today's own list.
 */
export function availableFloatingWorkOn(dateKey: string, tasks: Task[], checkIns: CheckIn[], lifecycles: TaskLifecycle[], pauses: PausePeriod[]): Task[] {
  return availableWorkOn(dateKey, tasks, checkIns, lifecycles, pauses).filter((task) => task.schedule.mode === "floating");
}
