import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { todayKey } from "../lib/dates";
import { resolveTaskColor } from "../services/areaService";
import { setCheckIn } from "../services/checkInService";
import { saveDailyOrder } from "../services/dailyService";
import { getQuotaPeriod, getQuotaProgress, getQuotaStreak } from "../services/quotaService";
import { isQuotaAvailableOn, scheduledTasks } from "../services/scheduleService";
import { calculateTaskStats } from "../services/statisticsService";
import { isPausedOn } from "../services/pauseService";
import type { Area, CheckIn, PausePeriod, Task, TaskLifecycle } from "../types";
import { ExperienceModal } from "./ExperienceModal";
import { HeaderActions } from "./shell/WorkspaceHeader";

function TodayItem({ task, record, checkIns, pauses, lifecycle, areas, onOpen, onReflect }: { task: Task; record?: CheckIn; checkIns: CheckIn[]; pauses: PausePeriod[]; lifecycle?: TaskLifecycle; areas: Area[]; onOpen: () => void; onReflect: (task: Task) => void }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const stats = calculateTaskStats(task, checkIns, new Date(), pauses, lifecycle?.personalBest ?? 0);
  const area = areas.find((item) => item.id === task.areaId);
  const kind = t(task.kind === "task" ? "regularTask" : task.kind === "habit" ? "goodHabit" : "avoidanceHabit");
  const check = async (status?: CheckIn["status"]) => { await setCheckIn(task.id, todayKey(), status); if (status === "done" || status === "lapse") onReflect(task); };
  const done = record?.status === "done";
  return (
    <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .55 : 1, "--task-color": resolveTaskColor(task, areas) } as React.CSSProperties} className={`today-item ${record?.status ?? ""}`}>
      <button className="drag-handle" type="button" aria-label={t("dragHint")} {...attributes} {...listeners}>⋮⋮</button>
      {task.kind !== "avoidance" && <button type="button" className={done ? "round-check checked" : "round-check"} aria-label={done ? t("undo") : t("done")} aria-pressed={done} onClick={() => check(done ? undefined : "done")}>{done ? "✓" : ""}</button>}
      <button type="button" className="item-copy task-link" onClick={onOpen}>
        <span className="item-title">{task.starred && <span className="star" aria-label={t("starred")}>★ </span>}{task.title}</span>
        <span className="item-sub"><i className="area-dot" aria-hidden="true"/>{area ? `${area.name} · ${kind}` : kind}</span>
      </button>
      {stats.targetReached && <span className="pill milestone-pill">{t("targetReached")}</span>}
      <span className="streak-chip" title={t("currentStreak")}><span aria-hidden="true">↗</span>{stats.currentStreak}<span className="sr-only"> {t("currentStreak")}</span></span>
      {task.kind === "avoidance" && <div className="status-pair">
        <button type="button" className={record?.status === "done" ? "status-button success active" : "status-button success"} aria-pressed={record?.status === "done"} onClick={() => check(record?.status === "done" ? undefined : "done")}>{t("safeToday")}</button>
        <button type="button" className={record?.status === "lapse" ? "status-button danger active" : "status-button danger"} aria-pressed={record?.status === "lapse"} onClick={() => check(record?.status === "lapse" ? undefined : "lapse")}>{t("lapse")}</button>
      </div>}
      <button type="button" className={record?.status === "skipped" ? "skip-button active" : "skip-button"} aria-label={t("skip")} aria-pressed={record?.status === "skipped"} title={t("skip")} onClick={() => check(record?.status === "skipped" ? undefined : "skipped")}>—</button>
    </article>
  );
}

