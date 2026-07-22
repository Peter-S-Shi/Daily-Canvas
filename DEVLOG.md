# Development log

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
