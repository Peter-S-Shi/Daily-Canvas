# Daily Canvas Architecture

## 1. Product Boundary

Daily Canvas is a local-first, single-user personal planning, habit, reflection, and insight application.

IndexedDB is authoritative for product data. The application must remain useful without an account, server, analytics service, advertising system, or remote AI dependency.

The architecture must support three connected product layers:

```text
Planning
  Fixed schedules · Floating tasks · Quota goals · Mainline Areas

Recording
  Check-ins · Experience logs · Daily reflections · Emotions

Understanding
  Calendar · Statistics · Plain-language insights
```

These layers should share domain entities and services rather than creating separate feature silos.

## 2. Architectural Principles

### 2.1 Local-First by Default

- Core data remains on the current device and application origin.
- Exports and restores are initiated explicitly by the user.
- Local images remain local.
- Any future remote sync, account, AI, or cloud capability must be opt-in and must not remove the local-only mode.

### 2.2 Domain Rules Outside UI Components

React components should render state, gather input, and call application services.

Business rules for scheduling, quota evaluation, check-ins, statistics, prompts, reflection, backups, migrations, and insight generation must live in reusable modules.

The UI must not become the only place where product semantics exist.

### 2.3 Additive, Versioned Evolution

- Dexie schema changes require explicit versioned migrations.
- Backup formats require explicit version numbers and migration logic.
- Existing records must remain meaningful after upgrades.
- Destructive replacement must be preceded by validation and a safety backup.
- Unknown or newer backup versions must fail safely with an actionable message.

### 2.4 Derived Information Should Stay Derived

Calendar states, streaks, quota progress, summaries, and most insights should be derived from stable source records.

Do not materialize unlimited future task occurrences.

Do not store a conclusion when it can be reproduced from durable facts, unless a future feature explicitly introduces a frozen review snapshot.

### 2.5 Compassionate and Non-Diagnostic Semantics

- Missing reflection data is simply missing.
- Missing avoidance-habit check-ins are never treated as success.
- Reflection prompts are optional.
- Statistics may describe patterns but must not diagnose, infer personality, or claim causation.
- Recovery flows preserve previous progress rather than erasing history.

---

## 3. Target Domain Model

### Current implementation through v0.6

Milestones 3 and 4 implement the current persistent model: first-class `Area` records, the fixed/floating/quota `Schedule` union, Daily Reflections, Emotion Definitions, Experience Logs, and local Appearance Assets. Dexie schema and backup format version 4 preserve and migrate every supported record from earlier releases.

Milestone 5 adds no persistent tables; its reviews remain derived. Milestone 6 advances Dexie and backup format to version 5 with `TaskLifecycle`, `PausePeriod`, and append-only `MilestoneEvent` records. Existing Task and CheckIn identities remain unchanged.

```text
Area
  └── Task
       ├── Schedule
       ├── CheckIn[taskId + date]
       ├── ExperienceLog[taskId + date]
       └── Reward[taskId?]

DailyOrder[date]

DailyReflection[date]
  ├── emotionIds[]
  ├── optional intensity
  ├── note
  └── promptId

EmotionDefinition

AppearanceAsset
AppSettings

Derived Services
  ├── Schedule Service
  ├── Quota Evaluation Service
  ├── Statistics Service
  ├── Reflection Prompt Service
  └── Insight Engine
```

The model remains intentionally shallow. An Area contains Tasks; Tasks do not form an unlimited recursive tree.

---

## 4. Area / Mainline

### Purpose

An `Area` represents a durable life domain such as French, Job Search, Piano, Health, or Personal Administration.

It is not itself a task and does not create check-ins.

### Suggested Shape

