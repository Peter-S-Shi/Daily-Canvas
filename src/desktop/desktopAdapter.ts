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
