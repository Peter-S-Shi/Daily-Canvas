import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { todayKey } from "../lib/dates";
import { resolveTaskColor } from "../services/areaService";
import { setCheckIn } from "../services/checkInService";
import { isFloatingAvailableOn, isFloatingOverdue } from "../services/scheduleService";
import { HeaderActions } from "./shell/WorkspaceHeader";

export function FloatingView({ onCreateTask, onOpenTask }: { onCreateTask: () => void; onOpenTask: (taskId: string) => void }) {
  const { t } = useTranslation();
  const date = todayKey();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []) ?? [];
  const areas = useLiveQuery(() => db.areas.toArray(), []) ?? [];
  const completionByTask = new Map(checkIns.filter((item) => item.status === "done").map((item) => [item.taskId, item.date]));
  const floating = tasks.filter((task) => task.schedule.mode === "floating" && !task.archived).sort((a, b) => Number(isFloatingOverdue(b, new Date(), completionByTask.get(b.id))) - Number(isFloatingOverdue(a, new Date(), completionByTask.get(a.id))) || Number(b.starred) - Number(a.starred));
  return (
    <div className="page page-narrow">
      <HeaderActions><button type="button" className="button primary" onClick={onCreateTask}>＋ {t("newFloatingTask")}</button></HeaderActions>
      <div className="page-intro"><h2 className="page-title">{t("floatingTasks")}</h2><p className="muted">{t("floatingHint")}</p></div>
      {floating.length === 0 ? <div className="empty-state"><p>{t("emptyFloating")}</p></div> : <div className="item-list">
        {floating.map((task) => {
          const completedDate = completionByTask.get(task.id);
          const overdue = isFloatingOverdue(task, new Date(), completedDate);
          const available = isFloatingAvailableOn(task, new Date(), completedDate);
          const area = areas.find((item) => item.id === task.areaId);
          const status = completedDate ? t("completedOn", { date: completedDate }) : overdue ? t("overdue") : available ? t("available") : t("availableFromDate", { date: task.schedule.mode === "floating" ? task.schedule.availableFrom : "" });
          return (
            <article key={task.id} className={`floating-item ${overdue ? "overdue" : ""} ${completedDate ? "done" : ""}`} style={{ "--task-color": resolveTaskColor(task, areas) } as React.CSSProperties}>
              <button type="button" className="item-copy task-link" onClick={() => onOpenTask(task.id)}>
                <span className="item-title">{task.starred && <span className="star" aria-label={t("starred")}>★ </span>}{task.title}</span>
                <span className="item-sub"><i className="area-dot" aria-hidden="true"/>{area?.name ?? t("noArea")}</span>
              </button>
              <span className={`pill ${overdue ? "pill-warning" : completedDate ? "pill-success" : ""}`}>{status}</span>
              {!completedDate && available && <button type="button" className="button secondary compact" onClick={() => setCheckIn(task.id, date, "done")}>{t("completeToday")}</button>}
              {completedDate && <span className="completion-mark" aria-hidden="true">✓</span>}
              {completedDate && <button type="button" className="button text-button" onClick={() => setCheckIn(task.id, completedDate, undefined)}>{t("undo")}</button>}
            </article>
          );
        })}
      </div>}
    </div>
  );
}
