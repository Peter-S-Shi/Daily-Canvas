import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AreasManager } from "./components/AreasManager";
import { CalendarView } from "./components/CalendarView";
import { FloatingView } from "./components/FloatingView";
import { LifecycleView } from "./components/LifecycleView";
import { MilestoneCelebration } from "./components/MilestoneCelebration";
import { MeditationsView } from "./components/MeditationsView";
import { Onboarding } from "./components/Onboarding";
import { ReflectionView } from "./components/ReflectionView";
import { ReviewView } from "./components/ReviewView";
import { RewardsView } from "./components/RewardsView";
import { SettingsView } from "./components/SettingsView";
import { DesktopShell } from "./components/shell/DesktopShell";
import { TaskEditor } from "./components/TaskEditor";
import { TasksView } from "./components/TasksView";
import { TodayView } from "./components/TodayView";
import { db, initializeDb, resetDatabase } from "./db";
import { calendarEvidenceFor, reflectionFor, useWorkspaceNavigation } from "./navigation/useWorkspaceNavigation";
import { backgroundStyle } from "./services/appearanceService";
import { resumeExpiredPauses } from "./services/lifecycleService";
import type { Task } from "./types";

export default function App() {
  const { t, i18n } = useTranslation();
  const navigation = useWorkspaceNavigation();
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined);
  const [startup, setStartup] = useState<"loading" | "ready" | "error">("loading");
  const [startupError, setStartupError] = useState("");
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const assets = useLiveQuery(() => db.appearanceAssets.toArray(), []) ?? [];
  const pendingLifecycle = useLiveQuery(() => db.taskLifecycles.where("celebrationPending").equals(1).first(), []);
  const pendingTask = useLiveQuery(() => pendingLifecycle ? db.tasks.get(pendingLifecycle.taskId) : undefined, [pendingLifecycle?.taskId]);
  useEffect(() => { initializeDb().then(resumeExpiredPauses).then(() => setStartup("ready")).catch((error: unknown) => { setStartupError(error instanceof Error ? error.message : String(error)); setStartup("error"); }); }, []);
  useEffect(() => { if (!settings) return; void i18n.changeLanguage(settings.language); document.documentElement.dataset.theme = settings.theme; document.documentElement.lang = settings.language; document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion); }, [settings, i18n]);
  if (startup === "error") return <main className="recovery-screen"><span className="logo-mark">DC</span><h1>Daily Canvas could not open its local database</h1><p>Try reloading. If the database itself is damaged, reset only after confirming you have a recent backup.</p><div className="inline-actions"><button className="button primary" type="button" onClick={() => globalThis.location.reload()}>Reload</button><button className="button secondary" type="button" onClick={() => globalThis.confirm("Reset all Daily Canvas data stored in this browser?") && resetDatabase().then(() => globalThis.location.reload())}>Reset local data</button></div><details><summary>Technical details</summary><code>{startupError}</code></details></main>;
  if (startup === "loading" || !settings) return <div className="loading-screen"><span className="logo-mark">DC</span><p>Daily Canvas</p></div>;
  if (!settings.onboardingComplete) return <Onboarding settings={settings}/>;
  const preferenceFor = (slot: string) => settings.backgroundPreferences.find((item) => item.slot === slot) ?? settings.backgroundPreferences.find((item) => item.slot === "app");
  const appPreference = preferenceFor("app");
  const sectionPreference = preferenceFor(navigation.backgroundSlot);
  const addTaskAction = navigation.workspace.id === "settings" || navigation.workspace.id === "review" ? undefined : <button type="button" className="button primary" onClick={() => setEditingTask(null)}>＋ {t("addTask")}</button>;
  return <>
    <DesktopShell navigation={navigation} actions={addTaskAction} shellStyle={backgroundStyle(appPreference, assets.find((item) => item.id === appPreference?.assetId))} contentStyle={backgroundStyle(sectionPreference, assets.find((item) => item.id === sectionPreference?.assetId))}>
      {navigation.section.id === "todayExecution" && <TodayView onEditTask={setEditingTask}/>}
      {navigation.section.id === "floating" && <FloatingView onAdd={() => setEditingTask(null)} onEdit={setEditingTask}/>}
      {navigation.section.id === "calendar" && <CalendarView key={navigation.calendarDate} initialDate={navigation.calendarDate} weekStartsOn={settings.weekStartsOn} onOpenReflection={(date) => navigation.navigate(reflectionFor(date))}/>}
      {navigation.section.id === "allTasks" && <TasksView onAdd={() => setEditingTask(null)} onEdit={setEditingTask}/>}
      {navigation.section.id === "areas" && <div className="view-stack"><section className="panel"><AreasManager/></section></div>}
      {navigation.section.id === "lifecycle" && <LifecycleView onEdit={setEditingTask}/>}
      {navigation.section.id === "rewards" && <RewardsView/>}
      {navigation.section.id === "dailyReflection" && <ReflectionView key={navigation.reflectionDate} initialDate={navigation.reflectionDate}/>}
      {navigation.section.id === "meditations" && <MeditationsView/>}
      {navigation.section.id === "periodReview" && <ReviewView weekStartsOn={settings.weekStartsOn} onInspectDate={(date) => navigation.navigate(calendarEvidenceFor(date))}/>}
      {navigation.workspace.id === "settings" && <SettingsView settings={settings} section={navigation.section.id}/>}
    </DesktopShell>
    {editingTask !== undefined && <TaskEditor task={editingTask ?? undefined} onClose={() => setEditingTask(undefined)}/>}
    {pendingLifecycle && pendingTask && <MilestoneCelebration task={pendingTask} lifecycle={pendingLifecycle}/>}
  </>;
}
