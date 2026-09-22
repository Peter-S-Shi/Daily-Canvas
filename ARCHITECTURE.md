# Daily Canvas Architecture

## 1. Product Boundary

Daily Canvas is a free, account-free, local-first, single-user personal planning, habit, reflection, review, and personal-preservation application.

The current implementation is v0.7.0: the same React/Vite application and Dexie/IndexedDB domain model, now also packaged as a Tauri 2 Windows desktop application (Milestone 8) alongside its existing browser-served form. The v1.0 target adds the approved planning/execution and desktop-native capabilities (Milestones 9–13) on top of this accepted desktop foundation.

The architecture supports five connected layers:

```text
Plan
  Areas · Fixed schedules · Floating tasks · Quota goals · Inbox · optional Timeline

Act / Track
  Check-ins · Replan · optional Time Blocks · local reminders

Reflect
  Experience logs · Daily Reflections · Emotions · Templates

Review
  Calendar · Statistics · deterministic plain-language Reviews · Search

Preserve
  Meditations · local export · versioned backup · automatic local backup
```

These layers share domain entities and services rather than becoming isolated feature silos.

## 2. Architectural Principles

### 2.1 Local-First and Account-Free

- Core personal data remains on the user's device.
- The complete product must remain usable without an account, cloud database, analytics system, advertising system, or remote AI dependency.
- Manual export remains available even after automatic local backups are introduced.
- Local images and personal documents remain local unless the user explicitly exports them.
- Any future sync or remote capability requires separate product planning and must not remove local-only mode.

### 2.2 Narrow Network Exception for Update Awareness

v1.0 may make a narrow outbound request to GitHub Releases for stable-version metadata.

That request must:

- carry no Task, CheckIn, Reflection, Meditation, ExperienceLog, Area, reward, or other personal content;
- not become analytics or usage telemetry;
- not be required for normal app operation;
- degrade safely while offline;
- only support update awareness and release-page navigation in v1.0.

### 2.3 Domain Rules Outside UI Components

React components render state, gather user input, and call application services.

Business rules for schedules, quota evaluation, check-ins, lifecycle, statistics, prompts, reflection, search behavior, backups, migrations, review generation, and desktop-native adapters must live behind reusable boundaries.

The UI must never be the only place where product semantics exist.

### 2.4 Additive, Versioned Evolution

- Dexie schema changes require explicit versioned migrations.
- Backup formats require explicit version numbers and migration logic.
- Existing records must remain meaningful after upgrades.
- Destructive restore must be preceded by validation and a safety backup.
- Unknown or newer backup versions must fail safely.
- Desktop migration is not permission to rewrite storage without evidence.

### 2.5 Derived Information Should Stay Derived

Calendar states, streaks, quota progress, review sentences, search indexes, and On This Day candidate sets should remain derived where practical.

Do not materialize unlimited future task occurrences.

Do not store a conclusion when it can be reproduced from durable facts unless a later feature explicitly requires a frozen snapshot.

### 2.6 Compassionate and Non-Diagnostic Semantics

- Missing reflection data is simply missing.
- Missing avoidance-habit check-ins are never success.
- Reflection prompts and templates are optional.
- Statistics may describe patterns but must not diagnose, infer personality, claim causation, or predict mental state.
- Recovery and replanning preserve history rather than rewriting it.

### 2.7 Optional Structure Must Stay Optional

Timeline and Time Blocking help users who want clock-based planning, but they must not become prerequisites for using Today, Floating Tasks, Quota Goals, Calendar, Reflection, or Review.

---

## 3. Current Persistent Model Through v0.7

The current authoritative persistent model is Dexie schema / backup format v6.

```text
Area
  └── Task
       ├── Schedule
       ├── CheckIn[taskId + date]
       ├── ExperienceLog[taskId + date]
       ├── TaskLifecycle
       ├── PausePeriod[]
       ├── MilestoneEvent[]
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
MeditationEntry
```

Derived services currently include scheduling, quota evaluation, statistics, review generation, prompts, Meditations, exports, appearance, and backup/migration logic.

Milestone 5 added no persistent review table; reviews remain derived. Milestone 6 added lifecycle/pause/event records. Milestone 7 added independent ordered Meditations.

The model remains intentionally shallow. An Area contains Tasks; Tasks do not form an unlimited recursive hierarchy.

---

