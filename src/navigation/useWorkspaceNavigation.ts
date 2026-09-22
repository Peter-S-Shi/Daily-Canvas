import { useCallback, useMemo, useState } from "react";
import { todayKey } from "../lib/dates";
import type { BackgroundSlot } from "../types";
import { getSection, getWorkspace, workspaceOf, type SectionId, type Workspace, type WorkspaceId, type WorkspaceSection } from "./workspaceModel";

/** A destination plus the optional context a surface should open on. */
export interface NavigationTarget {
  section: SectionId;
  date?: string;
  taskId?: string;
}

export interface WorkspaceNavigation {
  workspace: Workspace;
  section: WorkspaceSection;
  backgroundSlot: BackgroundSlot;
  calendarDate: string;
  reflectionDate: string;
  selectedTaskId: string;
  openWorkspace: (id: WorkspaceId) => void;
  openSection: (id: SectionId) => void;
  navigate: (target: NavigationTarget) => void;
  selectTask: (taskId: string) => void;
}

/** Calendar evidence for a review statement (Review -> Plan/Calendar). */
export const calendarEvidenceFor = (date: string): NavigationTarget => ({ section: "calendar", date });
/** The Daily Reflection authored on a date (Calendar -> Reflect/Daily Reflection). */
export const reflectionFor = (date: string): NavigationTarget => ({ section: "dailyReflection", date });
/** A task's read-first detail (behavior spec §3.4 / §8.3: Tasks -> selected Task Detail). */
export const taskDetailFor = (taskId: string): NavigationTarget => ({ section: "allTasks", taskId });

type SectionMemory = Partial<Record<WorkspaceId, SectionId>>;

export function useWorkspaceNavigation(): WorkspaceNavigation {
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>("today");
  const [sectionMemory, setSectionMemory] = useState<SectionMemory>({});
  const [calendarDate, setCalendarDate] = useState(todayKey());
  const [reflectionDate, setReflectionDate] = useState(todayKey());
  const [selectedTaskId, setSelectedTaskId] = useState("");

  const workspace = getWorkspace(workspaceId);
  const section = getSection(workspace, sectionMemory[workspaceId] ?? workspace.sections[0].id);

  const openWorkspace = useCallback((id: WorkspaceId) => setWorkspaceId(id), []);

  const openSection = useCallback((id: SectionId) => {
    const owner = workspaceOf(id);
    setWorkspaceId(owner.id);
    setSectionMemory((memory) => ({ ...memory, [owner.id]: id }));
  }, []);

  const navigate = useCallback((target: NavigationTarget) => {
    if (target.date && target.section === "calendar") setCalendarDate(target.date);
    if (target.date && target.section === "dailyReflection") setReflectionDate(target.date);
    if (target.taskId && target.section === "allTasks") setSelectedTaskId(target.taskId);
    openSection(target.section);
  }, [openSection]);

  return useMemo(
    () => ({ workspace, section, backgroundSlot: section.backgroundSlot ?? "app", calendarDate, reflectionDate, selectedTaskId, openWorkspace, openSection, navigate, selectTask: setSelectedTaskId }),
    [workspace, section, calendarDate, reflectionDate, selectedTaskId, openWorkspace, openSection, navigate],
  );
}
