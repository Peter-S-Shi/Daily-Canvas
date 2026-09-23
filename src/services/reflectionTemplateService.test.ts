import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../db";
import { getReflectionTemplate, REFLECTION_TEMPLATES } from "./reflectionTemplateService";
import { saveReflection } from "./reflectionService";

beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); });

describe("reflectionTemplateService", () => {
  it("ships at least three templates including Free Write with no prompts", () => {
    expect(REFLECTION_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    const free = getReflectionTemplate("free");
    expect(free.promptKeys).toEqual([]);
    expect(getReflectionTemplate("daily-checkin").promptKeys).toHaveLength(3);
    expect(getReflectionTemplate("gratitude").promptKeys).toHaveLength(3);
  });

  it("defaults to Free Write for an unknown/undefined id", () => {
    expect(getReflectionTemplate(undefined).id).toBe("free");
  });

  it("round-trips templateId through saveReflection/getReflection without rewriting the note", async () => {
    const saved = await saveReflection({ date: "2026-09-23", emotionIds: [], note: "my own words", templateId: "daily-checkin" });
    expect(saved.templateId).toBe("daily-checkin");
    expect(saved.note).toBe("my own words");
    const reloaded = await db.dailyReflections.get("2026-09-23");
    expect(reloaded?.templateId).toBe("daily-checkin");
    expect(reloaded?.note).toBe("my own words");
  });

  it("never requires a templateId -- free-form primacy is preserved", async () => {
    const saved = await saveReflection({ date: "2026-09-23", emotionIds: [], note: "no template chosen" });
    expect(saved.templateId).toBeUndefined();
  });
});
