import { useTranslation } from "react-i18next";
import { Dialog, DialogHeader } from "../Dialog";
import { resolveTaskColor } from "../../services/areaService";
import type { Area, Task } from "../../types";

interface TaskPickerDialogProps { date: string; tasks: Task[]; areas: Area[]; onClose: () => void; onPick: (task: Task) => void }

/** Keyboard-accessible task selection for scheduling a Time Block, independent of any drag interaction. */
export function TaskPickerDialog({ date, tasks, areas, onClose, onPick }: TaskPickerDialogProps) {
  const { t, i18n } = useTranslation();
  return (
    <Dialog labelledBy="task-picker-title" onClose={onClose} className="task-picker-dialog">
      <DialogHeader id="task-picker-title" eyebrow={new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`))} title={t("chooseWorkToSchedule")} onClose={onClose} closeLabel={t("close")} />
      {tasks.length === 0 ? <div className="empty-state"><p>{t("noAvailableWork")}</p></div> : <div className="item-list">
        {tasks.map((task) => <button type="button" key={task.id} className="item-copy task-link" style={{ "--task-color": resolveTaskColor(task, areas) } as React.CSSProperties} onClick={() => onPick(task)}>
          <span className="item-title"><i className="area-dot" aria-hidden="true" />{task.title}</span>
        </button>)}
      </div>}
    </Dialog>
  );
}
