import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { resolveTaskColor } from "../services/areaService";
import { getQuotaPeriod, getQuotaProgress, getQuotaStreak } from "../services/quotaService";
import { calculateTaskStats } from "../services/statisticsService";
import { updateTask } from "../services/taskService";
import type { Schedule, Task } from "../types";

/**
 * Read-first Task Detail (frozen M9 behavior spec §8.3, §8.5): selecting a Task
 * shows readable state, and editing stays an explicit, separate action through
 * the existing Task Editor. Every value here is derived from the current v6
 * record set — no M11 field (notes, checklist, duration, reminder) is invented.
 */
export function TaskDetailPanel({ task, onEdit }: { task?: Task; onEdit: (task: Task) => void }) {
  const { t } = useTranslation();
  const data = useLiveQuery(async () => (task ? { checkIns: await db.checkIns.where("taskId").equals(task.id).toArray(), lifecycle: await db.taskLifecycles.get(task.id), pauses: await db.pausePeriods.where("taskId").equals(task.id).toArray(), areas: await db.areas.toArray(), settings: await db.settings.get("app") } : undefined), [task?.id]);
  if (!task) return <aside className="task-detail empty"><p>{t("selectTaskHint")}</p></aside>;
  if (!data) return <aside className="task-detail" aria-busy="true"/>;
  const weekStartsOn = data.settings?.weekStartsOn ?? 1;
  const stats = calculateTaskStats(task, data.checkIns, new Date(), data.pauses, data.lifecycle?.personalBest ?? 0, weekStartsOn);
  const area = data.areas.find((item) => item.id === task.areaId);
  const facts: Array<{ label: string; value: string }> = [{ label: t("scheduleSummary"), value: describeSchedule(task.schedule, t) }, { label: t("taskKind"), value: t(task.kind === "task" ? "regularTask" : task.kind === "habit" ? "goodHabit" : "avoidanceHabit") }, { label: t("areas"), value: area ? `${area.icon ?? ""} ${area.name}`.trim() : t("noArea") }, { label: t("startDate"), value: task.startDate }];
  if (task.schedule.mode === "quota") {
    const progress = getQuotaProgress(task, getQuotaPeriod(task.schedule, new Date(), weekStartsOn), data.checkIns);
    facts.push({ label: t(task.schedule.period === "week" ? "thisWeek" : "thisMonth"), value: `${progress.count}/${progress.target}` }, { label: t("periodStreak"), value: String(getQuotaStreak(task, data.checkIns, new Date(), weekStartsOn)) });
  } else if (task.schedule.mode === "floating") {
    facts.push({ label: t("completed"), value: String(stats.completed) }, { label: t("deadline"), value: task.schedule.optionalDeadline ?? "—" });
  } else {
    facts.push({ label: t("currentStreak"), value: String(stats.currentStreak) }, { label: t("completionRate"), value: `${stats.completionRate}%` });
  }
  facts.push({ label: t("totalCompleted"), value: String(stats.completed) }, { label: t("recordedDays"), value: String(data.checkIns.length) });
  return (
    <aside className="task-detail" style={{ "--task-color": resolveTaskColor(task, data.areas) } as React.CSSProperties}>
      <div className="detail-head">
        <div>
          <span className="eyebrow">{t("taskDetail")}</span>
          <h2>{task.title}</h2>
          <div className="detail-badges">
            <span className="kind-pill">{t(task.schedule.mode === "fixed" ? "fixedSchedule" : task.schedule.mode === "floating" ? "floatingTask" : "quotaGoal")}</span>
            {data.lifecycle && <span className={`lifecycle-state state-${data.lifecycle.state}`}>{t(`lifecycle_${data.lifecycle.state}`)}</span>}
            {task.archived && <span className="kind-pill">{t("archived")}</span>}
          </div>
        </div>
        <button type="button" className="button primary" onClick={() => onEdit(task)}>{t("editTask")}</button>
      </div>
      <dl className="detail-facts">{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
      <div className="detail-actions">
        <button type="button" className="button secondary" onClick={() => updateTask(task.id, { starred: !task.starred })}>{task.starred ? "★" : "☆"} {t("filterStarred")}</button>
        <button type="button" className="button secondary" onClick={() => updateTask(task.id, { archived: !task.archived })}>{task.archived ? t("restore") : t("archive")}</button>
      </div>
    </aside>
  );
}

function describeSchedule(schedule: Schedule, t: (key: string) => string): string {
  if (schedule.mode === "floating") return t("floatingTask");
  if (schedule.mode === "quota") return `${t("quotaGoal")} · ${schedule.targetCount} / ${t(schedule.period === "week" ? "thisWeek" : "thisMonth")}`;
  if (schedule.recurrence.type === "interval") return `${t("interval")} · ${schedule.recurrence.intervalDays ?? 1}`;
  if (schedule.recurrence.type === "once") return t("fixedSchedule");
  return t(schedule.recurrence.type === "daily" ? "daily" : "weekdays");
}
