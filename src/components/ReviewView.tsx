import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { buildReviewModel, isValidRange, rangeForPreset, reviewAsText, reviewSentences, type DateRange, type ReviewFilters, type ReviewPreset } from "../services/reviewService";
import { HeaderControls } from "./shell/WorkspaceHeader";

const presets: ReviewPreset[] = ["this-week", "last-week", "this-month", "last-month", "custom"];
const evidencePreview = 6;

export function ReviewView({ weekStartsOn, onInspectDate }: { weekStartsOn: 0 | 1; onInspectDate: (date: string) => void }) {
  const { t, i18n } = useTranslation();
  const [preset, setPreset] = useState<ReviewPreset>("this-month");
  const [range, setRange] = useState<DateRange>(() => rangeForPreset("this-month", new Date(), weekStartsOn));
  const [filters, setFilters] = useState<ReviewFilters>({});
  const [copied, setCopied] = useState(false);
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const sources = useLiveQuery(async () => ({ tasks: await db.tasks.toArray(), areas: await db.areas.toArray(), checkIns: await db.checkIns.toArray(), reflections: await db.dailyReflections.toArray(), emotions: await db.emotionDefinitions.toArray(), experiences: await db.experienceLogs.toArray(), rewards: await db.rewards.toArray() }), []) ?? { tasks: [], areas: [], checkIns: [], reflections: [], emotions: [], experiences: [], rewards: [] };
  const valid = isValidRange(range);
  const model = useMemo(() => valid ? buildReviewModel(sources, range, filters, weekStartsOn) : null, [sources, range, filters, weekStartsOn, valid]);
  const language = i18n.language === "zh-CN" ? "zh-CN" : "en";
  const setShortcut = (next: ReviewPreset) => { setPreset(next); setShowAllEvidence(false); if (next !== "custom") setRange(rangeForPreset(next, new Date(), weekStartsOn)); };
  const copy = async () => { if (!model) return; await navigator.clipboard.writeText(reviewAsText(model, language)); setCopied(true); globalThis.setTimeout(() => setCopied(false), 1800); };
  const label = (date: string) => new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
  const groups = model?.completionGroups ?? [];
  const shownGroups = showAllEvidence ? groups : groups.slice(0, evidencePreview);

  return (
    <div className="page review-page">
      <HeaderControls>
        <div className="workspace-tabs" role="group" aria-label={t("reviewRange")}>{presets.map((item) => <button key={item} type="button" className={preset === item ? "active" : ""} aria-pressed={preset === item} onClick={() => setShortcut(item)}>{t(`range_${item}`)}</button>)}</div>
      </HeaderControls>

      <div className="review-toolbar">
        {preset === "custom"
          ? <div className="range-fields"><label className="field"><span>{t("startDate")}</span><input type="date" value={range.start} onChange={(event) => setRange({ ...range, start: event.target.value })}/></label><label className="field"><span>{t("reviewEndDate")}</span><input type="date" value={range.end} onChange={(event) => setRange({ ...range, end: event.target.value })}/></label></div>
          : <span className="range-label">{label(range.start)} – {label(range.end)}</span>}
        <div className="review-filters">
          <select aria-label={t("areas")} value={filters.areaId ?? ""} onChange={(event) => setFilters({ ...filters, areaId: event.target.value || undefined })}><option value="">{t("allAreas")}</option>{sources.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
          <select aria-label={t("taskKind")} value={filters.taskKind ?? ""} onChange={(event) => setFilters({ ...filters, taskKind: (event.target.value || undefined) as ReviewFilters["taskKind"] })}><option value="">{t("allTaskKinds")}</option><option value="task">{t("regularTask")}</option><option value="habit">{t("goodHabit")}</option><option value="avoidance">{t("avoidanceHabit")}</option></select>
          <select aria-label={t("scheduleType")} value={filters.scheduleMode ?? ""} onChange={(event) => setFilters({ ...filters, scheduleMode: (event.target.value || undefined) as ReviewFilters["scheduleMode"] })}><option value="">{t("allSchedules")}</option><option value="fixed">{t("fixedSchedule")}</option><option value="floating">{t("floatingTask")}</option><option value="quota">{t("quotaGoal")}</option></select>
          <button type="button" className="button secondary" onClick={copy} disabled={!model}>{t(copied ? "copied" : "copyReview")}</button>
        </div>
      </div>
      {!valid && <p className="error-message" role="alert">{t("invalidReviewRange")}</p>}

      {model && <>
        <section className="panel" aria-labelledby="review-summary-heading">
          <span className="eyebrow" id="review-summary-heading">{t("reviewSummary")}</span>
          <div className="review-summary">{reviewSentences(model, language).map((sentence) => <p key={sentence}>{sentence}</p>)}</div>
        </section>

        <div className="metric-grid">
          <div className="metric"><strong>{model.completedItems.length}</strong><span>{t("completedCheckIns")}</span></div>
          <div className="metric"><strong>{model.activeDays}</strong><span>{t("activeDays")}</span></div>
          <div className="metric"><strong>{model.achievedQuotaPeriods}</strong><span>{t("quotaPeriodsAchieved")}</span></div>
          <div className="metric"><strong>{model.reflectionDates.length}</strong><span>{t("reflectionDaysMetric")}</span></div>
        </div>

        <div className="review-grid">
          <section className="panel" aria-labelledby="review-evidence-heading">
            <div className="panel-head">
              <span className="eyebrow" id="review-evidence-heading">{t("evidence")}</span>
              {groups.length > evidencePreview && <button type="button" className="link-button" aria-expanded={showAllEvidence} onClick={() => setShowAllEvidence((value) => !value)}>{showAllEvidence ? t("showFewer") : t("showingOf", { shown: shownGroups.length, total: groups.length })}</button>}
            </div>
            <p className="muted small">{t("evidenceHint")}</p>
            {groups.length === 0 ? <p className="muted">{t("noCompletedWork")}</p> : <div className="completion-groups">{shownGroups.map((group) => <details key={group.taskId}><summary><span><strong>{group.title}</strong><small>{group.areaName ?? t("noArea")} · {t(`mode_${group.scheduleMode}`)}</small></span><b>{group.count}</b></summary><div className="evidence-dates">{group.dates.map((date) => <button type="button" key={date} onClick={() => onInspectDate(date)}>{label(date)}</button>)}</div></details>)}</div>}
          </section>
          <aside className="review-side">
            <section className="panel" aria-labelledby="area-breakdown-heading">
              <span className="eyebrow" id="area-breakdown-heading">{t("areaBreakdown")}</span>
              {model.areaBreakdown.length < 2 && <p className="muted small">{t("limitedAreaEvidence")}</p>}
              <div className="breakdown-list">{model.areaBreakdown.map((area) => <div key={area.areaId ?? "none"}><span>{area.name}</span><strong>{area.count}</strong><i style={{ width: `${model.completedItems.length ? area.count / model.completedItems.length * 100 : 0}%` }}/></div>)}</div>
              <span className="eyebrow spaced">{t("scheduleBreakdown")}</span>
              <div className="schedule-facts">{model.scheduleBreakdown.map((item) => <div key={item.mode}><span>{t(`mode_${item.mode}`)}</span><strong>{item.count}</strong></div>)}</div>
            </section>
            {(model.reflectionDates.length > 0 || model.emotionCounts.length > 0 || model.experienceRecords.length > 0) && <section className="panel context-panel" aria-labelledby="reflection-context-heading">
              <span className="eyebrow" id="reflection-context-heading">{t("reflectionContextOptional")}</span>
              <p>{t("reflectionDaysRecorded", { count: model.reflectionDates.length })}</p>
              {model.emotionCounts.length > 0 && <><div className="context-chips">{model.emotionCounts.map((emotion) => <span key={emotion.emotionId}>{emotion.label} · {emotion.count}</span>)}</div><small className="muted">{t("basedOnRecordedDays", { count: model.reflectionDates.length })}</small></>}
              {model.experienceRecords.length > 0 && <p className="muted small">{t("experienceSummary", model.experienceCounts)}</p>}
            </section>}
          </aside>
        </div>

        <section className="panel" aria-labelledby="quota-outcomes-heading">
          <span className="eyebrow" id="quota-outcomes-heading">{t("quotaOutcomes")}</span>
          {model.quotaFacts.length === 0 ? <p className="muted">{t("noQuotaPeriods")}</p> : <div className="quota-facts">{model.quotaFacts.map((fact) => <div key={`${fact.taskId}:${fact.period.start}`}><span><strong>{fact.title}</strong><small>{fact.period.start} – {fact.period.end}</small></span><b>{fact.count}/{fact.target}</b><em>{t(fact.provisional ? "quotaCurrentPeriod" : `quotaOutcome_${fact.outcome}`)}</em></div>)}</div>}
        </section>
      </>}
    </div>
  );
}
