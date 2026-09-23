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
import { DesktopShell, SectionNav } from "./components/shell/DesktopShell";
import { TaskEditor } from "./components/TaskEditor";
import { TasksView } from "./components/TasksView";
import { TodayView } from "./components/TodayView";
import { InboxView } from "./components/InboxView";
import { QuickCaptureDialog } from "./components/QuickCaptureDialog";
import { SearchDialog } from "./components/SearchDialog";
import { TimelineView } from "./components/timeline/TimelineView";
import { db, initializeDb, resetDatabase } from "./db";
import { calendarEvidenceFor, reflectionFor, taskDetailFor, timelineFor, useWorkspaceNavigation } from "./navigation/useWorkspaceNavigation";
import { backgroundStyle } from "./services/appearanceService";
import { deleteCapture } from "./services/inboxService";
import { resumeExpiredPauses } from "./services/lifecycleService";
import { catchUpMissedReminders, checkDueReminders } from "./services/reminderService";
import { todayKey } from "./lib/dates";
import type { Schedule, SearchResult, Task } from "./types";

const REMINDER_CHECK_INTERVAL_MS = 20_000;
const isEditableTarget = (target: EventTarget | null) => target instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);

type Editing = { task?: Task; mode?: Schedule["mode"]; initialTitle?: string; captureId?: string };

