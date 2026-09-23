import { toDateKey } from "../lib/dates";
import type { PausePeriod } from "../types";

const dateOnly = (isoOrDate: string) => isoOrDate.length === 10 ? isoOrDate : toDateKey(new Date(isoOrDate));

export function effectivePauseStart(pause: PausePeriod): string {
  return pause.type === "retroactive" && dateOnly(pause.createdAt) > pause.startDate ? dateOnly(pause.createdAt) : pause.startDate;
}

export function isPausedOn(pauses: PausePeriod[], date: string): boolean {
  return pauses.some((pause) => date >= effectivePauseStart(pause) && (!pause.endDate || date <= pause.endDate) && (!pause.resumedAt || date < dateOnly(pause.resumedAt)));
}

