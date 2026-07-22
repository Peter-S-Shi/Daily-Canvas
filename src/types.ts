export type Language = "zh-CN" | "en";
export type Theme = "light" | "dark" | "system";
export type TaskKind = "task" | "habit" | "avoidance";
export type RecurrenceType = "once" | "daily" | "weekdays" | "interval";
export type CheckInStatus = "done" | "lapse" | "skipped";

export interface Recurrence {
  type: RecurrenceType;
  weekdays?: number[];
  intervalDays?: number;
}

export interface FixedSchedule { mode: "fixed"; recurrence: Recurrence }
export interface FloatingSchedule { mode: "floating"; availableFrom: string; optionalDeadline?: string }
export interface QuotaSchedule { mode: "quota"; period: "week" | "month"; targetCount: number; availableFrom: string; optionalEndDate?: string }
export type Schedule = FixedSchedule | FloatingSchedule | QuotaSchedule;

export interface Area {
  id: string;
  name: string;
  color: string;
  icon?: string;
  sortOrder: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  kind: TaskKind;
  areaId?: string;
  colorOverride?: string;
  starred: boolean;
  archived: boolean;
  startDate: string;
  endDate?: string;
  schedule: Schedule;
  targetDays?: number;
  stopReminderAtTarget: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyTask extends Omit<Task, "schedule" | "areaId" | "colorOverride"> {
  category: string;
  color: string;
  recurrence: Recurrence;
}

export interface CheckIn { id: string; taskId: string; date: string; status: CheckInStatus; note?: string; updatedAt: string }
export interface DailyOrder { date: string; taskIds: string[] }
export interface JournalEntry { date: string; content: string; updatedAt: string }
export type RewardTrigger = "date" | "streak";
export interface Reward { id: string; title: string; taskId?: string; trigger: RewardTrigger; rewardDate?: string; streakDays?: number; claimedAt?: string; createdAt: string }

export interface AppSettings {
  id: "app";
  dataVersion: 3;
  language: Language;
  theme: Theme;
  weekStartsOn: 0 | 1;
  backgroundDataUrl?: string;
  reduceMotion: boolean;
  onboardingComplete: boolean;
}

interface BackupBase<TTask, TSettings> {
  format: "daily-canvas-backup";
  exportedAt: string;
  tasks: TTask[];
  checkIns: CheckIn[];
  dailyOrders: DailyOrder[];
  journalEntries: JournalEntry[];
  rewards: Reward[];
  settings: TSettings[];
}
export interface BackupPayloadV1 extends BackupBase<LegacyTask, Omit<AppSettings, "dataVersion" | "onboardingComplete">> { version: 1 }
export interface BackupPayloadV2 extends BackupBase<LegacyTask, Omit<AppSettings, "dataVersion"> & { dataVersion: 2 }> { version: 2 }
export interface BackupPayload extends BackupBase<Task, AppSettings> { version: 3; areas: Area[] }

export interface RestorePreview {
  payload: BackupPayload;
  sourceVersion: 1 | 2 | 3;
  migrated: boolean;
  warnings: string[];
  counts: { areas: number; tasks: number; checkIns: number; dailyOrders: number; journalEntries: number; rewards: number };
}
