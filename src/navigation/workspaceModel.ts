import type { BackgroundSlot } from "../types";

export type WorkspaceId = "today" | "inbox" | "plan" | "tasks" | "reflect" | "review" | "settings";
export type SectionId =
  | "todayExecution"
  | "inboxCaptures"
  | "floating"
  | "calendar"
  | "allTasks"
  | "areas"
  | "lifecycle"
  | "rewards"
  | "dailyReflection"
  | "meditations"
  | "periodReview"
  | "settingsGeneral"
  | "settingsAppearance"
  | "settingsData";

export interface WorkspaceSection {
  id: SectionId;
  labelKey: string;
  backgroundSlot?: BackgroundSlot;
}

export type WorkspaceIcon = "today" | "inbox" | "plan" | "tasks" | "reflect" | "review" | "settings";

export interface Workspace {
  id: WorkspaceId;
  labelKey: string;
  icon: WorkspaceIcon;
  anchored?: boolean;
  /** Where secondary navigation renders: header tabs (default) or inside the page (Settings, blueprint §11). */
  sectionPlacement?: "header" | "page";
  sections: WorkspaceSection[];
}

/**
 * The M11-active subset of the frozen M9 target information architecture
 * (`docs/m9-desktop-ui-blueprint/`, behavior spec Appendix A).
 *
 * Timeline, On This Day, Notifications, Shortcuts, and About & Updates belong
 * to M12-M13. Frozen Decision D4 requires
 * that a destination appear only once it is real and usable, so they are absent
 * here rather than rendered as disabled placeholders: adding one later means
 * adding its entry below in the same change that makes it work.
 */
export const workspaces: Workspace[] = [
  { id: "today", labelKey: "today", icon: "today", sections: [{ id: "todayExecution", labelKey: "today", backgroundSlot: "today" }] },
  { id: "inbox", labelKey: "inbox", icon: "inbox", sections: [{ id: "inboxCaptures", labelKey: "inbox" }] },
  { id: "plan", labelKey: "plan", icon: "plan", sections: [{ id: "floating", labelKey: "floating" }, { id: "calendar", labelKey: "calendar", backgroundSlot: "calendar" }] },
  { id: "tasks", labelKey: "ws_tasks", icon: "tasks", sections: [{ id: "allTasks", labelKey: "allTasks" }, { id: "areas", labelKey: "areas" }, { id: "lifecycle", labelKey: "lifecycle" }, { id: "rewards", labelKey: "rewards" }] },
  { id: "reflect", labelKey: "ws_reflect", icon: "reflect", sections: [{ id: "dailyReflection", labelKey: "dailyReflection", backgroundSlot: "reflection" }, { id: "meditations", labelKey: "meditations" }] },
  { id: "review", labelKey: "review", icon: "review", sections: [{ id: "periodReview", labelKey: "review" }] },
  { id: "settings", labelKey: "settings", icon: "settings", anchored: true, sectionPlacement: "page", sections: [{ id: "settingsGeneral", labelKey: "general" }, { id: "settingsAppearance", labelKey: "appearance" }, { id: "settingsData", labelKey: "dataAndBackup" }] },
];

export const primaryWorkspaces = workspaces.filter((workspace) => !workspace.anchored);
export const anchoredWorkspaces = workspaces.filter((workspace) => workspace.anchored);

export function getWorkspace(id: WorkspaceId): Workspace {
  const workspace = workspaces.find((item) => item.id === id);
  if (!workspace) throw new Error(`Unknown workspace: ${id}`);
  return workspace;
}

export function getSection(workspace: Workspace, id: SectionId): WorkspaceSection {
  return workspace.sections.find((section) => section.id === id) ?? workspace.sections[0];
}

export function workspaceOf(section: SectionId): Workspace {
  const workspace = workspaces.find((item) => item.sections.some((entry) => entry.id === section));
  if (!workspace) throw new Error(`Unknown section: ${section}`);
  return workspace;
}
