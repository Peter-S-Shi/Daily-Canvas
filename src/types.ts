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

export interface Task {
  id: string;
  title: string;
  kind: TaskKind;
  category: string;
  color: string;
  starred: boolean;
  archived: boolean;
  startDate: string;
  endDate?: string;
  recurrence: Recurrence;
  targetDays?: number;
  stopReminderAtTarget: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  id: string;
  taskId: string;
  date: string;
  status: CheckInStatus;
  note?: string;
  updatedAt: string;
}

export interface DailyOrder {
  date: string;
  taskIds: string[];
}

export interface JournalEntry {
  date: string;
  content: string;
  updatedAt: string;
}

export type RewardTrigger = "date" | "streak";

export interface Reward {
  id: string;
  title: string;
  taskId?: string;
  trigger: RewardTrigger;
  rewardDate?: string;
  streakDays?: number;
  claimedAt?: string;
  createdAt: string;
}

export interface AppSettings {
  id: "app";
  language: Language;
  theme: Theme;
  weekStartsOn: 0 | 1;
  backgroundDataUrl?: string;
  reduceMotion: boolean;
}

export interface BackupPayload {
  format: "daily-canvas-backup";
  version: 1;
  exportedAt: string;
  tasks: Task[];
  checkIns: CheckIn[];
  dailyOrders: DailyOrder[];
  journalEntries: JournalEntry[];
  rewards: Reward[];
  settings: AppSettings[];
}
