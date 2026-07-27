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
  chineseTitle?: string;
  englishTitle?: string;
  showDates?: boolean;
  pageStyle?: MeditationPageStyle;
  pageSize?: MeditationPageSize;
  textSize?: MeditationTextSize;
  locale?: string;
}

export interface MeditationExportModel {
  entries: MeditationEntry[];
  chineseTitle: string;
  englishTitle: string;
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
    chineseTitle: options.chineseTitle ?? "我的感悟",
    englishTitle: options.englishTitle ?? "Meditations",
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
  if (model.chineseTitle) cover.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 3000, after: 260 }, shading: shade, children: [new TextRun({ text: model.chineseTitle, bold: true, size: 48, color: style.ink.slice(1) })] }));
  if (model.englishTitle) cover.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, shading: shade, children: [new TextRun({ text: model.englishTitle, italics: true, size: 28, color: style.ink.slice(1) })] }));
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

export async function downloadMeditationDocx(model: MeditationExportModel): Promise<void> {
  const blob = await createMeditationDocx(model);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `daily-canvas-meditations-${new Date().toISOString().slice(0, 10)}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}
