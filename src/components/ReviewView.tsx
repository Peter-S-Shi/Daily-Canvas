import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { buildReviewModel, isValidRange, rangeForPreset, reviewAsText, reviewSentences, type DateRange, type ReviewFilters, type ReviewPreset } from "../services/reviewService";

export function ReviewView({ weekStartsOn, onInspectDate }: { weekStartsOn: 0 | 1; onInspectDate: (date: string) => void }) {
  const { t, i18n } = useTranslation();
  const [preset, setPreset] = useState<ReviewPreset>("this-month");
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("this-month", new Date(), weekStartsOn));
  const [filters, setFilters] = useState<ReviewFilters>({}); const [copied, setCopied] = useState(false);
  const sources = useLiveQuery(async () => ({ tasks: await db.tasks.toArray(), areas: await db.areas.toArray(), checkIns: await db.checkIns.toArray(), reflections: await db.dailyReflections.toArray(), emotions: await db.emotionDefinitions.toArray(), experiences: await db.experienceLogs.toArray(), rewards: await db.rewards.toArray() }), []) ?? { tasks: [], areas: [], checkIns: [], reflections: [], emotions: [], experiences: [], rewards: [] };
  const valid = isValidRange(range);
  const model = useMemo(() => valid ? buildReviewModel(sources, range, filters, weekStartsOn) : null, [sources, range, filters, weekStartsOn, valid]);
  const setShortcut = (next: ReviewPreset) => { setPreset(next); if (next !== "custom") setRange(rangeForPreset(next, new Date(), weekStartsOn)); };
  const copy = async () => { if (!model) return; await navigator.clipboard.writeText(reviewAsText(model, i18n.language === "zh-CN" ? "zh-CN" : "en")); setCopied(true); globalThis.setTimeout(() => setCopied(false), 1800); };
  const label = (date: string) => new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
  return <div className="view-stack review-view">
    <section className="review-hero">
      <div><span className="eyebrow">{t("periodReview")}</span><h1>{t("reviewTitle")}</h1><p>{t("reviewIntro")}</p></div>
      <div className="range-badge"><strong>{label(range.start)}</strong><span>→</span><strong>{label(range.end)}</strong></div>
    </section>
    <section className="panel range-panel" aria-label={t("reviewRange")}>
      <div className="range-shortcuts">{(["this-week", "last-week", "this-month", "last-month", "custom"] as ReviewPreset[]).map((item) => <button key={item} type="button" className={preset === item ? "active" : ""} onClick={() => setShortcut(item)}>{t(`range_${item}`)}</button>)}</div>
      <div className="range-fields"><label className="field"><span>{t("startDate")}</span><input type="date" value={range.start} onChange={(event) => { setPreset("custom"); setRange({ ...range, start: event.target.value }); }} /></label><label className="field"><span>{t("reviewEndDate")}</span><input type="date" value={range.end} onChange={(event) => { setPreset("custom"); setRange({ ...range, end: event.target.value }); }} /></label></div>
      {!valid && <p className="error-message" role="alert">{t("invalidReviewRange")}</p>}
      <div className="review-filters">
        <select aria-label={t("area")} value={filters.areaId ?? ""} onChange={(event) => setFilters({ ...filters, areaId: event.target.value || undefined })}><option value="">{t("allAreas")}</option>{sources.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
        <select aria-label={t("taskKind")} value={filters.taskKind ?? ""} onChange={(event) => setFilters({ ...filters, taskKind: (event.target.value || undefined) as ReviewFilters["taskKind"] })}><option value="">{t("allTaskKinds")}</option><option value="task">{t("regularTask")}</option><option value="habit">{t("goodHabit")}</option><option value="avoidance">{t("avoidanceHabit")}</option></select>
        <select aria-label={t("scheduleType")} value={filters.scheduleMode ?? ""} onChange={(event) => setFilters({ ...filters, scheduleMode: (event.target.value || undefined) as ReviewFilters["scheduleMode"] })}><option value="">{t("allSchedules")}</option><option value="fixed">{t("fixedSchedule")}</option><option value="floating">{t("floatingTask")}</option><option value="quota">{t("quotaGoal")}</option></select>
      </div>
    </section>
    {model && <>
      <section className="panel review-summary"><div className="section-heading compact-heading"><div><span className="eyebrow">{t("whatCompleted")}</span><h2>{t("reviewSummary")}</h2></div><button type="button" className="button secondary" onClick={copy}>{t(copied ? "copied" : "copyReview")}</button></div><div className="summary-prose">{reviewSentences(model, i18n.language === "zh-CN" ? "zh-CN" : "en").map((sentence) => <p key={sentence}>{sentence}</p>)}</div><div className="review-metrics"><div><strong>{model.completedItems.length}</strong><span>{t("completedCheckIns")}</span></div><div><strong>{model.activeDays}</strong><span>{t("activeDays")}</span></div><div><strong>{model.achievedQuotaPeriods}</strong><span>{t("quotaPeriodsAchieved")}</span></div></div></section>
      <section className="review-columns">
        <article className="panel"><h2>{t("completedWork")}</h2>{model.completionGroups.length === 0 ? <p className="muted-copy">{t("noCompletedWork")}</p> : <div className="completion-groups">{model.completionGroups.map((group) => <details key={group.taskId}><summary><span><strong>{group.title}</strong><small>{group.areaName ?? t("noArea")} · {t(`mode_${group.scheduleMode}`)}</small></span><b>{group.count}</b></summary><div className="evidence-dates">{group.dates.map((date) => <button type="button" key={date} onClick={() => onInspectDate(date)}>{label(date)}</button>)}</div></details>)}</div>}</article>
        <article className="panel"><h2>{t("areaBreakdown")}</h2>{model.areaBreakdown.length < 2 && <p className="evidence-note">{t("limitedAreaEvidence")}</p>}<div className="breakdown-list">{model.areaBreakdown.map((area) => <div key={area.areaId ?? "none"}><span>{area.name}</span><strong>{area.count}</strong><i style={{ width: `${model.completedItems.length ? area.count / model.completedItems.length * 100 : 0}%` }} /></div>)}</div><h2 className="spaced-heading">{t("scheduleBreakdown")}</h2><div className="schedule-facts">{model.scheduleBreakdown.map((item) => <div key={item.mode}><span>{t(`mode_${item.mode}`)}</span><strong>{item.count}</strong></div>)}</div></article>
      </section>
      <section className="panel"><h2>{t("quotaOutcomes")}</h2>{model.quotaFacts.length === 0 ? <p className="muted-copy">{t("noQuotaPeriods")}</p> : <div className="quota-facts">{model.quotaFacts.map((fact) => <div key={`${fact.taskId}:${fact.period.start}`}><span><strong>{fact.title}</strong><small>{fact.period.start} – {fact.period.end}</small></span><b>{fact.count}/{fact.target}</b><em>{t(fact.provisional ? "quotaCurrentPeriod" : `quotaOutcome_${fact.outcome}`)}</em></div>)}</div>}</section>
      {(model.reflectionDates.length > 0 || model.emotionCounts.length > 0 || model.experienceRecords.length > 0) && <section className="panel context-panel"><div><span className="eyebrow">{t("optionalContext")}</span><h2>{t("reflectionContext")}</h2><p>{t("reflectionDaysRecorded", { count: model.reflectionDates.length })}</p></div>{model.emotionCounts.length > 0 && <div><h3>{t("frequentRecordedEmotions")}</h3><div className="context-chips">{model.emotionCounts.map((emotion) => <span key={emotion.emotionId}>{emotion.label} · {emotion.count}</span>)}</div><small>{t("basedOnRecordedDays", { count: model.reflectionDates.length })}</small></div>}{model.experienceRecords.length > 0 && <div><h3>{t("experienceRecords")}</h3><p>{t("experienceSummary", model.experienceCounts)}</p></div>}</section>}
    </>}
  </div>;
}
