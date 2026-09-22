import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { anchoredWorkspaces, primaryWorkspaces, type Workspace } from "../../navigation/workspaceModel";
import type { WorkspaceNavigation } from "../../navigation/useWorkspaceNavigation";

interface DesktopShellProps {
  navigation: WorkspaceNavigation;
  shellStyle?: CSSProperties;
  contentStyle?: CSSProperties;
  actions?: ReactNode;
  children: ReactNode;
}

export function DesktopShell({ navigation, shellStyle, contentStyle, actions, children }: DesktopShellProps) {
  const { t } = useTranslation();
  const { workspace, section, openWorkspace, openSection } = navigation;
  const navButton = (item: Workspace) => (
    <button type="button" key={item.id} className={item.id === workspace.id ? "active" : ""} aria-current={item.id === workspace.id ? "page" : undefined} onClick={() => openWorkspace(item.id)}>
      <span aria-hidden="true">{item.icon}</span>
      <em>{t(item.labelKey)}</em>
    </button>
  );
  return (
    <div className="desktop-shell" style={shellStyle}>
      <aside className="shell-sidebar">
        <button type="button" className="brand" onClick={() => openWorkspace("today")}>
          <span className="logo-mark">DC</span>
          <span><strong>{t("appName")}</strong><small>Daily Canvas</small></span>
        </button>
        <nav className="shell-nav" aria-label={t("primaryNavigation")}>{primaryWorkspaces.map(navButton)}</nav>
        <div className="shell-sidebar-bottom">
          <nav className="shell-nav" aria-label={t("settings")}>{anchoredWorkspaces.map(navButton)}</nav>
          <p className="privacy-note">{t("privacyNote")}</p>
        </div>
      </aside>
      <main className="shell-main">
        <header className="workspace-topbar">
          <div className="workspace-identity">
            <h1>{t(workspace.labelKey)}</h1>
            {workspace.sections.length > 1 && (
              <nav className="workspace-tabs" aria-label={t("workspaceNavigation")}>
                {workspace.sections.map((item) => (
                  <button type="button" key={item.id} className={item.id === section.id ? "active" : ""} aria-current={item.id === section.id ? "page" : undefined} onClick={() => openSection(item.id)}>{t(item.labelKey)}</button>
                ))}
              </nav>
            )}
          </div>
          {actions && <div className="workspace-actions">{actions}</div>}
        </header>
        <div className="workspace-content personalized-surface" style={contentStyle}>{children}</div>
      </main>
    </div>
  );
}
