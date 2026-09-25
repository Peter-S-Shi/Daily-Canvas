# Daily Canvas Project Status

Status reviewed: 2026-09-25

## Current Phase

**v1.0 Desktop Program — Milestone 15 (RC1) In Progress, RC Batches 1 and 2 Landed on an Open PR, Awaiting Human Sign-Off**

The previous v0.7 Feature Complete Gate was not accepted. Before Feature Freeze, the project intentionally reopened scope, approved the v1.0 feature boundary, and selected a migration-first desktop strategy. Milestone 8 delivered the Tauri 2 desktop foundation and CI guardrails; Milestone 9 froze the desktop information architecture and UI blueprint; Milestone 10 migrated the existing product onto that blueprint.

Milestones 1–7 remain completed engineering history. Milestones 8–10 established the desktop foundation and frozen UI composition. Milestones 11–13 delivered the full approved v1.0 product, execution-planning, reflection/preservation, and desktop-utility capability set. Milestone 14 converged the complete system on release-level correctness, resilience, accessibility, performance, and verification evidence without adding new features. The v1.0 Feature Complete Gate (`ROADMAP.md`, "Feature Complete Gate") is explicitly accepted, and Feature Freeze is active. **Milestone 15's first RC batch has advanced the package version to the bare `1.0.0` on branch `milestone/15-rc1-release-engineering` (PR #31, not yet merged into `main`)** — see the RC evidence record below. `main` itself remains at `0.7.0` until this PR merges.

## Current Milestone

**Milestone 15: Daily Canvas v1.0.0 Release Candidate and Delivery — In Progress (RC Batches 1 and 2 landed, not merged).**

