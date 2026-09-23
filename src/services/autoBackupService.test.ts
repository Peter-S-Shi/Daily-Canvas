import { describe, expect, it, vi } from "vitest";
import { fileNameFor, pruneCandidates, RETAINED_BACKUPS, runAutoBackup, shouldRunAutoBackup } from "./autoBackupService";
import type { AppSettings, BackupPayload } from "../types";
import type { BackupFileInfo } from "../desktop/desktopAdapter";

const settings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  id: "app", dataVersion: 9, language: "en", theme: "system", weekStartsOn: 1, reduceMotion: false,
  onboardingComplete: true, reflectionPromptsEnabled: true, backgroundPreferences: [], autoBackupEnabled: true, ...overrides,
});
const payload = { format: "daily-canvas-backup", version: 9 } as unknown as BackupPayload;
const files = (n: number): BackupFileInfo[] => Array.from({ length: n }, (_, i) => ({ fileName: fileNameFor(new Date(2026, 0, i + 1)), sizeBytes: 100 }));

describe("autoBackupService", () => {
  it("runs at most once per local calendar day", () => {
    expect(shouldRunAutoBackup(undefined, "2026-09-23")).toBe(true);
    expect(shouldRunAutoBackup("2026-09-23", "2026-09-23")).toBe(false);
    expect(shouldRunAutoBackup("2026-09-22", "2026-09-23")).toBe(true);
  });

  it("keeps only the most recent RETAINED_BACKUPS, never deleting the newest", () => {
    expect(RETAINED_BACKUPS).toBe(7);
    const candidates = pruneCandidates(files(10));
    expect(candidates).toHaveLength(3);
    const newest = files(10).sort((a, b) => b.fileName.localeCompare(a.fileName)).slice(0, 7).map((f) => f.fileName);
    expect(candidates.some((c) => newest.includes(c.fileName))).toBe(false);
  });

  it("does not prune when at or under the retention limit", () => {
    expect(pruneCandidates(files(7))).toHaveLength(0);
    expect(pruneCandidates(files(3))).toHaveLength(0);
  });

  it("skips when disabled, without touching the write/list/delete adapters", async () => {
    const write = vi.fn(); const list = vi.fn(); const remove = vi.fn(); const saveSettings = vi.fn();
    const outcome = await runAutoBackup({ settings: settings({ autoBackupEnabled: false }), write, list, remove, saveSettings, createPayload: async () => payload });
    expect(outcome).toEqual({ ran: false, reason: "disabled" });
    expect(write).not.toHaveBeenCalled();
  });

  it("skips when a successful backup already ran today", async () => {
    const write = vi.fn(); const now = () => new Date(2026, 8, 23, 18, 0, 0);
    const outcome = await runAutoBackup({ settings: settings({ lastAutoBackupAt: new Date(2026, 8, 23, 2, 0, 0).toISOString() }), now, write, createPayload: async () => payload });
    expect(outcome).toEqual({ ran: false, reason: "already-ran-today" });
    expect(write).not.toHaveBeenCalled();
  });

  it("writes a backup, records lastAutoBackupAt, and prunes only after the write succeeds", async () => {
    const now = () => new Date(2026, 8, 23, 8, 0, 0);
    const write = vi.fn().mockResolvedValue({ fileName: "x", sizeBytes: 10 });
    const list = vi.fn().mockResolvedValue(files(9));
    const remove = vi.fn().mockResolvedValue(undefined);
    const saveSettings = vi.fn().mockResolvedValue(undefined);
    const outcome = await runAutoBackup({ settings: settings({ lastAutoBackupAt: new Date(2026, 8, 22, 8, 0, 0).toISOString() }), now, write, list, remove, saveSettings, createPayload: async () => payload });
    expect(outcome.ran).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(saveSettings).toHaveBeenCalledWith({ lastAutoBackupAt: now().toISOString() });
    expect(remove).toHaveBeenCalledTimes(2); // 9 files -> keep 7, prune 2
  });

  it("never prunes when the write itself fails, and reports a non-throwing failure outcome", async () => {
    const write = vi.fn().mockRejectedValue(new Error("disk full"));
    const list = vi.fn(); const remove = vi.fn();
    const outcome = await runAutoBackup({ settings: settings(), now: () => new Date("2026-09-23T08:00:00.000Z"), write, list, remove, createPayload: async () => payload });
    expect(outcome.ran).toBe(false);
    expect(list).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("reports failure (never throws) when writeAutoBackup returns undefined (browser fallback, no native backup directory)", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const outcome = await runAutoBackup({ settings: settings(), now: () => new Date("2026-09-23T08:00:00.000Z"), write, createPayload: async () => payload });
    expect(outcome.ran).toBe(false);
  });
});
