import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createCapture } from "../services/inboxService";
import { Dialog, DialogHeader } from "./Dialog";

export function QuickCaptureDialog({ onClose, onFullTask }: { onClose: () => void; onFullTask: (title: string) => void }) {
  const { t } = useTranslation(); const [title, setTitle] = useState(""); const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const save = async (event: React.FormEvent) => { event.preventDefault(); setState("saving"); try { await createCapture(title); onClose(); } catch { setState("error"); } };
  return <Dialog labelledBy="quick-capture-title" onClose={onClose} className="dialog-small"><form className="dialog-body" onSubmit={save}><DialogHeader id="quick-capture-title" title={t("quickCapture")} hint={t("capturePrompt")} onClose={onClose} closeLabel={t("close")}/><label className="field"><span>{t("title")}</span><input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)}/></label>{state === "error" && <p role="alert" className="error-message">{t("saveError")}</p>}<button disabled={state === "saving"} type="submit" className="button primary">{t("saveToInbox")}</button><button type="button" className="button text-button" onClick={() => onFullTask(title.trim())}>{t("createFullTaskInstead")}</button></form></Dialog>;
}
