import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { getQuotaPeriod, getQuotaProgress } from "../services/quotaService";
import { calculateTaskStats } from "../services/statisticsService";
import { TaskDetailPanel } from "./TaskDetailPanel";
import type { Task } from "../types";

interface TasksViewProps {
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onInspectDate: (date: string) => void;
  onOpenLifecycle: () => void;
}

export function TasksView({ selectedTaskId, onSelectTask, onCreateTask, onEditTask, onInspectDate, onOpenLifecycle }: TasksViewProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "starred" | "archived">("all");
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("");
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []) ?? [];
  const areas = useLiveQuery(() => db.areas.orderBy("sortOrder").toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const needle = query.trim().toLocaleLowerCase();
  const visible = tasks
    .filter((task) => (filter === "archived" ? task.archived : !task.archived && (filter !== "starred" || task.starred)) && (!areaFilter || task.areaId === areaFilter) && (!scheduleFilter || task.schedule.mode === scheduleFilter) && (!needle || task.title.toLocaleLowerCase().includes(needle)))
    .sort((a, b) => Number(b.starred) - Number(a.starred) || b.updatedAt.localeCompare(a.updatedAt));
  const selected = tasks.find((task) => task.id === selectedTaskId);
  const rowSummary = (task: Task) => {
    const area = areas.find((item) => item.id === task.areaId);
    const kind = t(task.kind === "task" ? "regularTask" : task.kind === "habit" ? "goodHabit" : "avoidanceHabit");
    const records = checkIns.filter((item) => item.taskId === task.id);
    let stat = "";
    if (task.schedule.mode === "quota") {
      const progress = getQuotaProgress(task, getQuotaPeriod(task.schedule, new Date(), settings?.weekStartsOn ?? 1), records);
      stat = `${progress.count}/${progress.target} ${t(task.schedule.period === "week" ? "thisWeek" : "thisMonth")}`;
    } else if (task.schedule.mode === "floating") {
      stat = t("floatingTask");
    } else if (task.kind !== "task") {
      const streak = calculateTaskStats(task, records).currentStreak;
      if (streak > 0) stat = t("streakDays", { count: streak });
    }
    return [area?.name ?? t("noArea"), kind, stat].filter(Boolean).join(" · ");
  };
  const moveFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const next = visible[index + offset];
    if (!next) return;
    onSelectTask(next.id);
    (event.currentTarget.parentElement?.children[index + offset] as HTMLElement | undefined)?.focus();
  };
  return (
    <div className="tasks-shell">
      <aside className="task-list-pane" aria-label={t("allTasks")}>
        <input className="filter-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("filterTasks")} aria-label={t("filterTasks")}/>
        <div className="mini-tabs">
          {(["all", "starred", "archived"] as const).map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>{t(item === "all" ? "filterAll" : item === "starred" ? "filterStarred" : "archived")}</button>)}
          <button type="button" className="link-button" onClick={onCreateTask}>＋ {t("newTask")}</button>
        </div>
        <div className="list-filters">
          <select aria-label={t("areas")} value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><option value="">{t("allAreas")}</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
          <select aria-label={t("scheduleType")} value={scheduleFilter} onChange={(event) => setScheduleFilter(event.target.value)}><option value="">{t("allSchedules")}</option><option value="fixed">{t("fixedSchedule")}</option><option value="floating">{t("floatingTask")}</option><option value="quota">{t("quotaGoal")}</option></select>
        </div>
        {visible.length === 0 ? <p className="list-empty">{t(needle ? "noMatchingTasks" : filter === "archived" ? "emptyArchived" : "emptyTasks")}</p> : (
          <div className="task-rows">
            {visible.map((task, index) => (
              <button type="button" key={task.id} className={task.id === selectedTaskId ? "task-row active" : "task-row"} aria-pressed={task.id === selectedTaskId} onClick={() => onSelectTask(task.id)} onKeyDown={(event) => moveFocus(event, index)}>
                <span className="row-star" aria-hidden="true">{task.starred ? "★" : "☆"}</span>
                <span className="task-row-copy"><strong>{task.title}</strong><span className="item-sub">{rowSummary(task)}</span></span>
              </button>
            ))}
          </div>
        )}
      </aside>
      <TaskDetailPanel task={selected} onEdit={onEditTask} onDeleted={() => onSelectTask("")} onInspectDate={onInspectDate} onOpenLifecycle={onOpenLifecycle}/>
    </div>
  );
}
