import { saveBlobWithPath, type SaveResult } from "../desktop/desktopAdapter";
import type { MeditationEntry } from "../types";

export type MeditationPageSize = "a4" | "letter";
export type MeditationTextSize = "compact" | "standard" | "large";
export type MeditationPageStyle = "parchment" | "ivory" | "blue-white" | "pure-white" | "soft-gray";

export const meditationPageStyles: Record<MeditationPageStyle, { background: string; ink: string }> = {
  parchment: { background: "#f6efd9", ink: "#3f392c" },
  ivory: { background: "#fffdf2", ink: "#36342f" },
  "blue-white": { background: "#f3f8fb", ink: "#293943" },
  "pure-white": { background: "#ffffff", ink: "#222222" },
  "soft-gray": { background: "#f3f3f1", ink: "#30302f" },
};

export interface MeditationExportOptions {
  selectedIds?: string[];
  /** Language-agnostic cover heading -- may be any Unicode script (Issue #23). */
  mainTitle?: string;
  /** Optional secondary cover line -- may be blank, and may be any Unicode script. */
  subtitle?: string;
  showDates?: boolean;
  pageStyle?: MeditationPageStyle;
  pageSize?: MeditationPageSize;
  textSize?: MeditationTextSize;
  locale?: string;
}

export interface MeditationExportModel {
  entries: MeditationEntry[];
  mainTitle: string;
  subtitle: string;
  showDates: boolean;
  pageStyle: MeditationPageStyle;
  pageSize: MeditationPageSize;
  textSize: MeditationTextSize;
  locale: string;
}

export function buildMeditationExportModel(entries: MeditationEntry[], options: MeditationExportOptions = {}): MeditationExportModel {
  const selected = options.selectedIds ? new Set(options.selectedIds) : undefined;
  const ordered = [...entries].sort((a, b) => a.sortOrder - b.sortOrder).filter((entry) => !selected || selected.has(entry.id));
  if (ordered.length === 0) throw new Error("Select at least one Meditation to export.");
  return {
    entries: ordered,
    mainTitle: options.mainTitle ?? "我的感悟",
    // Subtitle is allowed to be empty/blank -- no fallback to a default string.
    subtitle: options.subtitle ?? "",
    showDates: options.showDates ?? true,
    pageStyle: options.pageStyle ?? "ivory",
    pageSize: options.pageSize ?? "a4",
    textSize: options.textSize ?? "standard",
    locale: options.locale ?? "en",
  };
}

const pageDimensions = {
  a4: { width: 11906, height: 16838 },
  letter: { width: 12240, height: 15840 },
} as const;
const fontSizes = { compact: 20, standard: 24, large: 28 } as const;

export async function createMeditationDocx(model: MeditationExportModel): Promise<Blob> {
  const { AlignmentType, BorderStyle, Document, Packer, PageBreak, Paragraph, ShadingType, TextRun } = await import("docx");
  const style = meditationPageStyles[model.pageStyle];
  const shade = { type: ShadingType.CLEAR, fill: style.background.slice(1), color: "auto" };
  const cover: InstanceType<typeof Paragraph>[] = [];
  if (model.mainTitle) cover.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 3000, after: 260 }, shading: shade, children: [new TextRun({ text: model.mainTitle, bold: true, size: 48, color: style.ink.slice(1) })] }));
  if (model.subtitle) cover.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, shading: shade, children: [new TextRun({ text: model.subtitle, italics: true, size: 28, color: style.ink.slice(1) })] }));
  cover.push(new Paragraph({ shading: shade, children: [new PageBreak()] }));

  const body = model.entries.flatMap((entry, index): InstanceType<typeof Paragraph>[] => {
    const paragraphs = entry.content.split(/\r?\n/).map((line) => new Paragraph({
      keepNext: true,
      spacing: { after: line ? 180 : 80, line: 320 },
      shading: shade,
      children: [new TextRun({ text: line || " ", size: fontSizes[model.textSize], color: style.ink.slice(1) })],
    }));
    const date = model.showDates ? [new Paragraph({ spacing: { before: 80, after: 360 }, shading: shade, children: [new TextRun({ text: new Intl.DateTimeFormat(model.locale).format(new Date(entry.createdAt)), size: 18, color: "777777" })] })] : [new Paragraph({ spacing: { after: 260 }, shading: shade })];
    const divider = index < model.entries.length - 1 ? [new Paragraph({ spacing: { after: 180 }, shading: shade, border: { bottom: { style: BorderStyle.SINGLE, color: "D6D2C7", size: 4, space: 8 } } })] : [];
    return [...paragraphs, ...date, ...divider];
  });

  const doc = new Document({
    sections: [{
      properties: { page: { size: pageDimensions[model.pageSize], margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children: [...cover, ...body],
    }],
  });
  return Packer.toBlob(doc);
}

/** Saves the generated Word export and reports where (Issue #23's export-completion closure). */
export async function downloadMeditationDocx(model: MeditationExportModel): Promise<SaveResult & { fileName: string }> {
  const fileName = `daily-canvas-meditations-${new Date().toISOString().slice(0, 10)}.docx`;
  const result = await saveBlobWithPath(await createMeditationDocx(model), fileName);
  return { ...result, fileName };
}
