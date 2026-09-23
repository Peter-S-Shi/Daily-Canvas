import { differenceInCalendarDays, differenceInCalendarWeeks, format, getDaysInMonth, isAfter, isBefore, parseISO, startOfDay, startOfWeek } from "date-fns";
import type { Task } from "../types";

export function isFixedOccurrenceOn(task: Task, date: Date): boolean {
  if (task.archived || task.schedule.mode !== "fixed") return false;
  const day = startOfDay(date);
  const dayStr = format(day, "yyyy-MM-dd");
  if (dayStr < task.startDate) return false;
  if (task.endDate && dayStr > task.endDate) return false;

  let currentAnchor = task.startDate;

  if (task.replanHistory && task.replanHistory.length > 0) {
    const sorted = [...task.replanHistory].sort((a, b) => a.replannedAt.localeCompare(b.replannedAt));
    for (const h of sorted) {
      const replanDateStr = h.replannedAt.slice(0, 10);
      const nextStartStr = h.nextStartDate;
      if (dayStr < replanDateStr) {
        break;
      }
      if (dayStr < nextStartStr) {
        return false;
      }
      currentAnchor = nextStartStr;
    }
  } else if (task.replannedStartDate) {
    if (dayStr < task.replannedStartDate) {
      currentAnchor = task.startDate;
    } else {
      currentAnchor = task.replannedStartDate;
    }
  }

  const start = startOfDay(parseISO(currentAnchor));
  if (isBefore(day, start)) return false;
  const recurrence = task.schedule.recurrence;
  switch (recurrence.type) {
    case "once": return differenceInCalendarDays(day, start) === 0;
    case "daily": return true;
    case "weekdays": return (recurrence.weekdays ?? []).includes(day.getDay());
    case "interval": return differenceInCalendarDays(day, start) % Math.max(1, recurrence.intervalDays ?? 1) === 0;
    case "weeklyInterval": {
      const weeks = differenceInCalendarWeeks(startOfWeek(day), startOfWeek(start));
      return weeks % Math.max(1, recurrence.intervalWeeks ?? 1) === 0 && (recurrence.weekdays ?? []).includes(day.getDay());
    }
    case "monthlyDay": return day.getDate() === Math.min(Math.max(1, recurrence.dayOfMonth ?? 1), getDaysInMonth(day));
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
