import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { todayKey } from "../lib/dates";
import { saveTask } from "../services/taskService";
import type { RecurrenceType, Task, TaskKind } from "../types";
import { Dialog, DialogHeader } from "./Dialog";

interface TaskEditorProps { task?: Task; initialMode?: Task["schedule"]["mode"]; initialTitle?: string; onSaved?: (task: Task) => Promise<void> | void; onClose: () => void }
const colors = ["#f4a261", "#e76f51", "#2a9d8f", "#457b9d", "#8d6cab", "#e9c46a"];
const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function TaskEditor({ task, initialMode, initialTitle, onSaved, onClose }: TaskEditorProps) {
  const { t } = useTranslation();
  const areas = useLiveQuery(() => db.areas.orderBy("sortOrder").toArray(), []) ?? [];
  const [step, setStep] = useState<1 | 2>(1);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const defaults = useMemo(() => {
    const schedule = task?.schedule;
    return {
      title: task?.title ?? initialTitle ?? "", kind: task?.kind ?? ((initialMode === "floating" ? "task" : "habit") as TaskKind), areaId: task?.areaId ?? "", colorOverride: task?.colorOverride ?? "", starred: task?.starred ?? false,
      scheduleMode: schedule?.mode ?? initialMode ?? ("fixed" as Task["schedule"]["mode"]), startDate: task?.startDate ?? todayKey(), endDate: task?.endDate ?? "",
      recurrenceType: schedule?.mode === "fixed" ? schedule.recurrence.type : ("daily" as RecurrenceType), weekdays: schedule?.mode === "fixed" ? schedule.recurrence.weekdays ?? [1,2,3,4,5] : [1,2,3,4,5], intervalDays: schedule?.mode === "fixed" ? schedule.recurrence.intervalDays ?? 2 : 2,
      intervalWeeks: schedule?.mode === "fixed" ? schedule.recurrence.intervalWeeks ?? 2 : 2, dayOfMonth: schedule?.mode === "fixed" ? schedule.recurrence.dayOfMonth ?? 1 : 1,
      deadline: schedule?.mode === "floating" ? schedule.optionalDeadline ?? "" : "", quotaPeriod: schedule?.mode === "quota" ? schedule.period : ("week" as const), quotaTarget: schedule?.mode === "quota" ? schedule.targetCount : 1,
      targetDays: task?.targetDays ?? 21, targetPeriods: task?.targetPeriods ?? 4, notes: task?.notes ?? "", estimatedMinutes: task?.estimatedMinutes ?? 0, checklistText: (task?.checklist ?? []).map((item) => item.title).join("\n"),
    };
  }, [task, initialMode, initialTitle]);
  const [form, setForm] = useState(defaults);
  const toggleWeekday = (day: number) => setForm((current) => ({ ...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((item: number) => item !== day) : [...current.weekdays, day].sort() }));
  const setMode = (mode: Task["schedule"]["mode"]) => setForm((current) => ({ ...current, scheduleMode: mode, kind: mode === "floating" ? "task" : mode === "quota" && current.kind === "task" ? "habit" : current.kind }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (step === 1) return setStep(2); setState("saving");
    try {
      const schedule: Task["schedule"] = form.scheduleMode === "floating"
        ? { mode: "floating", availableFrom: form.startDate, optionalDeadline: form.deadline || undefined }
        : form.scheduleMode === "quota"
          ? { mode: "quota", period: form.quotaPeriod, targetCount: Math.max(1, form.quotaTarget), availableFrom: form.startDate, optionalEndDate: form.endDate || undefined }
          : { mode: "fixed", recurrence: { type: form.kind === "task" ? "once" : form.recurrenceType, weekdays: form.recurrenceType === "weekdays" || form.recurrenceType === "weeklyInterval" ? form.weekdays : undefined, intervalDays: form.recurrenceType === "interval" ? Math.max(1, form.intervalDays) : undefined, intervalWeeks: form.recurrenceType === "weeklyInterval" ? Math.max(1, form.intervalWeeks) : undefined, dayOfMonth: form.recurrenceType === "monthlyDay" ? Math.min(31, Math.max(1, form.dayOfMonth)) : undefined } };
      const now = new Date().toISOString(); const previous = new Map((task?.checklist ?? []).map((item) => [item.title, item])); const checklist = form.checklistText.split("\n").map((title: string) => title.trim()).filter(Boolean).map((title: string, index: number) => previous.get(title) ?? { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${index}`, title, completed: false, createdAt: now, updatedAt: now });
      const saved = await saveTask({ title: form.title.trim(), kind: form.kind, areaId: form.areaId || undefined, colorOverride: form.colorOverride || undefined, starred: form.starred, archived: task?.archived ?? false, startDate: form.startDate, replannedStartDate: task?.replannedStartDate, endDate: form.scheduleMode === "fixed" && form.endDate ? form.endDate : undefined, schedule, targetDays: form.scheduleMode === "fixed" && form.kind !== "task" ? Math.max(1, form.targetDays) : undefined, targetPeriods: form.scheduleMode === "quota" ? Math.max(1, form.targetPeriods) : undefined, stopReminderAtTarget: false, notes: form.notes.trim() || undefined, estimatedMinutes: form.estimatedMinutes > 0 ? Math.round(form.estimatedMinutes) : undefined, checklist }, task);
      await onSaved?.(saved);
      onClose();
    } catch { setState("error"); }
  };

  return <Dialog labelledBy="task-editor-title" onClose={onClose}>
    <div className="dialog-body">
      <DialogHeader id="task-editor-title" eyebrow={t("stepOf", { step, total: 2 })} title={task ? t("editTask") : t("createTask")} hint={t(step === 1 ? "taskBasicsHint" : "taskDetailsHint")} onClose={onClose} closeLabel={t("close")}/>
      <div className="step-track" aria-hidden="true"><i className="active" /><i className={step === 2 ? "active" : ""} /></div>
      <form className="task-form" onSubmit={save}>
        {step === 1 ? <>
          <label className="field field-wide"><span>{t("title")}</span><input required autoFocus maxLength={80} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <div className="field field-wide"><span>{t("scheduleType")}</span><div className="segmented schedule-segments" role="group" aria-label={t("scheduleType")}>{([ ["fixed","fixedSchedule"], ["floating","floatingTask"], ["quota","quotaGoal"] ] as const).map(([value,label]) => <button key={value} type="button" className={form.scheduleMode === value ? "active" : ""} aria-pressed={form.scheduleMode === value} onClick={() => setMode(value)}>{t(label)}</button>)}</div></div>
          {form.scheduleMode !== "floating" && <div className="segmented field-wide" role="group" aria-label={t("taskKind")}>{([ ["task","regularTask"], ["habit","goodHabit"], ["avoidance","avoidanceHabit"] ] as const).filter(([value]) => form.scheduleMode === "fixed" || value !== "task").map(([value,label]) => <button key={value} type="button" className={form.kind === value ? "active" : ""} aria-pressed={form.kind === value} onClick={() => setForm({ ...form, kind: value })}>{t(label)}</button>)}</div>}
          <label className="field"><span>{t(form.scheduleMode === "floating" ? "availableFrom" : "startDate")}</span><input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
          {form.scheduleMode === "fixed" && form.kind !== "task" && <label className="field"><span>{t("recurrence")}</span><select value={form.recurrenceType} onChange={(event) => setForm({ ...form, recurrenceType: event.target.value as RecurrenceType })}><option value="daily">{t("daily")}</option><option value="weekdays">{t("weekdays")}</option><option value="interval">{t("interval")}</option><option value="weeklyInterval">{t("weeklyInterval")}</option><option value="monthlyDay">{t("monthlyDay")}</option></select></label>}
          {form.scheduleMode === "fixed" && form.kind !== "task" && (form.recurrenceType === "weekdays" || form.recurrenceType === "weeklyInterval") && <div className="field field-wide"><span>{t("weekdays")}</span><div className="weekday-picker">{dayKeys.map((key, day) => <button type="button" key={key} className={form.weekdays.includes(day) ? "selected" : ""} aria-pressed={form.weekdays.includes(day)} onClick={() => toggleWeekday(day)}>{t(key)}</button>)}</div></div>}
          {form.scheduleMode === "fixed" && form.kind !== "task" && form.recurrenceType === "interval" && <label className="field field-wide"><span>{t("intervalDays")}</span><input type="number" min="1" max="365" value={form.intervalDays} onChange={(event) => setForm({ ...form, intervalDays: Number(event.target.value) })} /></label>}
          {form.scheduleMode === "fixed" && form.kind !== "task" && form.recurrenceType === "weeklyInterval" && <label className="field field-wide"><span>{t("intervalWeeks")}</span><input type="number" min="1" max="52" value={form.intervalWeeks} onChange={(event) => setForm({ ...form, intervalWeeks: Number(event.target.value) })}/></label>}
          {form.scheduleMode === "fixed" && form.kind !== "task" && form.recurrenceType === "monthlyDay" && <label className="field field-wide"><span>{t("dayOfMonth")}</span><input type="number" min="1" max="31" value={form.dayOfMonth} onChange={(event) => setForm({ ...form, dayOfMonth: Number(event.target.value) })}/></label>}
          {form.scheduleMode === "quota" && <><label className="field"><span>{t("quotaPeriod")}</span><select value={form.quotaPeriod} onChange={(event) => setForm({ ...form, quotaPeriod: event.target.value as "week" | "month" })}><option value="week">{t("weekly")}</option><option value="month">{t("monthly")}</option></select></label><label className="field"><span>{t("targetCount")}</span><input type="number" min="1" max="99" value={form.quotaTarget} onChange={(event) => setForm({ ...form, quotaTarget: Number(event.target.value) })} /></label></>}
        </> : <>
          <label className="field"><span>{t("area")}</span><select value={form.areaId} onChange={(event) => setForm({ ...form, areaId: event.target.value })}><option value="">{t("noArea")}</option>{areas.filter((area) => !area.archived || area.id === form.areaId).map((area) => <option key={area.id} value={area.id}>{area.icon ? `${area.icon} ` : ""}{area.name}</option>)}</select></label>
          {form.scheduleMode === "floating" ? <label className="field"><span>{t("deadline")}</span><input type="date" min={form.startDate} value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></label> : <label className="field"><span>{t("endDate")}</span><input type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>}
          {form.scheduleMode === "fixed" && form.kind !== "task" && <label className="field"><span>{t("targetDays")}</span><input type="number" min="1" max="999" value={form.targetDays} onChange={(event) => setForm({ ...form, targetDays: Number(event.target.value) })} /></label>}
          {form.scheduleMode === "quota" && <label className="field"><span>{t("targetPeriods")}</span><input type="number" min="1" max="99" value={form.targetPeriods} onChange={(event) => setForm({ ...form, targetPeriods: Number(event.target.value) })} /></label>}
          <div className="field"><span>{t("taskColorOverride")}</span><div className="color-picker"><button type="button" className={`inherit-color ${!form.colorOverride ? "selected" : ""}`} aria-pressed={!form.colorOverride} aria-label={t("inheritAreaColor")} onClick={() => setForm({ ...form, colorOverride: "" })}>∅</button>{colors.map((color) => <button key={color} type="button" aria-label={color} aria-pressed={form.colorOverride === color} className={form.colorOverride === color ? "selected" : ""} style={{ background: color }} onClick={() => setForm({ ...form, colorOverride: color })} />)}</div></div>
          <label className="toggle-row field-wide"><input type="checkbox" checked={form.starred} onChange={(event) => setForm({ ...form, starred: event.target.checked })} /><span>{t("starred")}</span></label>
          <label className="field"><span>{t("durationEstimate")}</span><input type="number" min="0" max="1440" value={form.estimatedMinutes} onChange={(event) => setForm({ ...form, estimatedMinutes: Number(event.target.value) })}/></label>
          <label className="field field-wide"><span>{t("taskNotes")}</span><textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })}/></label>
          <label className="field field-wide"><span>{t("checklistLines")}</span><textarea rows={4} value={form.checklistText} onChange={(event) => setForm({ ...form, checklistText: event.target.value })} placeholder={t("checklistLinesHint")}/></label>
          {state === "error" && <p className="error-message field-wide" role="alert">{t("saveError")}</p>}
        </>}
        <div className="form-actions field-wide"><button type="button" className="button secondary" onClick={step === 2 ? () => setStep(1) : onClose}>{step === 2 ? t("back") : t("cancel")}</button><button disabled={state === "saving"} type="submit" className="button primary">{step === 1 ? t("continue") : state === "saving" ? t("saving") : t("save")}</button></div>
      </form>
    </div>
  </Dialog>;
}
