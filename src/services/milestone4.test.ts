/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, defaultSettings, initializeDb } from "../db";
import { createCustomEmotion, normalizeEmotionLabel } from "./emotionService";
import { previousExperience, saveExperience } from "./experienceService";
import { nextReflectionPrompt, REFLECTION_PROMPTS } from "./promptService";
import { saveReflection } from "./reflectionService";
import { createBackup, migrateBackup, restoreBackup } from "./backupService";
import { deleteAppearanceAsset, setBackgroundPreference } from "./appearanceService";

beforeEach(async () => {
  await initializeDb();
  await db.transaction("rw", db.emotionDefinitions, db.dailyReflections, db.experienceLogs, db.appearanceAssets, db.settings, async () => {
    await Promise.all([db.emotionDefinitions.clear(), db.dailyReflections.clear(), db.experienceLogs.clear(), db.appearanceAssets.clear(), db.settings.clear()]);
    await db.settings.put({ ...defaultSettings(), onboardingComplete: true });
  });
});

describe("Milestone 4 reflection services", () => {
  it("normalizes custom emotions, prevents duplicates, and supports multiple emotion selection", async () => {
    expect(normalizeEmotionLabel("  Deep   Focus  ")).toBe("deep focus");
    const first = await createCustomEmotion("Deep Focus"); const duplicate = await createCustomEmotion(" deep   focus ");
    expect(duplicate.id).toBe(first.id); expect(await db.emotionDefinitions.count()).toBe(1);
    await saveReflection({ date: "2026-07-20", emotionIds: [first.id, "second", first.id], intensity: 4, note: "Line one\n\nLine two" });
    const edited = await saveReflection({ date: "2026-07-20", emotionIds: [first.id, "second"], note: "Revised in full" });
    expect(await db.dailyReflections.count()).toBe(1); expect(edited).toMatchObject({ emotionIds: [first.id, "second"], note: "Revised in full" });
  });

  it("uses a persisted shuffle bag and returns nothing when prompts are disabled", async () => {
    const seen: string[] = []; for (let index = 0; index < REFLECTION_PROMPTS.length; index++) seen.push((await nextReflectionPrompt(() => 0))!.id);
    expect(new Set(seen).size).toBe(REFLECTION_PROMPTS.length);
    expect((await db.settings.get("app"))?.promptRotationState?.remainingPromptIds).toHaveLength(0);
    await db.settings.update("app", { reflectionPromptsEnabled: false }); expect(await nextReflectionPrompt(() => 0)).toBeUndefined();
  });

  it("validates experience logs, compares with the previous recorded date, and never creates empty records", async () => {
    expect(await saveExperience({ taskId: "habit", date: "2026-07-19" })).toBeUndefined(); expect(await db.experienceLogs.count()).toBe(0);
    await saveExperience({ taskId: "habit", date: "2026-07-18", comparison: "similar", effort: 3 }); await saveExperience({ taskId: "habit", date: "2026-07-20", comparison: "easier", note: "Steady" });
    expect(await previousExperience("habit", "2026-07-21")).toMatchObject({ date: "2026-07-20", comparison: "easier" });
    await expect(saveExperience({ taskId: "habit", date: "2026-07-21", effort: 6 })).rejects.toThrow();
  });

  it("keeps appearance references consistent and includes all v4 private entities in backup restore", async () => {
    await db.appearanceAssets.put({ id: "local-image", kind: "background", mimeType: "image/png", dataUrl: "data:image/png;base64,c3ludGhldGlj", createdAt: "2026-07-20T00:00:00.000Z" }); await setBackgroundPreference("reflection", { assetId: "local-image", fit: "contain", overlayOpacity: .6 });
    await saveReflection({ date: "2026-07-20", emotionIds: [], note: "Private reflection" }); await saveExperience({ taskId: "habit", date: "2026-07-20", effort: 2 });
    const backup = await createBackup(); expect(backup).toMatchObject({ version: 7, dailyReflections: [{ note: "Private reflection" }], appearanceAssets: [{ id: "local-image" }] });
    await db.dailyReflections.clear(); await restoreBackup(backup); expect(await db.dailyReflections.get("2026-07-20")).toMatchObject({ note: "Private reflection" });
    await deleteAppearanceAsset("local-image"); expect((await db.settings.get("app"))?.backgroundPreferences.find((item) => item.slot === "reflection")?.assetId).toBeUndefined();
  });

  it("migrates a v3 backup with full journal text and background data", () => {
    const migrated = migrateBackup({ format: "daily-canvas-backup", version: 3, exportedAt: "2026-07-20T00:00:00.000Z", areas: [], tasks: [], checkIns: [], dailyOrders: [], journalEntries: [{ date: "2026-07-19", content: "Paragraph one\n\nParagraph two", updatedAt: "2026-07-19T23:00:00.000Z" }], rewards: [], settings: [{ id: "app", dataVersion: 3, language: "en", theme: "system", weekStartsOn: 1, reduceMotion: false, onboardingComplete: true, backgroundDataUrl: "data:image/png;base64,c3ludGhldGlj" }] });
    expect(migrated.payload.dailyReflections[0].note).toBe("Paragraph one\n\nParagraph two"); expect(migrated.payload.appearanceAssets).toHaveLength(1); expect(migrated.sourceVersion).toBe(3);
  });
});
