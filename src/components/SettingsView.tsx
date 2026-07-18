import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createBackup, db, isBackupPayload, restoreBackup } from "../db";
import type { AppSettings, Language, Theme } from "../types";

interface SettingsViewProps {
  settings: AppSettings;
}

export function SettingsView({ settings }: SettingsViewProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const backgroundInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const update = (changes: Partial<AppSettings>) => db.settings.update("app", changes);

  const setBackground = (file?: File) => {
    if (!file || !file.type.startsWith("image/") || file.size > 5_000_000) return;
    const reader = new FileReader();
    reader.onload = () => update({ backgroundDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const exportData = async () => {
    const backup = await createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daily-canvas-backup-${backup.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const payload: unknown = JSON.parse(await file.text());
      if (!isBackupPayload(payload)) throw new Error("Invalid backup");
      await restoreBackup(payload);
      setMessage(t("importSuccess"));
    } catch {
      setMessage(t("importError"));
    }
  };

  return (
    <div className="view-stack settings-stack">
      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">{t("settings")}</span><h1>{t("appearance")}</h1></div></div>
        <div className="settings-grid">
          <label className="setting-row"><span><strong>{t("language")}</strong></span><select value={settings.language} onChange={(event) => update({ language: event.target.value as Language })}><option value="zh-CN">中文</option><option value="en">English</option></select></label>
          <label className="setting-row"><span><strong>{t("theme")}</strong></span><select value={settings.theme} onChange={(event) => update({ theme: event.target.value as Theme })}><option value="light">{t("light")}</option><option value="dark">{t("dark")}</option><option value="system">{t("system")}</option></select></label>
          <div className="setting-row"><span><strong>{t("background")}</strong><small>JPG, PNG, WebP · 5 MB</small></span><div className="inline-actions"><button type="button" className="button secondary" onClick={() => backgroundInput.current?.click()}>{t("chooseImage")}</button>{settings.backgroundDataUrl && <button type="button" className="button text-button" onClick={() => update({ backgroundDataUrl: undefined })}>{t("clearImage")}</button>}</div><input hidden ref={backgroundInput} type="file" accept="image/*" onChange={(event) => setBackground(event.target.files?.[0])} /></div>
          <label className="setting-row"><span><strong>{t("reduceMotion")}</strong></span><input className="switch" type="checkbox" checked={settings.reduceMotion} onChange={(event) => update({ reduceMotion: event.target.checked })} /></label>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading compact-heading"><div><span className="eyebrow">{t("data")}</span><h2>{t("data")}</h2><p>{t("dataLocal")}</p></div></div>
        <div className="data-actions"><button type="button" className="button primary" onClick={exportData}>{t("exportData")}</button><button type="button" className="button secondary" onClick={() => importInput.current?.click()}>{t("importData")}</button><input hidden ref={importInput} type="file" accept="application/json" onChange={(event) => importData(event.target.files?.[0])} /></div>
        {message && <p className="status-message" role="status">{message}</p>}
      </section>
    </div>
  );
}
