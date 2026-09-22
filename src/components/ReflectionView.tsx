import { addDays, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { toDateKey, todayKey } from "../lib/dates";
import { createCustomEmotion, setEmotionArchived } from "../services/emotionService";
import { getPrompt, nextReflectionPrompt } from "../services/promptService";
import { saveReflection } from "../services/reflectionService";

export function ReflectionView({ initialDate = todayKey() }: { initialDate?: string }) {
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(initialDate);
  const reflection = useLiveQuery(() => db.dailyReflections.get(date), [date], null);
  const emotions = useLiveQuery(() => db.emotionDefinitions.toArray(), []) ?? [];
  const [emotionIds, setEmotionIds] = useState<string[]>([]); const [intensity, setIntensity] = useState<number>(); const [note, setNote] = useState(""); const [promptId, setPromptId] = useState<string>(); const [promptSkipped, setPromptSkipped] = useState(false); const promptRequested = useRef(false); const [custom, setCustom] = useState(""); const [addingCustom, setAddingCustom] = useState(false); const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  useEffect(() => { setEmotionIds(reflection?.emotionIds ?? []); setIntensity(reflection?.intensity); setNote(reflection?.note ?? ""); setPromptId(reflection?.promptId); }, [reflection, date]);
  useEffect(() => { promptRequested.current = false; setPromptSkipped(false); setSaveState("idle"); }, [date]);
  useEffect(() => { if (reflection === undefined && !promptId && !promptSkipped && !promptRequested.current) { promptRequested.current = true; void nextReflectionPrompt().then((prompt) => setPromptId(prompt?.id)); } }, [reflection, promptId, promptSkipped]);
  const active = useMemo(() => emotions.filter((item) => !item.archived || emotionIds.includes(item.id)), [emotions, emotionIds]);
  const prompt = getPrompt(promptId);
  const label = (id: string) => { const emotion = emotions.find((item) => item.id === id); return emotion?.systemKey ? t(`emotion_${emotion.systemKey}`) : emotion?.label ?? id; };
  const toggle = (id: string) => { setEmotionIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]); setSaveState("idle"); };
  const save = async () => { setSaveState("saving"); try { await saveReflection({ date, emotionIds, intensity, note, promptId: note || emotionIds.length ? promptId : undefined }); setSaveState("saved"); } catch { setSaveState("error"); } };
  const addCustom = async (event: React.FormEvent) => { event.preventDefault(); if (!custom.trim()) return; const emotion = await createCustomEmotion(custom); setEmotionIds((ids) => [...new Set([...ids, emotion.id])]); setCustom(""); setAddingCustom(false); };
  const shiftDate = (days: number) => setDate(toDateKey(addDays(parseISO(date), days)));
  const today = todayKey();
  return (
    <div className="page reflection-page">
      <div className="date-nav">
        <button type="button" className="icon-button" onClick={() => shiftDate(-1)} aria-label={t("previousDay")}>‹</button>
        <h2 className="date-nav-title">{new Intl.DateTimeFormat(i18n.language, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(parseISO(date))}</h2>
        <button type="button" className="icon-button" onClick={() => shiftDate(1)} disabled={date >= today} aria-label={t("nextDay")}>›</button>
      </div>
      <label className="date-jump"><span>{t("date")}</span><input type="date" value={date} max={today} onChange={(event) => event.target.value && setDate(event.target.value)}/></label>

      <section className="emotion-section" aria-labelledby="emotion-heading">
        <p className="eyebrow centered" id="emotion-heading">{t("howAreYouFeeling")} <span className="eyebrow-note">{t("emotionMultiHint")}</span></p>
        <div className="emotion-row">
          {active.map((emotion) => {
            const selected = emotionIds.includes(emotion.id);
            return (
              <div className="emotion-wrap" key={emotion.id}>
                <button type="button" className={selected ? "emotion selected" : "emotion"} aria-pressed={selected} onClick={() => toggle(emotion.id)}><span className="emotion-dot" aria-hidden="true">{selected ? "✓" : ""}</span><span className="emotion-label">{label(emotion.id)}</span></button>
                {!emotion.isSystem && <button className="archive-emotion" type="button" aria-label={t("archiveEmotion", { label: label(emotion.id) })} onClick={() => setEmotionArchived(emotion.id, true)}>×</button>}
              </div>
            );
          })}
          {!addingCustom && <button type="button" className="emotion" onClick={() => setAddingCustom(true)}><span className="emotion-dot" aria-hidden="true">+</span><span className="emotion-label">{t("customEmotionShort")}</span></button>}
        </div>
        {addingCustom && <form className="custom-emotion" onSubmit={addCustom}><input autoFocus value={custom} maxLength={32} onChange={(event) => setCustom(event.target.value)} placeholder={t("customEmotion")} aria-label={t("customEmotion")}/><button className="button secondary" type="submit">{t("add")}</button><button className="button text-button" type="button" onClick={() => { setAddingCustom(false); setCustom(""); }}>{t("cancel")}</button></form>}
        <div className="intensity" role="group" aria-label={`${t("overallIntensity")} (${t("optional")})`}>
          {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} className={intensity !== undefined && value <= intensity ? "on" : ""} aria-pressed={intensity === value} aria-label={`${t("overallIntensity")} ${value}`} onClick={() => { setIntensity(intensity === value ? undefined : value); setSaveState("idle"); }}/>)}
          <span className="intensity-note">{intensity ? `${intensity} / 5` : t("optional")}</span>
        </div>
      </section>

      {prompt && <div className="prompt"><p><span className="sr-only">{t("optionalPrompt")}: </span>{prompt[i18n.language === "zh-CN" ? "zh-CN" : "en"]}</p><button type="button" className="link-button" onClick={() => { setPromptSkipped(true); setPromptId(undefined); }}>{t("skipPrompt")}</button></div>}

      <label className="sr-only" htmlFor="daily-journal">{t("writeFreely")}</label>
      <textarea id="daily-journal" className="full-journal" value={note} onChange={(event) => { setNote(event.target.value); setSaveState("idle"); }} placeholder={t("journalFreeHint")}/>
      <div className="journal-actions">
        <button type="button" className="button primary" onClick={save} disabled={saveState === "saving"}>{t("saveReflection")}</button>
        <span role="status" className={saveState === "error" ? "error-message" : "save-state"}>{saveState === "saving" ? t("saving") : saveState === "saved" ? t("reflectionSaved") : saveState === "error" ? t("saveError") : t("authoredExactly")}</span>
      </div>
    </div>
  );
}
