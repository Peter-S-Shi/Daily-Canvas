# Development log

## Milestone 13: Reflection, Preservation, and Desktop Utilities — Completed

### 2026-09-23 — Merge-readiness corrective pass (PR #9)

Fixed three independently-confirmed correctness/data-safety seams before merge, with a minimal, TDD-covered fix for each; no new product features, no M14 scope, v9 schema/backup contract unchanged.

- **On This Day / Meditation local day.** `onThisDayService.ts` derived a Meditation's day via `meditation.createdAt.slice(0, 10)`, treating the UTC ISO timestamp as the local calendar date; in UTC-crossing timezones this misfiled evening entries into the next local day (and, near midnight on Dec 31/Jan 1, the wrong year). Fixed by reusing `toDateKey(new Date(createdAt))` -- the same local-calendar-day helper the rest of the app already uses. Daily Reflection's own date-key semantics were untouched. New regression test pins `process.env.TZ` to exercise a real UTC/local day-and-year boundary.
- **Automatic Backup namespace scoping.** The native `list_auto_backups` Tauri command returned every `.json` file in the backup directory, not just ones this app wrote; since retention prunes to the newest 7, an unrelated `.json` file sitting in that directory could be deleted. `list_auto_backups`/`delete_auto_backup` in `src-tauri/src/lib.rs` are now scoped strictly to the existing `daily-canvas-auto-backup-*` naming convention (no capability widening), with 4 new Rust unit tests against a real temp directory. `desktop-verify/desktop-smoke.mjs` was extended to place a sentinel non-namespaced `.json` file directly in the real backup directory during the existing 9-cycle retention exercise and assert it is never listed and survives untouched.
- **Export internal-identifier leakage.** Reflection Markdown export wrote the internal i18n key literal (e.g. `template_dailyCheckin`) instead of the resolved, current-language template display name. Review Markdown export's filter metadata could show a raw `areaId`/`taskId` instead of the Area/Task's name. Both are fixed in `exportService.ts`: `reflectionToMarkdown` resolves the template name through the app's i18n instance for the current language; `reviewToMarkdown` now takes an `ExportNameLookup` (Areas/Tasks) and resolves each filter id to its display name, omitting the metadata line entirely rather than printing the id when it cannot be resolved (e.g. a dangling reference).

Verification: 146/146 automated TypeScript/Vitest tests across the same 24 suites (up from 142, all in `onThisDayService.test.ts` and `exportService.test.ts`), plus 4 new Rust unit tests (`src-tauri/src/lib.rs`, `cargo test --lib`); TypeScript checking and the production build both pass. Each fix was verified red-before-green against the prior buggy behavior before being restored to the fixed state.

### 2026-09-23 — Reflection Templates, On This Day, local export, Automatic Backup, update awareness, and v9 backup

