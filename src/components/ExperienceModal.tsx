import { useState } from "react";
import { useTranslation } from "react-i18next";
import { saveExperience } from "../services/experienceService";
import type { ExperienceComparison, Task } from "../types";
import { Dialog, DialogHeader } from "./Dialog";

export function ExperienceModal({ task, date, onClose }: { task: Task; date: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [comparison, setComparison] = useState<ExperienceComparison>(); const [effort, setEffort] = useState<number>(); const [urge, setUrge] = useState<number>(); const [note, setNote] = useState(""); const [saving, setSaving] = useState(false);
  const submit = async () => { setSaving(true); await saveExperience({ taskId: task.id, date, comparison, effort, urgeIntensity: task.kind === "avoidance" ? urge : undefined, note }); onClose(); };
  return (
    <Dialog labelledBy="experience-title" onClose={onClose} className="dialog-small">
      <div className="dialog-body">
        <DialogHeader id="experience-title" eyebrow={t("optional")} title={t("howDidItFeel")} hint={t("experienceHint", { title: task.title })} onClose={onClose} closeLabel={t("close")}/>
        <div className="segmented" role="group" aria-label={t("howDidItFeel")}>{(["easier", "similar", "harder"] as const).map((value) => <button type="button" className={comparison === value ? "active" : ""} aria-pressed={comparison === value} key={value} onClick={() => setComparison(comparison === value ? undefined : value)}>{t(value)}</button>)}</div>
        <div className="field-pair">
          <label className="field"><span>{t("effort")}</span><select value={effort ?? ""} onChange={(event) => setEffort(event.target.value ? Number(event.target.value) : undefined)}><option value="">{t("notRecorded")}</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          {task.kind === "avoidance" && <label className="field"><span>{t("urgeIntensity")}</span><select value={urge ?? ""} onChange={(event) => setUrge(event.target.value ? Number(event.target.value) : undefined)}><option value="">{t("notRecorded")}</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>}
        </div>
        <label className="field"><span>{t("shortNote")}</span><textarea value={note} maxLength={280} onChange={(event) => setNote(event.target.value)} placeholder={t("experienceNoteHint")}/></label>
        <div className="form-actions"><button type="button" className="button text-button" onClick={onClose}>{t("notNow")}</button><button type="button" className="button primary" disabled={saving || !(comparison || effort || urge || note.trim())} onClick={submit}>{saving ? t("saving") : t("save")}</button></div>
      </div>
    </Dialog>
  );
}
