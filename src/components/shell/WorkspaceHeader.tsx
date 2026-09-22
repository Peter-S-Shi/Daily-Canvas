import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface WorkspaceHeaderSlots {
  controls: HTMLElement | null;
  actions: HTMLElement | null;
}

export const WorkspaceHeaderContext = createContext<WorkspaceHeaderSlots>({ controls: null, actions: null });

/** Surface-owned controls shown beside the workspace title (e.g. Review's period presets). */
export function HeaderControls({ children }: { children: ReactNode }) {
  const { controls } = useContext(WorkspaceHeaderContext);
  return controls ? createPortal(children, controls) : null;
}

/** Surface-owned primary actions on the right of the workspace header, named for what they create. */
export function HeaderActions({ children }: { children: ReactNode }) {
  const { actions } = useContext(WorkspaceHeaderContext);
  return actions ? createPortal(children, actions) : null;
}
