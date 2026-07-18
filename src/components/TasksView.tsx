import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { calculateTaskStats } from "../lib/dates";
import type { Task } from "../types";

interface TasksViewProps {
  onAdd: () => void;
  onEdit: (task: Task) => void;
}

export function TasksView({ onAdd, onEdit }: TasksViewProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "starred" | "archived">("all");
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []) ?? [];
  const visible = tasks
    .filter((task) => filter === "archived" ? task.archived : !task.archived && (filter !== "starred" || task.starred))
    .sort((a, b) => Number(b.starred) - Number(a.starred) || b.updatedAt.localeCompare(a.updatedAt));

  const remove = async (task: Task) => {
    if (!globalThis.confirm(t("deleteConfirm", { title: task.title }))) return;
    await db.transaction("rw", db.tasks, db.checkIns, db.dailyOrders, async () => {
      await db.tasks.delete(task.id);
      await db.checkIns.where("taskId").equals(task.id).delete();
      const orders = await db.dailyOrders.toArray();
      await db.dailyOrders.bulkPut(orders.map((order) => ({ ...order, taskIds: order.taskIds.filter((id) => id !== task.id) })));
    });
  };

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="section-heading">
          <div><span className="eyebrow">{t("tasks")}</span><h1>{t("tasks")}</h1><p>{t("appTagline")}</p></div>
          <button type="button" className="button primary" onClick={onAdd}>＋ {t("addTask")}</button>
        </div>
        <div className="filter-tabs">
          {(["all", "starred", "archived"] as const).map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{t(item === "all" ? "filterAll" : item === "starred" ? "filterStarred" : "archived")}</button>)}
        </div>
        <div className="task-gallery">
          {visible.map((task) => {
            const stats = calculateTaskStats(task, checkIns.filter((item) => item.taskId === task.id));
            return (
              <article className="task-tile" key={task.id} style={{ "--task-color": task.color } as React.CSSProperties}>
                <div className="tile-top"><span className="kind-pill">{t(task.kind === "task" ? "regularTask" : task.kind === "habit" ? "goodHabit" : "avoidanceHabit")}</span><button type="button" className="star-button" onClick={() => db.tasks.update(task.id, { starred: !task.starred, updatedAt: new Date().toISOString() })}>{task.starred ? "★" : "☆"}</button></div>
                <button type="button" className="tile-copy" onClick={() => onEdit(task)}><h3>{task.title}</h3><p>{task.category || t("category")}</p></button>
                <div className="mini-stats"><span><strong>{stats.currentStreak}</strong>{t("days")}</span><span><strong>{stats.completionRate}%</strong>{t("completionRate")}</span></div>
                <div className="tile-actions">
                  <button type="button" onClick={() => db.tasks.update(task.id, { archived: !task.archived, updatedAt: new Date().toISOString() })}>{task.archived ? t("restore") : t("archive")}</button>
                  <button type="button" className="danger-text" onClick={() => remove(task)}>{t("delete")}</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