- Advanced the candidate identity to the bare `1.0.0` (decided convention: no semver prerelease suffix, since `updateCheckService.compareVersions()` is a naive dotted-numeric comparator, not real semver) across `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and a regenerated `src-tauri/Cargo.lock`. Schema/backup version (v9) is deliberately unchanged — a data-shape concept, not a release-version one. The About & Updates display already reads the version live from `desktopAdapter`'s native `desktop_info` command (falling back to `package.json` only before that resolves), so no second hardcoded literal needed updating.
- Audited `desktop-verify/desktop-smoke.mjs` and `desktop-verify/installer-smoke.mjs` against `ROADMAP.md`'s M15 "Planned scope" bullets before building anything new; found nearly all of it already covered (see the RC evidence record below for the bullet-by-bullet disposition) and closed one genuine, narrow gap: the frozen shortcut set's `Ctrl+K` (Search) binding was not exercised at the packaged-app level, only `Ctrl+Shift+K` (Quick Capture), `Ctrl+1` (Today), and `Escape` were. Added a check for `Ctrl+K` opening Search and `Escape` closing it.
- Closed a real CI-evidence-retention gap for "produce the supported Windows NSIS candidate": the desktop CI job previously built and retained only two synthetic-version NSIS installers (`0.7.0-installer-test.1`/`.2`) used purely for upgrade-mechanics testing, never a genuine publicly-versioned candidate installer. `.github/workflows/ci.yml`'s desktop job now also runs `pnpm exec tauri build --bundles nsis` with no version override, producing the real `Daily Canvas_1.0.0_x64-setup.exe`, and retains it in the existing `desktop-evidence` artifact (7-day retention, matching the repo's established evidence-retention policy).
- Did not touch: the v1-v6 "browser-era" backup-import verification question (judged already sufficiently covered by existing unit evidence, not a new smoke need — see RC evidence record); the A→B installer-upgrade test's synthetic version labels (judged already representative of OS-level upgrade mechanics, which is what an NSIS-level test can actually exercise regardless of version label, since both installers build from the same current source tree); the live GitHub Release update-check path (no public Release exists yet; left as a human decision per the task brief, not decided unilaterally).
- **RC Batch 2** resolved the standing human decision (no draft/prerelease published to exercise live GitHub Release metadata; existing unit/mock coverage accepted as sufficient) and added user-facing v1.0.0 release notes, known limitations, and installation/use guidance to `README.md`/`README.zh-CN.md`, reconciled to clearly distinguish "Release Candidate prepared" from "final Release/tag published." No product, schema, or CI changes.
- See the **Milestone 15 RC Evidence Record** below for the full scope-by-scope disposition, real observed CI counts, and open items.

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

## Milestone 15 RC Evidence Record (RC Batch 1)

**This is real evidence for a real release decision. Every figure below was personally observed from the actual CI run cited, not projected or assumed.**

- **Candidate identity:** `1.0.0` at commit `ca73026e8f2a12e0ee6da43787d123cf448fa10f` (branch `milestone/15-rc1-release-engineering`, PR [#31](https://github.com/Peter-S-Shi/Daily-Canvas/pull/31), based on `main` @ `8df4227207f2bf723a5a6fdb155a127a1967c18b`). Schema/backup version: `9` (unchanged). No public GitHub Release or tag has been published for this or any candidate as of this record.
- **Follow-up docs-only commit, independently re-verified:** a subsequent commit on this branch, `d5866ff18f6b64ce56e08358ca31f0618814461f` (recording this evidence record in this file), re-triggered the full Desktop/MSVC tier as a normal push (no `[skip ci]`). Real CI run [`36081192440`](https://github.com/Peter-S-Shi/Daily-Canvas/actions/runs/36081192440): **success**, all four tiers green, matching the counts above. This commit is PR #31's HEAD as of this addendum; the figures above were gathered against `ca73026` one commit earlier and remain accurate for the code they describe (the follow-up commit touched only this file).
- **Local verification (this branch, before push):** `pnpm typecheck` clean; `pnpm test` 242/242 passed across 36 suites; `pnpm build` clean (pre-existing large-chunk advisory unchanged, no new warning); `cargo test --lib` 4/4 passed (existing auto-backup-namespace tests, unaffected by the version bump).
- **Real CI run:** GitHub Actions run [`36079764762`](https://github.com/Peter-S-Shi/Daily-Canvas/actions/runs/36079764762) on PR #31, triggered by push `8df4227..ca73026`. Conclusion: **success**, all tiers green — `Classify changes`: success; `Core (typecheck, tests, build)`: success (242/242 tests, 36 suites); `Desktop (Windows, MSVC)`: success; `PR Gate`: success.
  - Packaged-app smoke (`desktop-smoke.mjs`): **112/112 checks passed** (log: "112/112 checks passed in 86 s") — 110 pre-existing checks (the count as of the M14-B closeout run, `8df4227`, which had grown past the 103 figure recorded in this document's Milestone 13 section without that section being back-updated) plus the 2 new `Ctrl+K`-opens-Search / `Escape`-closes-Search checks added this batch.
  - Installer/upgrade/data-location smoke (`installer-smoke.mjs`): **17/17 checks passed** (log: "17/17 installer checks passed in 38 s"), using the two synthetic-version (`0.7.0-installer-test.1`/`.2`) installers built for upgrade-mechanics testing only.
  - Real-version NSIS candidate: `pnpm exec tauri build --bundles nsis` (no version override) produced `Daily Canvas_1.0.0_x64-setup.exe` (2,519,177 bytes) and it was retained in the `desktop-evidence` CI artifact (20,795,023 bytes total, 7-day retention, expires 2026-10-02) alongside the two test installers and the smoke `results.json`/`installer-results.json` files.
- **`ROADMAP.md` M15 "Planned scope" bullet-by-bullet disposition:**
  1. *Build the final desktop artifact and installer for the supported release environment.* — **Newly covered this batch.** CI's desktop job now builds and retains a real, publicly-versioned `Daily Canvas_1.0.0_x64-setup.exe` (see above); previously only test-only-versioned installers were retained.
  2. *Verify clean install, first run, normal restart, uninstall/reinstall, upgrade from representative prior desktop candidates.* — **Already fully covered** by `installer-smoke.mjs`'s existing A→B flow (install → first launch → restart → upgrade → same-version reinstall → silent uninstall → reinstall), 17/17 this run. The A→B installers intentionally carry synthetic test-only version labels rather than the real `0.7.0`/`1.0.0` pair; judged sufficient because both installers build from the identical current source tree regardless of label — the test exercises NSIS/OS-level upgrade mechanics (registry, data-folder retention, same-identifier attach), not a cross-version code diff, so the label itself does not add verification value. No change made; this is a considered "already sufficient," not an oversight.
  3. *Verify import of supported browser-era backups.* — **Already fully covered**, by unit evidence rather than new desktop-level smoke. "Browser-era" = the pre-desktop (pre-Milestone-8) web-only backup formats, versions 1–6. `src/services/backupService.test.ts` exercises `migrateBackup` starting from a real version-1 fixture (the oldest supported format) through several edge cases (Area/category merging, orphan check-in/reward dropping, malformed-collection rejection) all the way to the current format, plus explicit version-7/8/9 fixtures. `migrateBackup` is the exact function the desktop Settings import path calls, so this is real functional coverage of the oldest-supported-format import path, not a mock. `desktop-verify/M8B-EVIDENCE.md` additionally recorded a v6 backup driven end-to-end through the real desktop UI at Milestone 8. Judgment: this combination is sufficient; a new desktop-smoke fixture for v1–v6 specifically was not added.
  4. *Verify automatic backup and manual restore on a clean environment.* — **Already fully covered.** `desktop-smoke.mjs`'s "Automatic Backup" section (9 real "Back up now" cycles, 7-backup retention pruning, sentinel-file non-interference, and a full restore from a retained automatic backup through the shared restore pipeline) is unchanged this batch and passed as part of the 112/112 run.
  5. *Verify Meditation, Reflection, and Review local export paths.* — **Already fully covered**, unchanged this batch: Reflection Markdown export + `templateId` round-trip, Review Markdown export, and Meditation print/PDF (A4 + Letter, pagination, no blank page) + Word export all passed as part of the 112/112 run.
  6. *Verify local reminders and keyboard shortcuts.* — **Partially newly covered this batch.** The `send_notification` boundary check and `Ctrl+Shift+K`/`Ctrl+1`/`Escape` shortcuts were already covered; `Ctrl+K` (Search) was not and is now, per the DEVLOG entry and the diff above.
  7. *Verify GitHub Release update awareness against release metadata.* — **Resolved by explicit human decision (RC Batch 2): sufficient as-is, no draft/prerelease will be published to exercise it.** This repository has zero published GitHub Releases or tags. The five-state `updateCheckService`/`desktopAdapter` logic (up-to-date, update-available, no-release/404, network-failure, check-failed) is unit-tested with injected fakes (`updateCheckService.test.ts`), and the packaged-app smoke confirms the real, live (non-mocked) network call settles into one of the defined states without blocking the app. The decision: do not create a draft/prerelease merely to exercise the "update-available" branch live — that coverage, plus the real non-mocked network behavior already exercised, is sufficient for RC sign-off; the live "update-available" path will be exercised naturally once the real v1.0.0 GitHub Release is eventually published. This item is closed for RC purposes.
  8. *Finalize release notes, known limitations, privacy/data-ownership explanation, and end-user documentation.* — **Completed in RC Batch 2** (see below): concise, user-appropriate release notes, known limitations, and installation/use guidance were added to `README.md`/`README.zh-CN.md`; the existing "Privacy model" section was reviewed and found still accurate, no change needed.
  9. *Confirm package version, UI version, docs, schema version, backup version, repository commit, tag, and published artifact all identify the same accepted candidate.* — **Fully covered except the tag/published artifact, which is intentionally still open.** Package version (`package.json`/`tauri.conf.json`/`Cargo.toml`/`Cargo.lock`), UI version (About & Updates reads live), schema/backup version (v9, documented here as shipping with `1.0.0`), and now the macro docs (`README.md`/`README.zh-CN.md` describe the `1.0.0` candidate accurately as an unpublished Release Candidate, distinct from `main`'s `0.7.0`) all agree as of this branch's HEAD. No tag or published artifact/Release exists yet, and per the RC Batch 2 human decision (item 7), none will be created solely to close this item — real tag/artifact identification happens when the actual v1.0.0 GitHub Release is cut as a separate, later action.

### RC Batch 2 — release documentation and closeout preparation

- Added concise, recruiter/user-appropriate v1.0.0 release notes, known limitations, and installation/use guidance to `README.md` and `README.zh-CN.md` (a new "Daily Canvas v1.0.0 — Release Candidate" section in each, kept in substance-parity between the two languages), explicitly distinguishing "Release Candidate prepared" from "final Release/tag published" throughout — the existing "Privacy model"/"隐私模式" section was reviewed and found already accurate, so it was left unchanged rather than duplicated.
- Reconciled both READMEs' opening paragraphs to say `main` is at `0.7.0` while `1.0.0` is the in-progress candidate on an open, unmerged PR, rather than implying `1.0.0` is already the repository's shipped state.
- Fixed a staleness gap in this record itself: the original RC Batch 1 evidence cited commit `ca73026` as "the" candidate commit; a docs-only follow-up commit (`d5866ff`) moved PR #31's HEAD forward and re-ran full CI, which had not been reflected here until now (see the addendum above).
- Resolved the item-7 human decision (see above): no draft/prerelease will be published; unit/mock update-check coverage plus real non-mocked network behavior is accepted as sufficient for RC sign-off.
- Did not touch: `ROADMAP.md`'s Milestone 15 contract (still accurate as written, no edit needed), `ARCHITECTURE.md` (out of scope for a documentation-only closeout pass focused on end-user-facing docs), product code, schema/versioning, or CI configuration.
- **Release blockers found this batch:** none.
- **Recommendation for the next concrete M15 work batch** (a recommendation, not a decision — final RC sign-off and the eventual public Release/tag/merge are the user's call): with items 1–9 above now all closed or explicitly, deliberately deferred (only the real tag/artifact identification, which requires actually cutting the Release), this audit finds nothing further blocking RC sign-off from an engineering-evidence standpoint. The next action is a human decision: accept this candidate and proceed to merge PR #31 and eventually publish the real v1.0.0 GitHub Release, or request further changes first.
- **Note:** the `/handoff` skill was used between RC Batch 1 and RC Batch 2 (user-invoked) to carry state across a session boundary; its output lives outside this repository (a local, gitignored `prompt draft/handoff/` document) and is not duplicated here. This RC Evidence Record remains the durable, in-repository state record.

## Next Engineering Objective

**Milestone 15: Daily Canvas v1.0.0 Release Candidate and Delivery — RC Batches 1 and 2 both complete on open PR #31 (not yet merged).** Every item in the Milestone 15 RC Evidence Record above is either closed or a deliberately deferred, non-blocking item (real tag/artifact identification, which requires actually publishing the Release). No release blocker is known. The remaining step is a human decision: accept this candidate and proceed toward merging PR #31 and eventually publishing the real v1.0.0 GitHub Release, or request further changes first. This document will be updated again once that decision is made and acted on.

## Post-Merge Repository State

- Branch: `main` now has PRs #10 (Milestone 14-A product hardening), #11 (Time Block minute-precision blocker fix), #26 (Meditation blocker repair), #27 (H1 Daily Work UX hardening), and #28 (H2 final v1 hardening) integrated; Milestone 14 (including the 14-B closeout) is fully integrated into `main`.
- Current application version: `0.7.0`
- Current Dexie schema and backup format: `v9` (unchanged by Milestone 14)
- Current implementation baseline: Milestone 7.1 + Milestone 8 desktop foundation + Milestone 9 frozen blueprint + Milestone 10 desktop UI migration + Milestone 11 capture/task enrichment + Milestone 12 timeline/desktop execution + Milestone 13 reflection/preservation/desktop utilities + Milestone 14 product hardening (14-A audit plus the 14-B Human Using Experience Review closeout: PRs #11, #26, #27, #28)
- Desktop identifier: `io.github.peter-s-shi.dailycanvas`; packaged origin: `https://tauri.localhost` (both frozen)
- Desktop build target: Windows/MSVC (`x86_64-pc-windows-msvc`), statically linked CRT
- Local desktop development: `OPEN_DAILY_CANVAS_DEV.cmd` (requires Visual Studio Build Tools with the x64 MSVC toolset and a Windows SDK, the `stable-x86_64-pc-windows-msvc` Rust toolchain, Node.js, and pnpm)
- v1.0 product scope: approved; Milestones 8–14 complete (of 15); Milestone 15 in progress (RC batches 1 and 2 on open PR #31, not yet merged into `main`; awaiting human sign-off to proceed to merge/release) — see the Milestone 15 RC Evidence Record above
- Feature Complete: accepted
- Feature Freeze: active
