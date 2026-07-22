import { db } from "../db";
import type { Area, Task } from "../types";

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
export const DEFAULT_TASK_COLOR = "#f4a261";

export function resolveTaskColor(task: Pick<Task, "areaId" | "colorOverride">, areas: Area[]): string {
  return task.colorOverride || areas.find((area) => area.id === task.areaId)?.color || DEFAULT_TASK_COLOR;
}

export async function saveArea(input: Pick<Area, "name" | "color" | "icon">, existing?: Area): Promise<Area> {
  const now = new Date().toISOString();
  const name = input.name.trim();
  if (!name) throw new Error("Area name is required.");
  const duplicate = await db.areas.filter((area) => area.id !== existing?.id && area.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()).first();
  if (duplicate) throw new Error("An Area with that name already exists.");
  const area: Area = { id: existing?.id ?? makeId(), name, color: input.color, icon: input.icon?.trim() || undefined, sortOrder: existing?.sortOrder ?? await db.areas.count(), archived: existing?.archived ?? false, createdAt: existing?.createdAt ?? now, updatedAt: now };
  await db.areas.put(area);
  return area;
}

export async function updateArea(id: string, changes: Partial<Area>): Promise<void> { await db.areas.update(id, { ...changes, updatedAt: new Date().toISOString() }); }

export async function moveArea(id: string, direction: -1 | 1): Promise<void> {
  const areas = (await db.areas.orderBy("sortOrder").toArray()).filter((area) => !area.archived);
  const index = areas.findIndex((area) => area.id === id);
  const swap = index + direction;
  if (index < 0 || swap < 0 || swap >= areas.length) return;
  await db.transaction("rw", db.areas, async () => {
    await db.areas.update(areas[index].id, { sortOrder: areas[swap].sortOrder, updatedAt: new Date().toISOString() });
    await db.areas.update(areas[swap].id, { sortOrder: areas[index].sortOrder, updatedAt: new Date().toISOString() });
  });
}

export async function archiveArea(id: string, archived: boolean): Promise<void> {
  await updateArea(id, { archived });
}

export async function deleteArea(id: string): Promise<void> {
  await db.transaction("rw", db.areas, db.tasks, async () => {
    await db.tasks.where("areaId").equals(id).modify({ areaId: undefined });
    await db.areas.delete(id);
  });
}
