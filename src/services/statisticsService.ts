import { eachDayOfInterval, format, isAfter, isBefore, parseISO } from "date-fns";
import { isFixedOccurrenceOn } from "./scheduleService";
import { getQuotaPeriod, getQuotaProgress, getQuotaStreak } from "./quotaService";
import type { CheckIn, Task } from "../types";

export interface TaskStats { currentStreak: number; longestStreak: number; completed: number; scheduled: number; completionRate: number; targetReached: boolean }

export function calculateTaskStats(task: Task, checkIns: CheckIn[], through = new Date()): TaskStats {
  if (task.schedule.mode === "floating") {
    const completion = checkIns.filter((item) => item.taskId === task.id && item.status === "done").sort((a, b) => a.date.localeCompare(b.date))[0];
    return { currentStreak: 0, longestStreak: 0, completed: completion ? 1 : 0, scheduled: 0, completionRate: completion ? 100 : 0, targetReached: Boolean(completion) };
  }
  if (task.schedule.mode === "quota") {
    const period = getQuotaPeriod(task.schedule, through, 1);
    const progress = getQuotaProgress(task, period, checkIns, through);
    const streak = getQuotaStreak(task, checkIns, through, 1);
    return { currentStreak: streak, longestStreak: streak, completed: progress.count, scheduled: progress.target, completionRate: Math.min(100, Math.round(progress.count / progress.target * 100)), targetReached: progress.achieved };
  }
  const end = task.endDate && isBefore(parseISO(task.endDate), through) ? parseISO(task.endDate) : through;
  const start = parseISO(task.startDate);
  if (isAfter(start, end)) return { currentStreak: 0, longestStreak: 0, completed: 0, scheduled: 0, completionRate: 0, targetReached: false };
  const byDate = new Map(checkIns.map((item) => [item.date, item]));
  const days = eachDayOfInterval({ start, end }).filter((date) => isFixedOccurrenceOn({ ...task, archived: false }, date));
  let currentStreak = 0, running = 0, longest = 0, completed = 0, scheduled = 0;
  for (const date of days) {
    const record = byDate.get(format(date, "yyyy-MM-dd"));
    if (record?.status === "skipped") continue;
    scheduled += 1;
    if (record?.status === "done") { completed += 1; running += 1; longest = Math.max(longest, running); } else running = 0;
  }
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const record = byDate.get(format(days[index], "yyyy-MM-dd"));
    if (record?.status === "skipped") continue;
    if (record?.status === "done") currentStreak += 1; else break;
  }
  return { currentStreak, longestStreak: longest, completed, scheduled, completionRate: scheduled ? Math.round(completed / scheduled * 100) : 0, targetReached: Boolean(task.targetDays && currentStreak >= task.targetDays) };
}
