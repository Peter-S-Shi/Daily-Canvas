import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { archiveArea, deleteArea, moveArea, saveArea } from "../services/areaService";
import type { Area } from "../types";
import { HeaderActions } from "./shell/WorkspaceHeader";

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
  return (
    <div className="page page-narrow">
      <HeaderActions><button type="button" className="button primary" onClick={() => begin()}>＋ {t("addArea")}</button></HeaderActions>
      <div className="page-intro"><h2 className="page-title">{t("areas")}</h2><p className="muted">{t("areasHint")}</p></div>
      {open && <form className="panel area-form" onSubmit={submit} aria-label={t(editing ? "edit" : "addArea")}>
        <label className="field"><span>{t("areaName")}</span><input autoFocus required maxLength={40} value={name} onChange={(event) => setName(event.target.value)}/></label>
        <label className="field"><span>{t("areaIcon")}</span><input maxLength={4} value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="✦"/></label>
        <div className="field"><span>{t("color")}</span><div className="color-picker">{colors.map((item) => <button type="button" key={item} className={color === item ? "selected" : ""} style={{ background: item }} aria-pressed={color === item} onClick={() => setColor(item)} aria-label={item}/>)}</div></div>
        <div className="form-actions"><button type="button" className="button secondary" onClick={() => setOpen(false)}>{t("cancel")}</button><button className="button primary" type="submit">{t("save")}</button></div>
        {error && <p className="error-message" role="alert">{error}</p>}
      </form>}
      {areas.length === 0 && !open ? <div className="empty-state"><p>{t("noAreasYet")}</p></div> : <div className="item-list">
        {areas.map((area, index) => (
          <article key={area.id} className={`area-row ${area.archived ? "archived" : ""}`}>
            <span className="area-swatch" style={{ background: area.color }} aria-hidden="true"/>
            <div className="item-copy"><span className="item-title">{area.icon ? `${area.icon} ` : ""}{area.name}</span><span className="item-sub">{t("areaTaskCount", { count: tasks.filter((task) => task.areaId === area.id).length })}{area.archived ? ` · ${t("archived")}` : ""}</span></div>
            <div className="row-actions">
              <button type="button" className="icon-button small" disabled={area.archived || index === 0} onClick={() => moveArea(area.id, -1)} aria-label={t("moveUp")}>↑</button>
              <button type="button" className="icon-button small" disabled={area.archived || index === areas.length - 1} onClick={() => moveArea(area.id, 1)} aria-label={t("moveDown")}>↓</button>
              <button type="button" className="button text-button" onClick={() => begin(area)}>{t("edit")}</button>
              <button type="button" className="button text-button" onClick={() => archiveArea(area.id, !area.archived)}>{t(area.archived ? "restore" : "archive")}</button>
              <button type="button" className="button text-button danger-text" onClick={() => globalThis.confirm(t("areaDeleteConfirm")) && deleteArea(area.id)}>{t("delete")}</button>
            </div>
          </article>
        ))}
      </div>}
    </div>
  );
}
