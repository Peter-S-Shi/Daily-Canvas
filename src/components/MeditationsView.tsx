import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { buildMeditationExportModel, downloadMeditationDocx, meditationPageStyles, type MeditationExportModel, type MeditationPageSize, type MeditationPageStyle, type MeditationTextSize } from "../services/meditationExportService";
import { countMeditationUnits, createMeditation, deleteMeditation, reorderMeditations, updateMeditation, validateMeditationContent } from "../services/meditationService";
import type { MeditationEntry } from "../types";

function MeditationEditor({ entry, onClose }: { entry?: MeditationEntry; onClose: () => void }) {
  const { t } = useTranslation();
  const [content, setContent] = useState(entry?.content ?? "");
  const [error, setError] = useState("");
  const validation = validateMeditationContent(content);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validation.valid) return;
    try {
      if (entry) await updateMeditation(entry.id, content);
      else await createMeditation(content);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("meditationSaveError"));
    }
  };
  return <div className="modal-backdrop"><form className="modal-card meditation-editor" onSubmit={save}><div className="section-heading compact-heading"><div><span className="eyebrow">{t("meditations")}</span><h2>{t(entry ? "editMeditation" : "newMeditation")}</h2></div><button type="button" className="icon-button" onClick={onClose}>×</button></div><label className="field"><span>{t("meditationContent")}</span><textarea autoFocus rows={12} value={content} onChange={(event) => setContent(event.target.value)} placeholder={t("meditationPlaceholder")}/></label><div className={`meditation-counter ${validation.units > 150 ? "over" : ""}`}><span>{validation.error === "empty" ? t("meditationEmpty") : validation.error === "too-long" ? t("meditationTooLong") : t("meditationLimitHint")}</span><strong>{countMeditationUnits(content)} / 150</strong></div>{error && <p className="error-message" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>{t("cancel")}</button><button type="submit" className="button primary" disabled={!validation.valid}>{t("save")}</button></div></form></div>;
}