export function TodayView({ onCreateTask, onOpenTask, onOpenTimeline }: { onCreateTask: () => void; onOpenTask: (taskId: string) => void; onOpenTimeline: () => void }) {
  const { t, i18n } = useTranslation();
  const [experienceTask, setExperienceTask] = useState<Task>();
  const date = todayKey();
  const todaysBlocks = useLiveQuery(async () => (await db.timeBlocks.where("date").equals(date).toArray()).sort((a, b) => a.startMinutes - b.startMinutes), [date]) ?? [];
  const blockTasks = useLiveQuery(async () => db.tasks.bulkGet(todaysBlocks.map((block) => block.taskId)), [todaysBlocks.map((block) => block.taskId).join(",")]) ?? [];
  const rawTasks = useLiveQuery(async () => (await db.tasks.toArray()).filter((task) => !task.archived), []) ?? [];
  const lifecycles = useLiveQuery(() => db.taskLifecycles.toArray(), []) ?? [];
  const pauses = useLiveQuery(() => db.pausePeriods.toArray(), []) ?? [];
  const tasks = rawTasks.filter((task) => !["paused", "completed", "archived"].includes(lifecycles.find((item) => item.taskId === task.id)?.state ?? "") && !isPausedOn(pauses.filter((item) => item.taskId === task.id), date));
  const areas = useLiveQuery(() => db.areas.toArray(), []) ?? [];
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []) ?? [];
  const order = useLiveQuery(() => db.dailyOrders.get(date), [date]);
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const fixedTasks = useMemo(() => { const due = scheduledTasks(tasks, new Date()); const index = new Map((order?.taskIds ?? []).map((id, position) => [id, position])); return due.sort((a, b) => (index.get(a.id) ?? 9999) - (index.get(b.id) ?? 9999) || Number(b.starred) - Number(a.starred)); }, [tasks, order]);
  const quotas = tasks.filter((task) => task.schedule.mode === "quota" && isQuotaAvailableOn(task, new Date()));
  const todayRecords = new Map(checkIns.filter((item) => item.date === date).map((item) => [item.taskId, item]));
  const done = fixedTasks.filter((task) => todayRecords.get(task.id)?.status === "done").length;
  const progress = fixedTasks.length ? Math.round(done / fixedTasks.length * 100) : 0;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = async ({ active, over }: DragEndEvent) => { if (!over || active.id === over.id) return; const ids = fixedTasks.map((task) => task.id); await saveDailyOrder(date, arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))); };
  return (
    <div className="page page-narrow today-page">
      <HeaderActions><button type="button" className="button primary" onClick={onCreateTask}>＋ {t("newTask")}</button></HeaderActions>
      <p className="today-date">{new Intl.DateTimeFormat(i18n.language, { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p>
      <div className="today-heading"><h2 className="page-title">{t("today")}</h2><span className="muted">{t("completedCount", { done, total: fixedTasks.length })}</span></div>
      <div className="progress today-progress" role="progressbar" aria-label={t("todayProgress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }}/></div>
      <section aria-labelledby="fixed-today-heading">
        <div className="section-head"><h3 id="fixed-today-heading">{t("fixedToday")}</h3>{fixedTasks.length > 1 && <span className="section-hint">{t("dragHint")}</span>}</div>
        {fixedTasks.length === 0 ? <div className="empty-state"><p>{t("emptyToday")}</p></div> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={fixedTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}><div className="item-list">{fixedTasks.map((task) => <TodayItem key={task.id} task={task} record={todayRecords.get(task.id)} checkIns={checkIns.filter((item) => item.taskId === task.id)} pauses={pauses.filter((item) => item.taskId === task.id)} lifecycle={lifecycles.find((item) => item.taskId === task.id)} areas={areas} onOpen={() => onOpenTask(task.id)} onReflect={setExperienceTask}/>)}</div></SortableContext></DndContext>}
      </section>
      {todaysBlocks.length > 0 && <section aria-labelledby="todays-plan-heading" className="todays-plan">
        <div className="section-head"><h3 id="todays-plan-heading">{t("todaysPlan")}</h3><button type="button" className="button secondary compact" onClick={onOpenTimeline}>{t("openTimeline")}</button></div>
        <div className="item-list">{todaysBlocks.map((block, index) => { const task = blockTasks[index]; if (!task) return null; return <button type="button" key={block.id} className="item-copy plan-summary-row" onClick={onOpenTimeline}>
          <span className="item-title">{task.title}</span>
          <span className="item-sub">{String(Math.floor(block.startMinutes / 60)).padStart(2, "0")}:{String(block.startMinutes % 60).padStart(2, "0")}–{String(Math.floor((block.startMinutes + block.durationMinutes) / 60)).padStart(2, "0")}:{String((block.startMinutes + block.durationMinutes) % 60).padStart(2, "0")}</span>
        </button>; })}</div>
      </section>}
      {quotas.length > 0 && <section aria-labelledby="quota-today-heading">
        <div className="section-head"><h3 id="quota-today-heading">{t("quotaGoals")}</h3><span className="section-hint">{t("quotaTodayHint")}</span></div>
        <div className="quota-grid">{quotas.map((task) => {
          if (task.schedule.mode !== "quota") return null;
          const period = getQuotaPeriod(task.schedule, new Date(), settings?.weekStartsOn ?? 1);
          const records = checkIns.filter((item) => item.taskId === task.id);
          const quota = getQuotaProgress(task, period, records);
          const area = areas.find((item) => item.id === task.areaId);
          const checked = todayRecords.get(task.id)?.status === "done";
          const check = async () => { const status = checked ? undefined : "done"; await setCheckIn(task.id, date, status); if (status) setExperienceTask(task); };
          return (
            <article className="quota-card" key={task.id} style={{ "--task-color": resolveTaskColor(task, areas) } as React.CSSProperties}>
              <div className="quota-card-head">
                <button type="button" className="task-link" onClick={() => onOpenTask(task.id)}><strong>{task.title}</strong><span className="item-sub"><i className="area-dot" aria-hidden="true"/>{area?.name ?? t("noArea")}</span></button>
                <button type="button" className={checked ? "round-check checked" : "round-check"} aria-label={checked ? t("undo") : t("done")} aria-pressed={checked} onClick={check}>{checked ? "✓" : ""}</button>
              </div>
              <div className="quota-card-meta"><span><strong>{quota.count} / {quota.target}</strong> · {t(task.schedule.period === "week" ? "thisWeek" : "thisMonth")}</span><span title={t("periodStreak")}>↗ {getQuotaStreak(task, records, new Date(), settings?.weekStartsOn ?? 1, pauses.filter((item) => item.taskId === task.id))}<span className="sr-only"> {t("periodStreak")}</span></span></div>
              <div className="progress" role="progressbar" aria-label={task.title} aria-valuemin={0} aria-valuemax={quota.target} aria-valuenow={Math.min(quota.count, quota.target)}><i style={{ width: `${Math.min(100, quota.target ? quota.count / quota.target * 100 : 0)}%` }}/></div>
              <small className="muted">{quota.achieved ? t("quotaAchieved") : t("inProgress")}</small>
            </article>
          );
        })}</div>
      </section>}
      {experienceTask && <ExperienceModal task={experienceTask} date={date} onClose={() => setExperienceTask(undefined)}/>}
    </div>
  );
}
