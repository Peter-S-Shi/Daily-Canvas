import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createBackup, downloadBackup, migrateBackup, restoreBackup } from "../services/backupService";
import { updateSettings } from "../services/settingsService";
import type { AppSettings, Language, RestorePreview, Theme } from "../types";

interface SettingsViewProps { settings: AppSettings }
type Operation = "idle" | "saving" | "exporting" | "reading" | "restoring";

export function SettingsView({ settings }: SettingsViewProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [operation, setOperation] = useState<Operation>("idle");
  const [preview, setPreview] = useState<RestorePreview>();
  const backgroundInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const update = async (changes: Partial<AppSettings>) => {
    setOperation("saving"); setError("");
    try { await updateSettings(changes); setMessage(t("settingsSaved")); }
    catch { setError(t("saveError")); }
    finally { setOperation("idle"); }
  };

  const setBackground = (file?: File) => {
    if (!file || !file.type.startsWith("image/") || file.size > 5_000_000) return setError(t("imageError"));
    const reader = new FileReader();
    reader.onerror = () => setError(t("imageError"));
    reader.onload = () => void update({ backgroundDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const exportData = async () => {
    setOperation("exporting"); setError("");
    try { downloadBackup(await createBackup()); setMessage(t("exportSuccess")); }
    catch { setError(t("exportError")); }
    finally { setOperation("idle"); }
  };

  const readImport = async (file?: File) => {
    if (!file) return;
    setOperation("reading"); setPreview(undefined); setError("");
    try { setPreview(migrateBackup(JSON.parse(await file.text()))); }
    catch (caught) { setError(caught instanceof Error ? caught.message : t("importError")); }
    finally { setOperation("idle"); }
  };

  const confirmRestore = async () => {
    if (!preview) return;
    setOperation("restoring"); setError("");
    try {
      downloadBackup(await createBackup(), "daily-canvas-safety-backup");
      await restoreBackup(preview.payload);
      setPreview(undefined); setMessage(t("importSuccess"));
    } catch { setError(t("restoreError")); }
    finally { setOperation("idle"); }
  };

  return (
    <div className="view-stack settings-stack">
      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">{t("settings")}</span><h1>{t("appearance")}</h1></div>{operation === "saving" && <span className="save-state">{t("saving")}</span>}</div>
        <div className="settings-grid">
          <label className="setting-row"><span><strong>{t("language")}</strong></span><select value={settings.language} onChange={(event) => update({ language: event.target.value as Language })}><option value="zh-CN">中文</option><option value="en">English</option></select></label>
          <label className="setting-row"><span><strong>{t("theme")}</strong></span><select value={settings.theme} onChange={(event) => update({ theme: event.target.value as Theme })}><option value="light">{t("light")}</option><option value="dark">{t("dark")}</option><option value="system">{t("system")}</option></select></label>
          <label className="setting-row"><span><strong>{t("weekStartsOn")}</strong><small>{t("weekStartsOnHint")}</small></span><select value={settings.weekStartsOn} onChange={(event) => update({ weekStartsOn: Number(event.target.value) as 0 | 1 })}><option value={1}>{t("monday")}</option><option value={0}>{t("sunday")}</option></select></label>
          <div className="setting-row"><span><strong>{t("background")}</strong><small>JPG, PNG, WebP · 5 MB</small></span><div className="inline-actions"><button type="button" className="button secondary" onClick={() => backgroundInput.current?.click()}>{t("chooseImage")}</button>{settings.backgroundDataUrl && <button type="button" className="button text-button" onClick={() => update({ backgroundDataUrl: undefined })}>{t("clearImage")}</button>}</div><input hidden ref={backgroundInput} type="file" accept="image/*" onChange={(event) => setBackground(event.target.files?.[0])} /></div>
          <label className="setting-row"><span><strong>{t("reduceMotion")}</strong></span><input className="switch" type="checkbox" checked={settings.reduceMotion} onChange={(event) => update({ reduceMotion: event.target.checked })} /></label>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading compact-heading"><div><span className="eyebrow">{t("data")}</span><h2>{t("backupHeading")}</h2><p>{t("dataLocal")}</p></div></div>
        <div className="data-actions"><button disabled={operation !== "idle"} type="button" className="button primary" onClick={exportData}>{operation === "exporting" ? t("exporting") : t("exportData")}</button><button disabled={operation !== "idle"} type="button" className="button secondary" onClick={() => importInput.current?.click()}>{operation === "reading" ? t("readingBackup") : t("importData")}</button><input hidden ref={importInput} type="file" accept="application/json" onChange={(event) => readImport(event.target.files?.[0])} /></div>
        {preview && <div className="restore-preview"><h3>{t("restorePreview")}</h3><p>{t("restoreCounts", preview.counts)}</p>{preview.migrated && <p>{t("backupWillMigrate", { version: preview.sourceVersion })}</p>}{preview.warnings.map((warning) => <p className="warning-message" key={warning}>{warning}</p>)}<p>{t("safetyBackupNotice")}</p><div className="inline-actions"><button type="button" className="button secondary" onClick={() => setPreview(undefined)}>{t("cancel")}</button><button type="button" className="button primary" disabled={operation === "restoring"} onClick={confirmRestore}>{operation === "restoring" ? t("restoring") : t("confirmRestore")}</button></div></div>}
        {message && <p className="status-message" role="status">{message}</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
      </section>
    </div>
  );
}
