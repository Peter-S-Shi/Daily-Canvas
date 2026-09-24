import { addDays, format } from "date-fns";
import type { CheckIn, Task } from "../types";
import { isFixedOccurrenceOn, scheduledTasks } from "../services/scheduleService";
import { calculateTaskStats, type TaskStats } from "../services/statisticsService";

export const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");
export const todayKey = () => toDateKey(new Date());
/** True only when `dateKey` is the actual real-world current day, never a stale/cached notion of "today" (Issue #20 current-time-line gating). */
export const isViewingToday = (dateKey: string, now: Date = new Date()): boolean => dateKey === toDateKey(now);
/** Minutes elapsed since local midnight, for positioning a current-time indicator on a day grid. */
export const minutesSinceMidnight = (now: Date = new Date()): number => now.getHours() * 60 + now.getMinutes();
export const isTaskScheduledOn = isFixedOccurrenceOn;
export { scheduledTasks, calculateTaskStats, type TaskStats };
export const isSuccessful = (_task: Task, checkIn?: CheckIn) => checkIn?.status === "done";
export const calendarDaysAround = (start: Date, count = 35): Date[] => Array.from({ length: count }, (_, index) => addDays(start, index));
