/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { MeditationPrintDocument } from "../components/MeditationsView";
import { db, defaultSettings, initializeDb } from "../db";
import type { MeditationEntry } from "../types";
import { createMeditationDocx, buildMeditationExportModel, meditationPageStyles } from "./meditationExportService";
import { countMeditationUnits, createMeditation, deleteMeditation, getMeditation, listMeditations, reorderMeditations, updateMeditation, validateMeditationContent } from "./meditationService";
import { createBackup, migrateBackup, restoreBackup } from "./backupService";

beforeEach(async () => {
  await initializeDb();
  await db.transaction("rw", db.meditationEntries, db.settings, async () => {
    await db.meditationEntries.clear();
    await db.settings.clear();
    await db.settings.put({ ...defaultSettings(), onboardingComplete: true });
  });
});

describe("Milestone 7 semantic length rules", () => {
  it("accepts 150 Han characters and rejects 151", () => {
    expect(validateMeditationContent("悟".repeat(150))).toMatchObject({ valid: true, units: 150 });
    expect(validateMeditationContent("悟".repeat(151))).toMatchObject({ valid: false, units: 151, error: "too-long" });
  });

  it("accepts 150 English words and rejects 151", () => {
    expect(validateMeditationContent(Array(150).fill("steady").join(" "))).toMatchObject({ valid: true, units: 150 });
    expect(validateMeditationContent(Array(151).fill("steady").join(" "))).toMatchObject({ valid: false, units: 151 });
  });

  it("combines mixed content while excluding punctuation, whitespace, and paragraphs", () => {
    const text = `${"悟".repeat(80)}\n\n${Array(70).fill("steady").join(", ")}`;
    expect(countMeditationUnits(text)).toBe(150);
    expect(countMeditationUnits("... \n\t，！？")).toBe(0);
    expect(countMeditationUnits("Keep going 🌱")).toBe(3);
    expect(validateMeditationContent("\n \t")).toMatchObject({ valid: false, error: "empty" });
  });
});

describe("Milestone 7 CRUD and ordering", () => {
  it("appends entries, preserves paragraphs and creation time, and updates edited time", async () => {
    const first = await createMeditation("  First paragraph.\n\nSecond paragraph.  ");
    const second = await createMeditation("Second entry");
    await new Promise((resolve) => setTimeout(resolve, 2));
    const edited = await updateMeditation(first.id, "Revised\n\nStill multiline");
    expect(first.content).toBe("First paragraph.\n\nSecond paragraph.");
    expect(second.sortOrder).toBe(1);
    expect(edited.createdAt).toBe(first.createdAt);
    expect(edited.updatedAt >= first.updatedAt).toBe(true);
    expect(edited.content).toBe("Revised\n\nStill multiline");
    expect(await getMeditation(first.id)).toEqual(edited);
  });

  it("persists global order and normalizes gaps after delete without changing edit timestamps", async () => {
    const first = await createMeditation("First");
    const second = await createMeditation("Second");
    const third = await createMeditation("Third");
    await reorderMeditations([third.id, first.id, second.id]);
    expect((await listMeditations()).map((entry) => entry.id)).toEqual([third.id, first.id, second.id]);
    expect((await db.meditationEntries.get(third.id))?.updatedAt).toBe(third.updatedAt);
    await deleteMeditation(first.id);
    expect((await listMeditations()).map((entry) => ({ id: entry.id, sortOrder: entry.sortOrder }))).toEqual([{ id: third.id, sortOrder: 0 }, { id: second.id, sortOrder: 1 }]);
    expect(await db.meditationEntries.get(first.id)).toBeUndefined();
  });
});

