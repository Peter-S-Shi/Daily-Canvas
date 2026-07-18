import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { db, setCheckIn } from "../db";
import { calculateTaskStats, isTaskScheduledOn, scheduledTasks, toDateKey, todayKey } from "../lib/dates";

export function CalendarView() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [focusTaskId, setFocusTaskId] = useState("");
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []) ?? [];
  const activeTasks = tasks.filter((task) => !task.archived);
  const focusTask = activeTasks.find((task) => task.id === focusTaskId) ?? activeTasks.find((task) => task.kind !== "task") ?? activeTasks[0];
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const last = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: first, end: last });
  const recordsByKey = useMemo(() => new Map(checkIns.map((item) => [`${item.taskId}:${item.date}`, item])), [checkIns]);
  const dateTasks = scheduledTasks(activeTasks, parseISO(selectedDate));
  const selectedIsFuture = selectedDate > todayKey();
  const stats = focusTask ? calculateTaskStats(focusTask, checkIns.filter((item) => item.taskId === focusTask.id)) : null;
  const heatDays = eachDayOfInterval({ start: subDays(new Date(), 111), end: new Date() });
  const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  const cellState = (date: Date) => {
    const dateKey = toDateKey(date);
    const due = scheduledTasks(activeTasks, date);
    const success = due.filter((task) => recordsByKey.get(`${task.id}:${dateKey}`)?.status === "done").length;
    const lapses = due.filter((task) => recordsByKey.get(`${task.id}:${dateKey}`)?.status === "lapse").length;
    const ratio = due.length ? success / due.length : 0;
    return { due: due.length, success, lapses, ratio };
  };

  return (
    <div className="view-stack">
      <section className="panel calendar-panel">
        <div className="section-heading">
          <div><span className="eyebrow">{t("calendar")}</span><h1>{new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(month)}</h1><p>{t("calendarHint")}</p></div>
          <div className="month-controls">
            <button type="button" className="icon-button" onClick={() => setMonth(addMonths(month, -1))} aria-label={t("monthPrevious")}>‹</button>
            <button type="button" className="icon-button" onClick={() => setMonth(addMonths(month, 1))} aria-label={t("monthNext")}>›</button>
          </div>
        </div>
        <div className="calendar-grid weekday-row">
          {weekdays.map((key) => <span key={key}>{t(key)}</span>)}
        </div>
        <div className="calendar-grid month-grid">
          {monthDays.map((date) => {
            const key = toDateKey(date);
            const state = cellState(date);
            const intensity = state.ratio === 0 ? 0 : Math.max(0.2, state.ratio);
            return (
              <button
                type="button"
                key={key}
                className={`calendar-cell ${!isSameMonth(date, month) ? "outside" : ""} ${key === selectedDate ? "selected" : ""} ${key === todayKey() ? "today-cell" : ""}`}
                onClick={() => setSelectedDate(key)}
                style={{ "--cell-intensity": intensity } as React.CSSProperties}
              >
                <span>{format(date, "d")}</span>
                {state.due > 0 && <div className="cell-color"><i />{state.lapses > 0 && <b />}</div>}
                <small>{state.due ? `${state.success}/${state.due}` : ""}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel history-editor">
        <div className="section-heading compact-heading">
          <div><h2>{t("selectedDate", { date: new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric", year: "numeric" }).format(parseISO(selectedDate)) })}</h2><p>{isAfter(parseISO(selectedDate), new Date()) ? "" : t("calendarHint")}</p></div>
        </div>
        {dateTasks.length === 0 ? <div className="empty-state small"><p>{t("noTasksOnDate")}</p></div> : (
          <div className="history-list">
            {dateTasks.map((task) => {
              const record = recordsByKey.get(`${task.id}:${selectedDate}`);
              return (
                <div className="history-row" key={task.id}>
                  <span className="task-color" style={{ background: task.color }} />
                  <div><strong>{task.title}</strong><span>{record?.status ? t(record.status === "done" && task.kind === "avoidance" ? "safe" : record.status === "done" ? "done" : record.status === "lapse" ? "lapse" : "skipped") : t("unrecorded")}</span></div>
                  <div className="history-actions">
                    <button disabled={selectedIsFuture} type="button" className={record?.status === "done" ? "active" : ""} onClick={() => setCheckIn(task.id, selectedDate, record?.status === "done" ? undefined : "done")}>{task.kind === "avoidance" ? t("safe") : t("done")}</button>
                    {task.kind === "avoidance" && <button disabled={selectedIsFuture} type="button" className={record?.status === "lapse" ? "danger active" : "danger"} onClick={() => setCheckIn(task.id, selectedDate, record?.status === "lapse" ? undefined : "lapse")}>{t("lapse")}</button>}
                    <button disabled={selectedIsFuture} type="button" className={record?.status === "skipped" ? "active" : ""} onClick={() => setCheckIn(task.id, selectedDate, record?.status === "skipped" ? undefined : "skipped")}>{t("skip")}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel heatmap-panel">
        <div className="section-heading compact-heading">
          <div><h2>{focusTask?.title ?? t("tasks")}</h2><p>{t("completionRate")}</p></div>
          <select value={focusTask?.id ?? ""} onChange={(event) => setFocusTaskId(event.target.value)}>
            {activeTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </select>
        </div>
        {focusTask && stats ? (
          <>
            <div className="stats-strip">
              <div><strong>{stats.currentStreak}</strong><span>{t("currentStreak")}</span></div>
              <div><strong>{stats.longestStreak}</strong><span>{t("longestStreak")}</span></div>
              <div><strong>{stats.completionRate}%</strong><span>{t("completionRate")}</span></div>
            </div>
            <div className="heatmap" aria-label={focusTask.title}>
              {heatDays.map((date) => {
                const key = toDateKey(date);
                const scheduled = isTaskScheduledOn(focusTask, date);
                const status = recordsByKey.get(`${focusTask.id}:${key}`)?.status;
                const className = !scheduled ? "not-due" : status === "done" ? "heat-done" : status === "lapse" ? "heat-lapse" : status === "skipped" ? "heat-skip" : isAfter(date, new Date()) ? "not-due" : "heat-missed";
                return <button type="button" key={key} className={`heat-cell ${className}`} style={{ "--task-color": focusTask.color } as React.CSSProperties} title={`${key}: ${status ?? t("unrecorded")}`} onClick={() => { setSelectedDate(key); setMonth(startOfMonth(date)); }} />;
              })}
            </div>
          </>
        ) : <div className="empty-state small"><p>{t("noTasksOnDate")}</p></div>}
      </section>
    </div>
  );
}
