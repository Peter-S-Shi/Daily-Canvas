import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { todayKey } from "../lib/dates";
import { bulkChangeArea } from "../services/taskService";
import { getQuotaPeriod, getQuotaProgress } from "../services/quotaService";
import { TaskDetailPanel } from "./TaskDetailPanel";
import type { CheckIn, Task } from "../types";

interface TasksViewProps {
  selectedTaskId: string;
  onSelectTask: (taskId: string) => void;
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onInspectDate: (date: string) => void;
  onOpenLifecycle: () => void;
  selectedAreaId?: string;
}

export function TasksView({ selectedTaskId, selectedAreaId, onSelectTask, onCreateTask, onEditTask, onInspectDate, onOpenLifecycle }: TasksViewProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "starred" | "archived">("all");
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkArea, setBulkArea] = useState("");
  useEffect(() => { if (selectedAreaId) setAreaFilter(selectedAreaId); }, [selectedAreaId]);
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []) ?? [];
  const areas = useLiveQuery(() => db.areas.orderBy("sortOrder").toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const needle = query.trim().toLocaleLowerCase();
  const visible = tasks
    .filter((task) => (filter === "archived" ? task.archived : !task.archived && (filter !== "starred" || task.starred)) && (!areaFilter || task.areaId === areaFilter) && (!scheduleFilter || task.schedule.mode === scheduleFilter) && (!needle || task.title.toLocaleLowerCase().includes(needle)))
    .sort((a, b) => Number(b.starred) - Number(a.starred) || b.updatedAt.localeCompare(a.updatedAt));
  const selected = tasks.find((task) => task.id === selectedTaskId);

  /** Type-aware state grammar (Issue #17): "completed" is not one universal concept, so each Task kind gets its own compact, single-line state label. */
  const rowState = (task: Task, records: CheckIn[]): string => {
    if (task.schedule.mode === "quota") {
      const progress = getQuotaProgress(task, getQuotaPeriod(task.schedule, new Date(), settings?.weekStartsOn ?? 1), records);
      return `${progress.count}/${progress.target} ${t(task.schedule.period === "week" ? "thisWeek" : "thisMonth")}`;
    }
    if (task.kind !== "task") {
      const record = records.find((item) => item.date === todayKey());
      if (task.kind === "avoidance") return record?.status === "done" ? t("safe") : record?.status === "lapse" ? t("lapse") : record?.status === "skipped" ? t("skipped") : t("unrecorded");
      return record?.status === "done" ? t("done") : record?.status === "skipped" ? t("skipped") : t("unrecorded");
    }
    const completion = [...records].filter((item) => item.status === "done").sort((a, b) => a.date.localeCompare(b.date))[0];
    const parts = [task.schedule.mode === "floating" ? t("floatingTask") : undefined, completion ? t("completedOn", { date: completion.date }) : t("incomplete")];
    if ((task.checklist?.length ?? 0) > 0) parts.push(t("stepsProgress", { done: task.checklist!.filter((item) => item.completed).length, total: task.checklist!.length }));
    return parts.filter(Boolean).join(" · ");
  };
  const rowSummary = (task: Task) => {
    const area = areas.find((item) => item.id === task.areaId);
    const kind = t(task.kind === "task" ? "regularTask" : task.kind === "habit" ? "goodHabit" : "avoidanceHabit");
    const records = checkIns.filter((item) => item.taskId === task.id);
    return [area?.name ?? t("noArea"), kind, rowState(task, records)].filter(Boolean).join(" · ");
  };
  const toggleBulk = (taskId: string) => setBulkSelected((current) => { const next = new Set(current); if (next.has(taskId)) next.delete(taskId); else next.add(taskId); return next; });
  const closeSelection = () => { setSelecting(false); setBulkSelected(new Set()); setBulkArea(""); };
  const applyBulkArea = async () => { await bulkChangeArea([...bulkSelected], bulkArea || undefined); setBulkSelected(new Set()); setBulkArea(""); };
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
          {!selecting && <button type="button" className="link-button" onClick={() => setSelecting(true)}>{t("selectTasks")}</button>}
        </div>
        <div className="list-filters">
          <select aria-label={t("areas")} value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}><option value="">{t("allAreas")}</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
          <select aria-label={t("scheduleType")} value={scheduleFilter} onChange={(event) => setScheduleFilter(event.target.value)}><option value="">{t("allSchedules")}</option><option value="fixed">{t("fixedSchedule")}</option><option value="floating">{t("floatingTask")}</option><option value="quota">{t("quotaGoal")}</option></select>
        </div>
        {selecting && <div className="selection-bar bulk-actions" role="region" aria-label={t("selectTasks")}>
          <strong>{t("selectedCount", { count: bulkSelected.size })}</strong>
          <button type="button" className="button secondary" disabled={bulkSelected.size === visible.length} onClick={() => setBulkSelected(new Set(visible.map((task) => task.id)))}>{t("selectAllTasks")}</button>
          <button type="button" className="button secondary" disabled={bulkSelected.size === 0} onClick={() => setBulkSelected(new Set())}>{t("clearAllTasks")}</button>
          <label className="field inline-field"><span className="sr-only">{t("bulkChangeArea")}</span>
            <select value={bulkArea} onChange={(event) => setBulkArea(event.target.value)}><option value="">{t("chooseAreaPrompt")}</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
          </label>
          <button type="button" className="button primary" disabled={bulkSelected.size === 0} onClick={applyBulkArea}>{t("applyChangeArea")}</button>
          <button type="button" className="button secondary" onClick={closeSelection}>{t("cancelSelection")}</button>
        </div>}
        {visible.length === 0 ? <p className="list-empty">{t(needle ? "noMatchingTasks" : filter === "archived" ? "emptyArchived" : "emptyTasks")}</p> : (
          <div className="task-rows">
            {visible.map((task, index) => selecting ? (
              <div key={task.id} className={bulkSelected.has(task.id) ? "task-row selected" : "task-row"}>
                <label className="task-select"><input type="checkbox" checked={bulkSelected.has(task.id)} onChange={() => toggleBulk(task.id)} aria-label={t("selectTasks")}/></label>
                <span className="row-star" aria-hidden="true">{task.starred ? "★" : "☆"}</span>
                <button type="button" className="task-row-copy" onClick={() => onSelectTask(task.id)}><strong>{task.title}</strong><span className="item-sub">{rowSummary(task)}</span></button>
              </div>
            ) : (
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
