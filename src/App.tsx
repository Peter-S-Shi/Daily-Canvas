import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarView } from "./components/CalendarView";
import { FloatingView } from "./components/FloatingView";
import { Onboarding } from "./components/Onboarding";
import { ReflectionView } from "./components/ReflectionView";
import { RewardsView } from "./components/RewardsView";
import { SettingsView } from "./components/SettingsView";
import { TaskEditor } from "./components/TaskEditor";
import { TasksView } from "./components/TasksView";
import { TodayView } from "./components/TodayView";
import { db, initializeDb, resetDatabase } from "./db";
import { todayKey } from "./lib/dates";
import { backgroundStyle } from "./services/appearanceService";
import type { Task } from "./types";

type View = "today" | "floating" | "calendar" | "reflection" | "tasks" | "rewards" | "settings";
const nav: Array<{ id: View; icon: string }> = [{ id: "today", icon: "☀" }, { id: "floating", icon: "◌" }, { id: "calendar", icon: "▦" }, { id: "reflection", icon: "✎" }, { id: "tasks", icon: "✓" }, { id: "rewards", icon: "✦" }, { id: "settings", icon: "⚙" }];

export default function App() {
  const { t, i18n } = useTranslation(); const [view, setView] = useState<View>("today"); const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined); const [startup, setStartup] = useState<"loading" | "ready" | "error">("loading"); const [startupError, setStartupError] = useState(""); const [reflectionDate, setReflectionDate] = useState(todayKey()); const settings = useLiveQuery(() => db.settings.get("app"), []); const assets = useLiveQuery(() => db.appearanceAssets.toArray(), []) ?? [];
  useEffect(() => { initializeDb().then(() => setStartup("ready")).catch((error: unknown) => { setStartupError(error instanceof Error ? error.message : String(error)); setStartup("error"); }); }, []);
  useEffect(() => { if (!settings) return; void i18n.changeLanguage(settings.language); document.documentElement.dataset.theme = settings.theme; document.documentElement.lang = settings.language; document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion); }, [settings, i18n]);
  if (startup === "error") return <main className="recovery-screen"><span className="logo-mark">DC</span><h1>Daily Canvas could not open its local database</h1><p>Try reloading. If the database itself is damaged, reset only after confirming you have a recent backup.</p><div className="inline-actions"><button className="button primary" type="button" onClick={() => globalThis.location.reload()}>Reload</button><button className="button secondary" type="button" onClick={() => globalThis.confirm("Reset all Daily Canvas data stored in this browser?") && resetDatabase().then(() => globalThis.location.reload())}>Reset local data</button></div><details><summary>Technical details</summary><code>{startupError}</code></details></main>;
  if (startup === "loading" || !settings) return <div className="loading-screen"><span className="logo-mark">DC</span><p>Daily Canvas</p></div>;
  if (!settings.onboardingComplete) return <Onboarding settings={settings}/>;
  const slot = view === "today" || view === "calendar" || view === "reflection" ? view : "app"; const preference = settings.backgroundPreferences.find((item) => item.slot === slot) ?? settings.backgroundPreferences.find((item) => item.slot === "app"); const appPreference = settings.backgroundPreferences.find((item) => item.slot === "app");
  return <div className="app-shell" style={backgroundStyle(appPreference, assets.find((item) => item.id === appPreference?.assetId))}><aside className="sidebar"><button type="button" className="brand" onClick={() => setView("today")}><span className="logo-mark">DC</span><span><strong>{t("appName")}</strong><small>Daily Canvas</small></span></button><nav>{nav.map((item) => <button type="button" key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.icon}</span><em>{t(item.id)}</em></button>)}</nav><button type="button" className="sidebar-add" onClick={() => setEditingTask(null)}>＋ <span>{t("addTask")}</span></button><p className="privacy-note">Local-first · Private by default</p></aside><main className="main-content personalized-surface" style={backgroundStyle(preference, assets.find((item) => item.id === preference?.assetId))}>{view === "today" && <TodayView onEditTask={setEditingTask}/>} {view === "floating" && <FloatingView onAdd={() => setEditingTask(null)} onEdit={setEditingTask}/>} {view === "calendar" && <CalendarView weekStartsOn={settings.weekStartsOn} onOpenReflection={(date) => { setReflectionDate(date); setView("reflection"); }}/>} {view === "reflection" && <ReflectionView key={reflectionDate} initialDate={reflectionDate}/>} {view === "tasks" && <TasksView onAdd={() => setEditingTask(null)} onEdit={setEditingTask}/>} {view === "rewards" && <RewardsView/>} {view === "settings" && <SettingsView settings={settings}/>}</main>{editingTask !== undefined && <TaskEditor task={editingTask ?? undefined} onClose={() => setEditingTask(undefined)}/>}</div>;
}
