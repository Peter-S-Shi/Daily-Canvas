import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import type { CheckIn, PausePeriod, QuotaSchedule, Task } from "../types";
import { effectivePauseStart } from "./pauseService";

export interface QuotaPeriod { start: string; end: string; period: "week" | "month" }
export interface QuotaProgress { count: number; target: number; achieved: boolean; provisional: boolean; outcome: "achieved" | "partial" | "not-achieved" }

const key = (date: Date) => format(date, "yyyy-MM-dd");

export function getQuotaPeriod(schedule: QuotaSchedule, date: Date, weekStartsOn: 0 | 1): QuotaPeriod {
  const start = schedule.period === "week" ? startOfWeek(date, { weekStartsOn }) : startOfMonth(date);
  const end = schedule.period === "week" ? endOfWeek(date, { weekStartsOn }) : endOfMonth(date);
  return { start: key(start), end: key(end), period: schedule.period };
}

export function getQuotaProgress(task: Task, period: QuotaPeriod, checkIns: CheckIn[], through = new Date()): QuotaProgress {
  if (task.schedule.mode !== "quota") throw new Error("Quota progress requires a quota task.");
  const uniqueDates = new Set(checkIns.filter((item) => item.taskId === task.id && item.status === "done" && item.date >= period.start && item.date <= period.end).map((item) => item.date));
  const count = uniqueDates.size;
  const achieved = count >= task.schedule.targetCount;
  const provisional = key(through) <= period.end;
  return { count, target: task.schedule.targetCount, achieved, provisional, outcome: achieved ? "achieved" : provisional ? "partial" : "not-achieved" };
}

export function getQuotaStreak(task: Task, checkIns: CheckIn[], through: Date, weekStartsOn: 0 | 1, pauses: PausePeriod[] = []): number {
  if (task.schedule.mode !== "quota") return 0;
  let cursor = through;
  let streak = 0;
  for (let guard = 0; guard < 600; guard += 1) {
    const period = getQuotaPeriod(task.schedule, cursor, weekStartsOn);
    const frozen = pauses.some((pause) => effectivePauseStart(pause) <= period.end && (!pause.endDate || pause.endDate >= period.start));
    if (frozen) { cursor = new Date(`${period.start}T12:00:00`); cursor.setDate(cursor.getDate() - 1); continue; }
    const progress = getQuotaProgress(task, period, checkIns, through);
    if (progress.provisional && !progress.achieved) {
      cursor = new Date(`${period.start}T12:00:00`); cursor.setDate(cursor.getDate() - 1); continue;
    }
    if (!progress.achieved) break;
    streak += 1;
    cursor = new Date(`${period.start}T12:00:00`); cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
