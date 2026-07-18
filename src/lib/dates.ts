import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import type { CheckIn, Task } from "../types";

export const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");
export const todayKey = () => toDateKey(new Date());

export function isTaskScheduledOn(task: Task, date: Date): boolean {
  if (task.archived) return false;
  const day = startOfDay(date);
  const start = startOfDay(parseISO(task.startDate));
  if (isBefore(day, start)) return false;
  if (task.endDate && isAfter(day, startOfDay(parseISO(task.endDate)))) return false;

  switch (task.recurrence.type) {
    case "once":
      return differenceInCalendarDays(day, start) === 0;
    case "daily":
      return true;
    case "weekdays":
      return (task.recurrence.weekdays ?? []).includes(day.getDay());
    case "interval":
      return (
        differenceInCalendarDays(day, start) %
          Math.max(1, task.recurrence.intervalDays ?? 1) ===
        0
      );
  }
}

export function scheduledTasks(tasks: Task[], date: Date): Task[] {
  return tasks.filter((task) => isTaskScheduledOn(task, date));
}

export function isSuccessful(task: Task, checkIn?: CheckIn): boolean {
  if (!checkIn) return false;
  return task.kind === "avoidance"
    ? checkIn.status === "done"
    : checkIn.status === "done";
}

export interface TaskStats {
  currentStreak: number;
  longestStreak: number;
  completed: number;
  scheduled: number;
  completionRate: number;
  targetReached: boolean;
}

export function calculateTaskStats(
  task: Task,
  checkIns: CheckIn[],
  through = new Date(),
): TaskStats {
  const end = task.endDate && isBefore(parseISO(task.endDate), through)
    ? parseISO(task.endDate)
    : through;
  const start = parseISO(task.startDate);
  if (isAfter(start, end)) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      completed: 0,
      scheduled: 0,
      completionRate: 0,
      targetReached: false,
    };
  }

  const byDate = new Map(checkIns.map((item) => [item.date, item]));
  const scheduledDays = eachDayOfInterval({ start, end }).filter((date) =>
    isTaskScheduledOn({ ...task, archived: false }, date),
  );
  let currentStreak = 0;
  let runningStreak = 0;
  let longestStreak = 0;
  let completed = 0;
  let scheduled = 0;

  for (const date of scheduledDays) {
    const record = byDate.get(toDateKey(date));
    if (record?.status === "skipped") continue;
    scheduled += 1;
    if (isSuccessful(task, record)) {
      completed += 1;
      runningStreak += 1;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  }

  for (let index = scheduledDays.length - 1; index >= 0; index -= 1) {
    const record = byDate.get(toDateKey(scheduledDays[index]));
    if (record?.status === "skipped") continue;
    if (isSuccessful(task, record)) currentStreak += 1;
    else break;
  }

  return {
    currentStreak,
    longestStreak,
    completed,
    scheduled,
    completionRate: scheduled ? Math.round((completed / scheduled) * 100) : 0,
    targetReached: Boolean(task.targetDays && currentStreak >= task.targetDays),
  };
}

export function calendarDaysAround(start: Date, count = 35): Date[] {
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}
