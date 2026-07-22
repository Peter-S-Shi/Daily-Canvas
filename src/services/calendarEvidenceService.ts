import type { LifecycleState, Task, TaskLifecycle } from "../types";

export type CalendarRecordFilter = "all" | "check-in" | "floating" | "quota" | "reflection" | "experience";

export interface CalendarTaskFilters {
  mode: "aggregate" | "task" | "area";
  taskId: string;
  areaId: string;
  scheduleMode: "" | Task["schedule"]["mode"];
  taskKind: "" | Task["kind"];
}

const inactiveLifecycleStates = new Set<LifecycleState>(["paused", "completed", "archived"]);

export function isCalendarSelectorActive(task: Task, lifecycle?: TaskLifecycle): boolean {
  return !task.archived && !inactiveLifecycleStates.has(lifecycle?.state ?? "building");
}

export function matchesCalendarTask(task: Task, filters: CalendarTaskFilters): boolean {
  return (!filters.scheduleMode || task.schedule.mode === filters.scheduleMode) &&
    (!filters.taskKind || task.kind === filters.taskKind) &&
    (filters.mode !== "task" || !filters.taskId || task.id === filters.taskId) &&
    (filters.mode !== "area" || !filters.areaId || task.areaId === filters.areaId);
}

export function calendarTaskSets(tasks: Task[], lifecycles: TaskLifecycle[], filters: CalendarTaskFilters): { matching: Task[]; selectable: Task[] } {
  const lifecycleByTask = new Map(lifecycles.map((item) => [item.taskId, item]));
  const matching = tasks.filter((task) => matchesCalendarTask(task, filters));
  return { matching, selectable: matching.filter((task) => isCalendarSelectorActive(task, lifecycleByTask.get(task.id))) };
}

export function calendarRecordVisibility(filter: CalendarRecordFilter) {
  return {
    fixed: filter === "all" || filter === "check-in",
    floating: filter === "all" || filter === "floating",
    quota: filter === "all" || filter === "quota",
    reflection: filter === "all" || filter === "reflection",
    experience: filter === "all" || filter === "experience",
    pause: filter === "all",
  };
}
