import { deleteAutoBackup, listAutoBackups, writeAutoBackup, type BackupFileInfo } from "../desktop/desktopAdapter";
import { updateSettings } from "./settingsService";
import { createBackup } from "./backupService";
import { toDateKey } from "../lib/dates";
import type { AppSettings, BackupPayload } from "../types";

export const RETAINED_BACKUPS = 7;
const FILE_PREFIX = "daily-canvas-auto-backup-";

/** Encodes the write instant into a lexically sortable file name (`fileNameFor` and `sortDescending` agree on order). */
export function fileNameFor(at: Date): string {
  const iso = at.toISOString().replace(/[:.]/g, "-");
  return `${FILE_PREFIX}${iso}.json`;
}

/** A local-calendar-day boundary check, not UTC: at most one successful automatic backup per local day. */
export function shouldRunAutoBackup(lastRunLocalDay: string | undefined, nowLocalDay: string): boolean {
  return lastRunLocalDay !== nowLocalDay;
}

/** Never deletes the newest `keep` backups; returns the rest (oldest-first is irrelevant -- caller deletes all returned). Assumes file names sort lexically by recency, newest first, as `fileNameFor` guarantees. */
export function pruneCandidates(files: BackupFileInfo[], keep = RETAINED_BACKUPS): BackupFileInfo[] {
  const sorted = [...files].sort((a, b) => b.fileName.localeCompare(a.fileName));
  return sorted.slice(keep);
}

export interface AutoBackupDeps {
  now?: () => Date;
  settings: AppSettings;
  createPayload?: () => Promise<BackupPayload>;
  write?: typeof writeAutoBackup;
  list?: typeof listAutoBackups;
  remove?: typeof deleteAutoBackup;
  saveSettings?: typeof updateSettings;
}

export type AutoBackupOutcome = { ran: true; fileName: string } | { ran: false; reason: "disabled" | "already-ran-today" } | { ran: false; reason: "failed"; error: string };

/**
 * Orchestrates one automatic-backup attempt: at most once per local calendar day, only when
 * enabled, writing through the atomic native adapter, then pruning down to the most recent
 * `RETAINED_BACKUPS` only after the new backup is confirmed written. Any failure here is caught
 * and reported as a non-throwing outcome -- callers (app startup) must never be blocked by it.
 */
export async function runAutoBackup(deps: AutoBackupDeps): Promise<AutoBackupOutcome> {
  const now = deps.now ?? (() => new Date());
  const { settings } = deps;
  if (!settings.autoBackupEnabled) return { ran: false, reason: "disabled" };
  const nowDay = toDateKey(now());
  const lastRunDay = settings.lastAutoBackupAt ? toDateKey(new Date(settings.lastAutoBackupAt)) : undefined;
  if (!shouldRunAutoBackup(lastRunDay, nowDay)) return { ran: false, reason: "already-ran-today" };
  const write = deps.write ?? writeAutoBackup;
  const list = deps.list ?? listAutoBackups;
  const remove = deps.remove ?? deleteAutoBackup;
  const saveSettings = deps.saveSettings ?? updateSettings;
  const createPayload = deps.createPayload ?? createBackup;
  try {
    const payload = await createPayload();
    const at = now();
    const fileName = fileNameFor(at);
    const written = await write(new Blob([JSON.stringify(payload)], { type: "application/json" }), fileName);
    if (!written) return { ran: false, reason: "failed", error: "Automatic Backup is only available in the desktop app." };
    await saveSettings({ lastAutoBackupAt: at.toISOString() });
    const files = await list();
    for (const stale of pruneCandidates(files)) await remove(stale.fileName);
    return { ran: true, fileName };
  } catch (error) {
    return { ran: false, reason: "failed", error: error instanceof Error ? error.message : String(error) };
  }
}
