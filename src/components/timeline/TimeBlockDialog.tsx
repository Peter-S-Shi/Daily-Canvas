import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogHeader } from "../Dialog";
import { createTimeBlock, defaultDurationFor, deleteTimeBlock, MINUTE_STEP, updateTimeBlock } from "../../services/timeBlockService";
import type { ReminderOffset, Task, TimeBlock } from "../../types";

const reminderOptions: ReminderOffset[] = ["off", "at-start", "5", "10", "15", "30", "60"];
const toTimeInput = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const fromTimeInput = (value: string) => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };
const roundToStep = (minutes: number) => Math.round(minutes / MINUTE_STEP) * MINUTE_STEP;

interface TimeBlockDialogProps {
  task: Task;
  block?: TimeBlock;
  defaultDate: string;
  defaultStartMinutes?: number;
  onClose: () => void;
  onSaved: () => void;
}

/** The mandatory non-drag path (behavior spec §7.6 / roadmap M12): every block is fully creatable and editable through explicit Date/Start time/Duration fields, never only by dragging. */
export function TimeBlockDialog({ task, block, defaultDate, defaultStartMinutes, onClose, onSaved }: TimeBlockDialogProps) {
  const { t } = useTranslation();
  const [date, setDate] = useState(block?.date ?? defaultDate);
  const [startMinutes, setStartMinutes] = useState(block?.startMinutes ?? roundToStep(defaultStartMinutes ?? 9 * 60));
  const [durationMinutes, setDurationMinutes] = useState(block?.durationMinutes ?? defaultDurationFor(task));
  const [reminder, setReminder] = useState<ReminderOffset>(block?.reminder ?? "off");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setError("");
    try {
      if (block) await updateTimeBlock(block.id, { date, startMinutes, durationMinutes, reminder });
      else await createTimeBlock({ taskId: task.id, date, startMinutes, durationMinutes, reminder });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => { if (!block) return; setBusy(true); await deleteTimeBlock(block.id); onSaved(); };

  return (
    <Dialog labelledBy="time-block-dialog-title" onClose={onClose} className="time-block-dialog">
      <DialogHeader id="time-block-dialog-title" eyebrow={task.title} title={block ? t("editTimeBlock") : t("scheduleTimeBlock")} onClose={onClose} closeLabel={t("close")} />
      <form className="task-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <label className="field">{t("date")}<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="field">{t("startTime")}<input type="time" step={MINUTE_STEP * 60} value={toTimeInput(startMinutes)} onChange={(event) => setStartMinutes(roundToStep(fromTimeInput(event.target.value)))} /></label>
        <label className="field">{t("durationMinutesLabel")}<input type="number" min={1} step={1} value={durationMinutes} onChange={(event) => setDurationMinutes(Math.max(1, Math.round(Number(event.target.value))))} /></label>
        <label className="field">{t("reminder")}<select value={reminder} onChange={(event) => setReminder(event.target.value as ReminderOffset)}>{reminderOptions.map((option) => <option key={option} value={option}>{t(`reminder_${option}`)}</option>)}</select></label>
        {block?.needsReview && <p className="pill pill-warning field-wide">{t("blockNeedsReview")}</p>}
        {error && <p className="error-message field-wide" role="alert">{error}</p>}
        <div className="form-actions field-wide">
          {block && <button type="button" className="button text-button danger-text" disabled={busy} onClick={remove}>{t("delete")}</button>}
          <button type="button" className="button secondary" onClick={onClose}>{t("cancel")}</button>
          <button type="submit" className="button primary" disabled={busy}>{t("save")}</button>
        </div>
      </form>
    </Dialog>
  );
}
