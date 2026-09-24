import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { resolveTaskColor } from "../services/areaService";
import { supportsLifecycle, targetFor } from "../services/lifecycleService";
import { getQuotaPeriod, getQuotaProgress, getQuotaStreak } from "../services/quotaService";
import { calculateTaskStats } from "../services/statisticsService";
import { addChecklistItem, deleteTask, removeChecklistItem, renameChecklistItem, updateTask } from "../services/taskService";
import { canReplanTask, replanTask } from "../services/replanService";
import { updateTimeBlock } from "../services/timeBlockService";
import { todayKey } from "../lib/dates";
import type { CheckIn, ReminderOffset, Task, TimeBlock } from "../types";

const reminderOptions: ReminderOffset[] = ["off", "at-start", "5", "10", "15", "30", "60"];

type DetailTab = "overview" | "schedule" | "checklist" | "notes" | "lifecycle" | "history";
const tabs: DetailTab[] = ["overview", "schedule", "checklist", "notes", "lifecycle", "history"];
const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

interface TaskDetailProps {
  task?: Task;
  onEdit: (task: Task) => void;
  onDeleted: () => void;
  onInspectDate: (date: string) => void;
  onOpenLifecycle: () => void;
}

/**
 * Read-first Task Detail (behavior spec §8.3-§8.6): readable state first, editing only through
 * the explicit Edit action. Local tabs are the M10 subset of the §8.4 target; Checklist, Notes,
 * and Reminder arrive with their milestones. Every value is derived from existing v6 records.
 */
