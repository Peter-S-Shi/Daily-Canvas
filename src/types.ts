export type Language = "zh-CN" | "en";
export type Theme = "light" | "dark" | "system";
export type TaskKind = "task" | "habit" | "avoidance";
export type RecurrenceType = "once" | "daily" | "weekdays" | "interval" | "weeklyInterval" | "monthlyDay";
export type CheckInStatus = "done" | "lapse" | "skipped";

export interface Recurrence {
  type: RecurrenceType;
  weekdays?: number[];
  intervalDays?: number;
  intervalWeeks?: number;
  dayOfMonth?: number;
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
  replannedStartDate?: string;
  replanHistory?: ReplanHistoryEntry[];
  endDate?: string;
  schedule: Schedule;
  targetDays?: number;
  targetPeriods?: number;
  stopReminderAtTarget: boolean;
  notes?: string;
  checklist?: ChecklistItem[];
  estimatedMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem { id: string; title: string; completed: boolean; createdAt: string; updatedAt: string }
export interface InboxCapture { id: string; title: string; createdAt: string; updatedAt: string }
export type ReminderOffset = "off" | "at-start" | "5" | "10" | "15" | "30" | "60";
export interface TimeBlock { id: string; taskId: string; date: string; startMinutes: number; durationMinutes: number; reminder: ReminderOffset; needsReview: boolean; reminderFiredAt?: string; createdAt: string; updatedAt: string }
export interface ReplanHistoryEntry { replannedAt: string; previousStartDate: string; nextStartDate: string; note?: string }
export interface ReplanEvent { id: string; taskId: string; replannedAt: string; previousStartDate: string; nextStartDate: string; note?: string }
export type SearchResult =
  | { type: "task"; id: string; title: string; excerpt?: string }
  | { type: "reflection"; id: string; title: string; excerpt?: string }
  | { type: "meditation"; id: string; title: string; excerpt?: string }
  | { type: "area"; id: string; title: string; excerpt?: string };

export interface LegacyTask extends Omit<Task, "schedule" | "areaId" | "colorOverride"> {
  category: string;
  color: string;
  recurrence: Recurrence;
}

export interface CheckIn { id: string; taskId: string; date: string; status: CheckInStatus; note?: string; updatedAt: string }
export type LifecycleState = "starting" | "building" | "milestone-reached" | "maintenance" | "paused" | "completed" | "archived";
export type PauseType = "planned-break" | "vacation" | "retroactive";
export interface TaskLifecycle { taskId: string; state: LifecycleState; resumeState?: Exclude<LifecycleState, "paused" | "archived" | "completed">; milestoneSequence: number; nextMilestoneTarget?: number; personalBest: number; celebrationPending: boolean; createdAt: string; updatedAt: string }
export interface PausePeriod { id: string; taskId: string; startDate: string; endDate?: string; resumedAt?: string; type: PauseType; note?: string; createdAt: string; updatedAt: string }
export type MilestoneEventType = "target-reached" | "continued" | "maintenance" | "extended" | "completed" | "archived" | "paused" | "resumed" | "recovery-continued" | "plan-adjusted" | "reward-claimed";
export interface MilestoneEvent { id: string; taskId: string; date: string; type: MilestoneEventType; sequence: number; targetValue?: number; note?: string; createdAt: string }
export interface DailyOrder { date: string; taskIds: string[] }
export interface JournalEntry { date: string; content: string; updatedAt: string }
export type ReflectionTemplateId = "free" | "daily-checkin" | "gratitude";
export interface DailyReflection { date: string; emotionIds: string[]; intensity?: number; note: string; promptId?: string; templateId?: ReflectionTemplateId; createdAt: string; updatedAt: string }
export interface EmotionDefinition { id: string; label: string; normalizedLabel: string; systemKey?: string; isSystem: boolean; archived: boolean; createdAt: string; updatedAt: string }
export type ExperienceComparison = "easier" | "similar" | "harder";
export interface ExperienceLog { id: string; taskId: string; date: string; comparison?: ExperienceComparison; effort?: number; urgeIntensity?: number; note?: string; updatedAt: string }
export type BackgroundSlot = "app" | "today" | "calendar" | "reflection";
export interface AppearanceAsset { id: string; kind: "background"; mimeType: string; dataUrl: string; createdAt: string }
export interface BackgroundPreference { slot: BackgroundSlot; assetId?: string; fit: "cover" | "contain"; position: string; overlayOpacity: number; blurPx: number }
export type RewardTrigger = "date" | "streak";
export interface Reward { id: string; title: string; taskId?: string; trigger: RewardTrigger; rewardDate?: string; streakDays?: number; claimedAt?: string; createdAt: string }
export interface MeditationEntry { id: string; content: string; sortOrder: number; createdAt: string; updatedAt: string }
export type AutoBackupStatus = "success" | "failed";
export interface AutoBackupRun { id: string; at: string; status: AutoBackupStatus; fileName: string; sizeBytes?: number; error?: string }

export interface AppSettings {
  id: "app";
  dataVersion: 9;
  language: Language;
  theme: Theme;
  weekStartsOn: 0 | 1;
  reduceMotion: boolean;
  onboardingComplete: boolean;
  reflectionPromptsEnabled: boolean;
  promptRotationState?: { remainingPromptIds: string[]; promptSetVersion: number };
  backgroundPreferences: BackgroundPreference[];
  autoBackupEnabled: boolean;
  lastAutoBackupAt?: string;
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
export interface BackupPayloadV4 { format: "daily-canvas-backup"; version: 4; exportedAt: string; areas: Area[]; tasks: Task[]; checkIns: CheckIn[]; experienceLogs: ExperienceLog[]; dailyOrders: DailyOrder[]; dailyReflections: DailyReflection[]; emotionDefinitions: EmotionDefinition[]; rewards: Reward[]; appearanceAssets: AppearanceAsset[]; settings: Array<Omit<AppSettings, "dataVersion"> & { dataVersion: 4 }> }
export interface BackupPayloadV5 { format: "daily-canvas-backup"; version: 5; exportedAt: string; areas: Area[]; tasks: Task[]; checkIns: CheckIn[]; experienceLogs: ExperienceLog[]; taskLifecycles: TaskLifecycle[]; pausePeriods: PausePeriod[]; milestoneEvents: MilestoneEvent[]; dailyOrders: DailyOrder[]; dailyReflections: DailyReflection[]; emotionDefinitions: EmotionDefinition[]; rewards: Reward[]; appearanceAssets: AppearanceAsset[]; settings: Array<Omit<AppSettings, "dataVersion"> & { dataVersion: 5 }> }
export interface BackupPayloadV6 extends Omit<BackupPayloadV5, "version" | "settings"> { version: 6; meditationEntries: MeditationEntry[]; settings: Array<Omit<AppSettings, "dataVersion"> & { dataVersion: 6 }> }
export interface BackupPayloadV7 extends Omit<BackupPayloadV6, "version" | "settings"> { version: 7; inboxCaptures: InboxCapture[]; replanEvents: ReplanEvent[]; settings: Array<Omit<AppSettings, "dataVersion"> & { dataVersion: 7 }> }
export interface BackupPayloadV8 extends Omit<BackupPayloadV7, "version" | "settings"> { version: 8; timeBlocks: TimeBlock[]; settings: Array<Omit<AppSettings, "dataVersion" | "autoBackupEnabled" | "lastAutoBackupAt"> & { dataVersion: 8 }> }
export interface BackupPayload extends Omit<BackupPayloadV8, "version" | "settings"> { version: 9; settings: AppSettings[] }

export interface RestorePreview {
  payload: BackupPayload;
  sourceVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  migrated: boolean;
  warnings: string[];
  counts: { areas: number; tasks: number; inboxCaptures: number; replanEvents: number; timeBlocks: number; checkIns: number; experienceLogs: number; taskLifecycles: number; pausePeriods: number; milestoneEvents: number; dailyOrders: number; dailyReflections: number; meditations: number; emotions: number; rewards: number; appearanceAssets: number };
}
