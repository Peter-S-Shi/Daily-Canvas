import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { todayKey } from "../lib/dates";
import { saveTask } from "../services/taskService";
import type { RecurrenceType, Task, TaskKind } from "../types";

interface TaskEditorProps { task?: Task; onClose: () => void }
const colors = ["#f4a261", "#e76f51", "#2a9d8f", "#457b9d", "#8d6cab", "#e9c46a"];
const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function TaskEditor({ task, onClose }: TaskEditorProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const defaults = useMemo(() => ({
    title: task?.title ?? "", kind: task?.kind ?? ("habit" as TaskKind), category: task?.category ?? "", color: task?.color ?? colors[0], starred: task?.starred ?? false,
    startDate: task?.startDate ?? todayKey(), endDate: task?.endDate ?? "", recurrenceType: task?.recurrence.type ?? ("daily" as RecurrenceType), weekdays: task?.recurrence.weekdays ?? [1, 2, 3, 4, 5], intervalDays: task?.recurrence.intervalDays ?? 2, targetDays: task?.targetDays ?? 21, stopReminderAtTarget: task?.stopReminderAtTarget ?? true,
  }), [task]);
  const [form, setForm] = useState(defaults);
  const toggleWeekday = (day: number) => setForm((current) => ({ ...current, weekdays: current.weekdays.includes(day) ? current.weekdays.filter((item) => item !== day) : [...current.weekdays, day].sort() }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step === 1) return setStep(2);
    setState("saving");
    try {
      await saveTask({
        title: form.title.trim(), kind: form.kind, category: form.category.trim(), color: form.color, starred: form.starred, archived: task?.archived ?? false,
        startDate: form.startDate, endDate: form.endDate || undefined,
        recurrence: { type: form.kind === "task" ? "once" : form.recurrenceType, weekdays: form.recurrenceType === "weekdays" ? form.weekdays : undefined, intervalDays: form.recurrenceType === "interval" ? Math.max(1, form.intervalDays) : undefined },
        targetDays: form.kind === "task" ? undefined : Math.max(1, form.targetDays), stopReminderAtTarget: form.kind === "task" ? false : form.stopReminderAtTarget,
      }, task);
      onClose();
    } catch { setState("error"); }
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
      <div className="section-heading compact-heading"><div><span className="eyebrow">{t("stepOf", { step, total: 2 })}</span><h2 id="task-editor-title">{task ? t("editTask") : t("createTask")}</h2><p>{t(step === 1 ? "taskBasicsHint" : "taskDetailsHint")}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label={t("close")}>×</button></div>
      <div className="step-track"><i className="active" /><i className={step === 2 ? "active" : ""} /></div>
      <form className="task-form" onSubmit={save}>
        {step === 1 ? <>
          <label className="field field-wide"><span>{t("title")}</span><input required autoFocus maxLength={80} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <div className="segmented field-wide" aria-label={t("taskKind")}>{([ ["task", "regularTask"], ["habit", "goodHabit"], ["avoidance", "avoidanceHabit"] ] as const).map(([value, label]) => <button key={value} type="button" className={form.kind === value ? "active" : ""} onClick={() => setForm({ ...form, kind: value })}>{t(label)}</button>)}</div>
          <label className="field"><span>{t("startDate")}</span><input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
          {form.kind !== "task" && <label className="field"><span>{t("recurrence")}</span><select value={form.recurrenceType} onChange={(event) => setForm({ ...form, recurrenceType: event.target.value as RecurrenceType })}><option value="daily">{t("daily")}</option><option value="weekdays">{t("weekdays")}</option><option value="interval">{t("interval")}</option></select></label>}
          {form.kind !== "task" && form.recurrenceType === "weekdays" && <div className="field field-wide"><span>{t("weekdays")}</span><div className="weekday-picker">{dayKeys.map((key, day) => <button type="button" key={key} className={form.weekdays.includes(day) ? "selected" : ""} onClick={() => toggleWeekday(day)}>{t(key)}</button>)}</div></div>}
          {form.kind !== "task" && form.recurrenceType === "interval" && <label className="field field-wide"><span>{t("intervalDays")}</span><input type="number" min="1" max="365" value={form.intervalDays} onChange={(event) => setForm({ ...form, intervalDays: Number(event.target.value) })} /></label>}
        </> : <>
          <label className="field"><span>{t("category")}</span><input maxLength={30} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
          <label className="field"><span>{t("endDate")}</span><input type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
          {form.kind !== "task" && <label className="field"><span>{t("targetDays")}</span><input type="number" min="1" max="999" value={form.targetDays} onChange={(event) => setForm({ ...form, targetDays: Number(event.target.value) })} /></label>}
          <div className="field"><span>{t("color")}</span><div className="color-picker">{colors.map((color) => <button key={color} type="button" aria-label={color} className={form.color === color ? "selected" : ""} style={{ background: color }} onClick={() => setForm({ ...form, color })} />)}</div></div>
          <label className="toggle-row field-wide"><input type="checkbox" checked={form.starred} onChange={(event) => setForm({ ...form, starred: event.target.checked })} /><span>{t("starred")}</span></label>
          {form.kind !== "task" && <label className="toggle-row field-wide"><input type="checkbox" checked={form.stopReminderAtTarget} onChange={(event) => setForm({ ...form, stopReminderAtTarget: event.target.checked })} /><span>{t("stopAtTarget")}</span></label>}
          {state === "error" && <p className="error-message field-wide" role="alert">{t("saveError")}</p>}
        </>}
        <div className="form-actions field-wide"><button type="button" className="button secondary" onClick={step === 2 ? () => setStep(1) : onClose}>{step === 2 ? t("back") : t("cancel")}</button><button disabled={state === "saving"} type="submit" className="button primary">{step === 1 ? t("continue") : state === "saving" ? t("saving") : t("save")}</button></div>
      </form>
    </section>
  </div>;
}
