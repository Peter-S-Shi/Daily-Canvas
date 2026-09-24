import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  max,
  min,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { getQuotaPeriod, getQuotaProgress, type QuotaPeriod } from "./quotaService";
import { isFixedOccurrenceOn } from "./scheduleService";
import type { Area, CheckIn, DailyReflection, EmotionDefinition, ExperienceLog, Language, Reward, Task, TaskKind } from "../types";

export interface DateRange { start: string; end: string }
export type ReviewPreset = "this-week" | "last-week" | "this-month" | "last-month" | "custom";
export interface ReviewFilters { areaId?: string; taskId?: string; taskKind?: TaskKind; scheduleMode?: Task["schedule"]["mode"] }
export interface ReviewSources {
  tasks: Task[]; areas: Area[]; checkIns: CheckIn[]; reflections: DailyReflection[];
  emotions: EmotionDefinition[]; experiences: ExperienceLog[]; rewards: Reward[];
}
export interface CompletedItem {
  recordId: string; taskId: string; title: string; date: string; areaId?: string; areaName?: string;
  scheduleMode: Task["schedule"]["mode"]; taskKind: TaskKind; note?: string;
}
export interface CompletionGroup { taskId: string; title: string; areaId?: string; areaName?: string; scheduleMode: Task["schedule"]["mode"]; taskKind: TaskKind; count: number; dates: string[] }
export interface QuotaFact { taskId: string; title: string; areaId?: string; period: QuotaPeriod; count: number; target: number; outcome: "achieved" | "partial" | "not-achieved"; provisional: boolean; sourceDates: string[] }
export interface ReviewModel {
  range: DateRange; completedItems: CompletedItem[]; completionGroups: CompletionGroup[];
  fixedCount: number; floatingCount: number; quotaCreditCount: number; activeDays: number;
  areaBreakdown: Array<{ areaId?: string; name: string; count: number }>;
  scheduleBreakdown: Array<{ mode: Task["schedule"]["mode"]; count: number }>;
  quotaFacts: QuotaFact[]; achievedQuotaPeriods: number;
  reflectionDates: string[]; emotionCounts: Array<{ emotionId: string; label: string; count: number }>;
  experienceCounts: Record<"easier" | "similar" | "harder", number>; experienceRecords: ExperienceLog[];
  rewardEvents: Array<{ id: string; title: string; date: string }>;
  summaryKeys: Array<"completion" | "floating" | "quota" | "areas" | "no-completion">;
}

const key = (date: Date) => format(date, "yyyy-MM-dd");
export function isValidRange(range: DateRange): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(range.start) && /^\d{4}-\d{2}-\d{2}$/.test(range.end) && range.start <= range.end; }

export function rangeForPreset(preset: Exclude<ReviewPreset, "custom">, today: Date, weekStartsOn: 0 | 1): DateRange {
  if (preset === "this-week") return { start: key(startOfWeek(today, { weekStartsOn })), end: key(endOfWeek(today, { weekStartsOn })) };
  if (preset === "last-week") { const date = subWeeks(today, 1); return { start: key(startOfWeek(date, { weekStartsOn })), end: key(endOfWeek(date, { weekStartsOn })) }; }
  if (preset === "this-month") return { start: key(startOfMonth(today)), end: key(endOfMonth(today)) };
  const date = subMonths(today, 1); return { start: key(startOfMonth(date)), end: key(endOfMonth(date)) };
}

function matches(task: Task, filters: ReviewFilters): boolean {
  return (!filters.areaId || task.areaId === filters.areaId) && (!filters.taskId || task.id === filters.taskId) &&
    (!filters.taskKind || task.kind === filters.taskKind) && (!filters.scheduleMode || task.schedule.mode === filters.scheduleMode);
}

