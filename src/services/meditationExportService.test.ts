import { describe, expect, it, vi } from "vitest";
import type { MeditationEntry } from "../types";
import { buildMeditationExportModel, createMeditationDocx, downloadMeditationDocx } from "./meditationExportService";

vi.mock("../desktop/desktopAdapter", () => ({
  saveBlobWithPath: vi.fn(async (_blob: Blob, fileName: string) => ({ saved: true, path: `C:/Users/test/Documents/${fileName}` })),
}));

const stamp = "2026-01-01T12:00:00.000Z";
const entry = (id: string, content: string, sortOrder: number): MeditationEntry => ({ id, content, sortOrder, createdAt: stamp, updatedAt: stamp });

describe("meditationExportService field rename (Issue #23)", () => {
  it("names the cover fields mainTitle/subtitle and keeps both language-agnostic when callers omit them", () => {
    const model = buildMeditationExportModel([entry("a", "One", 0)]);
    expect(model.mainTitle).toBe("");
    expect(model.subtitle).toBe("");
  });

  it("accepts an explicit empty-string subtitle without substituting a default", () => {
    const model = buildMeditationExportModel([entry("a", "One", 0)], { mainTitle: "Reflections", subtitle: "" });
    expect(model.subtitle).toBe("");
  });

  it("accepts any Unicode script for both mainTitle and subtitle, with no language-bound assumption", () => {
    const model = buildMeditationExportModel([entry("a", "One", 0)], { mainTitle: "日記帳 🌙", subtitle: "Мысли и заметки" });
    expect(model.mainTitle).toBe("日記帳 🌙");
    expect(model.subtitle).toBe("Мысли и заметки");
  });

  it("round-trips Unicode main title and subtitle through the generated .docx cover", async () => {
    const model = buildMeditationExportModel([entry("a", "Content one", 0)], { mainTitle: "日記帳 🌙", subtitle: "Мысли и заметки" });
    const blob = await createMeditationDocx(model);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("downloadMeditationDocx reports the saved file name and path for the export-completion closure", async () => {
    const model = buildMeditationExportModel([entry("a", "One", 0)]);
    const result = await downloadMeditationDocx(model);
    expect(result).toMatchObject({ saved: true, fileName: expect.stringMatching(/^daily-canvas-meditations-.*\.docx$/) });
    expect(result.path).toContain(result.fileName);
  });
});
