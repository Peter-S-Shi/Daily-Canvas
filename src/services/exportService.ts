import i18n from "../i18n";
import { saveBlob } from "../desktop/desktopAdapter";
import { getReflectionTemplate } from "./reflectionTemplateService";
import { reviewSentences, type ReviewFilters, type ReviewModel } from "./reviewService";
import type { Area, DailyReflection, Language, Task } from "../types";

/** Areas/Tasks lookups needed only to resolve a Review filter's id into its current display name. */
export interface ExportNameLookup { areas: Pick<Area, "id" | "name">[]; tasks: Pick<Task, "id" | "title">[] }

/**
 * Local, derived Markdown export -- never mutates the source Reflection or Review data. Output is
 * a deterministic function of its inputs so the same record/period+filters always produces the
 * same document (covered by exportService.test.ts).
 */
export function reflectionToMarkdown(reflection: DailyReflection, language: Language): string {
  const zh = language === "zh-CN";
  const template = getReflectionTemplate(reflection.templateId);
  // Resolve the template's i18n key to a real, human-readable, current-language name -- never write
  // the internal key literal (e.g. `template_dailyCheckin`) into a user-facing exported file.
  const templateName = i18n.t(template.labelKey, { lng: language });
  const lines = [`# ${zh ? "每日回顾" : "Daily Reflection"} — ${reflection.date}`, ""];
  if (reflection.templateId && reflection.templateId !== "free") lines.push(`_${zh ? "模板" : "Template"}: ${templateName}_`, "");
  if (reflection.intensity !== undefined) lines.push(`${zh ? "整体感受强度" : "Overall intensity"}: ${reflection.intensity} / 5`, "");
  lines.push(reflection.note || (zh ? "（未填写文字）" : "(no written text)"));
  return lines.join("\n");
}

export async function exportReflection(reflection: DailyReflection, language: Language): Promise<boolean> {
  return saveBlob(new Blob([reflectionToMarkdown(reflection, language)], { type: "text/markdown" }), `daily-canvas-reflection-${reflection.date}.md`);
}

export function reviewToMarkdown(model: ReviewModel, filters: ReviewFilters, language: Language, names: ExportNameLookup): string {
  const zh = language === "zh-CN";
  const lines = [`# ${zh ? "每日画布回顾" : "Daily Canvas Review"}`, "", `${zh ? "区间" : "Period"}: ${model.range.start} — ${model.range.end}`];
  const filterParts: string[] = [];
  // Filter metadata must only ever show a resolved, human-readable name -- never the raw internal
  // id. If the id cannot be resolved (e.g. a dangling reference to a deleted Area/Task), the line is
  // omitted entirely rather than falling back to printing the id.
  if (filters.areaId) { const name = names.areas.find((area) => area.id === filters.areaId)?.name; if (name) filterParts.push(`${zh ? "领域" : "Area"}: ${name}`); }
  if (filters.taskId) { const title = names.tasks.find((task) => task.id === filters.taskId)?.title; if (title) filterParts.push(`${zh ? "任务" : "Task"}: ${title}`); }
  if (filters.taskKind) filterParts.push(`${zh ? "类型" : "Kind"}: ${filters.taskKind}`);
  if (filters.scheduleMode) filterParts.push(`${zh ? "计划方式" : "Schedule"}: ${filters.scheduleMode}`);
  if (filterParts.length) lines.push(`${zh ? "筛选" : "Filters"}: ${filterParts.join(", ")}`);
  lines.push("", `## ${zh ? "摘要" : "Summary"}`, "", ...reviewSentences(model, language).map((sentence) => `- ${sentence}`));
  lines.push("", `## ${zh ? "已完成" : "Completed"}`, "");
  if (!model.completionGroups.length) lines.push(zh ? "这个区间没有已完成的事项。" : "No completed work was recorded in this range.");
  for (const group of model.completionGroups) lines.push(`- ${group.title}: ${group.count} (${group.dates.join(", ")})`);
  return lines.join("\n");
}

export async function exportReview(model: ReviewModel, filters: ReviewFilters, language: Language, names: ExportNameLookup): Promise<boolean> {
  return saveBlob(new Blob([reviewToMarkdown(model, filters, language, names)], { type: "text/markdown" }), `daily-canvas-review-${model.range.start}-to-${model.range.end}.md`);
}
