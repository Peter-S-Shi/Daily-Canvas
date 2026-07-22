import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createTasksFromTemplates, taskTemplates } from "../services/taskService";
import { updateSettings } from "../services/settingsService";
import type { AppSettings } from "../types";

export function Onboarding({ settings }: { settings: AppSettings }) {
  const { t } = useTranslation();
  const templates = taskTemplates(settings.language);
  const [selected, setSelected] = useState<number[]>([0]);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  const finish = async (withTemplates: boolean) => {
    setState("saving");
    try {
      if (withTemplates) await createTasksFromTemplates(settings.language, selected);
      await updateSettings({ onboardingComplete: true });
    } catch {
      setState("error");
    }
  };

  return (
    <main className="onboarding-screen">
      <section className="onboarding-card">
        <span className="logo-mark">DC</span>
        <span className="eyebrow">{t("welcomeEyebrow")}</span>
        <h1>{t("welcomeTitle")}</h1>
        <p>{t("welcomeBody")}</p>
        <div className="template-grid">
          {templates.map((template, index) => (
            <button key={template.title} type="button" className={selected.includes(index) ? "template-card selected" : "template-card"} onClick={() => setSelected((items) => items.includes(index) ? items.filter((item) => item !== index) : [...items, index])}>
              <span className="task-color" style={{ background: template.colorOverride }} />
              <strong>{template.title}</strong>
              <small>{t(template.kind === "avoidance" ? "avoidanceHabit" : "goodHabit")}</small>
            </button>
          ))}
        </div>
        {state === "error" && <p className="error-message" role="alert">{t("saveError")}</p>}
        <div className="onboarding-actions">
          <button className="button secondary" disabled={state === "saving"} type="button" onClick={() => finish(false)}>{t("startEmpty")}</button>
          <button className="button primary" disabled={state === "saving" || selected.length === 0} type="button" onClick={() => finish(true)}>{state === "saving" ? t("saving") : t("useExamples")}</button>
        </div>
        <small className="privacy-line">{t("welcomePrivacy")}</small>
      </section>
    </main>
  );
}
