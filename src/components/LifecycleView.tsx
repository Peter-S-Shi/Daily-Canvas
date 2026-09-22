import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { todayKey } from "../lib/dates";
import { addPause, recordRecoveryChoice, resumeTask, supportsLifecycle, targetFor } from "../services/lifecycleService";
import { calculateTaskStats } from "../services/statisticsService";
import type { PauseType, Task } from "../types";
import { Dialog, DialogHeader } from "./Dialog";

export function LifecycleView({ onEdit, onOpenTask }: { onEdit: (task: Task) => void; onOpenTask: (taskId: string) => void }) {
  const { t } = useTranslation();
  const [pauseTask, setPauseTask] = useState<string>(); const [pauseType, setPauseType] = useState<PauseType>("planned-break"); const [start, setStart] = useState(todayKey()); const [end, setEnd] = useState("");
  const data = useLiveQuery(async () => ({ tasks: await db.tasks.toArray(), lifecycles: await db.taskLifecycles.toArray(), pauses: await db.pausePeriods.toArray(), events: await db.milestoneEvents.orderBy("createdAt").reverse().toArray(), checkIns: await db.checkIns.toArray(), settings: await db.settings.get("app") }), []) ?? { tasks: [], lifecycles: [], pauses: [], events: [], checkIns: [], settings: undefined };
  const tasks = data.tasks.filter(supportsLifecycle).filter((task) => data.lifecycles.some((item) => item.taskId === task.id));
  const savePause = async (event: React.FormEvent) => { event.preventDefault(); if (!pauseTask) return; await addPause(pauseTask, start, end || undefined, pauseType); setPauseTask(undefined); };
  const pausedTaskTitle = data.tasks.find((task) => task.id === pauseTask)?.title ?? "";
  return (
    <div className="page page-narrow">
      <div className="page-intro"><span className="eyebrow">{t("habitLifecycle")}</span><h2 className="page-title">{t("lifecycleTitle")}</h2><p className="muted">{t("lifecycleIntro")}</p></div>
      {tasks.length === 0 ? <div className="empty-state"><p>{t("noLifecycleYet")}</p></div> : <div className="stack">
        {tasks.map((task) => {
          const lifecycle = data.lifecycles.find((item) => item.taskId === task.id)!;
          const pauses = data.pauses.filter((item) => item.taskId === task.id);
          const stats = calculateTaskStats(task, data.checkIns.filter((item) => item.taskId === task.id), new Date(), pauses, lifecycle.personalBest, data.settings?.weekStartsOn ?? 1);
          const events = data.events.filter((item) => item.taskId === task.id);
          const interrupted = !stats.paused && stats.currentStreak === 0 && lifecycle.personalBest > 0 && lifecycle.state === "building";
          return (
            <article className="panel lifecycle-card" key={task.id} aria-labelledby={`lifecycle-${task.id}`}>
              <div className="panel-head">
                <div>
                  <span className={`pill lifecycle-state state-${lifecycle.state}`}>{t(`lifecycle_${lifecycle.state}`)}</span>
                  <h3 id={`lifecycle-${task.id}`}><button type="button" className="task-link" onClick={() => onOpenTask(task.id)}>{task.title}</button></h3>
                  <p className="muted small">{t(task.schedule.mode === "quota" ? "quotaMilestoneTarget" : "dayMilestoneTarget", { count: targetFor(task) })}</p>
                </div>
                <button type="button" className="button secondary" onClick={() => onEdit(task)}>{t("adjustPlan")}</button>
              </div>
              <div className="metric-row">
                <div><strong>{stats.currentStreak}</strong><span>{t("currentStreak")}</span></div>
                <div><strong>{lifecycle.personalBest}</strong><span>{t("personalBest")}</span></div>
                <div><strong>{stats.completed}</strong><span>{t("totalCompleted")}</span></div>
                <div><strong>{events.filter((item) => item.type === "target-reached").length}</strong><span>{t("pastMilestones")}</span></div>
              </div>
              {stats.paused && <div className="banner banner-info"><div><strong>{t("streakFrozen")}</strong><p>{t("pauseNeutralHint")}</p></div><button type="button" className="button secondary" onClick={() => resumeTask(task.id)}>{t("resume")}</button></div>}
              {interrupted && <div className="banner"><div><strong>{t("streakInterrupted")}</strong><p>{t("historyStillHere", { completed: stats.completed, best: lifecycle.personalBest })}</p></div><div className="inline-actions"><button type="button" className="button primary" onClick={() => recordRecoveryChoice(task.id, "continue")}>{t("continueOriginal")}</button><button type="button" className="button secondary" onClick={() => { void recordRecoveryChoice(task.id, "adjust"); onEdit(task); }}>{t("adjustPlan")}</button><button type="button" className="button secondary" onClick={() => setPauseTask(task.id)}>{t("pause")}</button></div></div>}
              {!stats.paused && !interrupted && <button type="button" className="button text-button" onClick={() => setPauseTask(task.id)}>Ⅱ {t("planPause")}</button>}
              <div className="milestone-timeline">
                <h4>{t("milestoneTimeline")}</h4>
                {events.length === 0 ? <p className="muted small">{t("noMilestonesYet")}</p> : <ol>{events.slice(0, 6).map((item) => <li key={item.id}><strong>{t(`event_${item.type}`)}</strong><small>{item.date}</small></li>)}</ol>}
              </div>
            </article>
          );
        })}
      </div>}
      {pauseTask && <Dialog labelledBy="pause-title" onClose={() => setPauseTask(undefined)} className="dialog-small">
        <form className="dialog-body" onSubmit={savePause}>
          <DialogHeader id="pause-title" eyebrow={pausedTaskTitle} title={t("planPause")} hint={t("pauseFormHint")} onClose={() => setPauseTask(undefined)} closeLabel={t("close")}/>
          <label className="field"><span>{t("pauseType")}</span><select value={pauseType} onChange={(event) => setPauseType(event.target.value as PauseType)}><option value="planned-break">{t("plannedBreak")}</option><option value="vacation">{t("vacation")}</option><option value="retroactive">{t("retroactivePause")}</option></select></label>
          <div className="field-pair"><label className="field"><span>{t("startDate")}</span><input type="date" required value={start} onChange={(event) => setStart(event.target.value)}/></label><label className="field"><span>{t("reviewEndDate")}</span><input type="date" min={start} value={end} onChange={(event) => setEnd(event.target.value)}/></label></div>
          {pauseType === "retroactive" && <p className="muted small">{t("retroactivePauseRule")}</p>}
          <div className="form-actions"><button type="button" className="button secondary" onClick={() => setPauseTask(undefined)}>{t("cancel")}</button><button type="submit" className="button primary">{t("pause")}</button></div>
        </form>
      </Dialog>}
    </div>
  );
}