function quotaPeriods(task: Task, range: DateRange, weekStartsOn: 0 | 1): QuotaPeriod[] {
  if (task.schedule.mode !== "quota") return [];
  const periods: QuotaPeriod[] = [];
  let cursor = parseISO(range.start);
  const seen = new Set<string>();
  while (!isAfter(cursor, parseISO(range.end))) {
    const period = getQuotaPeriod(task.schedule, cursor, weekStartsOn);
    if (!seen.has(period.start) && period.end >= task.schedule.availableFrom && (!task.schedule.optionalEndDate || period.start <= task.schedule.optionalEndDate)) { periods.push(period); seen.add(period.start); }
    cursor = task.schedule.period === "week" ? addWeeks(parseISO(period.start), 1) : addMonths(parseISO(period.start), 1);
  }
  return periods;
}

export function buildReviewModel(sources: ReviewSources, range: DateRange, filters: ReviewFilters = {}, weekStartsOn: 0 | 1 = 1, today = new Date()): ReviewModel {
  if (!isValidRange(range)) throw new Error("The review start date must be on or before the end date.");
  const tasks = sources.tasks.filter((task) => matches(task, filters));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const areaById = new Map(sources.areas.map((area) => [area.id, area]));
  const inRange = (date: string) => date >= range.start && date <= range.end;
  const completedItems = sources.checkIns.filter((record) => record.status === "done" && inRange(record.date) && taskById.has(record.taskId)).flatMap((record): CompletedItem[] => {
    const task = taskById.get(record.taskId)!;
    if (task.schedule.mode === "fixed" && !isFixedOccurrenceOn(task, parseISO(record.date))) return [];
    const area = task.areaId ? areaById.get(task.areaId) : undefined;
    if (task.schedule.mode === "floating") {
      const firstCompletion = sources.checkIns.filter((item) => item.taskId === task.id && item.status === "done").sort((a, b) => a.date.localeCompare(b.date))[0];
      if (firstCompletion?.id !== record.id) return [];
    }
    return [{ recordId: record.id, taskId: task.id, title: task.title, date: record.date, areaId: task.areaId, areaName: area?.name, scheduleMode: task.schedule.mode, taskKind: task.kind, note: record.note }];
  }).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  const grouped = new Map<string, CompletionGroup>();
  for (const item of completedItems) {
    const current = grouped.get(item.taskId) ?? { taskId: item.taskId, title: item.title, areaId: item.areaId, areaName: item.areaName, scheduleMode: item.scheduleMode, taskKind: item.taskKind, count: 0, dates: [] };
    current.count += 1; current.dates.push(item.date); grouped.set(item.taskId, current);
  }
  const areaCounts = new Map<string, { areaId?: string; name: string; count: number }>();
  for (const item of completedItems) { const id = item.areaId ?? "none"; const row = areaCounts.get(id) ?? { areaId: item.areaId, name: item.areaName ?? "No Area", count: 0 }; row.count += 1; areaCounts.set(id, row); }
  const todayKey = key(today);
  const quotaFacts = tasks.filter((task) => task.schedule.mode === "quota").flatMap((task) => quotaPeriods(task, range, weekStartsOn).filter((period) => todayKey >= period.start).map((period): QuotaFact => {
    const bounded: QuotaPeriod = { ...period, start: key(max([parseISO(period.start), parseISO(task.schedule.mode === "quota" ? task.schedule.availableFrom : period.start)])), end: key(min([parseISO(period.end), parseISO(task.schedule.mode === "quota" && task.schedule.optionalEndDate ? task.schedule.optionalEndDate : period.end)])) };
    const progress = getQuotaProgress(task, period, sources.checkIns, today);
    const sourceDates = sources.checkIns.filter((item) => item.taskId === task.id && item.status === "done" && item.date >= bounded.start && item.date <= bounded.end && inRange(item.date)).map((item) => item.date);
    return { taskId: task.id, title: task.title, areaId: task.areaId, period, count: progress.count, target: progress.target, outcome: progress.outcome, provisional: progress.provisional, sourceDates };
  })).filter((fact) => fact.period.end >= range.start && fact.period.start <= range.end);
  const reflectionDates = sources.reflections.filter((item) => inRange(item.date)).map((item) => item.date).sort();
  const emotionById = new Map(sources.emotions.map((item) => [item.id, item])); const emotionMap = new Map<string, number>();
  for (const reflection of sources.reflections.filter((item) => inRange(item.date))) for (const id of new Set(reflection.emotionIds)) emotionMap.set(id, (emotionMap.get(id) ?? 0) + 1);
  const emotionCounts = [...emotionMap].map(([emotionId, count]) => ({ emotionId, label: emotionById.get(emotionId)?.label ?? emotionId, count })).filter((item) => item.count >= 2).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const experienceRecords = sources.experiences.filter((item) => inRange(item.date) && taskById.has(item.taskId));
  const experienceCounts = { easier: 0, similar: 0, harder: 0 }; for (const item of experienceRecords) if (item.comparison) experienceCounts[item.comparison] += 1;
  const rewardEvents = sources.rewards.flatMap((reward) => { const date = reward.claimedAt?.slice(0, 10) ?? reward.rewardDate; return date && inRange(date) ? [{ id: reward.id, title: reward.title, date }] : []; });
  const fixedCount = completedItems.filter((item) => item.scheduleMode === "fixed").length;
  const floatingCount = completedItems.filter((item) => item.scheduleMode === "floating").length;
  const quotaCreditCount = completedItems.filter((item) => item.scheduleMode === "quota").length;
  const activeDays = new Set(completedItems.map((item) => item.date)).size;
  const areaBreakdown = [...areaCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const summaryKeys: ReviewModel["summaryKeys"] = completedItems.length ? ["completion"] : ["no-completion"];
  if (floatingCount) summaryKeys.push("floating");
  if (quotaFacts.some((item) => item.outcome === "achieved" && !item.provisional)) summaryKeys.push("quota");
  if (completedItems.length >= 2 && areaBreakdown.length >= 2) summaryKeys.push("areas");
  return { range, completedItems, completionGroups: [...grouped.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)), fixedCount, floatingCount, quotaCreditCount, activeDays, areaBreakdown, scheduleBreakdown: (["fixed", "floating", "quota"] as const).map((mode) => ({ mode, count: completedItems.filter((item) => item.scheduleMode === mode).length })), quotaFacts, achievedQuotaPeriods: quotaFacts.filter((item) => item.outcome === "achieved" && !item.provisional).length, reflectionDates, emotionCounts, experienceCounts, experienceRecords, rewardEvents, summaryKeys };
}

