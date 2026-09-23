import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadOnThisDay, type OnThisDayGroup } from "../services/onThisDayService";
import { todayKey } from "../lib/dates";

/**
 * On This Day (Milestone 13): a read-only lens over existing Daily Reflections and Meditations
 * from the exact same month+day in prior years. It never edits or duplicates a source record --
 * "Open original" is the only action, and there is no growth/emotion/analysis framing here.
 */
export function OnThisDayView({ onOpenReflection, onOpenMeditation }: { onOpenReflection: (date: string) => void; onOpenMeditation: (id: string) => void }) {
  const { t, i18n } = useTranslation();
  const [groups, setGroups] = useState<OnThisDayGroup[]>();
  useEffect(() => { let active = true; void loadOnThisDay(todayKey()).then((result) => { if (active) setGroups(result); }); return () => { active = false; }; }, []);

  return (
    <div className="page on-this-day-page">
      <p className="eyebrow">{t("onThisDay")}</p>
      <h2 className="page-title">{new Intl.DateTimeFormat(i18n.language, { month: "long", day: "numeric" }).format(new Date())}</h2>
      <p className="settings-intro">{t("onThisDayIntro")}</p>
      {groups === undefined && <p className="save-state">{t("saving")}</p>}
      {groups?.length === 0 && <p className="empty-state">{t("onThisDayEmpty")}</p>}
      {groups?.map((group) => (
        <section key={group.year} className="on-this-day-group" aria-labelledby={`otd-${group.year}`}>
          <h3 id={`otd-${group.year}`}>{group.year}</h3>
          <ul className="on-this-day-list">
            {group.entries.map((entry) => (
              <li key={entry.source === "reflection" ? `r-${entry.reflection.date}` : `m-${entry.meditation.id}`} className="on-this-day-entry">
                <span className="on-this-day-kind">{entry.source === "reflection" ? t("dailyReflection") : t("meditations")}</span>
                <p className="on-this-day-excerpt">{(entry.source === "reflection" ? entry.reflection.note : entry.meditation.content).slice(0, 160)}</p>
                <button type="button" className="button text-button" onClick={() => entry.source === "reflection" ? onOpenReflection(entry.reflection.date) : onOpenMeditation(entry.meditation.id)}>{t("openOriginal")}</button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
