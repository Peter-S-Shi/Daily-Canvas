# Development log

## Project lifecycle revision

### 2026-07-27 — Feature completion and release-readiness stages

- Superseded the former planned Milestone 7 PWA/reminder scope with Personal Meditations and Print Collection.
- Distinguished Feature Complete, Feature Freeze, Product Hardening, Full Regression and Manual Acceptance, and Release Candidate as separate lifecycle stages.
- Introduced `PROJECT_STATUS.md` as the authoritative current-state summary.
- Changed planning documentation only; no product code, application version, Dexie schema, or backup version changed.

## Milestone 6.1: Lifecycle corrections

### 2026-07-22 — Durable milestone continuation and manual resume

- Added a persistent next-milestone threshold so Continue original plan keeps the existing schedule while preventing the acknowledged target from reopening immediately.
- Closed active pauses with a recorded resume timestamp, preserving the original pause range and evidence while making the resume date active again.
- Added regression coverage for repeated milestones, open-ended pauses, and dated pauses resumed before their planned end.
- Kept backup format v5 compatible by adding only optional lifecycle fields.

## Milestone 5 follow-up: Calendar evidence corrections

### 2026-07-22 — Lifecycle-safe history and distinct record filters

- Separated lifecycle-aware active-task selectors from historical Calendar evidence so archived, completed, and paused tasks keep their recorded check-ins and experience context.
- Split CheckIn, Floating, Quota, Reflection, and Experience visibility rules; the Quota filter now renders quota credits only.
- Added focused regression coverage for both boundaries before closing Milestone 6.

## Milestone 6: Daily Canvas v0.6 Habit Lifecycle and Rewards — Completed

### 2026-07-22 — Milestones, neutral pauses, and compassionate recovery

- Added persistent lifecycle profiles, pause periods, and immutable milestone events through Dexie and backup format v5.
- Added milestone evaluation for fixed habits and Quota Goals, followed by a restrained celebration and explicit user choice.
- Added planned-break, vacation, and retroactive pause semantics; planned pauses freeze streaks while retroactive pauses cannot repair earlier misses.
- Preserved personal bests monotonically and kept total completions and milestone history visible after interruptions.
- Added factual interruption recovery with Continue original plan, Adjust plan, and Pause options without “total reset” language.
- Added a bilingual Lifecycle surface, milestone timeline, automatic ended-pause recovery, Calendar pause evidence, and reward claiming beside milestone celebrations.
- Added focused migration, pause, personal-best, lifecycle-decision, and backup tests.

## Milestone 5: Daily Canvas v0.5 Calendar and Human-Friendly Reviews — Completed

### 2026-07-22 — Local, traceable period reviews

- Added reusable arbitrary-range review facts for fixed completions, Floating Tasks, Quota credits and completed periods, Areas, active days, reflections, emotions, experience records, and reward events.
- Added Monday/Sunday-aware weekly shortcuts, month and year-boundary presets, inclusive custom ranges, validation, and reusable Area/task-kind/schedule filters.
- Added deterministic bilingual review sentences with sample-size suppression and no causal, predictive, diagnostic, or prescriptive language.
- Added a dedicated Review surface with source-date drill-down, repeated-completion aggregation, readable breakdowns, optional context, and local copy output.
- Rebuilt Calendar as an evidence surface with aggregate, single-task, and single-Area modes; record filters; a color-independent legend; keyboard date navigation; and inspectable check-in, reflection, emotion, and experience details.
- Kept all review results derived, leaving Dexie and backup format at version 4 while advancing the application to v0.5.0.
- Added Milestone 5 range, schedule-semantic, quota, traceability, sparse-data, optional-context, bilingual, and language-guardrail tests.

## Milestone 4: Daily Canvas v0.4 Reflection and Personalization — Completed

### 2026-07-21 — Private reflection and appearance delivery

- Migrated complete legacy journal text into one editable Daily Reflection per date without truncation or rewriting.
- Added multi-select bilingual system emotions, normalized reusable custom labels, optional intensity, and an unrestricted multi-paragraph journal editor.
- Added optional bilingual prompts with a persisted non-repeating shuffle bag and a setting to disable them.
- Added optional post-check-in Experience Logs with comparison, effort, avoidance urge intensity, and short notes, separate from CheckIns.
- Replaced the embedded global background with local appearance assets and App, Today, Calendar, and Reflection slot preferences.
- Added Dexie schema version 4 and backup format version 4 with migration from every supported older version.
- Expanded automated coverage to 27 tests for migration, reflection, prompts, emotions, experience validation, appearance references, backup, and the critical bilingual UI flow.

## Milestone 3: Daily Canvas v0.3 Flexible Planning and Mainlines — Completed

### 2026-07-21 — Flexible planning delivery

- Added first-class Areas with name, color, optional icon, ordering, archive/restore behavior, safe deletion, and optional task assignment.
- Added explicit fixed, floating, and weekly/monthly quota schedules through reusable services rather than component-owned date rules.
- Added a dedicated Floating Tasks view; unchosen days remain neutral and optional deadlines communicate overdue state without creating failed habit days.
- Added quota progress, achieved/partial/not-achieved period outcomes, configurable week boundaries, unique same-day credit, and successful-period streaks.
- Added a Dexie v2-to-v3 migration that preserves task/check-in identities and related records while converting categories and recurrence.
- Added backup format version 3 with migration from supported older formats and restoration coverage for Areas and schedule data.
- Updated Today, Tasks, Calendar, history, and statistics to keep fixed-day, floating, and quota semantics distinct.
- Expanded automated coverage to 21 tests, including migration, boundaries, leap dates, backup, and a critical UI flow for all schedule modes.

## Milestone 2: Daily Canvas v0.2 Trustworthy Daily Core — Completed

### 2026-07-21 — Reliability and first-run delivery

- Added a versioned Dexie v1-to-v2 migration and a version 2 backup format with in-memory migration from version 1.
- Added import validation, restoration previews and warnings, automatic safety exports, transactional restoration, and post-restore integrity checks.
- Introduced reusable task, check-in, schedule, statistics, daily entry, reward, settings, and backup services.
- Replaced silent startup failure with an error boundary and local-database recovery screen.
- Added English-first onboarding with editable starter examples, empty states, and a progressive two-step task editor.
- Made calendar week order follow the configured Monday/Sunday preference.
- Added visible save/error states and expanded date, avoidance, skipped-day, milestone, archive, backup-migration, and critical browser-flow coverage.
- Verified 14 automated tests, type checking, a production build, and a live local-browser smoke flow with no console errors.

## Milestone 1: Daily Canvas v0.1 Foundation — Completed

### 2026-07-17 — Windows launcher stabilization

- Added a double-click Windows launcher that finds the bundled Codex Node.js and pnpm runtimes when they are not on the system PATH.
- Documented that the Vite source `index.html` must be served rather than opened directly.

### 2026-07-17 — Foundation delivery

- Created the React and TypeScript application with a responsive, bilingual interface.
- Added task, recurrence, check-in, daily order, journal, reward, and settings entities in IndexedDB.
- Added positive-habit and avoidance-habit semantics so missing data is not counted as success.
- Added daily/weekday/interval schedules, optional end dates, and customizable streak milestones.
- Added today's list, drag-and-drop ordering, daily note, monthly calendar, past-date editing, per-task heatmap, and statistics.
- Added date- and streak-based rewards.
- Added Chinese/English switching, themes, reduced motion, local background images, and JSON backup/restore.
- Added recurrence and streak tests, privacy-oriented ignore rules, bilingual documentation, and architecture notes.
- Made English the first-run default while retaining the complete Chinese interface.