```ts
interface Area {
  id: string;
  name: string;
  color: string;
  icon?: string;
  sortOrder: number;
  archived: boolean;
  backgroundAssetId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Task Relationship

```ts
interface Task {
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
```

The display color resolves as:

```text
task.colorOverride
    else area.color
    else application default
```

### Migration from Existing Categories

- Each unique non-empty existing category should become one Area.
- Existing tasks should receive the matching `areaId`.
- Existing task colors should be preserved as explicit overrides when needed to avoid unexpected visual changes.
- Empty categories may remain without an Area.
- Migration must not alter check-ins, rewards, journal history, or task identity.

### Boundary

One optional Area per Task is sufficient for the planned product. Tags or many-to-many classification can be considered later, but unlimited nested projects and subtasks are outside the current architecture.

---

## 5. Schedule Model

The existing recurrence model must evolve into an explicit schedule union.

```ts
type Schedule =
  | FixedSchedule
  | FloatingSchedule
  | QuotaSchedule;
```

### 5.1 Fixed Schedule

```ts
interface FixedSchedule {
  mode: "fixed";
  recurrence:
    | { type: "once" }
    | { type: "daily" }
    | { type: "weekdays"; weekdays: number[] }
    | { type: "interval"; intervalDays: number };
}
```

Fixed schedules preserve the existing semantics:

- an occurrence is calculated for a date;
- past unrecorded scheduled dates may count as missed;
- skipped dates are neutral according to the existing statistics rules;
- no future occurrence rows are materialized.

### 5.2 Floating Schedule

```ts
interface FloatingSchedule {
  mode: "floating";
  availableFrom: string;
  optionalDeadline?: string;
}
```

A Floating Task is a one-time item that can be chosen on any suitable date.

Semantics:

- it is available rather than automatically due every day;
- not choosing it today is not a daily failure;
- completion is represented by a successful dated check-in;
- an optional deadline may make it overdue, but overdue is not the same as a failed habit day;
- the Today view may surface or pin floating items without changing their schedule definition.

### 5.3 Quota Schedule

```ts
interface QuotaSchedule {
  mode: "quota";
  period: "week" | "month";
  targetCount: number;
  availableFrom: string;
  optionalEndDate?: string;
}
```

Examples:

- one vegetarian day per week;
- four gym visits per month.

Semantics:

- successful dated check-ins count toward the active period;
- one task can receive at most one credited completion per calendar date in the planned v0.x model;
- individual uncompleted dates are not failures;
- the period result is derived as achieved, partial, or not achieved;
- quota streaks count consecutive successful periods, not consecutive days;
- the configured first day of the week must control weekly period boundaries;
- current-period progress remains provisional until the period closes.

### Schedule Service Boundary

All schedule decisions belong in a date-domain service:

```text
isAvailableOn(task, date)
isFixedOccurrenceOn(task, date)
getQuotaPeriod(task, date, weekStartsOn)
getQuotaProgress(task, period, checkIns)
getPeriodOutcome(task, completedPeriod, checkIns)
```

UI components should not duplicate these rules.

---

## 6. Check-In

The stable identifier remains:

```text
taskId:date
```

### Suggested Shape

```ts
type CheckInStatus = "done" | "lapse" | "skipped";

interface CheckIn {
  id: string;
  taskId: string;
  date: string;
  status: CheckInStatus;
  note?: string;
  updatedAt: string;
}
```

### Semantics by Task Kind

- `task` or positive `habit`
  - `done`: completed
  - `skipped`: neutral
  - missing: unrecorded
- `avoidance`
  - `done`: explicitly confirmed safe day
  - `lapse`: explicit lapse
  - `skipped`: neutral
  - missing: never treated as success

### Semantics by Schedule Mode

- fixed: evaluated against scheduled dates;
- floating: completion closes the item; absence on other dates is neutral;
- quota: successful dated check-ins count toward the period target; individual missing dates are neutral.

The same CheckIn table can therefore support all schedule modes as long as schedule evaluation is handled by services rather than embedded in record shape.

---

## 7. Experience Log

A CheckIn records what happened. An `ExperienceLog` records how it felt.

These must remain separate so subjective reflection never corrupts completion semantics.

### Suggested Shape

```ts
type ExperienceComparison = "easier" | "similar" | "harder";

interface ExperienceLog {
  id: string;              // taskId:date
  taskId: string;
  date: string;
  comparison?: ExperienceComparison;
  effort?: number;         // 1–5
  urgeIntensity?: number;  // 1–5, especially useful for avoidance habits
  note?: string;
  updatedAt: string;
}
```

### Rules

- Optional at all times.
- Usually offered after a check-in as a compact micro-reflection.
- Comparison should refer to the previous recorded experience for that task, not automatically to yesterday.
- Empty Experience Logs should not be created.
- Values outside supported ranges must be rejected by the service layer.
- Experience data may support later summaries but must not be presented as diagnosis or proof of cause.

---

## 8. Daily Reflection and Emotions

The existing one-note-per-day journal evolves into a structured `DailyReflection`.

### Suggested Shape

```ts
interface DailyReflection {
  date: string;
  emotionIds: string[];
  intensity?: number;   // optional overall intensity, 1–5
  note: string;
  promptId?: string;
  updatedAt: string;
}
```

### Emotion Definition

```ts
interface EmotionDefinition {
  id: string;
  label: string;
  normalizedLabel: string;
  isSystem: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Rules

- Several emotions may be selected on one date.
- Users may create their own labels.
- Normalized labels prevent accidental duplicates while preserving the user's display text.
- System emotion labels may be localized; user-created labels are authored content and must not be auto-translated.
- An empty emotion list is valid.
- The note remains optional and supports complete free-form, multi-paragraph writing without an application-imposed diary-length limit.
- Existing `JournalEntry.content` migrates into `DailyReflection.note` without alteration.

---

## 9. Reflection Prompt Service

Prompt content should be stored as versioned local resources, not fetched remotely.

### Prompt Requirements

- warm but not overly cheerful;
- non-judgmental;
- non-diagnostic;
- useful even on difficult days;
- skippable and disableable;
- complete in both supported interface languages.

### Shuffle-Bag Behavior

The prompt service should:

1. build the active prompt-id set;
2. remove prompt ids already used in the current rotation;
3. choose from the remaining ids;
4. begin a new shuffled rotation only after the current set is exhausted;
5. persist enough rotation state to prevent repetition after reload.

The selected `promptId` should be stored with the Daily Reflection when the user writes a reflection.

Prompt selection is a service concern; React components should not implement randomization rules independently.

---

## 10. Rewards

Rewards remain independent entities and may optionally refer to a Task.

```ts
type RewardTrigger = "date" | "streak" | "quota_periods" | "milestone";

interface Reward {
  id: string;
  title: string;
  taskId?: string;
  trigger: RewardTrigger;
  rewardDate?: string;
  streakDays?: number;
  quotaPeriods?: number;
  milestoneId?: string;
  claimedAt?: string;
  createdAt: string;
}
```

Reward expansion should occur only when the corresponding lifecycle milestone requires it.

Rewards must support motivation without becoming a points economy or punitive mechanism.

---

## 11. Daily Order

`DailyOrder[date]` remains a presentation concern.

```ts
interface DailyOrder {
  date: string;
  taskIds: string[];
}
```

Rules:

- ordering must not change task schedule or Area ownership;
- scheduled, floating, and quota items may appear together;
- Area grouping and manual ordering must have deterministic conflict rules;
- archived or unavailable tasks should be ignored safely when old order arrays are read;
- normalization should be handled by a service.

---

## 12. Appearance Assets and Background Slots

The existing single `backgroundDataUrl` setting should evolve into local appearance assets rather than growing one settings record indefinitely.

### Suggested Shape

```ts
type BackgroundSlot = "app" | "today" | "calendar" | "reflection";

interface AppearanceAsset {
  id: string;
  kind: "background";
  mimeType: string;
  dataUrl: string;
  createdAt: string;
}

interface BackgroundPreference {
  slot: BackgroundSlot;
  assetId?: string;
  fit: "cover" | "contain";
  position: string;
  overlayOpacity: number;
  blurPx: number;
}
```

### Rules

- Files must be validated by type and size before storage.
- Assets remain in IndexedDB and are included in compatible backups.
- Deleting an asset must clear or repair references safely.
- Readability overlays and contrast protections are mandatory.
- The initial implementation should use a small, supported set of slots rather than arbitrary DOM-level customization.
- Area-specific background references may be added later through `Area.backgroundAssetId`.

---

## 13. App Settings

`AppSettings` should hold global preferences and small configuration values, not large binary-like data or domain history.

```ts
interface AppSettings {
  id: "app";
  language: Language;
  theme: Theme;
  weekStartsOn: 0 | 1;
  reduceMotion: boolean;
  reflectionPromptsEnabled: boolean;
  promptRotationState?: {
    remainingPromptIds: string[];
    promptSetVersion: number;
  };
  backgroundPreferences: BackgroundPreference[];
}
```

Large local images belong in `AppearanceAsset`.

Authorship rule:

- interface language may change system labels;
- user-authored task titles, Area names, emotion labels, notes, and rewards must not be auto-translated.

---

## 14. Statistics and Insight Architecture

### 14.1 Statistics Service

The Statistics Service produces structured facts from stable records.

Examples:

```text
Task completion facts
Quota-period outcomes
Area activity distribution
Experience comparison counts
Emotion recording frequencies
Milestone progress
Active-day counts
Missing-data counts
```

The service must return plain data structures and must not depend on React.

### 14.2 Review Service

The Review Service converts structured facts into cautious, plain-language review models. It accepts any inclusive valid date range plus Area, task, task-kind, and schedule-mode filters. It preserves source record ids and dates so every completion statement can open supporting Calendar evidence.

Recommended pipeline:

```text
Source records
    ↓
Statistics service
    ↓
Structured facts
    ↓
Eligibility and sample-size rules
    ↓
Prioritized insight candidates
    ↓
Localized sentence templates
    ↓
Localized period review
```

### Guardrails

- Every statement must be traceable to structured facts.
- Minimum sample sizes should prevent fragile statements.
- Missing data should be acknowledged when relevant.
- The service may report counts, distributions, and sufficiently supported recorded frequencies.
- The service must not prescribe actions or say “caused,” “proves,” “you are,” or diagnose a condition.
- Summaries must not punish low activity or difficult periods.
- The user should be able to inspect the underlying dates and records.
- AI rewriting is not part of the default architecture.

A future optional AI language layer may only rewrite approved structured facts. It must not invent findings, change numerical meaning, or operate without explicit privacy review and user consent.

---

## 15. Database Evolution

The Dexie database is currently at version 5. It contains the Milestone 3–4 planning and reflection tables plus lifecycle profiles, pause periods, and milestone events. Review output remains derived.

Expected entity groups:

```text
areas
tasks
checkIns
experienceLogs
dailyOrders
dailyReflections
emotionDefinitions
rewards
appearanceAssets
settings
```

### Migration Order

A safe conceptual sequence is:

1. introduce service boundaries and migration infrastructure;
2. add Areas and migrate categories;
3. migrate recurrence into the Schedule union;
4. add Experience Logs;
5. migrate Journal Entries into Daily Reflections;
6. add Emotion Definitions;
7. move the current background into Appearance Assets and slot preferences;
8. update backup format and restoration validation after each schema change.

Milestone 2 completed step 1 with a Dexie v1-to-v2 upgrade and reusable services. Milestone 3 completed steps 2 and 3 with the v2-to-v3 Area and Schedule migration. Milestone 4 completed steps 4 through 7 with the v3-to-v4 reflection and appearance migration. Milestone 6 adds the v4-to-v5 lifecycle migration and backup format version 5.

The exact Dexie version numbers belong to implementation, but every version must have:

- an explicit upgrade function when data transformation is needed;
- tests using representative old records;
- backup compatibility rules;
- a documented rollback or recovery approach where practical.

---

## 16. Backup and Restore

The backup payload must remain versioned.

```ts
interface BackupPayload {
  format: "daily-canvas-backup";
  version: number;
  exportedAt: string;
  areas: Area[];
  tasks: Task[];
  checkIns: CheckIn[];
  experienceLogs: ExperienceLog[];
  dailyOrders: DailyOrder[];
  dailyReflections: DailyReflection[];
  emotionDefinitions: EmotionDefinition[];
  rewards: Reward[];
  appearanceAssets: AppearanceAsset[];
  settings: AppSettings[];
}
```

### Restore Workflow

```text
Choose file
    ↓
Parse safely
    ↓
Validate format and version
    ↓
Migrate in memory if supported
    ↓
Show summary and warnings
    ↓
Create safety backup
    ↓
Confirm replacement
    ↓
Restore transactionally
    ↓
Run integrity checks
```

A failed restore must not leave the active database partially replaced.

Large appearance assets may increase backup size; the UI should report this clearly.

---

## 17. Service Boundaries

Recommended reusable modules include:

```text
services/
  areaService
  taskService
  scheduleService
  checkInService
  quotaService
  dailyOrderService
  reflectionService
  experienceService
  promptService
  statisticsService
  reviewService
  appearanceService
  backupService
```

This is a conceptual separation, not a requirement to create one file per line immediately.

The current implementation provides task, schedule, check-in, daily-order, reflection, emotion, experience, prompt, appearance, reward, settings, statistics, review, and backup service boundaries. `reviewService` owns range presets, structured facts, sample-size rules, source traceability, and deterministic English/Chinese review text; React components only render those models.

The important rule is that components call stable domain operations instead of manipulating Dexie tables and date rules directly.

---

## 18. Testing Boundaries

### Schedule Tests

- fixed once/daily/weekday/interval behavior;
- floating availability and optional deadline;
- weekly and monthly quota boundaries;
- configurable first day of week;
- leap years, month length, and timezone/date transitions;
- quota progress and completed-period outcome;
- no daily-failure semantics for floating or quota schedules.

### Migration Tests

- existing categories become Areas;
- existing task colors remain visually stable;
- existing recurrence becomes fixed schedule;
- journal text survives Daily Reflection migration;
- existing background survives Appearance Asset migration;
- old backups migrate or fail safely.

### Reflection Tests

- custom emotion normalization;
- optional fields remain optional;
- prompt shuffle-bag does not repeat prematurely;
- disabled prompts stay disabled;
- Experience Logs compare against prior records correctly.

### Insight Tests

- each summary sentence maps to reproducible facts;
- low sample size suppresses fragile conclusions;
- templates avoid causal and diagnostic language;
- bilingual output is complete;
- missing data is represented honestly.

### End-to-End Tests

Critical journeys should eventually include:

- create Area and task;
- complete fixed habit;
- choose and complete floating task;
- progress and complete a quota period;
- record an experience;
- write a daily reflection with emotions;
- inspect calendar details;
- read a weekly summary;
- export, validate, and restore a backup.

---

## 19. Privacy Boundary

No application data leaves the browser in the local-first product mode.

The application must not make runtime requests to:

- analytics services;
- advertising services;
- remote fonts;
- account systems;
- cloud databases;
- remote image storage;
- AI services.

Future optional services require:

- explicit opt-in;
- a documented data-flow explanation;
- clear deletion behavior;
- local-only mode preservation;
- security and operating-cost review.

Emotion records, reflections, experience notes, and local images are especially sensitive and must receive the same or stronger protection as task history.

---

## 20. Explicit Non-Goals

The current architecture does not aim to become:

- a clinical mental-health application;
- an AI therapist;
- a team project-management platform;
- an unlimited hierarchical task tree;
- a social network;
- a competitive habit leaderboard;
- a punitive streak system;
- an opaque predictive coach;
- a mandatory cloud service.

These boundaries protect the product's coherence: private planning, compassionate tracking, structured reflection, and understandable self-review.