export function reviewSentences(model: ReviewModel, language: Language): string[] {
  const zh = language === "zh-CN"; const topAreas = model.areaBreakdown.slice(0, 2).map((item) => item.name).join(zh ? "、" : " and ");
  return model.summaryKeys.map((item) => {
    if (item === "completion") return zh ? `你在 ${model.activeDays} 个有记录的日期完成了 ${model.completedItems.length} 次行动。` : `You completed ${model.completedItems.length} ${model.completedItems.length === 1 ? "check-in" : "check-ins"} across ${model.activeDays} active ${model.activeDays === 1 ? "day" : "days"}.`;
    if (item === "floating") return zh ? `其中有 ${model.floatingCount} 个已完成的浮动任务。` : `You finished ${model.floatingCount} Floating ${model.floatingCount === 1 ? "Task" : "Tasks"}.`;
    if (item === "quota") return zh ? `${model.achievedQuotaPeriods} 个已结束的配额周期达到目标。` : `${model.achievedQuotaPeriods} completed quota ${model.achievedQuotaPeriods === 1 ? "period reached" : "periods reached"} the target.`;
    if (item === "areas") return zh ? `完成记录最多的领域是 ${topAreas}。` : `Most completed items belonged to ${topAreas}.`;
    return zh ? "这个区间没有已完成的行动记录。" : "No completed actions were recorded in this range.";
  });
}

export function reviewAsText(model: ReviewModel, language: Language): string {
  const zh = language === "zh-CN"; const lines = [zh ? `每日画布回顾：${model.range.start} 至 ${model.range.end}` : `Daily Canvas Review: ${model.range.start} to ${model.range.end}`, "", ...reviewSentences(model, language), "", zh ? "已完成" : "Completed"];
  for (const group of model.completionGroups) lines.push(`- ${group.title}: ${group.count} (${group.dates.join(", ")})`);
  return lines.join("\n");
}
