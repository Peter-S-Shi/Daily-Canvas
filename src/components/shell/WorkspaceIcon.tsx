import type { WorkspaceIcon as IconName } from "../../navigation/workspaceModel";

const paths: Record<IconName, React.ReactNode> = {
  today: <><circle cx="10" cy="10" r="3.4"/><path d="M10 2.2v2M10 15.8v2M2.2 10h2M15.8 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M4.5 15.5l1.4-1.4M14.1 5.9l1.4-1.4"/></>,
  plan: <><circle cx="10" cy="10" r="7.6"/><path d="M12.9 7.1l-1.6 4.2-4.2 1.6 1.6-4.2z"/></>,
  tasks: <><rect x="3" y="3" width="14" height="14" rx="3"/><path d="M6.8 10.2l2.2 2.2 4.3-4.6"/></>,
  reflect: <><path d="M15.8 3.4c-4.9.4-8.6 3.9-9.4 9.2l-.6 4"/><path d="M6.4 12.6c3.2-.2 6.2-1.4 8-4.3M8.6 9.2l3.2-.2"/></>,
  review: <><path d="M3 17h14"/><path d="M6 14V9M10 14V5M14 14v-3"/></>,
  settings: <><path d="M3.5 6h6M13.5 6h3M3.5 14h3M10.5 14h6"/><circle cx="11.5" cy="6" r="2"/><circle cx="8.5" cy="14" r="2"/></>,
};

export function WorkspaceIcon({ name }: { name: IconName }) {
  return <svg className="workspace-icon" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