function SortableMeditationCard({ entry, selected, selecting, onSelect, onEdit, onDelete, locale }: { entry: MeditationEntry; selected: boolean; selecting: boolean; onSelect: () => void; onEdit: () => void; onDelete: () => void; locale: string }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const edited = entry.updatedAt !== entry.createdAt;
  return <article ref={setNodeRef} className={`meditation-card ${selected ? "selected" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .55 : 1 }}>{selecting && <label className="meditation-select"><input type="checkbox" checked={selected} onChange={onSelect}/><span className="sr-only">{t("selectMeditation")}</span></label>}<button type="button" className="drag-handle meditation-drag" aria-label={t("reorderMeditation")} {...attributes} {...listeners}>⋮⋮</button><div className="meditation-copy"><p>{entry.content}</p><small>{new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(entry.createdAt))}{edited ? ` · ${t("edited")}` : ""}</small></div><div className="meditation-actions"><button type="button" className="quiet-action" onClick={onEdit}>{t("edit")}</button><button type="button" className="quiet-action danger-text" onClick={onDelete}>{t("delete")}</button></div></article>;
}

export function MeditationPrintDocument({ model }: { model: MeditationExportModel }) {
  const printPageSize = model.pageSize === "a4" ? "A4" : "Letter";
  return <><style data-meditation-page-size={model.pageSize}>{`@page { size: ${printPageSize}; margin: 0; }`}</style><div className={`meditation-print-document size-${model.pageSize} text-${model.textSize}`} style={{ "--paper": meditationPageStyles[model.pageStyle].background, "--paper-ink": meditationPageStyles[model.pageStyle].ink } as React.CSSProperties}><section className="meditation-cover"><h1>{model.chineseTitle}</h1>{model.englishTitle && <p>{model.englishTitle}</p>}</section><section className="meditation-pages">{model.entries.map((entry) => <article key={entry.id}><div>{entry.content}</div>{model.showDates && <time>{new Intl.DateTimeFormat(model.locale, { year: "numeric", month: "long", day: "numeric" }).format(new Date(entry.createdAt))}</time>}</article>)}</section></div></>;
}

function MeditationExportPreview({ entries, selectedIds, onClose }: { entries: MeditationEntry[]; selectedIds?: string[]; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [chineseTitle, setChineseTitle] = useState("我的感悟");
  const [englishTitle, setEnglishTitle] = useState("Meditations");
  const [showDates, setShowDates] = useState(true);
  const [pageStyle, setPageStyle] = useState<MeditationPageStyle>("ivory");
  const [pageSize, setPageSize] = useState<MeditationPageSize>("a4");
  const [textSize, setTextSize] = useState<MeditationTextSize>("standard");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const model = buildMeditationExportModel(entries, { selectedIds, chineseTitle, englishTitle, showDates, pageStyle, pageSize, textSize, locale: i18n.language });
  const downloadWord = async () => {
    setGenerating(true); setError("");
    try { await downloadMeditationDocx(model); } catch (reason) { setError(reason instanceof Error ? reason.message : t("wordExportError")); } finally { setGenerating(false); }
  };
  return <div className="modal-backdrop export-backdrop"><section className="modal-card meditation-export-modal" role="dialog" aria-modal="true" aria-label={t("exportPreview")}><div className="section-heading compact-heading no-print"><div><span className="eyebrow">{t("exportPreview")}</span><h2>{t(selectedIds ? "exportSelected" : "exportAll")}</h2><p>{t("exportCount", { count: model.entries.length })}</p></div><button type="button" className="icon-button" onClick={onClose}>×</button></div><div className="meditation-export-layout"><aside className="export-controls no-print"><label className="field"><span>{t("chineseCoverTitle")}</span><input value={chineseTitle} onChange={(event) => setChineseTitle(event.target.value)}/></label><label className="field"><span>{t("englishCoverTitle")}</span><input value={englishTitle} onChange={(event) => setEnglishTitle(event.target.value)}/></label><label className="toggle-row"><input type="checkbox" checked={showDates} onChange={(event) => setShowDates(event.target.checked)}/>{t("showDates")}</label><label className="field"><span>{t("pageSize")}</span><select value={pageSize} onChange={(event) => setPageSize(event.target.value as MeditationPageSize)}><option value="a4">A4</option><option value="letter">Letter</option></select></label><label className="field"><span>{t("textSize")}</span><select value={textSize} onChange={(event) => setTextSize(event.target.value as MeditationTextSize)}><option value="compact">{t("compact")}</option><option value="standard">{t("standard")}</option><option value="large">{t("large")}</option></select></label><fieldset className="export-styles"><legend>{t("backgroundPreset")}</legend>{(Object.keys(meditationPageStyles) as MeditationPageStyle[]).map((style) => <label key={style} className={pageStyle === style ? "active" : ""} style={{ background: meditationPageStyles[style].background }}><input type="radio" name="page-style" value={style} checked={pageStyle === style} onChange={() => setPageStyle(style)}/><span>{t(`pageStyle_${style}`)}</span></label>)}</fieldset><div className="export-actions"><button type="button" className="button primary" onClick={() => globalThis.print()}>{t("printPdf")}</button><button type="button" className="button secondary" disabled={generating} onClick={downloadWord}>{generating ? t("generatingWord") : t("downloadWord")}</button></div>{error && <p className="error-message" role="alert">{error}</p>}</aside><MeditationPrintDocument model={model}/></div></section></div>;
}

export function MeditationsView() {
  const { t, i18n } = useTranslation();
  const entries = useLiveQuery(() => db.meditationEntries.orderBy("sortOrder").toArray(), []) ?? [];
  const [editing, setEditing] = useState<MeditationEntry | null | undefined>(undefined);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportIds, setExportIds] = useState<string[] | null | undefined>(undefined);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = entries.map((entry) => entry.id);
    await reorderMeditations(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };
  const remove = async (entry: MeditationEntry) => {
    if (!globalThis.confirm(t("deleteMeditationConfirm"))) return;
    await deleteMeditation(entry.id);
    setSelected((current) => { const next = new Set(current); next.delete(entry.id); return next; });
  };
  const toggle = (entryId: string) => setSelected((current) => { const next = new Set(current); if (next.has(entryId)) next.delete(entryId); else next.add(entryId); return next; });
  const closeSelection = () => { setSelecting(false); setSelected(new Set()); };
  return <div className="view-stack"><section className="meditations-hero"><div><span className="eyebrow">{t("personalCollection")}</span><h1>{t("meditations")}</h1><p>{t("meditationsIntro")}</p></div><div className="meditation-hero-actions"><button type="button" className="button primary" onClick={() => setEditing(null)}>＋ {t("newMeditation")}</button>{entries.length > 0 && <button type="button" className="button secondary" onClick={() => setExportIds(null)}>{t("exportAll")}</button>}{entries.length > 0 && <button type="button" className="button secondary" onClick={() => selecting ? closeSelection() : setSelecting(true)}>{selecting ? t("cancelSelection") : t("select")}</button>}</div></section><section className="panel meditations-panel">{selecting && <div className="selection-bar"><strong>{t("selectedCount", { count: selected.size })}</strong><button type="button" className="button primary" disabled={selected.size === 0} onClick={() => setExportIds([...selected])}>{t("exportSelected")}</button><button type="button" className="button secondary" onClick={closeSelection}>{t("cancelSelection")}</button></div>}{entries.length === 0 ? <div className="empty-state meditation-empty"><span>〝</span><h2>{t("noMeditations")}</h2><p>{t("noMeditationsHint")}</p><button type="button" className="button primary" onClick={() => setEditing(null)}>{t("writeFirstMeditation")}</button></div> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={entries.map((entry) => entry.id)} strategy={verticalListSortingStrategy}><div className="meditation-list">{entries.map((entry) => <SortableMeditationCard key={entry.id} entry={entry} selected={selected.has(entry.id)} selecting={selecting} onSelect={() => toggle(entry.id)} onEdit={() => setEditing(entry)} onDelete={() => remove(entry)} locale={i18n.language}/>)}</div></SortableContext></DndContext>}</section>{editing !== undefined && <MeditationEditor entry={editing ?? undefined} onClose={() => setEditing(undefined)}/>} {exportIds !== undefined && <MeditationExportPreview entries={entries} selectedIds={exportIds ?? undefined} onClose={() => setExportIds(undefined)}/>}</div>;
}