export default function App() {
  const { t, i18n } = useTranslation();
  const navigation = useWorkspaceNavigation();
  const [editing, setEditing] = useState<Editing>();
  const [quickCapture, setQuickCapture] = useState(false);
  const [searching, setSearching] = useState(false);
  const [startup, setStartup] = useState<"loading" | "ready" | "error">("loading");
  const [startupError, setStartupError] = useState("");
  const settings = useLiveQuery(() => db.settings.get("app"), []);
  const assets = useLiveQuery(() => db.appearanceAssets.toArray(), []) ?? [];
  const pendingLifecycle = useLiveQuery(() => db.taskLifecycles.where("celebrationPending").equals(1).first(), []);
  const pendingTask = useLiveQuery(() => pendingLifecycle ? db.tasks.get(pendingLifecycle.taskId) : undefined, [pendingLifecycle?.taskId]);
  useEffect(() => { initializeDb().then(resumeExpiredPauses).then(() => setStartup("ready")).catch((error: unknown) => { setStartupError(error instanceof Error ? error.message : String(error)); setStartup("error"); }); }, []);
  // Reminders are an in-app-only assistive feature: a notification failure must never affect local-data startup/recovery, so this is deliberately kept out of the initializeDb chain above (reminderService also catches its own errors).
  useEffect(() => { if (startup !== "ready") return; void catchUpMissedReminders(); const id = setInterval(() => { void checkDueReminders(); }, REMINDER_CHECK_INTERVAL_MS); return () => clearInterval(id); }, [startup]);
  /** Frozen desktop shortcut set (ROADMAP M12): Ctrl/Cmd+K Search, Ctrl/Cmd+Shift+K Quick Capture, Ctrl/Cmd+1 Today. Escape is handled locally by each Dialog. Guarded against editable targets so text editing is never hijacked. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || isEditableTarget(event.target)) return;
      const key = event.key.toLocaleLowerCase();
      if (key === "k" && event.shiftKey) { event.preventDefault(); setQuickCapture(true); return; }
      if (key === "k") { event.preventDefault(); setSearching(true); return; }
      if (key === "1") { event.preventDefault(); navigation.openWorkspace("today"); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigation]);
  useEffect(() => { if (!settings) return; void i18n.changeLanguage(settings.language); document.documentElement.dataset.theme = settings.theme; document.documentElement.lang = settings.language; document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion); }, [settings, i18n]);
  if (startup === "error") return <main className="recovery-screen"><span className="logo-mark">DC</span><h1>Daily Canvas could not open its local data</h1><p>Try reloading. If the local data itself is damaged, reset only after confirming you have a recent backup.</p><div className="inline-actions"><button className="button primary" type="button" onClick={() => globalThis.location.reload()}>Reload</button><button className="button secondary" type="button" onClick={() => globalThis.confirm("Reset all Daily Canvas data stored on this device?") && resetDatabase().then(() => globalThis.location.reload())}>Reset local data</button></div><details><summary>Technical details</summary><code>{startupError}</code></details></main>;
  if (startup === "loading" || !settings) return <div className="loading-screen"><span className="logo-mark">DC</span><p>Daily Canvas</p></div>;
  if (!settings.onboardingComplete) return <Onboarding settings={settings}/>;
  const preferenceFor = (slot: string) => settings.backgroundPreferences.find((item) => item.slot === slot) ?? settings.backgroundPreferences.find((item) => item.slot === "app");
  const appPreference = preferenceFor("app");
  const sectionPreference = preferenceFor(navigation.backgroundSlot);
  const createTask = (mode?: Schedule["mode"]) => setEditing({ mode });
  const editTask = (task: Task) => setEditing({ task });
  const openTask = (taskId: string) => navigation.navigate(taskDetailFor(taskId));
  const section = navigation.section.id;
  const selectSearchResult = (result: SearchResult) => { setSearching(false); if (result.type === "task") navigation.navigate(taskDetailFor(result.id)); else if (result.type === "reflection") navigation.navigate(reflectionFor(result.id)); else if (result.type === "meditation") navigation.navigate({ section: "meditations", meditationId: result.id }); else navigation.navigate({ section: "allTasks", areaId: result.id }); };
  return <>
    <DesktopShell navigation={navigation} onSearch={() => setSearching(true)} onQuickCapture={() => setQuickCapture(true)} shellStyle={backgroundStyle(appPreference, assets.find((item) => item.id === appPreference?.assetId))} contentStyle={backgroundStyle(sectionPreference, assets.find((item) => item.id === sectionPreference?.assetId))}>
      {section === "todayExecution" && <TodayView onCreateTask={() => createTask()} onOpenTask={openTask} onOpenTimeline={() => navigation.navigate(timelineFor(todayKey()))}/>}
      {section === "inboxCaptures" && <InboxView onFullTask={(capture) => setEditing({ initialTitle: capture.title, captureId: capture.id })}/>}
      {section === "floating" && <FloatingView onCreateTask={() => createTask("floating")} onOpenTask={openTask}/>}
      {section === "calendar" && <CalendarView key={navigation.calendarDate} initialDate={navigation.calendarDate} weekStartsOn={settings.weekStartsOn} onOpenReflection={(date) => navigation.navigate(reflectionFor(date))}/>}
      {section === "timeline" && <TimelineView key={navigation.timelineDate} initialDate={navigation.timelineDate} weekStartsOn={settings.weekStartsOn} onOpenTask={openTask}/>}
      {section === "allTasks" && <TasksView selectedTaskId={navigation.selectedTaskId} selectedAreaId={navigation.selectedAreaId} onSelectTask={navigation.selectTask} onCreateTask={() => createTask()} onEditTask={editTask} onInspectDate={(date) => navigation.navigate(calendarEvidenceFor(date))} onOpenLifecycle={() => navigation.openSection("lifecycle")}/>}
      {section === "areas" && <AreasManager/>}
      {section === "lifecycle" && <LifecycleView onEdit={editTask} onOpenTask={openTask}/>}
      {section === "rewards" && <RewardsView/>}
      {section === "dailyReflection" && <ReflectionView key={navigation.reflectionDate} initialDate={navigation.reflectionDate}/>}
      {section === "meditations" && <MeditationsView selectedId={navigation.selectedMeditationId}/>}
      {section === "periodReview" && <ReviewView weekStartsOn={settings.weekStartsOn} onInspectDate={(date) => navigation.navigate(calendarEvidenceFor(date))}/>}
      {navigation.workspace.id === "settings" && <SettingsView settings={settings} section={section} nav={<SectionNav navigation={navigation} variant="list"/>}/>}
    </DesktopShell>
    {editing && <TaskEditor task={editing.task} initialMode={editing.mode} initialTitle={editing.initialTitle} onSaved={async () => { if (editing.captureId) await deleteCapture(editing.captureId); }} onClose={() => setEditing(undefined)}/>}
    {quickCapture && <QuickCaptureDialog onClose={() => setQuickCapture(false)} onFullTask={(title) => { setQuickCapture(false); setEditing({ initialTitle: title }); }}/>}
    {searching && <SearchDialog onClose={() => setSearching(false)} onSelect={selectSearchResult}/>}
    {pendingLifecycle && pendingTask && <MilestoneCelebration task={pendingTask} lifecycle={pendingLifecycle}/>}
  </>;
}
