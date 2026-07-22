import { db } from "../db";
import type { AppSettings } from "../types";

export async function updateSettings(changes: Partial<Omit<AppSettings, "id" | "dataVersion">>): Promise<void> {
  await db.settings.update("app", changes);
}
