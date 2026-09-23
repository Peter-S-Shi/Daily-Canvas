import { addDays, parseISO, startOfWeek } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../db";
import { toDateKey, todayKey } from "../../lib/dates";
import { resolveTaskColor } from "../../services/areaService";
import { availableWorkOn } from "../../services/availableWorkService";
import { updateTimeBlock } from "../../services/timeBlockService";
import type { Task, TimeBlock } from "../../types";
import { HeaderActions } from "../shell/WorkspaceHeader";
import { TaskPickerDialog } from "./TaskPickerDialog";
import { TimeBlockDialog } from "./TimeBlockDialog";

type Mode = "day" | "week";
// The grid spans the full domain-legal 00:00-24:00 day: a Time Block may be placed anywhere in
// that range, so the Day view must never clip a normally-created early-morning/late-night block.
const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const DEFAULT_SCROLL_HOUR = 6;
const ROW_MINUTES = 15;
const ROW_HEIGHT_PX = 16;
const timeLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function TimelineView({ weekStartsOn, initialDate = todayKey(), onOpenTask }: { weekStartsOn: 0 | 1; initialDate?: string; onOpenTask: (taskId: string) => void }) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<Mode>("day");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const dayGridRef = useRef<HTMLDivElement>(null);
  // The full day is rendered so every legal block stays visible; scroll to a conventional working-hour start by default (convenience only, never a domain restriction).
  useEffect(() => { dayGridRef.current?.scrollTo({ top: DEFAULT_SCROLL_HOUR * (60 / ROW_MINUTES) * ROW_HEIGHT_PX }); }, [selectedDate, mode]);
  const [editingBlock, setEditingBlock] = useState<TimeBlock>();
  const [scheduling, setScheduling] = useState<{ task: Task; date: string; startMinutes?: number }>();
  const [pickerDate, setPickerDate] = useState<string>();
  const [dragError, setDragError] = useState("");

  const data = useLiveQuery(async () => ({ tasks: await db.tasks.toArray(), areas: await db.areas.toArray(), checkIns: await db.checkIns.toArray(), lifecycles: await db.taskLifecycles.toArray(), pauses: await db.pausePeriods.toArray(), timeBlocks: await db.timeBlocks.toArray() }), []) ?? { tasks: [], areas: [], checkIns: [], lifecycles: [], pauses: [], timeBlocks: [] };
  const taskById = new Map(data.tasks.map((task) => [task.id, task]));
  const blocksOn = (date: string) => data.timeBlocks.filter((block) => block.date === date).sort((a, b) => a.startMinutes - b.startMinutes);
  const availableWork = (date: string) => availableWorkOn(date, data.tasks, data.checkIns, data.lifecycles, data.pauses);

  const moveBlock = async (blockId: string, changes: { date?: string; startMinutes?: number }) => {
    try { setDragError(""); await updateTimeBlock(blockId, changes); } catch (err) { setDragError(err instanceof Error ? err.message : String(err)); }
  };

  const weekStart = startOfWeek(parseISO(selectedDate), { weekStartsOn });
  const weekDays = Array.from({ length: 7 }, (_, index) => toDateKey(addDays(weekStart, index)));
  const rows = Array.from({ length: ((DAY_END_HOUR - DAY_START_HOUR) * 60) / ROW_MINUTES }, (_, index) => DAY_START_HOUR * 60 + index * ROW_MINUTES);

  const BlockChip = ({ block }: { block: TimeBlock }) => {
    const task = taskById.get(block.taskId);
    if (!task) return null;
    return <button type="button" draggable className={`time-block-chip ${block.needsReview ? "needs-review" : ""}`} style={{ "--task-color": resolveTaskColor(task, data.areas) } as React.CSSProperties}
      onDragStart={(event) => event.dataTransfer.setData("text/time-block-id", block.id)}
      onClick={() => setEditingBlock(block)}>
      <strong>{task.title}</strong><span>{timeLabel(block.startMinutes)}–{timeLabel(block.startMinutes + block.durationMinutes)}</span>
      {block.needsReview && <span className="pill pill-warning compact">{t("blockNeedsReview")}</span>}
    </button>;
  };

  return (
    <div className="page timeline-page">
      <HeaderActions>
        <div className="segmented compact-segmented" role="group" aria-label={t("timelineModeLabel")}>
          {(["day", "week"] as Mode[]).map((item) => <button type="button" key={item} className={mode === item ? "active" : ""} aria-pressed={mode === item} onClick={() => setMode(item)}>{t(`timelineMode_${item}`)}</button>)}
        </div>
      </HeaderActions>
      <div className="page-intro"><h2 className="page-title">{t("timeline")}</h2><p className="muted">{t("timelineHint")}</p></div>
      {dragError && <p className="error-message" role="alert">{dragError}</p>}

      {mode === "day" && <div className="timeline-day-layout">
        <section className="panel timeline-grid-panel" aria-labelledby="timeline-day-heading">
          <div className="panel-head">
            <h3 id="timeline-day-heading">{new Intl.DateTimeFormat(i18n.language, { weekday: "long", month: "long", day: "numeric" }).format(parseISO(selectedDate))}</h3>
            <div className="month-controls">
              <button type="button" className="icon-button" aria-label={t("previousDay")} onClick={() => setSelectedDate(toDateKey(addDays(parseISO(selectedDate), -1)))}>‹</button>
              <button type="button" className="button secondary compact" onClick={() => setSelectedDate(todayKey())}>{t("today")}</button>
              <button type="button" className="icon-button" aria-label={t("nextDay")} onClick={() => setSelectedDate(toDateKey(addDays(parseISO(selectedDate), 1)))}>›</button>
            </div>
          </div>
          <div className="timeline-day-grid" ref={dayGridRef}>
            <div className="timeline-day-grid-inner" style={{ height: rows.length * ROW_HEIGHT_PX }}>
              {rows.map((minutes) => <div key={minutes} className={`timeline-row ${minutes % 60 === 0 ? "hour-row" : ""}`} style={{ height: ROW_HEIGHT_PX }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { const id = event.dataTransfer.getData("text/time-block-id"); if (id) void moveBlock(id, { date: selectedDate, startMinutes: minutes }); }}>
                {minutes % 60 === 0 && <span className="timeline-hour-label">{timeLabel(minutes)}</span>}
              </div>)}
              {blocksOn(selectedDate).map((block) => <div key={block.id} className="timeline-block-position" style={{ top: (block.startMinutes - DAY_START_HOUR * 60) / ROW_MINUTES * ROW_HEIGHT_PX, height: block.durationMinutes / ROW_MINUTES * ROW_HEIGHT_PX }}><BlockChip block={block} /></div>)}
            </div>
          </div>
        </section>
        <section className="panel available-work-panel" aria-labelledby="available-work-heading">
          <h3 id="available-work-heading">{t("availableWork")}</h3>
          <p className="muted small">{t("availableWorkHint")}</p>
          {availableWork(selectedDate).length === 0 ? <div className="empty-state"><p>{t("noAvailableWork")}</p></div> : <div className="item-list">
            {availableWork(selectedDate).map((task) => <article key={task.id} className="item-copy" style={{ "--task-color": resolveTaskColor(task, data.areas) } as React.CSSProperties}>
              <button type="button" className="task-link" onClick={() => onOpenTask(task.id)}><span className="item-title"><i className="area-dot" aria-hidden="true" />{task.title}</span></button>
              <button type="button" className="button secondary compact" onClick={() => setScheduling({ task, date: selectedDate })}>{t("scheduleAction")}</button>
            </article>)}
          </div>}
        </section>
      </div>}

      {mode === "week" && <div className="timeline-week-grid">
        {weekDays.map((date) => <section className="panel timeline-week-day" key={date} aria-label={date}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { const id = event.dataTransfer.getData("text/time-block-id"); if (id) void moveBlock(id, { date }); }}>
          <div className="panel-head"><h4>{new Intl.DateTimeFormat(i18n.language, { weekday: "short", month: "short", day: "numeric" }).format(parseISO(date))}</h4><button type="button" className="icon-button" aria-label={t("scheduleAction")} onClick={() => setPickerDate(date)}>＋</button></div>
          {blocksOn(date).length === 0 ? <p className="muted small">{t("emptyDay")}</p> : <div className="week-block-list">{blocksOn(date).map((block) => <BlockChip key={block.id} block={block} />)}</div>}
        </section>)}
      </div>}

      {editingBlock && taskById.get(editingBlock.taskId) && <TimeBlockDialog task={taskById.get(editingBlock.taskId)!} block={editingBlock} defaultDate={editingBlock.date} onClose={() => setEditingBlock(undefined)} onSaved={() => setEditingBlock(undefined)} />}
      {scheduling && <TimeBlockDialog task={scheduling.task} defaultDate={scheduling.date} defaultStartMinutes={scheduling.startMinutes} onClose={() => setScheduling(undefined)} onSaved={() => setScheduling(undefined)} />}
      {pickerDate && <TaskPickerDialog date={pickerDate} tasks={availableWork(pickerDate)} areas={data.areas} onClose={() => setPickerDate(undefined)} onPick={(task) => { setScheduling({ task, date: pickerDate }); setPickerDate(undefined); }} />}
    </div>
  );
}