export function TaskDetailPanel({ task, onEdit, onDeleted, onInspectDate, onOpenLifecycle }: TaskDetailProps) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<DetailTab>("overview");
  const [error, setError] = useState("");
  const [replanDate, setReplanDate] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [renamingItemId, setRenamingItemId] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  useEffect(() => { setTab("overview"); setError(""); setEditingNotes(false); setRenamingItemId(""); }, [task?.id]);
  const data = useLiveQuery(async () => (task ? { checkIns: await db.checkIns.where("taskId").equals(task.id).toArray(), lifecycle: await db.taskLifecycles.get(task.id), pauses: await db.pausePeriods.where("taskId").equals(task.id).toArray(), events: await db.milestoneEvents.where("taskId").equals(task.id).toArray(), areas: await db.areas.toArray(), settings: await db.settings.get("app"), futureBlocks: (await db.timeBlocks.where("taskId").equals(task.id).toArray()).filter((block) => block.date >= todayKey()).sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes) } : undefined), [task?.id]);
  if (!task) return <section className="task-detail-pane empty"><p>{t("selectTaskHint")}</p></section>;
  if (!data) return <section className="task-detail-pane" aria-busy="true"/>;

  const weekStartsOn = data.settings?.weekStartsOn ?? 1;
  const stats = calculateTaskStats(task, data.checkIns, new Date(), data.pauses, data.lifecycle?.personalBest ?? 0, weekStartsOn);
  const area = data.areas.find((item) => item.id === task.areaId);
  const kind = t(task.kind === "task" ? "regularTask" : task.kind === "habit" ? "goodHabit" : "avoidanceHabit");
  const mode = t(task.schedule.mode === "fixed" ? "fixedSchedule" : task.schedule.mode === "floating" ? "floatingTask" : "quotaGoal");
  const date = (value: string) => new Intl.DateTimeFormat(i18n.language, { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
  const statusLabel = (record: CheckIn) => record.status === "done" ? t(task.kind === "avoidance" ? "safe" : task.schedule.mode === "quota" ? "quotaCompletion" : "done") : t(record.status);

  let primary: { label: string; value: string };
  if (task.schedule.mode === "quota") {
    const progress = getQuotaProgress(task, getQuotaPeriod(task.schedule, new Date(), weekStartsOn), data.checkIns);
    primary = { label: t(task.schedule.period === "week" ? "thisWeek" : "thisMonth"), value: `${progress.count} / ${progress.target}` };
  } else if (task.schedule.mode === "floating") {
    primary = { label: t("deadline"), value: task.schedule.optionalDeadline ? date(task.schedule.optionalDeadline) : "—" };
  } else {
    primary = { label: t("currentStreak"), value: String(stats.currentStreak) };
  }

  const remove = async () => {
    if (!globalThis.confirm(t("deleteConfirm", { title: task.title }))) return;
    try { await deleteTask(task.id); onDeleted(); } catch { setError(t("deleteError")); }
  };
  const onTabKey = (event: React.KeyboardEvent) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const next = tabs[(tabs.indexOf(tab) + offset + tabs.length) % tabs.length];
    setTab(next);
    document.getElementById(`task-tab-${next}`)?.focus();
  };

  return (
    <section className="task-detail-pane" style={{ "--task-color": resolveTaskColor(task, data.areas) } as React.CSSProperties} aria-labelledby="task-detail-title">
      <div className="detail-head">
        <div>
          <h2 className="detail-title" id="task-detail-title">{task.starred && <span className="star" aria-label={t("starred")}>★ </span>}{task.title}</h2>
          <div className="pill-row">
            <span className="pill area-pill"><i className="area-dot" aria-hidden="true"/>{area ? `${area.icon ? `${area.icon} ` : ""}${area.name}` : t("noArea")}</span>
            <span className="pill">{kind}</span>
            <span className="pill">{mode}</span>
            {data.lifecycle && <span className={`pill lifecycle-state state-${data.lifecycle.state}`}>{t(`lifecycle_${data.lifecycle.state}`)}</span>}
            {task.archived && <span className="pill">{t("archived")}</span>}
          </div>
        </div>
        <button type="button" className="button secondary" onClick={() => onEdit(task)}>{t("edit")}</button>
      </div>

      <div className="detail-tabs" role="tablist" aria-label={t("taskDetail")}>
        {tabs.map((item) => <button type="button" role="tab" key={item} id={`task-tab-${item}`} aria-selected={tab === item} aria-controls="task-tab-panel" tabIndex={tab === item ? 0 : -1} className={tab === item ? "active" : ""} onClick={() => setTab(item)} onKeyDown={onTabKey}>{t(`detail_${item}`)}</button>)}
      </div>

      <div className="detail-panel" role="tabpanel" id="task-tab-panel" aria-labelledby={`task-tab-${tab}`}>
        {tab === "overview" && <>
          <div className="stats3">
            <div><div className="stat-label">{t("scheduleSummary")}</div><div>{describeSchedule(task, t)}</div></div>
            <div><div className="stat-label">{primary.label}</div><div>{primary.value}</div></div>
            <div><div className="stat-label">{t("totalCompleted")}</div><div>{stats.completed}</div></div>
            <div><div className="stat-label">{t("durationEstimate")}</div><div>{task.estimatedMinutes ? t("minutesEstimate", { count: task.estimatedMinutes }) : "—"}</div></div>
          </div>
          <dl className="fact-list">
            <div><dt>{t("startDate")}</dt><dd>{date(task.startDate)}</dd></div>
            <div><dt>{t("recordedDays")}</dt><dd>{data.checkIns.length}</dd></div>
            {task.schedule.mode === "fixed" && task.kind !== "task" && <div><dt>{t("completionRate")}</dt><dd>{stats.completionRate}%</dd></div>}
            {task.schedule.mode === "quota" && <div><dt>{t("periodStreak")}</dt><dd>{getQuotaStreak(task, data.checkIns, new Date(), weekStartsOn, data.pauses)}</dd></div>}
            {data.lifecycle && <div><dt>{t("personalBest")}</dt><dd>{data.lifecycle.personalBest}</dd></div>}
          </dl>
        </>}

        {tab === "schedule" && <dl className="fact-list">
          <div><dt>{t("scheduleType")}</dt><dd>{mode}</dd></div>
          <div><dt>{t("taskKind")}</dt><dd>{kind}</dd></div>
          {task.schedule.mode === "fixed" && <div><dt>{t("recurrence")}</dt><dd>{describeSchedule(task, t)}</dd></div>}
          <div><dt>{t(task.schedule.mode === "floating" ? "availableFrom" : "startDate")}</dt><dd>{date(task.schedule.mode === "fixed" ? task.startDate : task.schedule.availableFrom)}</dd></div>
          {task.schedule.mode === "fixed" && task.endDate && <div><dt>{t("endDate")}</dt><dd>{date(task.endDate)}</dd></div>}
          {task.schedule.mode === "floating" && <div><dt>{t("deadline")}</dt><dd>{task.schedule.optionalDeadline ? date(task.schedule.optionalDeadline) : "—"}</dd></div>}
          {task.schedule.mode === "quota" && <div><dt>{t("targetCount")}</dt><dd>{task.schedule.targetCount} · {t(task.schedule.period === "week" ? "weekly" : "monthly")}</dd></div>}
          {task.schedule.mode === "quota" && task.schedule.optionalEndDate && <div><dt>{t("endDate")}</dt><dd>{date(task.schedule.optionalEndDate)}</dd></div>}
          {supportsLifecycle(task) && <div><dt>{t(task.schedule.mode === "quota" ? "targetPeriods" : "targetDays")}</dt><dd>{targetFor(task)}</dd></div>}
          {canReplanTask(task, data.checkIns) && (
            <div className="replan-row"><dt>{t("replan")}</dt><dd><input type="date" min={todayKey()} value={replanDate} onChange={(event) => setReplanDate(event.target.value)}/><button type="button" className="button secondary" disabled={!replanDate} onClick={async () => { try { await replanTask(task.id, replanDate); setReplanDate(""); } catch { setError(t("saveError")); } }}>{t("replanFuture")}</button></dd></div>
          )}
        </dl>}

        {tab === "schedule" && data.futureBlocks.length > 0 && <div className="upcoming-blocks">
          <h3>{t("upcomingTimeBlocks")}</h3>
          <ul className="task-history">
            {data.futureBlocks.map((block: TimeBlock) => <li key={block.id}>
              <span>{date(block.date)} · {String(Math.floor(block.startMinutes / 60)).padStart(2, "0")}:{String(block.startMinutes % 60).padStart(2, "0")}</span>
              <label className="field inline-field"><span className="sr-only">{t("reminder")}</span>
                <select value={block.reminder} onChange={(event) => void updateTimeBlock(block.id, { reminder: event.target.value as ReminderOffset })}>{reminderOptions.map((option) => <option key={option} value={option}>{t(`reminder_${option}`)}</option>)}</select>
              </label>
            </li>)}
          </ul>
        </div>}

        {tab === "checklist" && <>
          {(task.checklist?.length ?? 0) === 0 ? <p className="muted">{t("noChecklistItems")}</p> : <ul className="checklist-list">{task.checklist!.map((item) => (
            <li key={item.id}>
              {renamingItemId === item.id ? (
                <form onSubmit={async (event) => { event.preventDefault(); try { await renameChecklistItem(task.id, item.id, renameDraft); setRenamingItemId(""); } catch (reason) { setError(reason instanceof Error ? reason.message : t("saveError")); } }}>
                  <input type="text" autoFocus value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} aria-label={t("renameChecklistItemLabel")}/>
                  <button type="submit" className="quiet-action">{t("save")}</button>
                  <button type="button" className="quiet-action" onClick={() => setRenamingItemId("")}>{t("cancel")}</button>
                </form>
              ) : (
                <>
                  <label><input type="checkbox" checked={item.completed} onChange={() => updateTask(task.id, { checklist: task.checklist!.map((value) => value.id === item.id ? { ...value, completed: !value.completed, updatedAt: new Date().toISOString() } : value) })}/><span className={item.completed ? "strike" : ""}>{item.title}</span></label>
                  <button type="button" className="quiet-action" onClick={() => { setRenamingItemId(item.id); setRenameDraft(item.title); }}>{t("edit")}</button>
                  <button type="button" className="quiet-action danger-text" onClick={() => removeChecklistItem(task.id, item.id)}>{t("deleteChecklistItem")}</button>
                </>
              )}
            </li>
          ))}</ul>}
          <form className="checklist-add" onSubmit={async (event) => { event.preventDefault(); if (!newChecklistTitle.trim()) return; try { await addChecklistItem(task.id, newChecklistTitle); setNewChecklistTitle(""); } catch (reason) { setError(reason instanceof Error ? reason.message : t("saveError")); } }}>
            <input type="text" value={newChecklistTitle} onChange={(event) => setNewChecklistTitle(event.target.value)} placeholder={t("newChecklistItemPlaceholder")} aria-label={t("addChecklistItem")}/>
            <button type="submit" className="button secondary compact" disabled={!newChecklistTitle.trim()}>{t("addChecklistItem")}</button>
          </form>
        </>}

        {tab === "notes" && <div className="task-notes">
          <h3>{t("taskNotes")}</h3>
          {editingNotes ? (
            <>
              <textarea rows={6} autoFocus value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} placeholder={t("notesPlaceholder")}/>
              <div className="form-actions">
                <button type="button" className="button secondary" onClick={() => setEditingNotes(false)}>{t("cancel")}</button>
                <button type="button" className="button primary" onClick={async () => { try { await updateTask(task.id, { notes: notesDraft.trim() || undefined }); setEditingNotes(false); } catch (reason) { setError(reason instanceof Error ? reason.message : t("saveError")); } }}>{t("saveNotes")}</button>
              </div>
            </>
          ) : (
            <>
              {task.notes ? <p>{task.notes}</p> : <p className="muted">{t("noTaskNotes")}</p>}
              <button type="button" className="button secondary compact notes-edit-toggle" onClick={() => { setNotesDraft(task.notes ?? ""); setEditingNotes(true); }}>{t("editNotes")}</button>
            </>
          )}
        </div>}

        {tab === "lifecycle" && (!supportsLifecycle(task) || !data.lifecycle ? <p className="muted">{t("lifecycleNotApplicable")}</p> : <>
          <dl className="fact-list">
            <div><dt>{t("habitLifecycle")}</dt><dd>{t(`lifecycle_${data.lifecycle.state}`)}</dd></div>
            <div><dt>{t("personalBest")}</dt><dd>{data.lifecycle.personalBest}</dd></div>
            <div><dt>{t("pastMilestones")}</dt><dd>{data.events.filter((item) => item.type === "target-reached").length}</dd></div>
            <div><dt>{t("pause")}</dt><dd>{data.pauses.length}</dd></div>
          </dl>
          <button type="button" className="button secondary" onClick={onOpenLifecycle}>{t("openLifecycle")}</button>
        </>)}

        {tab === "history" && (data.checkIns.length === 0 ? <p className="muted">{t("noHistoryYet")}</p> : <ul className="task-history">
          {[...data.checkIns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map((record) => <li key={record.id}><button type="button" className="history-date" onClick={() => onInspectDate(record.date)}>{date(record.date)}</button><span className={`status-text status-${record.status}`}>{statusLabel(record)}</span></li>)}
        </ul>)}
      </div>

      <div className="detail-footer">
        <button type="button" className="button text-button" onClick={() => updateTask(task.id, { starred: !task.starred })}>{task.starred ? t("unstar") : t("star")}</button>
        <button type="button" className="button text-button" onClick={() => updateTask(task.id, { archived: !task.archived })}>{task.archived ? t("restore") : t("archive")}</button>
        <button type="button" className="button text-button danger-text" onClick={remove}>{t("delete")}</button>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
    </section>
  );
}

function describeSchedule(task: Task, t: (key: string, options?: Record<string, unknown>) => string): string {
  const schedule = task.schedule;
  if (schedule.mode === "floating") return t("floatingTask");
  if (schedule.mode === "quota") return `${schedule.targetCount} / ${t(schedule.period === "week" ? "thisWeek" : "thisMonth")}`;
  if (schedule.recurrence.type === "once") return t("oneTime");
  if (schedule.recurrence.type === "daily") return t("daily");
  if (schedule.recurrence.type === "interval") return t("everyNDays", { count: schedule.recurrence.intervalDays ?? 1 });
  if (schedule.recurrence.type === "weeklyInterval") return t("everyNWeeks", { count: schedule.recurrence.intervalWeeks ?? 1, days: (schedule.recurrence.weekdays ?? []).map((day) => t(dayKeys[day])).join(" · ") });
  if (schedule.recurrence.type === "monthlyDay") return t("monthlyOnDay", { day: schedule.recurrence.dayOfMonth ?? 1 });
  return (schedule.recurrence.weekdays ?? []).map((day) => t(dayKeys[day])).join(" · ");
}
