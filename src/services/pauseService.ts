import type { PausePeriod } from "../types";

export function effectivePauseStart(pause: PausePeriod): string {
  return pause.type === "retroactive" && pause.createdAt.slice(0, 10) > pause.startDate ? pause.createdAt.slice(0, 10) : pause.startDate;
}

export function isPausedOn(pauses: PausePeriod[], date: string): boolean {
  return pauses.some((pause) => date >= effectivePauseStart(pause) && (!pause.endDate || date <= pause.endDate));
}
