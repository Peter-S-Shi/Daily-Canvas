import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { deleteAppearanceAsset, importBackground, setBackgroundPreference } from "../services/appearanceService";
import { createBackup, downloadBackup, migrateBackup, restoreBackup } from "../services/backupService";
import { updateSettings } from "../services/settingsService";
import { runAutoBackup } from "../services/autoBackupService";
import { backupDirectory, getDesktopInfo, listAutoBackups, openExternal, readAutoBackup, type BackupFileInfo } from "../desktop/desktopAdapter";
import { checkForUpdate, type UpdateCheckResult } from "../services/updateCheckService";
import packageJson from "../../package.json";
import type { SectionId } from "../navigation/workspaceModel";
import type { AppSettings, BackgroundSlot, Language, RestorePreview, Theme } from "../types";

const FALLBACK_APP_VERSION = packageJson.version;

type Operation = "idle" | "saving" | "exporting" | "reading" | "restoring";
const slots: BackgroundSlot[] = ["app", "today", "calendar", "reflection"];

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return <div className="segmented-control" role="group" aria-label={label}>{options.map((option) => <button type="button" key={String(option.value)} className={option.value === value ? "active" : ""} aria-pressed={option.value === value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}

function SettingRow({ title, hint, control }: { title: string; hint?: string; control: ReactNode }) {
  return <div className="setting-row"><div className="setting-copy"><strong>{title}</strong>{hint && <small>{hint}</small>}</div><div className="setting-control">{control}</div></div>;
}

export function SettingsView({ settings, section, nav }: { settings: AppSettings; section: SectionId; nav: ReactNode }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [operation, setOperation] = useState<Operation>("idle"); const [preview, setPreview] = useState<RestorePreview>(); const [slot, setSlot] = useState<BackgroundSlot>("app");
  const backgroundInput = useRef<HTMLInputElement>(null); const importInput = useRef<HTMLInputElement>(null);
  const [autoBackups, setAutoBackups] = useState<BackupFileInfo[]>([]); const [backupDir, setBackupDir] = useState<string>();
  const [runningAutoBackup, setRunningAutoBackup] = useState(false);
  const [appVersion, setAppVersion] = useState(FALLBACK_APP_VERSION);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult>();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const refreshAutoBackups = () => { void listAutoBackups().then(setAutoBackups); void backupDirectory().then(setBackupDir); };
  useEffect(() => { if (section === "settingsData") refreshAutoBackups(); }, [section]);
  useEffect(() => { if (section !== "settingsAbout") return; void getDesktopInfo().then((info) => { if (info) setAppVersion(info.appVersion); }); void runUpdateCheck(); }, [section]);
  const runUpdateCheck = async () => { setCheckingUpdate(true); try { setUpdateResult(await checkForUpdate(appVersion)); } finally { setCheckingUpdate(false); } };
  const backupNow = async () => { setRunningAutoBackup(true); setError(""); try { const outcome = await runAutoBackup({ settings: { ...settings, autoBackupEnabled: true, lastAutoBackupAt: undefined } }); if (outcome.ran) { setMessage(t("automaticBackupSuccess")); refreshAutoBackups(); } else if (outcome.reason === "failed") setError(outcome.error); } finally { setRunningAutoBackup(false); } };
  const restoreFromAutoBackup = async (fileName: string) => { setOperation("reading"); setPreview(undefined); setError(""); try { const content = await readAutoBackup(fileName); if (!content) throw new Error("unavailable"); setPreview(migrateBackup(JSON.parse(content))); } catch { setError(t("importError")); } finally { setOperation("idle"); } };
  const assets = useLiveQuery(() => db.appearanceAssets.toArray(), []) ?? [];
  const preference = settings.backgroundPreferences.find((item) => item.slot === slot)!;
  const asset = assets.find((item) => item.id === preference?.assetId);
  const update = async (changes: Partial<AppSettings>) => { setOperation("saving"); setError(""); try { await updateSettings(changes); setMessage(t("settingsSaved")); } catch { setError(t("saveError")); } finally { setOperation("idle"); } };
  const chooseBackground = async (file?: File) => { if (!file) return; setError(""); try { const imported = await importBackground(file); if (asset) await deleteAppearanceAsset(asset.id); await setBackgroundPreference(slot, { assetId: imported.id }); setMessage(t("settingsSaved")); } catch { setError(t("imageError")); } };
  const clear = async () => { if (asset) await deleteAppearanceAsset(asset.id); };
  const exportData = async () => { setOperation("exporting"); setError(""); try { if (await downloadBackup(await createBackup())) setMessage(t("exportSuccess")); } catch { setError(t("exportError")); } finally { setOperation("idle"); } };
  const readImport = async (file?: File) => { if (!file) return; setOperation("reading"); setPreview(undefined); setError(""); try { setPreview(migrateBackup(JSON.parse(await file.text()))); } catch (caught) { setError(caught instanceof Error ? caught.message : t("importError")); } finally { setOperation("idle"); } };
  const confirmRestore = async () => { if (!preview) return; setOperation("restoring"); setError(""); try { if (!(await downloadBackup(await createBackup(), "daily-canvas-safety-backup"))) return; await restoreBackup(preview.payload); setPreview(undefined); setMessage(t("importSuccess")); } catch { setError(t("restoreError")); } finally { setOperation("idle"); } };

  const heading = t(section === "settingsAppearance" ? "appearance" : section === "settingsData" ? "dataAndBackup" : section === "settingsShortcuts" ? "shortcuts" : section === "settingsAbout" ? "aboutAndUpdates" : "general");
  const shortcuts: Array<{ keys: string; labelKey: string }> = [
    { keys: "Ctrl/⌘ K", labelKey: "shortcut_search" },
    { keys: "Ctrl/⌘ Shift K", labelKey: "shortcut_quickCapture" },
    { keys: "Ctrl/⌘ 1", labelKey: "shortcut_today" },
    { keys: "Esc", labelKey: "shortcut_escape" },
  ];
  return (
    <div className="page settings-layout">
      {nav}
      <section className="settings-panel" aria-labelledby="settings-heading">
        <div className="settings-heading"><h2 id="settings-heading" className="page-title">{heading}</h2>{operation === "saving" && <span className="save-state">{t("saving")}</span>}</div>

        {section === "settingsGeneral" && <>
          <SettingRow title={t("language")} hint={t("languageHint")} control={<Segmented label={t("language")} value={settings.language} options={[{ value: "en" as Language, label: "English" }, { value: "zh-CN" as Language, label: "中文" }]} onChange={(language) => update({ language })}/>}/>
          <SettingRow title={t("weekStartsOn")} hint={t("weekStartsOnHint")} control={<select aria-label={t("weekStartsOn")} value={settings.weekStartsOn} onChange={(event) => update({ weekStartsOn: Number(event.target.value) as 0 | 1 })}><option value={1}>{t("monday")}</option><option value={0}>{t("sunday")}</option></select>}/>
          <SettingRow title={t("reduceMotion")} hint={t("reduceMotionHint")} control={<input className="switch" type="checkbox" aria-label={t("reduceMotion")} checked={settings.reduceMotion} onChange={(event) => update({ reduceMotion: event.target.checked })}/>}/>
          <SettingRow title={t("reflectionPrompts")} hint={t("reflectionPromptsHint")} control={<input className="switch" type="checkbox" aria-label={t("reflectionPrompts")} checked={settings.reflectionPromptsEnabled} onChange={(event) => update({ reflectionPromptsEnabled: event.target.checked })}/>}/>
        </>}

        {section === "settingsAppearance" && <>
          <SettingRow title={t("theme")} control={<Segmented label={t("theme")} value={settings.theme} options={[{ value: "light" as Theme, label: t("light") }, { value: "dark" as Theme, label: t("dark") }, { value: "system" as Theme, label: t("system") }]} onChange={(theme) => update({ theme })}/>}/>
          <div className="setting-row setting-row-stacked">
            <div className="setting-copy"><strong>{t("backgroundSlots")}</strong><small>{t("backgroundPrivacy")}</small></div>
            <div className="background-controls">
              <div className="background-slot-row">
                <select aria-label={t("backgroundSlots")} value={slot} onChange={(event) => setSlot(event.target.value as BackgroundSlot)}>{slots.map((item) => <option key={item} value={item}>{t(`slot_${item}`)}</option>)}</select>
                <button type="button" className="button secondary" onClick={() => backgroundInput.current?.click()}>{asset ? t("replaceImage") : t("chooseImage")}</button>
                {asset && <button type="button" className="button text-button" onClick={clear}>{t("clearImage")}</button>}
              </div>
              <input hidden ref={backgroundInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseBackground(event.target.files?.[0])}/>
              {preference && <div className="background-options">
                <label className="field"><span>{t("fit")}</span><select value={preference.fit} onChange={(event) => setBackgroundPreference(slot, { fit: event.target.value as "cover" | "contain" })}><option value="cover">{t("cover")}</option><option value="contain">{t("contain")}</option></select></label>
                <label className="field"><span>{t("position")}</span><select value={preference.position} onChange={(event) => setBackgroundPreference(slot, { position: event.target.value })}><option value="center">{t("center")}</option><option value="top">{t("top")}</option><option value="bottom">{t("bottom")}</option></select></label>
                <label className="field"><span>{t("overlay")}</span><input type="range" min="0.2" max="0.85" step="0.05" value={preference.overlayOpacity} onChange={(event) => setBackgroundPreference(slot, { overlayOpacity: Number(event.target.value) })}/></label>
                <label className="field"><span>{t("blur")}</span><input type="range" min="0" max="12" value={preference.blurPx} onChange={(event) => setBackgroundPreference(slot, { blurPx: Number(event.target.value) })}/></label>
              </div>}
            </div>
          </div>
        </>}

        {section === "settingsData" && <>
          <p className="settings-intro">{t("dataLocal")}</p>
          <SettingRow title={t("exportData")} hint={t("exportDataHint")} control={<button disabled={operation !== "idle"} type="button" className="button primary" onClick={exportData}>{operation === "exporting" ? t("exporting") : t("exportData")}</button>}/>
          <SettingRow title={t("importData")} hint={t("importDataHint")} control={<><button disabled={operation !== "idle"} type="button" className="button secondary" onClick={() => importInput.current?.click()}>{operation === "reading" ? t("readingBackup") : t("importData")}</button><input hidden ref={importInput} type="file" accept="application/json" onChange={(event) => readImport(event.target.files?.[0])}/></>}/>
          {preview && <div className="restore-preview" role="region" aria-label={t("restorePreview")}>
            <h3>{t("restorePreview")}</h3>
            <p>{t("restoreCountsV4", preview.counts)}</p>
            {preview.migrated && <p>{t("backupWillMigrate", { version: preview.sourceVersion })}</p>}
            {preview.warnings.map((warning) => <p className="warning-message" key={warning}>{warning}</p>)}
            <p>{t("safetyBackupNotice")}</p>
            <div className="inline-actions"><button type="button" className="button secondary" onClick={() => setPreview(undefined)}>{t("cancel")}</button><button type="button" className="button primary" disabled={operation === "restoring"} onClick={confirmRestore}>{operation === "restoring" ? t("restoring") : t("confirmRestore")}</button></div>
          </div>}

          <h3 className="settings-subheading">{t("automaticBackup")}</h3>
          <SettingRow title={t("automaticBackupEnabled")} hint={t("automaticBackupHint")} control={<input className="switch" type="checkbox" aria-label={t("automaticBackupEnabled")} checked={settings.autoBackupEnabled} onChange={(event) => update({ autoBackupEnabled: event.target.checked })}/>}/>
          <dl className="fact-list">
            <div><dt>{t("lastAutoBackup")}</dt><dd>{settings.lastAutoBackupAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(settings.lastAutoBackupAt)) : t("neverYet")}</dd></div>
            <div><dt>{t("backupLocation")}</dt><dd>{backupDir ?? t("desktopOnlyFeature")}</dd></div>
          </dl>
          <SettingRow title={t("backUpNow")} hint={t("backUpNowHint")} control={<button type="button" className="button secondary" disabled={runningAutoBackup} onClick={backupNow}>{runningAutoBackup ? t("exporting") : t("backUpNow")}</button>}/>
          {autoBackups.length > 0 && <div className="backup-history" role="region" aria-label={t("backupHistory")}>
            <h4>{t("backupHistory")}</h4>
            <ul className="backup-history-list">{autoBackups.map((file) => <li key={file.fileName}><span>{file.fileName}</span><button type="button" className="button text-button" disabled={operation !== "idle"} onClick={() => restoreFromAutoBackup(file.fileName)}>{t("restoreFromThis")}</button></li>)}</ul>
          </div>}
        </>}

        {section === "settingsAbout" && <>
          <dl className="fact-list">
            <div><dt>{t("installedVersion")}</dt><dd>{appVersion}</dd></div>
          </dl>
          <SettingRow title={t("checkForUpdates")} hint={t("checkForUpdatesHint")} control={<button type="button" className="button secondary" disabled={checkingUpdate} onClick={runUpdateCheck}>{checkingUpdate ? t("checkingForUpdates") : t("checkForUpdates")}</button>}/>
          {updateResult && <p role="status" className={updateResult.state === "unable-to-check" ? "error-message" : "status-message"}>
            {updateResult.state === "up-to-date" && t("upToDate")}
            {updateResult.state === "unable-to-check" && t("unableToCheck")}
            {updateResult.state === "update-available" && <>{t("updateAvailable", { version: updateResult.latestVersion })} <button type="button" className="link-button" onClick={() => openExternal(updateResult.releaseUrl)}>{t("viewRelease")}</button></>}
          </p>}
        </>}

        {section === "settingsShortcuts" && <>
          <p className="settings-intro">{t("shortcutsIntro")}</p>
          <dl className="fact-list shortcuts-list">{shortcuts.map((item) => <div key={item.labelKey}><dt>{t(item.labelKey)}</dt><dd><kbd>{item.keys}</kbd></dd></div>)}</dl>
        </>}

        {message && <p className="status-message" role="status">{message}</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
      </section>
    </div>
  );
}
