import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarView } from "./components/CalendarView";
import { RewardsView } from "./components/RewardsView";
import { SettingsView } from "./components/SettingsView";
import { TaskEditor } from "./components/TaskEditor";
import { TasksView } from "./components/TasksView";
import { TodayView } from "./components/TodayView";
import { db, initializeDb } from "./db";
import type { Task } from "./types";

type View = "today" | "calendar" | "tasks" | "rewards" | "settings";

const nav: Array<{ id: View; icon: string }> = [
  { id: "today", icon: "☀" },
  { id: "calendar", icon: "▦" },
  { id: "tasks", icon: "✓" },
  { id: "rewards", icon: "✦" },
  { id: "settings", icon: "⚙" },
];

export default function App() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<View>("today");
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(undefined);
  const settings = useLiveQuery(() => db.settings.get("app"), []);

  useEffect(() => { void initializeDb(); }, []);
  useEffect(() => {
    if (!settings) return;
    void i18n.changeLanguage(settings.language);
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = settings.language;
    document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion);
  }, [settings, i18n]);

  if (!settings) return <div className="loading-screen"><span className="logo-mark">DC</span><p>Daily Canvas</p></div>;

  return (
    <div className="app-shell" style={settings.backgroundDataUrl ? { backgroundImage: `linear-gradient(rgba(26, 22, 18, .48), rgba(26, 22, 18, .48)), url(${settings.backgroundDataUrl})` } : undefined}>
      <aside className="sidebar">
        <button type="button" className="brand" onClick={() => setView("today")}><span className="logo-mark">DC</span><span><strong>{t("appName")}</strong><small>Daily Canvas</small></span></button>
        <nav>
          {nav.map((item) => <button type="button" key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.icon}</span><em>{t(item.id)}</em></button>)}
        </nav>
        <button type="button" className="sidebar-add" onClick={() => setEditingTask(null)}>＋ <span>{t("addTask")}</span></button>
        <p className="privacy-note">Local-first · Private by default</p>
      </aside>
      <main className="main-content">
        {view === "today" && <TodayView onEditTask={(task) => setEditingTask(task)} />}
        {view === "calendar" && <CalendarView />}
        {view === "tasks" && <TasksView onAdd={() => setEditingTask(null)} onEdit={(task) => setEditingTask(task)} />}
        {view === "rewards" && <RewardsView />}
        {view === "settings" && <SettingsView settings={settings} />}
      </main>
      {editingTask !== undefined && <TaskEditor task={editingTask ?? undefined} onClose={() => setEditingTask(undefined)} />}
    </div>
  );
}
