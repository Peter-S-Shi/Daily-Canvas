import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { subDays } from "date-fns";
import { db } from "../db";
import { setCheckIn } from "../services/checkInService";
import { saveDailyOrder, saveJournal } from "../services/dailyService";
import { todayKey } from "../lib/dates";
import { scheduledTasks } from "../services/scheduleService";
import { calculateTaskStats } from "../services/statisticsService";
import type { CheckIn, Task } from "../types";

interface TodayViewProps {
  onEditTask: (task: Task) => void;
}

function SortableTaskCard({ task, record, checkIns, onEdit }: { task: Task; record?: CheckIn; checkIns: CheckIn[]; onEdit: () => void }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const stats = calculateTaskStats(task, checkIns);
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 };

  return (
    <article ref={setNodeRef} style={style} className={`task-card ${record?.status ?? ""}`}>
      <button className="drag-handle" type="button" aria-label={t("dragHint")} {...attributes} {...listeners}>⋮⋮</button>
      <span className="task-color" style={{ background: task.color }} />
      <button type="button" className="task-copy" onClick={onEdit}>
        <span className="task-title">{task.starred && <span className="star">★</span>}{task.title}</span>
        <span className="task-meta">{task.category || t(task.kind === "task" ? "regularTask" : task.kind === "habit" ? "goodHabit" : "avoidanceHabit")}</span>
      </button>
      <div className="streak-chip" title={t("currentStreak")}><span>↗</span>{stats.currentStreak}</div>
      <div className="check-actions">
        {task.kind === "avoidance" ? (
          <>
            <button type="button" className={record?.status === "done" ? "status-button success active" : "status-button success"} onClick={() => setCheckIn(task.id, todayKey(), record?.status === "done" ? undefined : "done")}>{t("safeToday")}</button>
            <button type="button" className={record?.status === "lapse" ? "status-button danger active" : "status-button danger"} onClick={() => setCheckIn(task.id, todayKey(), record?.status === "lapse" ? undefined : "lapse")}>{t("lapse")}</button>
          </>
        ) : (
          <button type="button" className={record?.status === "done" ? "round-check checked" : "round-check"} aria-label={record?.status === "done" ? t("undo") : t("done")} onClick={() => setCheckIn(task.id, todayKey(), record?.status === "done" ? undefined : "done")}>{record?.status === "done" ? "✓" : ""}</button>
        )}
        <button type="button" className={record?.status === "skipped" ? "more-button active" : "more-button"} onClick={() => setCheckIn(task.id, todayKey(), record?.status === "skipped" ? undefined : "skipped")} title={t("skip")}>—</button>
      </div>
      {stats.targetReached && <span className="milestone-badge">{t("targetReached")}</span>}
    </article>
  );
}

export function TodayView({ onEditTask }: TodayViewProps) {
  const { t, i18n } = useTranslation();
  const date = todayKey();
  const tasks = useLiveQuery(async () => (await db.tasks.toArray()).filter((task) => !task.archived), []) ?? [];
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []) ?? [];
  const order = useLiveQuery(() => db.dailyOrders.get(date), [date]);
  const journal = useLiveQuery(() => db.journalEntries.get(date), [date]);
  const todayTasks = useMemo(() => {
    const scheduled = scheduledTasks(tasks, new Date()).filter((task) => {
      if (!task.stopReminderAtTarget || !task.targetDays) return true;
      const priorRecords = checkIns.filter((item) => item.taskId === task.id);
      return !calculateTaskStats(task, priorRecords, subDays(new Date(), 1)).targetReached;
    });
    const index = new Map((order?.taskIds ?? []).map((id, position) => [id, position]));
    return scheduled.sort((a, b) => (index.get(a.id) ?? 9999) - (index.get(b.id) ?? 9999) || Number(b.starred) - Number(a.starred));
  }, [tasks, order, checkIns]);
  const todayRecords = new Map(checkIns.filter((item) => item.date === date).map((item) => [item.taskId, item]));
  const done = todayTasks.filter((task) => todayRecords.get(task.id)?.status === "done").length;
  const progress = todayTasks.length ? Math.round((done / todayTasks.length) * 100) : 0;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = todayTasks.map((task) => task.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    await saveDailyOrder(date, next);
  };

  return (
    <div className="view-stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow">{new Intl.DateTimeFormat(i18n.language, { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</span>
          <h1>{t("today")}</h1>
          <p>{t("appTagline")}</p>
        </div>
        <div className="progress-orbit" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{progress}%</strong><span>{t("todayProgress")}</span></div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading compact-heading">
          <div>
            <h2>{t("todayProgress")}</h2>
            <p>{t("completedCount", { done, total: todayTasks.length })}</p>
          </div>
          <span className="quiet-hint">{t("dragHint")}</span>
        </div>
        {todayTasks.length === 0 ? (
          <div className="empty-state"><span>☀</span><p>{t("emptyToday")}</p></div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={todayTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
              <div className="task-list">
                {todayTasks.map((task) => (
                  <SortableTaskCard key={task.id} task={task} record={todayRecords.get(task.id)} checkIns={checkIns.filter((item) => item.taskId === task.id)} onEdit={() => onEditTask(task)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <section className="panel journal-card">
        <div className="section-heading compact-heading">
          <div><h2>{t("journal")}</h2><p>{t("journalHint")}</p></div>
          <span className="character-count">{t("charsLeft", { count: 500 - Array.from(journal?.content ?? "").length })}</span>
        </div>
        <textarea value={journal?.content ?? ""} onChange={(event) => saveJournal(date, event.target.value)} maxLength={500} placeholder={t("journalHint")} />
      </section>
    </div>
  );
}