## 4. Desktop Boundary for v1.0

Milestone 8 resolved the desktop shell, identity, storage, and CI questions below. Milestones 9 and onward build the approved v1.0 product surface on top of this accepted foundation; they do not reopen it.

### 4.1 Thin Desktop Shell First — Accepted: Tauri 2

The desktop transition wraps and adapts the existing application before broad feature expansion. The M8-A feasibility spike evaluated Tauri 2 against the actual application (packaged-app smoke, restart and forced-kill persistence, v6 backup restore/export, Meditation print/PDF/Word paths, bilingual operation) and found no blocker; it is the accepted shell.

The shell provides native capabilities through narrow adapters:

```text
Desktop App
   │
   ├── React / Vite UI
   │      ↓
   ├── existing domain services
   │      ↓
   ├── Dexie / IndexedDB
   │
   └── desktop adapters
          ├── local file / backup adapter    (M8: save-file dialog + print surface — src/desktop/desktopAdapter.ts)
          ├── notification adapter           (planned: Milestone 12, local reminders)
          ├── release-awareness adapter      (planned: Milestone 13, GitHub Release update awareness)
          └── packaging / app metadata adapter (M8: desktop_info command — version, identifier, data paths)
```

Domain services do not depend directly on shell-specific APIs: `src/desktop/desktopAdapter.ts` and three narrow Rust commands (`save_export`, `print_page`, `desktop_info`) are the only points where the web layer talks to the shell. In a plain browser the same call sites keep their original behavior (anchor download, `window.print()`). No filesystem, shell, or network capability is granted to the web layer beyond these commands (`src-tauri/capabilities/default.json` declares no permissions), and the packaged app's Content-Security-Policy disallows outbound network requests from page script.

### 4.2 Desktop Identity — Frozen

The desktop application identifier is `io.github.peter-s-shi.dailycanvas`, and the packaged app runs at the fixed origin `https://tauri.localhost` (`useHttpsScheme: true`). Both are permanent: IndexedDB is keyed by origin inside the identifier's WebView2 profile, so changing either after release would orphan existing installed users' data. Any future change to identifier or origin requires an explicit, evidence-reviewed migration plan, not a routine edit.

### 4.3 Storage Decision — Retained: Dexie/IndexedDB

Dexie/IndexedDB is the v1.0 storage direction. The Milestone 8 feasibility spike found no evidence that the current store creates a meaningful blocker in persistence, upgrade, backup, performance, or packaged-app reliability — restart persistence, forced-process-kill durability, an 11 MB synthetic v6 restore/export round-trip, and a same-identifier installer upgrade all passed without data loss.

“Desktop app” by itself remains insufficient justification for a database rewrite. A rewrite to SQLite or another engine still requires new evidence of a real blocker.

### 4.4 Windows Build and Packaging Foundation

- **Authoritative build:** Windows, Rust `stable` targeting `x86_64-pc-windows-msvc`, with a statically linked C runtime (`src-tauri/.cargo/config.toml`) so the shipped executable does not depend on the VC++ redistributable. CI asserts (via `dumpbin /dependents`) that the built executable imports only OS-owned DLLs.
- **Packaging foundation:** a current-user NSIS installer (`tauri.conf.json` → `bundle`) is enabled to answer install/upgrade/uninstall questions, not to produce a release-ready artifact. Code signing, an updater, and installer branding/polish are explicitly deferred to Milestones 14–15.

### 4.5 Desktop Data Ownership — Established

The following are understandable and were tested end to end (Windows/MSVC, GitHub Actions, synthetic data — see `desktop-verify/M8B-EVIDENCE.md`):

- application-owned local data resides under `%LOCALAPPDATA%\io.github.peter-s-shi.dailycanvas\EBWebView\...\IndexedDB`; nothing is written under `%APPDATA%` (Roaming);
- all data survives a graceful restart and a forced process kill;
- a same-identifier installer upgrade does not orphan IndexedDB (same origin, same identifier, data unchanged);
- a silent per-user uninstall removes the application files but currently leaves IndexedDB in place (the NSIS default; whether to add an explicit data-delete uninstall option is an open product decision, not yet built);
- a reinstall after uninstall re-attaches to any data that uninstall left behind;
- how browser-era v1–v6 backups migrate into a desktop install: unchanged from the existing `backupService` migration path (only v6 was driven end to end in M8; v1–v6 migration itself has its own unit tests, unaffected by the desktop shell);
- automatic backups do not exist yet (Milestone 13); today, manual export/import through Settings is the same in the browser and the desktop build, routed through the local-file adapter.

