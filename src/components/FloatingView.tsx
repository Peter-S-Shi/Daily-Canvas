import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { todayKey } from "../lib/dates";
import { resolveTaskColor } from "../services/areaService";
import { setCheckIn } from "../services/checkInService";
import { isFloatingAvailableOn, isFloatingOverdue } from "../services/scheduleService";
import type { Task } from "../types";

export function FloatingView({ onAdd, onEdit }: { onAdd: () => void; onEdit: (task: Task) => void }) {
  const { t } = useTranslation(); const date = todayKey();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []; const checkIns = useLiveQuery(() => db.checkIns.toArray(), []) ?? []; const areas = useLiveQuery(() => db.areas.toArray(), []) ?? [];
  const completionByTask = new Map(checkIns.filter((item) => item.status === "done").map((item) => [item.taskId, item.date]));
  const floating = tasks.filter((task) => task.schedule.mode === "floating" && !task.archived).sort((a,b) => Number(isFloatingOverdue(b, new Date(), completionByTask.get(b.id))) - Number(isFloatingOverdue(a, new Date(), completionByTask.get(a.id))) || Number(b.starred) - Number(a.starred));
  return <div className="view-stack"><section className="panel"><div className="section-heading"><div><span className="eyebrow">{t("flexiblePlanning")}</span><h1>{t("floatingTasks")}</h1><p>{t("floatingHint")}</p></div><button className="button primary" type="button" onClick={onAdd}>＋ {t("addTask")}</button></div>
    {floating.length === 0 && <div className="empty-state"><span>◌</span><p>{t("emptyFloating")}</p></div>}
    <div className="floating-list">{floating.map((task) => { const completedDate = completionByTask.get(task.id); const overdue = isFloatingOverdue(task, new Date(), completedDate); const available = isFloatingAvailableOn(task, new Date(), completedDate); const area = areas.find((item) => item.id === task.areaId); return <article key={task.id} className={`floating-card ${overdue ? "overdue" : ""}`} style={{ "--task-color": resolveTaskColor(task, areas) } as React.CSSProperties}><span className="task-color" /><button type="button" className="task-copy" onClick={() => onEdit(task)}><span className="task-title">{task.starred && "★ "}{task.title}</span><span className="task-meta">{area?.name ?? t("noArea")} · {completedDate ? t("completedOn", { date: completedDate }) : overdue ? t("overdue") : available ? t("available") : t("availableFromDate", { date: task.schedule.mode === "floating" ? task.schedule.availableFrom : "" })}</span></button>{!completedDate && available && <button type="button" className="button primary compact-button" onClick={() => setCheckIn(task.id, date, "done")}>{t("completeToday")}</button>}{completedDate && <span className="completion-mark">✓</span>}</article>; })}</div>
  </section></div>;
}
