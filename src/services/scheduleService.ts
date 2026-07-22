import { differenceInCalendarDays, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import type { Task } from "../types";

export function isFixedOccurrenceOn(task: Task, date: Date): boolean {
  if (task.archived || task.schedule.mode !== "fixed") return false;
  const day = startOfDay(date);
  const start = startOfDay(parseISO(task.startDate));
  if (isBefore(day, start) || (task.endDate && isAfter(day, startOfDay(parseISO(task.endDate))))) return false;
  const recurrence = task.schedule.recurrence;
  switch (recurrence.type) {
    case "once": return differenceInCalendarDays(day, start) === 0;
    case "daily": return true;
    case "weekdays": return (recurrence.weekdays ?? []).includes(day.getDay());
    case "interval": return differenceInCalendarDays(day, start) % Math.max(1, recurrence.intervalDays ?? 1) === 0;
  }
}

export const isTaskScheduledOn = isFixedOccurrenceOn;
export const scheduledTasks = (tasks: Task[], date: Date) => tasks.filter((task) => isFixedOccurrenceOn(task, date));

export function isFloatingAvailableOn(task: Task, date: Date, completedDate?: string): boolean {
  if (task.archived || task.schedule.mode !== "floating" || completedDate) return false;
  return !isBefore(startOfDay(date), startOfDay(parseISO(task.schedule.availableFrom)));
}

export function isFloatingOverdue(task: Task, date: Date, completedDate?: string): boolean {
  return task.schedule.mode === "floating" && !completedDate && Boolean(task.schedule.optionalDeadline && isAfter(startOfDay(date), startOfDay(parseISO(task.schedule.optionalDeadline))));
}

export function isQuotaAvailableOn(task: Task, date: Date): boolean {
  if (task.archived || task.schedule.mode !== "quota") return false;
  const day = startOfDay(date);
  if (isBefore(day, startOfDay(parseISO(task.schedule.availableFrom)))) return false;
  return !task.schedule.optionalEndDate || !isAfter(day, startOfDay(parseISO(task.schedule.optionalEndDate)));
}
