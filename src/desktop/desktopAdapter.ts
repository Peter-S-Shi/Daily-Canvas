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

export interface SaveResult { saved: boolean; path?: string }

/**
 * Saves a file through the native Save dialog (desktop) or a browser download (web). On desktop
 * the native Save dialog hands back the exact path the user chose (Issue #23's "Export complete"
 * closure needs it); a plain browser download never exposes a filesystem path, so `path` is
 * `undefined` there -- callers must not fabricate one.
 */
export async function saveBlobWithPath(blob: Blob, fileName: string): Promise<SaveResult> {
  if (isDesktop()) {
    const saved = await invoke<string | null>("save_export", new Uint8Array(await blob.arrayBuffer()), {
      headers: { "x-file-name": encodeURIComponent(fileName) },
    });
    return { saved: saved !== null, path: saved ?? undefined };
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return { saved: true, path: undefined };
}

/** Saves a file through the native Save dialog (desktop) or a browser download (web). Returns false when the user cancelled. */
export async function saveBlob(blob: Blob, fileName: string): Promise<boolean> {
  return (await saveBlobWithPath(blob, fileName)).saved;
}

/**
 * Reveals a previously-saved file in the OS file manager (desktop-only "Show in folder"),
 * through the same scoped `tauri-plugin-opener` capability already used by `openExternal` --
 * no new IPC command is introduced. A no-op in a plain browser, where no such path exists.
 */
export async function revealInFolder(path: string): Promise<void> {
  if (isDesktop()) await (await import("@tauri-apps/plugin-opener")).revealItemInDir(path);
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

/** GitHub has no published Release yet (404) -- a neutral, expected state, not a failure. */
export class ReleaseNotFoundError extends Error { constructor() { super("No published release is available yet"); this.name = "ReleaseNotFoundError"; } }
/** A genuine network/timeout/DNS failure -- the request never got a response from GitHub. */
export class UpdateNetworkError extends Error { constructor(cause?: unknown) { super("Network error while checking for updates"); this.name = "UpdateNetworkError"; if (cause !== undefined) this.cause = cause; } }
/** Any other update-check failure: unexpected HTTP status, malformed JSON, missing fields. */
export class UpdateCheckFailedError extends Error { constructor(message: string) { super(message); this.name = "UpdateCheckFailedError"; } }

/**
 * GitHub Release metadata adapter (Milestone 13). Reads only the minimum public fields needed for
 * version comparison, never sends personal data, and is only ever called on demand (opening
 * Settings -> About & Updates, or its "Check for updates" button) -- never on a timer or at
 * startup. On desktop the request runs through the scoped `tauri-plugin-http` capability (limited
 * to this single GitHub endpoint); in a plain browser it uses the ordinary Fetch API.
 *
 * Distinguishes a 404 (no Release published yet -- neutral, not an error condition for the user)
 * from a genuine network failure (fetch itself throws) and from any other unexpected failure
 * (other HTTP statuses, malformed JSON) so callers can surface the correct message (Issue #15).
 */
export async function fetchLatestRelease(): Promise<ReleaseMetadata> {
  const doFetch = isDesktop() ? (await import("@tauri-apps/plugin-http")).fetch : fetch;
  let response: Response;
  try {
    response = await doFetch(RELEASES_URL, { headers: { Accept: "application/vnd.github+json" } });
  } catch (error) {
    throw new UpdateNetworkError(error);
  }
  if (response.status === 404) throw new ReleaseNotFoundError();
  if (!response.ok) throw new UpdateCheckFailedError(`GitHub returned ${response.status}`);
  let data: { tag_name?: string; html_url?: string };
  try {
    data = (await response.json()) as { tag_name?: string; html_url?: string };
  } catch {
    throw new UpdateCheckFailedError("Malformed release metadata");
  }
  if (!data.tag_name || !data.html_url) throw new UpdateCheckFailedError("Malformed release metadata");
  return { tagName: data.tag_name, releaseUrl: data.html_url };
}

/** Opens a URL in the system's default browser (desktop, via the scoped `tauri-plugin-opener`) or a new tab (web). Used only for "View Release" -- never an automatic navigation. */
export async function openExternal(url: string): Promise<void> {
  if (isDesktop()) { await (await import("@tauri-apps/plugin-opener")).openUrl(url); return; }
  globalThis.open?.(url, "_blank", "noopener,noreferrer");
}
