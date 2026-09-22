import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { anchoredWorkspaces, primaryWorkspaces, type Workspace } from "../../navigation/workspaceModel";
import type { WorkspaceNavigation } from "../../navigation/useWorkspaceNavigation";
import { WorkspaceHeaderContext } from "./WorkspaceHeader";
import { WorkspaceIcon } from "./WorkspaceIcon";

interface DesktopShellProps {
  navigation: WorkspaceNavigation;
  shellStyle?: CSSProperties;
  contentStyle?: CSSProperties;
  children: ReactNode;
  onSearch: () => void;
  onQuickCapture: () => void;
}

export function DesktopShell({ navigation, shellStyle, contentStyle, children, onSearch, onQuickCapture }: DesktopShellProps) {
  const { t } = useTranslation();
  const { workspace, openWorkspace } = navigation;
  const [controls, setControls] = useState<HTMLElement | null>(null);
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const slots = useMemo(() => ({ controls, actions }), [controls, actions]);
  const navButton = (item: Workspace) => (
    <button type="button" key={item.id} data-workspace={item.id} className={item.id === workspace.id ? "nav-button active" : "nav-button"} aria-current={item.id === workspace.id ? "page" : undefined} onClick={() => openWorkspace(item.id)}>
      <WorkspaceIcon name={item.icon}/>
      <span>{t(item.labelKey)}</span>
    </button>
  );
  const headerTabs = workspace.sectionPlacement !== "page" && workspace.sections.length > 1;
  return (
    <div className="desktop-shell" style={shellStyle}>
      <aside className="shell-sidebar">
        <button type="button" className="brand" onClick={() => openWorkspace("today")}>
          <span className="logo-mark" aria-hidden="true">DC</span>
          <strong>{t("appName")}</strong>
        </button>
        <nav className="shell-nav" aria-label={t("primaryNavigation")}>{primaryWorkspaces.map(navButton)}</nav>
        <div className="shell-sidebar-bottom">
          <nav className="shell-nav" aria-label={t("settings")}>{anchoredWorkspaces.map(navButton)}</nav>
          <p className="privacy-note">{t("privacyNote")}</p>
        </div>
      </aside>
      <main className="shell-main">
        <header className="workspace-topbar">
          <h1 className="workspace-title">{t(workspace.labelKey)}</h1>
          {headerTabs && <SectionNav navigation={navigation} variant="tabs"/>}
          <div className="workspace-controls" ref={setControls}/>
          <div className="workspace-actions"><button type="button" className="button secondary global-search" onClick={onSearch}>{t("search")} <kbd>Ctrl K</kbd></button><button type="button" className="button primary global-capture" onClick={onQuickCapture}>＋ {t("quickCapture")}</button><span ref={setActions}/></div>
        </header>
        <div className={contentStyle || shellStyle ? "workspace-surface personalized-surface has-background" : "workspace-surface personalized-surface"} style={contentStyle}>
          <div className="workspace-content">
            <WorkspaceHeaderContext.Provider value={slots}>{children}</WorkspaceHeaderContext.Provider>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Secondary navigation for the active workspace: header tabs, or a vertical in-page list (Settings). */
export function SectionNav({ navigation, variant }: { navigation: WorkspaceNavigation; variant: "tabs" | "list" }) {
  const { t } = useTranslation();
  const { workspace, section, openSection } = navigation;
  return (
    <nav className={variant === "tabs" ? "workspace-tabs" : "section-list"} aria-label={t(variant === "tabs" ? "workspaceNavigation" : "settingsCategories")}>
      {workspace.sections.map((item) => (
        <button type="button" key={item.id} data-section={item.id} className={item.id === section.id ? "active" : ""} aria-current={item.id === section.id ? "page" : undefined} onClick={() => openSection(item.id)}>{t(item.labelKey)}</button>
      ))}
    </nav>
  );
}
