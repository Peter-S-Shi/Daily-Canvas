import { addDays, format } from "date-fns";
import type { CheckIn, Task } from "../types";
import { isFixedOccurrenceOn, scheduledTasks } from "../services/scheduleService";
import { calculateTaskStats, type TaskStats } from "../services/statisticsService";

export const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");
export const todayKey = () => toDateKey(new Date());
export const isTaskScheduledOn = isFixedOccurrenceOn;
export { scheduledTasks, calculateTaskStats, type TaskStats };
export const isSuccessful = (_task: Task, checkIn?: CheckIn) => checkIn?.status === "done";
export const calendarDaysAround = (start: Date, count = 35): Date[] => Array.from({ length: count }, (_, index) => addDays(start, index));
