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
export interface DailyReflection { date: string; emotionIds: string[]; intensity?: number; note: string; promptId?: string; createdAt: string; updatedAt: string }
export interface EmotionDefinition { id: string; label: string; normalizedLabel: string; systemKey?: string; isSystem: boolean; archived: boolean; createdAt: string; updatedAt: string }
export type ExperienceComparison = "easier" | "similar" | "harder";
export interface ExperienceLog { id: string; taskId: string; date: string; comparison?: ExperienceComparison; effort?: number; urgeIntensity?: number; note?: string; updatedAt: string }
export type BackgroundSlot = "app" | "today" | "calendar" | "reflection";
export interface AppearanceAsset { id: string; kind: "background"; mimeType: string; dataUrl: string; createdAt: string }
export interface BackgroundPreference { slot: BackgroundSlot; assetId?: string; fit: "cover" | "contain"; position: string; overlayOpacity: number; blurPx: number }
export type RewardTrigger = "date" | "streak";
export interface Reward { id: string; title: string; taskId?: string; trigger: RewardTrigger; rewardDate?: string; streakDays?: number; claimedAt?: string; createdAt: string }

export interface AppSettings {
  id: "app";
  dataVersion: 4;
  language: Language;
  theme: Theme;
  weekStartsOn: 0 | 1;
  reduceMotion: boolean;
  onboardingComplete: boolean;
  reflectionPromptsEnabled: boolean;
  promptRotationState?: { remainingPromptIds: string[]; promptSetVersion: number };
  backgroundPreferences: BackgroundPreference[];
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
type LegacySettings = Omit<AppSettings, "dataVersion" | "reflectionPromptsEnabled" | "promptRotationState" | "backgroundPreferences"> & { backgroundDataUrl?: string };
export interface BackupPayloadV1 extends BackupBase<LegacyTask, Omit<LegacySettings, "onboardingComplete">> { version: 1 }
export interface BackupPayloadV2 extends BackupBase<LegacyTask, LegacySettings & { dataVersion: 2 }> { version: 2 }
export interface BackupPayloadV3 extends BackupBase<Task, LegacySettings & { dataVersion: 3 }> { version: 3; areas: Area[] }
export interface BackupPayload { format: "daily-canvas-backup"; version: 4; exportedAt: string; areas: Area[]; tasks: Task[]; checkIns: CheckIn[]; experienceLogs: ExperienceLog[]; dailyOrders: DailyOrder[]; dailyReflections: DailyReflection[]; emotionDefinitions: EmotionDefinition[]; rewards: Reward[]; appearanceAssets: AppearanceAsset[]; settings: AppSettings[] }

export interface RestorePreview {
  payload: BackupPayload;
  sourceVersion: 1 | 2 | 3 | 4;
  migrated: boolean;
  warnings: string[];
  counts: { areas: number; tasks: number; checkIns: number; experienceLogs: number; dailyOrders: number; dailyReflections: number; emotions: number; rewards: number; appearanceAssets: number };
}