- Three lightweight Reflection Templates (Free Write, Daily Check-in, Gratitude & Perspective) live inside the existing Daily Reflection flow: every prompt is skippable, prompt text is never written into the saved `note`, and Free Write remains the default. `DailyReflection.templateId` is an additive optional field.
- On This Day is a real destination inside Reflect: a pure, read-only selection over `dailyReflections`/`meditationEntries` for exact month+day matches in years strictly before the current one, grouped by year (most recent first), with "Open original" navigation to the source record. It never mutates or duplicates a source and adds no growth/emotion/analysis framing.
- Local Reflection and Review export produce deterministic Markdown through the existing `saveBlob` native-Save-dialog seam; Review export carries the Review screen's current period/filter selection. The Meditation print/PDF/Word pipeline is untouched.
- Automatic Rotating Backup is enabled by default, runs at most once per local calendar day on successful startup (failure-isolated from startup, like M12 reminders), and is exposed as "Back up now" in Settings → Data & Backup, alongside the toggle, last-success time, backup location, and retained history. Four narrow native commands (`backup_directory`, `write_auto_backup`, `list_auto_backups`, `read_auto_backup`, `delete_auto_backup`; `std::fs` only, no filesystem plugin) back a temp-file-then-atomic-rename write, 7-backup retention pruning that only runs after a new backup is confirmed written, and a restore-from-automatic-backup flow that reuses the exact manual restore pipeline (parse → validate/migrate → preview/warnings → safety backup → confirm → transactional restore).
- GitHub Release update awareness lives only in the new Settings → About & Updates page (frozen Decision D4: added only once genuinely functional): it shows the installed version and checks only on page open or an explicit "Check for updates" click, through the newly scoped `tauri-plugin-http` (limited to the single `GET /repos/Peter-S-Shi/Daily-Canvas/releases/latest` endpoint) and offers "View Release" via the newly added `tauri-plugin-opener`. States are Up to date / Update available / Unable to check; network failure is non-blocking.
- Dexie schema and backup format moved v8 → v9. No new table was needed for `templateId` (additive optional field); v9 exists to version the new `AppSettings.autoBackupEnabled`/`lastAutoBackupAt` defaults and keep the versioned-migration/backup pattern intact. v1-v8 forward migration, restore validation, and export/restore fidelity are preserved and extended.
- A real correctness finding from packaged-app verification: Automatic Backup's files live in the app-owned `%LOCALAPPDATA%\<identifier>\backups` directory, which is **not** covered by the packaged-app smoke's isolated WebView2 profile (that only isolates IndexedDB/browser storage) -- unlike every prior desktop feature, this is the first one that legitimately writes real files outside that isolated profile. `desktop-smoke.mjs` was updated to take the same safe, marker-based ownership of the whole per-identifier data folder that `installer-smoke.mjs` already used (refuse to touch a folder it didn't create; always clean up afterward), replacing the now-inapplicable "byte-identical real profile" invariant.
- 142/142 automated tests across 24 suites; TypeScript checking; production build. `cargo check` and a release Windows/MSVC Tauri build (`tauri build --no-bundle --target x86_64-pc-windows-msvc`) pass with the new `tauri-plugin-http`/`tauri-plugin-opener` dependencies (version-pinned to match their npm counterparts) alongside the existing dialog/notification plugins. The extended packaged-app smoke passed 103/103 checks against the real release exe, including Reflection Template round-trip + Markdown export, On This Day against two seeded historical records with year grouping and "Open original", Review Markdown export, 9 real automatic-backup writes exercising genuine 7-backup retention pruning through the native commands, a full restore-from-automatic-backup, and About & Updates settling into a real (non-mocked) "Unable to check" state against the actual GitHub API (this repository does not yet publish a stable Release).

## Milestone 12: Timeline and Desktop Execution — Completed

### 2026-09-22 — Day/Week Timeline, Time Blocks, local reminders, shortcuts, and v8 backup

- Day and Week Timeline (`Plan → Timeline`) share one persistent Time Block collection; Available Work derives eligible Fixed/Floating/Quota work from existing Task data without a second authoritative store, excluding completed/archived/paused items and Avoidance habits (frozen Decision D2).
- Time Blocks reference real Tasks only, snap to a 15-minute grid, default duration to `Task.estimatedMinutes` (else 30 minutes), and reject overlaps explicitly instead of auto-moving either block. Deleting a block never deletes its Task; a block ending never auto-completes the Task; moving/resizing/re-reminding a block never touches recurrence, quota, or schedule.
- Every block has a fully keyboard-accessible Date/Start time/Duration/Reminder dialog; drag-and-drop (within Day, across days in Week) is an optional convenience layered on top.
- Replan flags a Task's existing future blocks `needsReview` when they no longer fit the new plan, without moving, deleting, or silently repairing them, preserving historical truth.
- Today gained an optional "Today's Plan" summary that appears only when Time Blocks exist for the day and disappears entirely otherwise; Today remains independently complete.
- Local, in-app-only reminders on the frozen Off/At-start/5-60-minute grammar belong to a Time Block; Task Detail can view/edit the reminder on a Task's upcoming blocks. A new narrow `send_notification` Tauri command (`tauri-plugin-notification`, minimal `notification:default` permission) fires while the app is running, with a restrained, non-repeating startup catch-up for reminders missed while closed — no resident process, tray, or OS task scheduler was added.
- The frozen small shortcut set is live (`Ctrl/Cmd+K` Search, `Ctrl/Cmd+Shift+K` Quick Capture, `Ctrl/Cmd+1` Today, `Escape`), guarded against firing while an editable element is focused; Settings → Shortcuts is a read-only cheat sheet with no customization.
- Dexie schema and backup format advanced to v8, adding the `timeBlocks` collection with complete v1–v7 migration compatibility and full export/restore fidelity.

### 2026-09-23 — Merge-readiness corrective pass

Five seams confirmed independently before merge, all fixed with regression tests:

- `defaultDurationFor()` now rounds a `Task.estimatedMinutes` that isn't a 15-minute multiple onto the grid (nearest, floor 15) instead of producing a default Time Block that failed validation on first Save.
- Day Timeline renders the full domain-legal 00:00-24:00 range in a bounded, internally-scrollable viewport (previously 06:00-23:00 with `overflow: hidden` silently dropped legitimate early-morning/late-night blocks); 900×600 stays usable.
- `updateTimeBlock()` clears a stale `reminderFiredAt` whenever Date, Start time, or Reminder is explicitly edited, so a past firing can never suppress a newly-relevant future reminder.
- Reminder/notification failures (native command, live checker, startup catch-up) are caught inside `reminderService` and kept structurally out of `App`'s `initializeDb`/recovery-screen chain: a notification failure can never send the app into local-data recovery or produce an unhandled rejection.
- v8 backup restore validation now rejects a Time Block that violates the 15-minute grid, the day boundary, or overlaps another block on the same date, instead of silently importing a domain-invalid placement.
- Packaged-app smoke now actually switches Timeline to Week mode and verifies the seven-day grid, alongside the existing Day/shortcut/notification/v8-round-trip evidence.

Verification: 114/114 automated tests across 19 suites, TypeScript checking, production build; `cargo check` and a release Windows/MSVC Tauri build pass locally with the notification plugin and capability; manually verified in a live browser preview (a 23:30-24:00 block created, visible, and correct in Week mode) with zero console errors. The corrective implementation commit `9389c0b` passed GitHub Actions run `35820653400` with all tiers green: Classify, Core, Desktop (Windows/MSVC -- 70/70 packaged-app smoke checks, 17/17 installer/upgrade smoke checks), and PR Gate. Milestone 13 is next and has not started.

## Milestone 11: Capture and Task Enrichment — Completed

### 2026-09-22 — Capture, task enrichment, recurrence/replan correctness, and v7 backup

- Quick Capture implements the frozen title-only flow with Save to Inbox and direct Task Editor paths.
- Inbox persists lightweight unresolved captures separately from Tasks and removes records only upon explicit triage into Fixed, Floating, or Quota semantics.
- Local Global Search derives results across Task titles/notes, Daily Reflections, Meditations, and Areas; unresolved Inbox captures remain excluded and no duplicate authoritative index is stored.
- Task-owned Notes, one-level Checklist items, and duration estimates extend read-first Task Detail without independent Task semantics or tracked-time claims.
- Richer Habit/Avoidance recurrence supports every-N-weeks with selected weekdays and monthly day-of-month with short-month final-day fallback.
- Replan updates future Task plans and appends durable ReplanEvents while preserving historical check-ins, hiatus gaps, active start tracking, and anchor transitions across multiple replans. Completed one-time/floating tasks are protected against replanning.
- Dexie schema and backup format advanced to v7 with complete v1–v6 migration compatibility.
- Desktop verification uses an isolated WebView2 profile, protects real user profiles with metadata fingerprint comparison, and executes 58/58 packaged-app smoke checks and 17/17 installer/upgrade smoke checks.
- Verification: 86/86 automated tests across 15 suites, TypeScript checking, production build, and full GitHub Actions CI green across Classify, Core, Desktop (Windows/MSVC), and PR Gate.

## Milestone 10: Desktop UI Migration — Completed

### 2026-09-22 — Milestone 10 Exit Review acceptance and PR merge

- Independent Milestone 10 Exit Review accepted: verified no regression against Milestones 1–7 domain semantics, alignment with the frozen M9 behavior specification and interaction blueprint, durable 900×600 minimum responsive behavior, and clean architectural seams.
- PR #4 merged into `main` at commit `2730bbf49e669db8a3022182dd72711ea8540fb7` (`2730bbf`).
- Independent post-merge CI run `35782091580` on `main` passed completely across all tiers: Classify, Core, Desktop (Windows/MSVC), and PR Gate (including 54/54 packaged-app smoke checks and 17/17 NSIS installer/upgrade/data-retention checks).
- Milestone 10 is formally complete. Milestone 11 (Capture and Task Enrichment) is the next engineering objective and has not started.

### 2026-09-22 — Workspace architecture (M10-A) and full UI migration (M10-B)

- M10-A replaced the flat ten-view navigation with the M9 workspace architecture. There are six M10-active destinations, and their secondary sections are declared once in `src/navigation/workspaceModel.ts`. Context jumps go through named navigation targets. Accepted at Human Gate 1.
- The HG1 repair fixed a persistent horizontal scrollbar at the 900×600 minimum. The personalized background layer is scaled 1.015 to hide blurred edges, and M10-A had moved it onto the new scroll container, turning its 0.75% bleed into scroll range. It now bleeds against a separate clipping frame.
- Desktop development is durable. Vite no longer watches `src-tauri/**`, which removes Windows EBUSY during Cargo builds without polling. A new root launcher, `OPEN_DAILY_CANVAS_DEV.cmd`, discovers the Visual Studio Build Tools x64 environment, pins the MSVC Rust toolchain, and explains any missing toolchain.
- M10-B migrated every M10-capable surface to the frozen blueprint's visual system:
  - light and dark themes, serif display type, a dark sidebar with line icons, and a 78px workspace header with segmented tabs;
  - surface-owned header actions replace the ambiguous global "+ New";
  - Review's period presets move into the header, and Settings uses an in-page category list;
  - Tasks is the blueprint's side-by-side, read-first master/detail;
  - Daily Reflection is a single surface with an explicit Save;
  - modals share an accessible dialog: named, Escape only when safe, focus trapped and restored.
- Copy fixes: device wording replaces "this browser", and "Areas" replaces "Mainlines / Areas". Over a personal background, the reading column now gets a paper veil so text never sits directly on the image.
- The packaged-app and installer smokes drive the UI and had been stale since M10-A, because CI's path routing never ran them. They were ported to the new composition using stable `data-workspace`/`data-section` hooks. The dev launcher now routes to the desktop CI tier.
- Local verification: 72 automated tests; zero horizontal overflow on every surface at 1280×820 and 900×600, in English and Chinese; inspection of the real Tauri window. Domain services, Dexie schema, backup format v6, and the Tauri boundary are unchanged. M11–M13 capabilities are absent, not stubbed.

## Milestone 9: Desktop Information Architecture and UI Blueprint — Completed

### 2026-09-22 — Frozen desktop blueprint

- Integrated the frozen artifact set in `docs/m9-desktop-ui-blueprint/`: Behavior & State Specification, HTML Interaction Blueprint, frozen PDF snapshot, selected visual reference, and manifest. The exit review found no blocking contradiction with domain governance.
- Three wording errata were reconciled at M10 Human Gate 1, each recorded in the affected file; no product decision changed.

## Milestone 8: Desktop Foundation and CI Guardrails

### 2026-09-22 — Tauri 2 desktop foundation, frozen identity, and risk-scaled CI

- Evaluated Tauri 2 against the existing React/Vite application (M8-A feasibility spike) and accepted it as the desktop shell; found no evidence to justify rewriting Dexie/IndexedDB to another engine, so storage stayed unchanged.
- Froze the desktop identity before installer and persistence evidence made it costly to change: application identifier `io.github.peter-s-shi.dailycanvas` and packaged origin `https://tauri.localhost` (replacing the provisional M8-A identifier).
- Added a thin desktop-adapter boundary (`src/desktop/desktopAdapter.ts` plus three narrow Rust commands: save-file dialog, print surface, data-location info) so domain services and the web UI never call shell APIs directly; web behavior (anchor download, `window.print()`) is unchanged in a plain browser, and no filesystem/shell/network capability is granted to the web layer.
- Established Windows/MSVC (`x86_64-pc-windows-msvc`, statically linked CRT) as the authoritative desktop build, with an automated check that the shipped executable imports only OS-owned DLLs.
- Enabled a current-user NSIS installer as a verification foundation (not release polish) and drove it end to end: install, first launch, restart, same-identifier upgrade without orphaning IndexedDB, same-version reinstall, silent uninstall (data currently retained by the NSIS default), and reinstall re-attaching to kept data.
- Added risk-scaled GitHub Actions CI (`.github/workflows/ci.yml`) with a self-tested cheap path classifier and a fail-closed `PR Gate`: documentation-only changes install no toolchain; app changes run typecheck/tests/build; migration/backup changes add targeted regression; desktop/CI changes add the Windows/MSVC build, a packaged-app smoke run, and the installer/upgrade smoke run.
- Verification result on Windows/MSVC in CI: packaged-app smoke 53/53 checks passed; installer/upgrade/data-retention smoke 17/17 checks passed. Full evidence: `desktop-spike/M8A-EVIDENCE.md` and `desktop-verify/M8B-EVIDENCE.md`.
- Intentionally deferred to later hardening/RC milestones: code signing, updater infrastructure, installer branding/polish, an uninstall data-delete option, and a Windows-version build matrix. No v1.0 product feature was implemented in this milestone.

## Milestone 7.1: Print and backup contract corrections

### 2026-07-27 — Physical page size and Meditation restore validation

- Added a dynamic print `@page size` rule so choosing A4 or Letter affects the browser print contract rather than only the on-screen preview width.
- Required every v6 Meditation backup entry to provide a non-negative finite integer `sortOrder`.
- Rejected duplicate Meditation sort orders before restore instead of silently accepting ambiguous collection order.
- Reused the domain length validator during backup validation so empty or over-limit Meditation content cannot enter IndexedDB through restore.
- Added focused regressions and a live browser check for both A4 and Letter rules; TypeScript checking, 60 automated tests, and the production build passed.

## Milestone 7: Personal Meditations and Print Collection

### 2026-07-27 — Private ordered collection and local document export

- Added a separate bilingual Meditations page with multiline plain-text CRUD, immutable creation time, edited state, confirmed deletion, and persisted pointer/keyboard ordering.
- Added one reusable 150-unit mixed-language counter for Han characters, non-Han words, number runs, and emoji graphemes while excluding punctuation, whitespace, and paragraph breaks.
- Added Select Mode plus all/selected export using global manual order, editable bilingual covers, optional localized dates, A4/Letter layouts, three text sizes, and five print-conscious backgrounds.
- Added browser Print / Save as PDF and dynamically loaded, locally generated editable Word output without remote services or fonts.
- Advanced Dexie and backup format to v6 with additive Meditation migration, validation, preview counts, restoration, and integrity checks.
- Passed TypeScript checking, 57 automated tests, production build, live English/Chinese browser smoke checks, system print-dialog validation, and OpenXML inspection of the generated Word file.

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