### 4.6 Desktop UI Composition — Established Baseline (M9 blueprint, M10 migration)

The UI follows the frozen M9 artifact set in `docs/m9-desktop-ui-blueprint/`, which is subordinate to this document and `ROADMAP.md`. Milestone 10 completed the migration onto that blueprint and established the seams that later milestones extend. Each is presentation-only, and none owns product semantics:

- **Workspace model** (`src/navigation/workspaceModel.ts`): the single declaration of workspaces, their secondary sections, where section navigation renders, and which appearance background slot each section uses. A new destination is added here, in the same change that makes it usable. Frozen Decision D4 forbids disabled placeholders.
- **Workspace navigation** (`src/navigation/useWorkspaceNavigation.ts`): the only way to change destination. Context jumps are named targets — Review → Calendar evidence for a date, Calendar → the Daily Reflection for a date, and any surface → a task's read-first detail — never ad-hoc view state.
- **Header slots** (`src/components/shell/WorkspaceHeader.tsx`): a surface portals its own controls (for example, Review's period presets) and its own primary action into the workspace header. Actions are therefore named for the surface that owns them; there is no global creation action.
- **Dialog** (`src/components/Dialog.tsx`): every modal is named, focus-managed, and dismissible with Escape only when that is safe. Decisions such as milestone choices cannot be dismissed implicitly.

Components continue to call the existing domain services; none of these seams stores or derives product data. No Milestone 11 capability (Inbox, Search, Task Notes, Checklist, duration estimates, or Replan) is implemented yet — Milestone 10 only established the seams they will extend.

---

## 5. Area, Task, and Checklist Boundary

### 5.1 Area

An `Area` is a durable life domain such as French, Job Search, Health, or Personal Administration. It is not itself a Task and does not create check-ins.

A Task may belong to one optional Area.

### 5.2 Task

Current Task semantics remain authoritative: task kind, Area ownership, color, schedule, lifecycle, check-ins, rewards, and history belong to the Task layer.

v1.0 may extend Task detail with fields such as notes and estimated duration, but those additions must preserve existing identity and history.

### 5.3 One-Level Checklist

The v1.0 hierarchy is:

```text
Area
  └── Task
       └── ChecklistItem[]
```

Checklist items are intentionally limited local steps.

They must not independently own:

- Area;
- recurrence or schedule;
- quota semantics;
- streaks;
- lifecycle;
- rewards;
- Reflection/Experience history;
- recursive child items.

If a step requires those semantics, it should be promoted into a real Task.

---

## 6. Inbox / Quick Capture Boundary

Inbox is a capture state, not a schedule mode.

```text
Capture thought
      ↓
    Inbox
      ↓ triage
Fixed Task / Floating Task / Quota Goal
```

Inbox must not silently become another name for Floating Task.

A captured item may remain intentionally lightweight until triage. The exact storage shape may be a dedicated entity or an equivalent service-owned representation, but unresolved capture data must not masquerade as a fully classified scheduled Task.

---

## 7. Schedule Model

The current schedule union remains the base model:

```ts
type Schedule = FixedSchedule | FloatingSchedule | QuotaSchedule;
```

### Fixed

Current v0.7 recurrence supports once, daily, selected weekdays, and every-N-days interval rules.

v1.0 will add richer recurrence while preserving the rule that recurrence describes when a Task is scheduled or available; it does not materialize unlimited future rows.

### Floating

A Floating Task is intentionally flexible one-time work. Not choosing it today is neutral. An optional deadline may make it overdue without turning every earlier date into a failure.

### Quota

A Quota Goal expresses a weekly or monthly completion target. Individual uncompleted dates are neutral; the period result is evaluated at the period level.

### Replan

Replan is a forward-looking action. It may change what should happen next, but it must not rewrite historical evidence or convert an earlier miss into a success.

---

## 8. Timeline and Time Block Model

Timeline is an optional execution-planning layer and is distinct from schedule semantics.

Conceptually:

```ts
interface TimeBlock {
  id: string;
  taskId?: string;
  date: string;
  startTime: string;
  durationMinutes: number;
}
```

The exact implementation may evolve, but these rules are stable:

- a Time Block says when the user plans to act;
- it does not redefine a Task's fixed/floating/quota schedule;
- removing a Time Block does not delete the Task;
- completing a Task remains a domain action, not an automatic consequence of a block ending;
- Timeline use is optional;
- task duration estimates may assist placement but are not proof of actual time spent.

External calendar-provider synchronization is outside v1.0.

---

## 9. Check-In and Habit Semantics

The stable CheckIn identifier remains `taskId:date` unless a later approved feature explicitly changes the one-credit-per-day model.

### Positive task / habit

- `done`: completed
- `skipped`: neutral
- missing: unrecorded

### Avoidance habit

- `done`: explicitly confirmed safe day
- `lapse`: explicit lapse
- `skipped`: neutral
- missing: never success

### By schedule mode

- fixed: evaluated against scheduled dates;
- floating: successful completion closes the item; absence on other dates is neutral;
- quota: successful dated check-ins count toward the period target; individual missing dates are neutral.

Quantitative habits with multiple units per day are intentionally deferred beyond v1.0 because they would change this model.

---

## 10. Reflection, Experience, and Templates

A CheckIn records what happened. An ExperienceLog records how it felt. A DailyReflection records broader daily reflection. These layers remain separate.

v1.0 Reflection Templates must remain optional and lightweight.

Templates may prefill or structure a reflection session, but they must not:

- make free-form writing second-class;
- force completion of every field;
- become clinical questionnaires;
- convert missing answers into negative evidence.

On This Day is a derived resurfacing feature. It should select from appropriate historical records without mutating them or creating duplicate authoritative copies.

---

## 11. Search Architecture

Global Search should operate locally.

Search may cover approved sources such as Task titles/notes, Area names, Reflection text, Meditations, and other explicitly supported local records.

Rules:

- search must not upload content;
- derived indexes must be rebuildable from authoritative records;
- indexing must not create a second unsynchronized source of truth;
- archived/completed history should remain discoverable when the user explicitly searches for it;
- privacy-sensitive content must not be sent to remote search services.

---

## 12. Statistics and Review Architecture

The Statistics Service produces structured facts from stable records.

The Review Service converts those facts into cautious bilingual review models.

```text
Source records
    ↓
Statistics service
    ↓
Structured facts
    ↓
Eligibility / sample rules
    ↓
Prioritized review candidates
    ↓
Localized sentence templates
    ↓
Review model
```

Guardrails remain unchanged:

- every statement must be traceable to facts;
- weak samples should suppress fragile claims;
- missing data is acknowledged when relevant;
- the product may describe counts, distributions, and supported recorded patterns;
- it must not diagnose, prescribe, claim causation, or predict mental state.

Local Reflection / Review export is derived output and must not mutate source records.

---

## 13. Meditations and Personal Preservation

Meditations remain independent from dated Reflections and derived Reviews.

Current v0.7 rules remain authoritative:

- content is multiline plain text;
- creation time is immutable;
- edit time changes only on content edit;
- manual ordering is persisted and reused by display/export;
- the 150-unit mixed-language rule is enforced in reusable domain logic;
- print/PDF and editable Word generation remain local;
- export output is derived and does not mutate source entries.

Global Search and On This Day may surface Meditations only if the approved product design explicitly includes them; they must never rewrite or duplicate the source collection.

---

## 14. Backup, Restore, and Automatic Backup

The manual backup payload remains versioned and portable.

Current v6 includes Areas, Tasks, CheckIns, ExperienceLogs, lifecycle records, pause records, milestone events, daily order, Daily Reflections, Meditations, emotions, rewards, appearance assets, and settings.

Restore remains:

```text
Choose file
    ↓
Parse safely
    ↓
Validate format/version
    ↓
Migrate in memory if supported
    ↓
Show summary/warnings
    ↓
Create safety backup
    ↓
Confirm replacement
    ↓
Restore transactionally
    ↓
Run integrity checks
```

v1.0 Automatic Local Backup extends this contract rather than replacing it.

Rules:

- automatic backups remain local;
- retention is bounded and understandable;
- backup files use a recoverable documented location;
- manual export remains available;
- restore uses the same validation/migration guarantees as manual backups where practical;
- failures must not corrupt the active store;
- personal data must not be uploaded merely to implement backup convenience.

---

## 15. Reminders and Desktop Shortcuts

### Reminders

Basic reminders are local, user-controlled desktop notifications tied to explicit user-configured product events.

They must not require a backend or account.

Reminder scheduling logic should remain separate from UI components and shell APIs should be isolated behind an adapter.

### Keyboard shortcuts

v1.0 should prioritize a small set of high-value shortcuts such as Quick Capture, Global Search, Today navigation, New Task, and closing transient surfaces.

Do not create a large shortcut-customization subsystem unless later evidence justifies it.

---

## 16. Update Awareness

v1.0 update awareness follows a simple release-detection model:

```text
Installed version
      ↓
query stable GitHub Release metadata
      ↓
compare semantic versions
      ↓
Up to date / Update available
      ↓
View Release
```

Boundaries:

- no silent auto-download;
- no silent application replacement;
- no automatic restart to finish an update;
- no custom update backend;
- no account requirement;
- offline failure must be non-blocking.

A full self-updater is post-v1.

---

## 17. Appearance and Settings

Current local appearance assets and App/Today/Calendar/Reflection background preferences remain supported.

AppSettings should continue to hold small global preferences, not large binary-like history.

User-authored content must never be auto-translated merely because interface language changes.

The desktop redesign may reorganize settings presentation, but should not silently change stored semantics.

---

## 18. Testing and CI Boundaries

Tests should be proportional to risk and aligned with domain boundaries.

### Core domain coverage

- recurrence and date boundaries;
- floating/quota semantics;
- avoidance/missing-data semantics;
- lifecycle, pause, resume, replan;
- reflection/experience separation;
- search result correctness;
- Timeline/schedule separation;
- backup/migration integrity;
- update-version comparison logic.

### Desktop-specific coverage

Established by Milestone 8, exercised on Windows/MSVC through synthetic data in GitHub Actions
(`desktop-verify/`, evidence in `desktop-verify/M8B-EVIDENCE.md`):

- packaged startup and restart persistence — verified (graceful restart and forced process kill);
- local data location behavior — verified (`%LOCALAPPDATA%\<identifier>\EBWebView\...\IndexedDB`; nothing under `%APPDATA%`);
- packaged local export — verified (JSON backup and Meditation `.docx` export through the native save dialog);
- installer/upgrade/uninstall behavior — verified at the foundation level (same-identifier upgrade without orphaning data, silent uninstall/reinstall); RC-level installer polish remains for Milestone 15;
- automatic backup creation and restoration — not yet implemented (Milestone 13);
- local notification adapter behavior — not yet implemented (Milestone 12).

### CI topology — established (`.github/workflows/ci.yml`)

A cheap classifier (`.github/scripts/classify.sh`, self-tested on every run) determines which expensive jobs are relevant:

- docs-only: no Node, pnpm, or Rust install, no test run;
- ordinary app code: typecheck + tests + build;
- migration/backup: core + targeted migration regressions + fixture validation;
- desktop/CI/dependency changes: core + Windows/MSVC Tauri build + runtime-dependency check + packaged-app smoke + NSIS installer/upgrade smoke;
- RC/release installer/clean-install/upgrade/artifact checks remain for Milestone 15.

A stable final `PR Gate` job always runs and fails closed: it requires every job the classifier marked as needed to have succeeded, and every job it marked as unneeded to have been skipped — never silently run, never silently failed. Superseded runs are cancelled (`concurrency: cancel-in-progress`).

---

## 19. Privacy Boundary

Core product data must not be sent to:

- analytics services;
- advertising services;
- account systems;
- cloud databases;
- remote image storage;
- remote AI services;
- remote search/indexing services.

The only approved v1.0 routine network exception is narrow GitHub Release metadata access for update awareness.

Emotion records, Reflections, Experience Logs, local images, Meditations, search content, and backup files are especially sensitive and must remain local by default.

---

## 20. Explicit Non-Goals

The v1.0 architecture does not aim to become:

- a clinical mental-health application;
- an AI therapist or predictive coach;
- a team project-management platform;
- an unlimited hierarchical task tree;
- a social network;
- a competitive habit leaderboard;
- a complex points/levels economy;
- a mandatory cloud service;
- a PWA-first release;
- a full automatic self-updating platform.

These boundaries protect the product's coherence: private planning, flexible execution, compassionate tracking, structured reflection, understandable self-review, and durable personal ownership.
