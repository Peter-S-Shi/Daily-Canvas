// Desktop adapter boundary. Domain services call these functions and never import
// shell APIs directly. In a plain browser they keep the original web behavior.
import { invoke } from "@tauri-apps/api/core";

export interface DesktopInfo {
  appVersion: string;
  identifier: string;
  appLocalDataDir: string;
  webviewDataDir: string;
}

export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getDesktopInfo(): Promise<DesktopInfo | undefined> {
  return isDesktop() ? invoke<DesktopInfo>("desktop_info") : undefined;
}

/** Saves a file through the native Save dialog (desktop) or a browser download (web). Returns false when the user cancelled. */
export async function saveBlob(blob: Blob, fileName: string): Promise<boolean> {
  if (isDesktop()) {
    const saved = await invoke<string | null>("save_export", new Uint8Array(await blob.arrayBuffer()), {
      headers: { "x-file-name": encodeURIComponent(fileName) },
    });
    return saved !== null;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

/** Opens the system print surface (Print / Save as PDF). */
export async function printPage(): Promise<void> {
  if (isDesktop()) await invoke("print_page");
  else globalThis.print();
}

/**
 * Local, in-app reminder notification. Fires only while Daily Canvas is running; there is no
 * resident process, tray, or OS task scheduler behind this. In a plain browser it falls back to
 * the Web Notification API and quietly does nothing if permission was never granted.
 */
export async function notify(title: string, body: string): Promise<void> {
  if (isDesktop()) {
    await invoke("send_notification", { title, body });
    return;
  }
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") new Notification(title, { body });
}

export interface BackupFileInfo { fileName: string; sizeBytes: number }

/**
 * Automatic Backup native adapter (Milestone 13). No general-purpose filesystem capability is
 * granted to the web layer -- these four narrow commands (write, list, read, delete) are the only
 * surface, mirroring how `notify()` was added for M12. This is a desktop-native reliability
 * feature: in a plain browser there is no app-owned backup directory, so every function is a no-op
 * or empty result rather than a partial/simulated implementation.
 */
export async function backupDirectory(): Promise<string | undefined> {
  return isDesktop() ? invoke<string>("backup_directory") : undefined;
}

export async function writeAutoBackup(blob: Blob, fileName: string): Promise<BackupFileInfo | undefined> {
  if (!isDesktop()) return undefined;
  return invoke<BackupFileInfo>("write_auto_backup", new Uint8Array(await blob.arrayBuffer()), {
    headers: { "x-file-name": encodeURIComponent(fileName) },
  });
}

export async function listAutoBackups(): Promise<BackupFileInfo[]> {
  return isDesktop() ? invoke<BackupFileInfo[]>("list_auto_backups") : [];
}

export async function readAutoBackup(fileName: string): Promise<string | undefined> {
  return isDesktop() ? invoke<string>("read_auto_backup", { fileName }) : undefined;
}

export async function deleteAutoBackup(fileName: string): Promise<void> {
  if (isDesktop()) await invoke("delete_auto_backup", { fileName });
}

export interface ReleaseMetadata { tagName: string; releaseUrl: string }
const RELEASES_URL = "https://api.github.com/repos/Peter-S-Shi/Daily-Canvas/releases/latest";

/**
 * GitHub Release metadata adapter (Milestone 13). Reads only the minimum public fields needed for
 * version comparison, never sends personal data, and is only ever called on demand (opening
 * Settings -> About & Updates, or its "Check for updates" button) -- never on a timer or at
 * startup. On desktop the request runs through the scoped `tauri-plugin-http` capability (limited
 * to this single GitHub endpoint); in a plain browser it uses the ordinary Fetch API.
 */
export async function fetchLatestRelease(): Promise<ReleaseMetadata> {
  const doFetch = isDesktop() ? (await import("@tauri-apps/plugin-http")).fetch : fetch;
  const response = await doFetch(RELEASES_URL, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  const data = (await response.json()) as { tag_name?: string; html_url?: string };
  if (!data.tag_name || !data.html_url) throw new Error("Malformed release metadata");
  return { tagName: data.tag_name, releaseUrl: data.html_url };
}

/** Opens a URL in the system's default browser (desktop, via the scoped `tauri-plugin-opener`) or a new tab (web). Used only for "View Release" -- never an automatic navigation. */
export async function openExternal(url: string): Promise<void> {
  if (isDesktop()) { await (await import("@tauri-apps/plugin-opener")).openUrl(url); return; }
  globalThis.open?.(url, "_blank", "noopener,noreferrer");
}