describe("Milestone 7 export, Word, migration, and backup", () => {
  const entries: MeditationEntry[] = [
    { id: "later", content: "Second\n\nParagraph", sortOrder: 1, createdAt: "2026-07-02T12:00:00.000Z", updatedAt: "2026-07-02T12:00:00.000Z" },
    { id: "earlier", content: "第一条感悟", sortOrder: 0, createdAt: "2026-07-01T12:00:00.000Z", updatedAt: "2026-07-01T12:00:00.000Z" },
  ];

  it("builds all and selected models in global order with safe defaults", () => {
    const all = buildMeditationExportModel(entries);
    expect(all.entries.map((entry) => entry.id)).toEqual(["earlier", "later"]);
    expect(all).toMatchObject({ mainTitle: "我的感悟", subtitle: "", showDates: true, pageStyle: "ivory", pageSize: "a4", locale: "en" });
    expect(buildMeditationExportModel(entries, { selectedIds: ["later"], showDates: false, mainTitle: "", subtitle: "Private volume", locale: "zh-CN" })).toMatchObject({ entries: [expect.objectContaining({ id: "later" })], showDates: false, mainTitle: "", subtitle: "Private volume", locale: "zh-CN" });
    expect(() => buildMeditationExportModel(entries, { selectedIds: [] })).toThrow(/select at least one/i);
    expect(Object.keys(meditationPageStyles)).toEqual(["parchment", "ivory", "blue-white", "pure-white", "soft-gray"]);
  });

  it("generates a non-empty editable Word package from Unicode and multiline content", async () => {
    const blob = await createMeditationDocx(buildMeditationExportModel(entries, { pageSize: "letter", pageStyle: "parchment" }));
    expect(blob.type).toContain("wordprocessingml");
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("renders only the selected print scope as escaped text and respects the date toggle", () => {
    const unsafe = { ...entries[1], content: "<img src=x onerror=alert(1)>\n\n第一条感悟" };
    const hiddenDates = buildMeditationExportModel([entries[0], unsafe], { selectedIds: ["earlier"], showDates: false, locale: "zh-CN" });
    const hiddenMarkup = renderToStaticMarkup(createElement(MeditationPrintDocument, { model: hiddenDates }));
    expect(hiddenMarkup).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(hiddenMarkup).toContain("第一条感悟");
    expect(hiddenMarkup).not.toContain("<img src=x");
    expect(hiddenMarkup).not.toContain("<time");
    expect(hiddenMarkup).not.toContain("Second");

    const shownMarkup = renderToStaticMarkup(createElement(MeditationPrintDocument, { model: buildMeditationExportModel(entries, { locale: "en-CA" }) }));
    expect(shownMarkup).toContain("<time");
    expect(shownMarkup.indexOf("第一条感悟")).toBeLessThan(shownMarkup.indexOf("Second"));
  });

  it("writes the selected A4 or Letter size into the actual print page rule", () => {
    const a4Markup = renderToStaticMarkup(createElement(MeditationPrintDocument, { model: buildMeditationExportModel(entries, { pageSize: "a4" }) }));
    const letterMarkup = renderToStaticMarkup(createElement(MeditationPrintDocument, { model: buildMeditationExportModel(entries, { pageSize: "letter" }) }));
    expect(a4Markup).toContain('data-meditation-page-size="a4"');
    expect(a4Markup).toContain("@page { size: A4; margin: 0; }");
    expect(letterMarkup).toContain('data-meditation-page-size="letter"');
    expect(letterMarkup).toContain("@page { size: Letter; margin: 0; }");
  });

  it("upgrades v5 backups with an empty collection and restores current content, order, and timestamps", async () => {
    const current = await createBackup();
    const { meditationEntries: _removed, ...v5Fields } = current;
    const migrated = migrateBackup({ ...v5Fields, version: 5, settings: current.settings.map((setting) => ({ ...setting, dataVersion: 5 })) });
    expect(migrated).toMatchObject({ sourceVersion: 5, migrated: true, counts: { meditations: 0 } });
    expect(migrated.payload.meditationEntries).toEqual([]);

    await db.meditationEntries.bulkPut(entries);
    const backup = await createBackup();
    expect(backup.version).toBe(9);
    expect(backup.meditationEntries).toEqual(expect.arrayContaining(entries));
    await db.meditationEntries.clear();
    await restoreBackup(backup);
    expect(await listMeditations()).toEqual([entries[1], entries[0]]);
  });

  it("rejects v6 Meditations with missing, non-integer, negative, non-finite, or duplicate sort orders", async () => {
    const valid = await createBackup();
    const entry = entries[1];
    const invalidOrders: unknown[] = [undefined, "0", 1.5, -1, Number.NaN, Number.POSITIVE_INFINITY];
    for (const sortOrder of invalidOrders) {
      expect(() => migrateBackup({ ...valid, meditationEntries: [{ ...entry, sortOrder }] })).toThrow(/invalid sort order/i);
    }
    expect(() => migrateBackup({ ...valid, meditationEntries: [{ ...entries[1], sortOrder: 0 }, { ...entries[0], sortOrder: 0 }] })).toThrow(/duplicate sort orders/i);
  });

  it("rejects empty or over-limit Meditation content before restore", async () => {
    const valid = await createBackup();
    expect(() => migrateBackup({ ...valid, meditationEntries: [{ ...entries[1], content: " \n " }] })).toThrow(/invalid content/i);
    expect(() => migrateBackup({ ...valid, meditationEntries: [{ ...entries[1], content: "悟".repeat(151) }] })).toThrow(/invalid content/i);
  });
});
