# Daily Canvas Project Status

Status reviewed: 2026-09-24

## Current Phase

**v1.0 Desktop Program — Milestone 14 Complete, Feature Complete Gate Accepted, Feature Freeze Active**

The previous v0.7 Feature Complete Gate was not accepted. Before Feature Freeze, the project intentionally reopened scope, approved the v1.0 feature boundary, and selected a migration-first desktop strategy. Milestone 8 delivered the Tauri 2 desktop foundation and CI guardrails; Milestone 9 froze the desktop information architecture and UI blueprint; Milestone 10 migrated the existing product onto that blueprint.

Milestones 1–7 remain completed engineering history. Milestones 8–10 established the desktop foundation and frozen UI composition. Milestones 11–13 delivered the full approved v1.0 product, execution-planning, reflection/preservation, and desktop-utility capability set. Milestone 14 converged the complete system on release-level correctness, resilience, accessibility, performance, and verification evidence without adding new features. The v1.0 Feature Complete Gate (`ROADMAP.md`, "Feature Complete Gate") is now explicitly accepted, and Feature Freeze is active. The package version remains v0.7.0 until release-version policy advances it in Milestone 15.

## Current Milestone

**Milestone 14: Product Hardening and Full Regression — Completed.**

- A release-hardening evidence matrix was built from `ROADMAP.md`'s M14 exit criteria, this document's Known Risks, `ARCHITECTURE.md`'s testing boundaries, and every capability promised across Milestones 1–13, then audited systematically rather than searched at random.
- Two confirmed data-integrity release blockers were found and fixed: `deleteTask` never removed a deleted task's `experienceLogs` or `rewards` rows, leaving a streak-triggered Reward permanently, invisibly unlockable-never; and backup restore never filtered `rewards` referencing a task missing from the restored set, letting the same dead reference re-enter through import. Both fixes are additive and change no schema.
- The previously-recorded path-based CI routing gap is closed: `.github/scripts/classify.sh` now fails closed under `src/` — only an explicit allowlist of non-visual, pure-logic paths (services, `lib`, `vite-env.d.ts`, the migration/backup-contract files) stays core-only; every other `src/` path also selects the desktop tier, so a UI-reshaping change can no longer silently skip real packaged-app/installer evidence.
- A full accessibility and color-independence sweep (dialog focus trap/return, reduced-motion honoring, icon-button labeling, and every status/lifecycle/streak/area indicator across the major surfaces) found the existing implementation already correct; no defect required a fix.
- Large-history performance was measured against a defined synthetic scale (6 years, ~36 tasks, ~11,900 check-ins, 2,190 daily reflections, 400 meditations, ~2,400 experience logs): Review's full-range model built in ~102 ms, Available Work in ~1.1 ms/day, per-task streak stats in ~92 ms across all fixed habits, On This Day in ~1.5 ms. No O(n²) pattern or release-level stall was found; no performance fix was required.
- No known release blocker remains. Deferred, non-blocking issues (DST-transition scheduling has no dedicated test, no code signing yet, NSIS uninstall doesn't offer to delete user data, single-runner/single-install-mode coverage, the existing large-chunk build advisory) are recorded and do not affect Feature Complete or Feature Freeze.

**Milestone 14-B: Human Using Experience Review and blocker/hardening closeout — Completed.**

- A Human Using Experience Review exercised the packaged desktop application the way a real user would, beyond the M14-A audit's systematic-but-code-driven sweep, and surfaced blockers and hardening gaps that only showed up under genuine use.
- PR #11 fixed a Time Block blocker: duration was being forced onto the 15-minute grid, so an intended 1-minute-precision duration could not be saved; duration is now whole-minute precision with no snapping.
- PR #26 repaired a Meditations blocker: Select All/Clear All did not behave correctly and print pagination was broken; both are fixed.
- PR #27 ("H1: Daily Work UX hardening") added Tasks bulk organization, Areas drill-down, type-aware state grammar, local Notes/Checklist editing, and Today↔Floating discoverability.
- PR #28 ("H2: final v1 hardening") corrected Quota Review retrospective correctness, distinguished a GitHub Release 404 (no published Release) from a genuine network failure, hardened Timeline UX (including making Time Block **Start** whole-minute precision with no snapping, matching the duration fix from PR #11, plus Day-view overlap grouping), changed Time Block overlap from a hard rejection to an explicit warned choice, added the Light Theme sidebar, and made Meditation export language-agnostic.
- All four PRs (#11, #26, #27, #28) are merged into `main`. Final human acceptance was given after PR #28.
- The Time Block contract is now final: Start and Duration are both stored at whole-minute precision with no 15-minute snapping (the Timeline view still renders a 15-minute *visual* grid, a presentation-only detail); overlapping a Time Block with another is a warned, explicit `Adjust time` / `Save anyway` choice rather than a rejection, and the Day view groups genuinely-overlapping saved blocks into a clickable "N tasks overlapping" chip.
- A manual `workflow_dispatch` CI run on `main` at this state (`f8bf7e48e39bd9184c98395aa8927d8c3f7bd8ce`, run `36072432474`) failed Core/PR Gate; the sole cause was one stale backup-migration test still asserting the superseded 15-minute-grid Start rule, not a production defect. The M14 closeout corrected that stale test expectation and synchronized the macro documentation to the final post-M14 state described above.

**Milestone 13: Reflection, Preservation, and Desktop Utilities — Completed.**

- Three lightweight Reflection Templates (Free Write, Daily Check-in, Gratitude & Perspective) live inside the existing Daily Reflection flow. Every prompt is skippable and never mandatory; prompt text is never written into the saved `note`; Free Write remains the default. `DailyReflection.templateId` is an additive optional field.
- On This Day is a real destination inside Reflect: a read-only lens over Daily Reflections and Meditations matching the exact month+day from prior years only (never the current year), grouped by year with the most recent year first, each entry offering "Open original" navigation. It never mutates or duplicates a source record and produces no growth/emotion/analysis framing.
- Local Reflection and Review export produce deterministic Markdown (`.md`) through the existing `saveBlob` native-Save-dialog seam; Review export carries the Review screen's current period/filter selection; neither mutates source data, and the Meditation print/PDF/Word pipeline is untouched.
- Automatic Rotating Backup is enabled by default, runs at most once per local calendar day on successful startup (failure-isolated from startup, like M12 reminders), and is also exposed as "Back up now" in Settings → Data & Backup alongside the toggle, last-success time, location, and retained history. Backups write to a temp file and atomically rename into place, retain only the most recent 7, and prune only after a new backup is confirmed written. Restoring from a retained automatic backup reuses the exact manual restore pipeline (parse → validate/migrate → preview/warnings → safety backup → confirm → transactional restore). Four narrow native commands (`std::fs` only, no filesystem plugin) back this.
- GitHub Release update awareness lives only in the new Settings → About & Updates page: it shows the installed version and checks only on page open or an explicit "Check for updates" click (never on a timer or at startup), through the scoped `tauri-plugin-http` (limited to the single GitHub Releases endpoint). **Superseded by Milestone 14-B (PR #28, Issue #15):** the check now distinguishes five states rather than three -- Up to date; Update available (with "View Release" via the scoped `tauri-plugin-opener`); no published Release yet ("No published release is available yet", a 404 from the Releases API, not a failure); a genuine network/timeout/DNS failure; and any other check failure (generic message) -- so a repository with no published Release is never described as a network problem.
- Dexie schema and backup format move v8 → v9. No new table was needed for `templateId` (additive optional field); v9 versions the new `AppSettings.autoBackupEnabled`/`lastAutoBackupAt` defaults and keeps the versioned-migration/backup-format pattern intact. v1-v8 backups migrate forward and every new field round-trips through backup.

The v1.0 approved feature scope (Milestones 8–13) is fully implemented, and Milestone 14 hardening is complete with no known release blocker remaining. The next engineering milestone is **Milestone 15: Daily Canvas v1.0.0 Release Candidate and Delivery**. It has not started.

**Milestone 12: Timeline and Desktop Execution — Completed.**

- Day and Week Timeline (`Plan → Timeline`) share one persistent Time Block collection; Available Work is derived from existing Fixed/Floating/Quota Task data, never a second authoritative task store.
- Every Time Block references a real Task and defaults duration to `Task.estimatedMinutes` (else 30 minutes). **Superseded by Milestone 14-B** (see above): Start and Duration are both whole-minute precision with no 15-minute snapping (the Timeline view keeps a 15-minute visual grid as a presentation-only detail), and an overlap is a warned, explicit `Adjust time` / `Save anyway` choice rather than a rejection, with genuinely-overlapping saved blocks grouped into a Day-view "N tasks overlapping" chip. Deleting a block never deletes its Task; a block ending never auto-completes the Task; moving/resizing a block never changes recurrence, quota, or schedule.
- Drag-and-drop is an optional convenience; every block also has a fully keyboard-accessible Date/Start time/Duration/Reminder dialog.
- Replan flags a Task's existing future blocks `needsReview` when they no longer fit the new plan, without moving, deleting, or silently repairing them.
- Today shows an optional "Today's Plan" summary only when Time Blocks exist for the day, and disappears entirely otherwise.
- Local, in-app-only reminders (frozen Off/At-start/5-60-minute grammar) belong to a Time Block; Task Detail can view/edit the reminder on a Task's upcoming blocks. A minimal `send_notification` Tauri command fires while the app is running, with a restrained, non-repeating startup catch-up for reminders missed while closed — no resident process, tray, or OS task scheduler was added.
- The frozen small shortcut set is live (`Ctrl/Cmd+K` Search, `Ctrl/Cmd+Shift+K` Quick Capture, `Ctrl/Cmd+1` Today, `Escape`), guarded against editable targets; Settings → Shortcuts is a read-only cheat sheet with no customization.
- Dexie schema and backup format move v7 → v8, adding the `timeBlocks` collection; v1-v7 backups migrate forward and every new field round-trips through backup.

**Milestone 11: Capture and Task Enrichment — Completed.**

- Quick Capture implements the frozen title-only `Save to Inbox` flow plus `Create full task instead`.
- Inbox captures remain distinct unresolved records until explicit successful triage into Fixed, Floating, or Quota Task semantics.
- Global Search is local and derived across Tasks (including notes), Daily Reflections, Meditations, and Areas; unresolved Inbox captures are excluded.
- Task Notes, one-level Task-owned Checklist items, and duration estimates are available through read-first Task Detail and explicit Edit.
- Habit/Avoidance recurrence now includes every-N-weeks with selected weekdays and monthly day-of-month with short-month final-day behavior. Regular Tasks remain one-time.
- Replan changes only the future plan and appends a durable event; earlier check-ins and missing occurrences are not rewritten.
- Dexie schema and backup format were v7 at completion; superseded by v8 in Milestone 12.
- Desktop smoke infrastructure now forces a disposable WebView2 user-data folder, refuses cleanup of an existing real profile, and verifies the real Daily Canvas profile metadata remains unchanged.

**Milestone 10: Desktop UI Migration — Completed.**

- **M10-A (migration skeleton):** the flat ten-view navigation was replaced by the M9 workspace architecture — six M10-active destinations (Today, Plan, Tasks, Reflect, Review, Settings) with secondary destinations declared once in `src/navigation/workspaceModel.ts`. Accepted at **Human Gate 1** (2026-09-22) after independent architecture review and human inspection of the real Tauri window.
- **M10-B (full UI migration):** every M10-capable surface followed the frozen blueprint's visual system and composition. See *UI Decision* below.
- **M10 Exit Review:** accepted independently against the frozen M9 artifacts and the exit criteria below. PR #4 merged into `main` at `2730bbf49e669db8a3022182dd72711ea8540fb7`; post-merge CI run `35782091580` succeeded (Classify, Core, Desktop Windows/MSVC, PR Gate all green).

**Milestone 9: Desktop Information Architecture and UI Blueprint — Completed.** The frozen artifact set lives in `docs/m9-desktop-ui-blueprint/` (integrated through PR #3). Wording errata found during review were reconciled at M10 Human Gate 1; no product decision changed.

## Current Release Target

The active target is **Daily Canvas v1.0.0**, a free, account-free, local-first desktop application.

The v1.0 program preserves the current planning, habit, lifecycle, reflection, review, and Meditation semantics while adding the approved planning/execution and desktop-native capabilities defined in `ROADMAP.md`.

## Approved v1.0 Feature Scope

### Planning and execution

- Quick Capture / Inbox.
- Global Search.
- Task Notes.
- One-level Checklist items only.
- Richer recurrence rules.
- Task duration estimates.
- Explicit replan flow for unfinished work.
- Optional Day / Week Timeline.
- Optional simple Time Blocking on the Timeline.

### Reflection and preservation

- Lightweight Reflection Templates.
- On This Day / historical resurfacing.
- Local Reflection / Review export.

### Desktop-native and reliability

- Automatic rotating local backups.
- Basic local reminders.
- Desktop keyboard shortcuts.
- GitHub Release update awareness without silent self-update.

Milestone 11 implements Quick Capture/Inbox, Global Search, Task Notes, one-level Checklist items, richer recurrence, duration estimates, and Replan. Timeline/Time Blocking and desktop execution controls remain M12; the reflection/preservation and automatic-backup/update-awareness items remain M13.

## Explicit v1.0 Deferrals

The following are intentionally outside v1.0 and may be reconsidered only in later planning:

- Focus Timer / Pomodoro.
- External calendar integration.
- App Lock / product-managed encryption.
- Quantitative habits with multiple daily units.
- Generic personal-metric tracking.
- Desktop widgets or tray mini-UI.
- Full automatic self-updater.
- Cross-device/cloud sync.

## Explicit Non-Goals

The following are not planned product directions:

- Accounts or user-management infrastructure.
- Team collaboration or shared tasks.
- Recursive project/task hierarchies.
- Social feeds, competitive habit leaderboards, or complex points economies.
- Remote AI coach / AI therapist behavior.
- Automated diagnosis or prediction from personal data.
- Mandatory cloud backup.
- PWA-first release delivery.

## Desktop Migration Decision — Resolved by Milestone 8

The project migrated to a thin desktop foundation rather than a rewrite, as planned:

- **Shell:** Tauri 2, chosen after the M8-A feasibility spike. React, TypeScript, Vite, service boundaries, and existing domain semantics are unchanged.
- **Storage:** Dexie/IndexedDB is retained unchanged. The spike found no evidence of a blocker that would justify a rewrite to SQLite or another engine.
- **Identity (frozen):** application identifier `io.github.peter-s-shi.dailycanvas`; packaged origin `https://tauri.localhost`. Both are now permanent — IndexedDB is keyed by origin inside the identifier's WebView2 profile, so changing either later would orphan existing user data.
- **Desktop adapters:** native concerns (save-file dialog, print surface, data-location info, local reminder notifications) live behind `src/desktop/desktopAdapter.ts` and four narrow Rust commands. The web layer is granted only the minimal `notification:default` capability (Milestone 12, for local Time Block reminders) beyond the dialog plugin; no filesystem, shell, or network capability is granted (`src-tauri/capabilities/default.json`). Web behavior (anchor download, `window.print()`, Web Notification fallback) is unchanged when running in a plain browser.
- **Build:** Windows/MSVC (`x86_64-pc-windows-msvc`) is the authoritative build target, with a statically linked CRT; CI asserts the built executable has no unexpected runtime dependency (no VC++ redistributable, no GNU-toolchain artifacts).
- **Packaging foundation:** a current-user NSIS installer is enabled for verification purposes. Installer/upgrade/uninstall behavior was exercised end to end (see Verification Status below). Signing, an updater, and installer branding/polish are explicitly deferred to hardening/RC (Milestones 14–15).

Evidence: `desktop-spike/M8A-EVIDENCE.md` (shell feasibility) and `desktop-verify/M8B-EVIDENCE.md` (identity, CI, MSVC build, packaged-app and installer verification).

## UI Decision — Blueprint Frozen (M9), Migrated (M10)

The desktop UI follows the frozen M9 artifact set in `docs/m9-desktop-ui-blueprint/`, subordinate to `ARCHITECTURE.md`, `ROADMAP.md`, and current domain semantics. Authority order: domain governance → Behavior & State Specification → HTML Interaction Blueprint → frozen PDF snapshot and visual reference.

Milestone 13 extends the migrated M10/M11/M12 composition:

- **Navigation:** seven workspaces — Today, Inbox, Plan (Floating, Calendar, Timeline), Tasks (All tasks, Areas, Lifecycle, Rewards), Reflect (Daily Reflection, On This Day, Meditations), Review, Settings (General, Appearance, Data & Backup, Shortcuts, About & Updates).
- **Global actions:** Search and Quick Capture are functional overlays rather than primary destinations. Task Detail adds Schedule (now including a Task's upcoming Time Block reminders), Checklist, Notes, Lifecycle, and History states while preserving read-first behavior and explicit Edit.
- **Staging (frozen Decision D4):** On This Day and About & Updates are live real destinations as of Milestone 13, added in the same change that made each one genuinely usable; a general desktop Notifications surface (distinct from the M12 in-app Time Block reminders already live) remains out of scope and absent, not a disabled placeholder.
- **Composition:** each surface owns its actions, named for what they create; there is no ambiguous global "+ New". Task Detail is read-first with an explicit Edit. Review's period presets sit in the workspace header, alongside its new Markdown export action. Settings uses an in-page category list. Daily Reflection is a single surface with an explicit Save, a template picker, and a Markdown export action. Every Time Block has a fully keyboard-accessible Date/Start/Duration/Reminder dialog; drag is an optional convenience, never the only entry point.
- **Deliberate deviations from blueprint values:** muted text and the primary-button fill are slightly deeper than the blueprint's colors, to meet WCAG AA text contrast (spec §14.5 outranks the visual reference). A full dark theme is defined because the product supports one, although the blueprint depicts only light. Over a personal background, the reading column gets a paper veil (spec §18).

## CI and Branching Decision — Established by Milestone 8

Risk-scaled GitHub Actions CI is live (`.github/workflows/ci.yml`), gated by a cheap path classifier (`.github/scripts/classify.sh`, self-tested on every run):

- documentation-only changes: classification and a stable PR Gate pass without installing Node, pnpm, or Rust;
- ordinary app changes: typecheck, tests, production build;
- migration/backup changes: the above plus targeted migration/restore regression and fixture validation;
- desktop-shell/CI/dependency changes: the above plus a Windows/MSVC Tauri build, a runtime-dependency check, a packaged-app smoke run, and an NSIS installer/upgrade/data-retention smoke run;
- RC/release packaging validation remains for Milestone 15.

A stable `PR Gate` job always runs and fails closed: it requires every needed job to have succeeded and every unneeded job to have been skipped (never silently run, never silently failed). `concurrency: cancel-in-progress` cancels superseded runs. Only short-retention (7-day) evidence artifacts are uploaded, and only when produced.

Branching remains lightweight: `main` plus one short-lived branch per milestone, integrated through a PR — `m8-desktop-foundation` (PR #2), `m9-desktop-ui-blueprint` (PR #3), and `m10-desktop-ui-migration` (PR #4, merged at `2730bbf`). A permanent `develop` branch is not currently justified.

The classifier routes the root dev launcher `OPEN_DAILY_CANVAS_DEV.cmd` to the desktop tier, like the other desktop tooling.

## Feature Complete and Freeze Status

**Feature Complete: accepted.** Every approved v1.0 feature (`ROADMAP.md`, "v1.0 Approved Scope") is implemented, and the v1.0 Feature Complete Gate itself (`ROADMAP.md`, "Feature Complete Gate") has been explicitly accepted, recorded here and in `ROADMAP.md`.

**Feature Freeze: active.**

Milestone 14 was executed under this policy: it added no new features and fixed only release-blocking and hardening-class defects (data integrity, migration/backup, desktop persistence, core workflow, accessibility, performance, verification infrastructure). Reopening product scope now requires an explicit recorded decision, per `ROADMAP.md`, "Feature Freeze Policy".

## Verification Status of Current Baseline

- Milestone 13 is the latest completed **product-feature** baseline (Milestone 14 is a hardening milestone, adding no new features); Milestones 8–10 added the desktop foundation, frozen UI blueprint, and UI migration around the prior Milestone 7.1 baseline without changing product semantics.
- The v0.7 baseline passed TypeScript checking, 60 automated tests, production build, focused print checks, live print-dialog validation, and the earlier bilingual/OpenXML checks recorded in project history.
- Dexie migrations and backup compatibility are implemented through version 6, unchanged by Milestone 8.
- Milestone 8 desktop verification (Windows/MSVC, GitHub Actions, synthetic data): packaged-app smoke 53/53 checks passed (launch, all 10 existing screens, v6 backup restore/export round-trip, large-image import, bilingual switch, Meditation print/PDF page sizing and `.docx` OpenXML content, CSP/no-outbound-network, graceful-restart and forced-kill persistence, data-boundary location); NSIS installer/upgrade/data-retention smoke 17/17 checks passed (install, first launch, restart, same-identifier upgrade without orphaning IndexedDB, same-version reinstall, silent uninstall with data retention, reinstall re-attaching to kept data).
- GitHub Actions now provides independent CI evidence for every subsequent change, with the risk routing described above.
- Milestone 10 (local, synthetic data): TypeScript checking; 72 automated tests, including the end-to-end UI flow driven through the new workspace composition, a navigation-IA suite, and dialog focus/dismissal tests; production build. Every M10 surface was measured at 1280×820 and at the 900×600 minimum, in English and Chinese, with zero horizontal overflow. It was inspected in light and dark themes, over a personal background, and in the real Tauri window launched through `OPEN_DAILY_CANVAS_DEV.cmd`. Domain services, Dexie schema, backup format v6, and the Tauri adapter boundary were unchanged at that historical milestone.
- The packaged-app and installer smokes (`desktop-verify/`) drive the UI and were ported to the new workspace composition in M10-B. They had been stale since M10-A, because M10-A changed no desktop-routed path and CI never ran them. Screen coverage grew to 11 destinations, so the packaged-app smoke has 54 checks.
- Milestone 10 final PR CI (run on the merged head of PR #4) and the independent post-merge CI run `35782091580` on `main` at `2730bbf` both passed in full: Classify, Core, Desktop (Windows/MSVC), and PR Gate all green, including the 54-check packaged-app smoke and the 17-check installer/upgrade smoke.
- Milestone 11 verification (synthetic data): TypeScript checking; 86/86 automated tests across 15 suites; production build; Windows/MSVC Tauri build; packaged-app smoke 58/58 checks passed using an isolated WebView2 profile; NSIS installer/upgrade/data-retention smoke 17/17 checks passed. Coverage includes schema/backup format v7, v1-v6 migration, Inbox triage, approved Search sources and Inbox exclusion, recurrence boundaries, forward-only Replan with anchor transition and gap semantics, active start tracking, all 12 M11 desktop surfaces, bilingual operation, print/Word, restart persistence, and forced-kill durability. The smoke verifies that the real Daily Canvas profile metadata fingerprint is unchanged. Remote GitHub Actions CI confirmed all tiers green (Classify, Core, Desktop Windows/MSVC, PR Gate).
- Milestone 12 verification (synthetic data): TypeScript checking; 114/114 automated tests across 19 suites, including 15-minute-grid and overlap invariants (both in `createTimeBlock` and in v8 backup restore validation), Avoidance exclusion from Time Blocks, Available Work derivation, Replan `needsReview` flagging without history rewrite, restrained reminder catch-up and failure-isolation semantics, and full v1-v8 schema/backup migration and round-trip coverage; production build. `cargo check` and a release Windows/MSVC Tauri build pass locally with the `tauri-plugin-notification` dependency and its `notification:default` capability. A merge-readiness corrective pass fixed five confirmed seams before merge (Task-duration-estimate rounding onto the 15-minute grid, Day Timeline's full 00:00-24:00 domain, `reminderFiredAt` clearing on explicit Date/Start/Reminder edits, reminder-failure isolation from the local-data startup/recovery path, and hardened v8 restore validation). Manually verified in a live browser preview: creating/editing a Time Block including a 23:30-24:00 late-night block, overlap rejection, Week mode showing the same block correctly, the Today's Plan summary, Task Detail reminder editing, and the Settings Shortcuts cheat sheet, with zero console errors. The corrective implementation commit `9389c0b` passed GitHub Actions run `35820653400` with all tiers green: Classify, Core, Desktop Windows/MSVC (70/70 packaged-app smoke checks including the v8 backup restore/export round-trip, the Plan/Timeline Day and Week modes, the Settings/Shortcuts screen, shortcut behavior, and the notification boundary; 17/17 installer/upgrade/data-retention smoke checks), and PR Gate.
- Milestone 13 verification (synthetic data): TypeScript checking; 142/142 automated tests across 24 suites, including Reflection Template persistence and free-form primacy (`reflectionTemplateService.test.ts`), On This Day month/day/year selection and past-years-only/source restriction (`onThisDayService.test.ts`), deterministic Reflection/Review Markdown export (`exportService.test.ts`), backup rotation/retention/atomic-write-failure-isolation semantics (`autoBackupService.test.ts`), update-check version comparison and non-throwing network-failure handling (`updateCheckService.test.ts`), and full v1-v9 schema/backup migration and round-trip coverage extended in `backupService.test.ts`; production build. `cargo check` and a release Windows/MSVC Tauri build (`tauri build --no-bundle --target x86_64-pc-windows-msvc`) both pass locally with the new `tauri-plugin-http` (scoped to the single GitHub Releases endpoint) and `tauri-plugin-opener` dependencies, version-pinned to match their npm counterparts. The extended packaged-app smoke (`desktop-verify/desktop-smoke.mjs`) passed 103/103 checks against the real release executable: Reflection Template selection/save and `templateId` round-trip plus its Markdown export; On This Day rendering two seeded historical records (dated 1 and 2 years before the real run date, so the check is correct on any run date) grouped by year with working "Open original" navigation; Review Markdown export; 9 real "Back up now" invocations exercising genuine 7-backup retention pruning through the native write/list/delete commands; a full restore from a retained automatic backup through the shared restore-preview/confirm pipeline; and About & Updates settling into a real (not mocked) "Unable to check" state against the live GitHub API, since this repository does not yet publish a stable Release, without affecting app startup or any other check. A genuine finding from this run -- Automatic Backup's files live in the real, shared `%LOCALAPPDATA%\<identifier>\backups` directory, which the packaged-app smoke's isolated WebView2 profile does not cover -- was fixed by having `desktop-smoke.mjs` take the same safe, marker-based, always-cleaned-up ownership of that directory that `installer-smoke.mjs` already used, in place of the now-inapplicable "byte-identical real profile" invariant.
- Milestone 13 merge-readiness corrective pass (synthetic data, PR #9): fixed three independently-confirmed seams without changing the v9 schema/backup contract or any other M13 behavior. (1) On This Day derived a Meditation's calendar day by slicing its UTC `createdAt` ISO string instead of reusing `toDateKey` (the app's existing local-calendar-day convention), which misfiled evening entries into the next local day and, near a year boundary, the wrong year; fixed in `onThisDayService.ts`. (2) The native `list_auto_backups` Tauri command listed every `.json` file in the backup directory rather than only ones matching the app's own `daily-canvas-auto-backup-*` naming convention, so retention pruning could delete an unrelated file; `list_auto_backups`/`delete_auto_backup` in `src-tauri/src/lib.rs` are now scoped strictly to that namespace, with 4 new Rust unit tests. (3) Reflection Markdown export wrote the internal i18n key literal (e.g. `template_dailyCheckin`) instead of the resolved, current-language template name, and Review Markdown export's filter metadata could show a raw `areaId`/`taskId` instead of the Area/Task's name (or, if unresolvable, now omits that line entirely); fixed in `exportService.ts` (`reflectionToMarkdown`, `reviewToMarkdown`). Automated coverage grew to 146/146 TypeScript/Vitest tests across the same 24 suites, plus 4 new Rust unit tests (`src-tauri/src/lib.rs`, `cargo test --lib`); TypeScript checking and the production build both pass. `desktop-verify/desktop-smoke.mjs` was extended with a sentinel non-namespaced `.json` file placed directly in the real backup directory during the existing 9-cycle retention exercise, asserting it is never listed and survives on disk untouched.
- Milestone 14 hardening (synthetic data): a systematic audit against the release-hardening evidence matrix found and fixed two confirmed data-integrity blockers with regression coverage (`deleteTask` orphaning `experienceLogs`/`rewards`; backup restore not filtering orphan `rewards`), and closed the previously-recorded path-based CI routing gap by making `.github/scripts/classify.sh` fail closed for `src/` (`src/services/*`, `src/lib/*`, and `src/vite-env.d.ts` are now the only `src/` paths that stay core-only; every other `src/` path also selects the desktop tier), with the classifier self-test extended to lock this in. A full accessibility/color-independence sweep and a large-history performance measurement (6-year synthetic dataset; see `ROADMAP.md`, Milestone 14 "Completion evidence") found the existing implementation already correct, with no fix required in either area. Automated coverage reached 148/148 TypeScript/Vitest tests across 25 suites; TypeScript checking and the production build pass; the existing large-chunk advisory is unchanged. No smoke-suite coverage changed in this milestone, so the packaged-app smoke (103/103) and installer/upgrade smoke (17/17) established in Milestone 13 continue to apply unchanged.

## Known Risks Entering v1.0

- Desktop shell selection is now evidence-backed (Milestone 8); remaining desktop risk is about hardening, not shell choice.
- No code signing yet: a real release will show an unsigned-publisher SmartScreen prompt until Milestone 14/15 addresses it.
- Uninstall does not currently offer to delete user data (the NSIS default); whether to add that option is an open product decision for later hardening, not a defect.
- Only a Windows per-user NSIS install was exercised; a machine-wide install mode, MSI packaging, and non-English Windows locales are not yet covered.
- Desktop CI verification runs on a single GitHub-hosted Windows runner image, not a version matrix; a machine-wide/MSI install path and non-English Windows locales are also not yet covered. These are explicitly deferred to Milestone 15 (Release Candidate), not defects.
- The production build still has the previously recorded large-chunk advisory.
- **Resolved in Milestone 14:** the path-based CI routing gap is closed. `.github/scripts/classify.sh` now fails closed for `src/` — only an explicit allowlist of non-visual, pure-logic paths stays core-only, and every other `src/` path (including anything new or unanticipated) also selects the desktop tier, so a UI-reshaping change can no longer silently skip the packaged-app/installer smokes the way M10-A's navigation rewrite once did. The classifier self-test locks this in.
- **Resolved in Milestone 14:** large multi-year history performance and release-level accessibility were audited (a defined 6-year synthetic dataset for performance; a full keyboard/focus/color-independence/reduced-motion sweep for accessibility). Both were already correct against the frozen spec; no defect was found or needed fixing.
- Reminder/Time-Block scheduling has no dedicated regression test for real DST transitions; this is inherent to ordinary JS local-`Date` semantics rather than an observed app defect, and is noted here as a candidate for manual verification at RC time rather than a confirmed bug.
- This repository does not yet publish a stable GitHub Release, so About & Updates currently and correctly resolves to "No published release is available yet" (a 404 from the Releases API, not a defect, and explicitly distinct from a network failure since Milestone 14-B/PR #28) against the real network; the "Update available" success path is covered by `updateCheckService.test.ts`'s injected-fake unit tests, not by an end-to-end live-network check, since CI must not depend on this repository's release history to stay green.
- Automatic Backup's real files live under `%LOCALAPPDATA%\<identifier>\backups`, a genuine per-machine OS path that packaged-app smoke now takes safe, disposable ownership of (see Verification Status above); this is a new category of desktop-verify responsibility that Milestone 14 hardening should keep in mind if further native features write outside the WebView2-isolated profile.

## Next Engineering Objective

Start **Milestone 15: Daily Canvas v1.0.0 Release Candidate and Delivery**. It has not started. The v1.0 approved feature scope (Milestones 8–13) is fully implemented, Milestone 14 hardening is complete, the Feature Complete Gate is accepted, and Feature Freeze is active.

## Post-Merge Repository State

- Branch: `main` now has PRs #10 (Milestone 14-A product hardening), #11 (Time Block minute-precision blocker fix), #26 (Meditation blocker repair), #27 (H1 Daily Work UX hardening), and #28 (H2 final v1 hardening) integrated; Milestone 14 (including the 14-B closeout) is fully integrated into `main`.
- Current application version: `0.7.0`
- Current Dexie schema and backup format: `v9` (unchanged by Milestone 14)
- Current implementation baseline: Milestone 7.1 + Milestone 8 desktop foundation + Milestone 9 frozen blueprint + Milestone 10 desktop UI migration + Milestone 11 capture/task enrichment + Milestone 12 timeline/desktop execution + Milestone 13 reflection/preservation/desktop utilities + Milestone 14 product hardening (14-A audit plus the 14-B Human Using Experience Review closeout: PRs #11, #26, #27, #28)
- Desktop identifier: `io.github.peter-s-shi.dailycanvas`; packaged origin: `https://tauri.localhost` (both frozen)
- Desktop build target: Windows/MSVC (`x86_64-pc-windows-msvc`), statically linked CRT
- Local desktop development: `OPEN_DAILY_CANVAS_DEV.cmd` (requires Visual Studio Build Tools with the x64 MSVC toolset and a Windows SDK, the `stable-x86_64-pc-windows-msvc` Rust toolchain, Node.js, and pnpm)
- v1.0 product scope: approved; Milestones 8–14 complete (of 15); Milestone 15 next, not started
- Feature Complete: accepted
- Feature Freeze: active
