import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { archiveArea, deleteArea, moveArea, saveArea } from "../services/areaService";
import type { Area } from "../types";

const colors = ["#f4a261", "#e76f51", "#2a9d8f", "#457b9d", "#8d6cab", "#e9c46a"];
export function AreasManager() {
  const { t } = useTranslation();
  const areas = useLiveQuery(() => db.areas.orderBy("sortOrder").toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const [editing, setEditing] = useState<Area | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [icon, setIcon] = useState(""); const [color, setColor] = useState(colors[0]); const [error, setError] = useState("");
  const begin = (area?: Area) => { setEditing(area ?? null); setName(area?.name ?? ""); setIcon(area?.icon ?? ""); setColor(area?.color ?? colors[0]); setError(""); setOpen(true); };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); try { await saveArea({ name, icon, color }, editing ?? undefined); setOpen(false); } catch (reason) { setError(reason instanceof Error ? reason.message : t("saveError")); } };
  return <section className="area-manager">
    <div className="subheading"><div><h2>{t("areas")}</h2><p>{t("areasHint")}</p></div><button type="button" className="button secondary" onClick={() => begin()}>＋ {t("addArea")}</button></div>
    {open && <form className="area-form" onSubmit={submit}><label className="field"><span>{t("areaName")}</span><input autoFocus required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field"><span>{t("areaIcon")}</span><input maxLength={4} value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="✦" /></label><div className="field"><span>{t("color")}</span><div className="color-picker">{colors.map((item) => <button type="button" key={item} className={color === item ? "selected" : ""} style={{ background: item }} onClick={() => setColor(item)} aria-label={item} />)}</div></div><div className="inline-actions"><button type="button" className="button secondary" onClick={() => setOpen(false)}>{t("cancel")}</button><button className="button primary" type="submit">{t("save")}</button></div>{error && <p className="error-message">{error}</p>}</form>}
    <div className="area-list">{areas.map((area, index) => <article key={area.id} className={`area-chip ${area.archived ? "archived-area" : ""}`}><span className="area-swatch" style={{ background: area.color }} /> <strong>{area.icon} {area.name}</strong><small>{t("areaTaskCount", { count: tasks.filter((task) => task.areaId === area.id).length })}</small><div className="area-actions"><button type="button" disabled={area.archived || index === 0} onClick={() => moveArea(area.id, -1)} aria-label={t("moveUp")}>↑</button><button type="button" disabled={area.archived || index === areas.length - 1} onClick={() => moveArea(area.id, 1)} aria-label={t("moveDown")}>↓</button><button type="button" onClick={() => begin(area)}>{t("edit")}</button><button type="button" onClick={() => archiveArea(area.id, !area.archived)}>{t(area.archived ? "restore" : "archive")}</button><button type="button" className="danger-text" onClick={() => globalThis.confirm(t("areaDeleteConfirm")) && deleteArea(area.id)}>{t("delete")}</button></div></article>)}</div>
  </section>;
}
