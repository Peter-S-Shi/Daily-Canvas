# Daily Canvas Project Status

Status reviewed: 2026-09-22

## Current Phase

**v1.0 Desktop Program — Milestone 11 Complete, Milestone 12 Next**

The previous v0.7 Feature Complete Gate was not accepted. Before Feature Freeze, the project intentionally reopened scope, approved the v1.0 feature boundary, and selected a migration-first desktop strategy. Milestone 8 delivered the Tauri 2 desktop foundation and CI guardrails; Milestone 9 froze the desktop information architecture and UI blueprint; Milestone 10 migrated the existing product onto that blueprint.

Milestones 1–7 remain completed engineering history. Milestones 8–10 established the desktop foundation and frozen UI composition. Milestone 11 delivered the first v1.0 product capabilities while the package version remains v0.7.0 until release-version policy advances it.

## Current Milestone

**Milestone 11: Capture and Task Enrichment — Completed.**

- Quick Capture implements the frozen title-only `Save to Inbox` flow plus `Create full task instead`.
- Inbox captures remain distinct unresolved records until explicit successful triage into Fixed, Floating, or Quota Task semantics.
- Global Search is local and derived across Tasks (including notes), Daily Reflections, Meditations, and Areas; unresolved Inbox captures are excluded.
- Task Notes, one-level Task-owned Checklist items, and duration estimates are available through read-first Task Detail and explicit Edit.
- Habit/Avoidance recurrence now includes every-N-weeks with selected weekdays and monthly day-of-month with short-month final-day behavior. Regular Tasks remain one-time.
- Replan changes only the future plan and appends a durable event; earlier check-ins and missing occurrences are not rewritten.
- Dexie schema and backup format are v7. Supported v1-v6 backups migrate forward; every new authoritative M11 field survives export/restore.
- Desktop smoke infrastructure now forces a disposable WebView2 user-data folder, refuses cleanup of an existing real profile, and verifies the real Daily Canvas profile metadata remains unchanged.

The next engineering milestone is **Milestone 12: Timeline and Desktop Execution**. It has not started.

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
- **Desktop adapters:** native concerns (save-file dialog, print surface, data-location info) live behind `src/desktop/desktopAdapter.ts` and three narrow Rust commands. No filesystem, shell, or network capability is granted to the web layer (`src-tauri/capabilities/default.json` grants no permissions); web behavior (anchor download, `window.print()`) is unchanged when running in a plain browser.
- **Build:** Windows/MSVC (`x86_64-pc-windows-msvc`) is the authoritative build target, with a statically linked CRT; CI asserts the built executable has no unexpected runtime dependency (no VC++ redistributable, no GNU-toolchain artifacts).
- **Packaging foundation:** a current-user NSIS installer is enabled for verification purposes. Installer/upgrade/uninstall behavior was exercised end to end (see Verification Status below). Signing, an updater, and installer branding/polish are explicitly deferred to hardening/RC (Milestones 14–15).

Evidence: `desktop-spike/M8A-EVIDENCE.md` (shell feasibility) and `desktop-verify/M8B-EVIDENCE.md` (identity, CI, MSVC build, packaged-app and installer verification).

## UI Decision — Blueprint Frozen (M9), Migrated (M10)

The desktop UI follows the frozen M9 artifact set in `docs/m9-desktop-ui-blueprint/`, subordinate to `ARCHITECTURE.md`, `ROADMAP.md`, and current domain semantics. Authority order: domain governance → Behavior & State Specification → HTML Interaction Blueprint → frozen PDF snapshot and visual reference.

Milestone 11 extends the migrated M10 composition:

- **Navigation:** seven destinations — Today, Inbox, Plan (Floating, Calendar), Tasks (All tasks, Areas, Lifecycle, Rewards), Reflect (Daily Reflection, Meditations), Review, Settings (General, Appearance, Data & Backup).
- **Global actions:** Search and Quick Capture are functional overlays rather than primary destinations. Task Detail adds Schedule, Checklist, Notes, Lifecycle, and History states while preserving read-first behavior and explicit Edit.
- **Staging (frozen Decision D4):** Timeline, Reminders, On This Day, automatic backup, update awareness, Notifications, Shortcuts, and About & Updates remain absent, not disabled placeholders.
- **Composition:** each surface owns its actions, named for what they create; there is no ambiguous global "+ New". Task Detail is read-first with an explicit Edit. Review's period presets sit in the workspace header. Settings uses an in-page category list. Daily Reflection is a single surface with an explicit Save.
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

**Feature Complete: not reached for v1.0.**

**Feature Freeze: not active.**

Feature Freeze can begin only after the approved v1.0 scope is implemented and the new Feature Complete Gate is explicitly accepted. Milestones 8–10 were foundation, blueprint, and migration milestones, not product-feature milestones, so completing them does not change this.

## Verification Status of Current Baseline

- Milestone 7.1 remains the latest completed **product-feature** baseline; Milestone 8 added the desktop foundation around it without changing product semantics.
- The v0.7 baseline passed TypeScript checking, 60 automated tests, production build, focused print checks, live print-dialog validation, and the earlier bilingual/OpenXML checks recorded in project history.
- Dexie migrations and backup compatibility are implemented through version 6, unchanged by Milestone 8.
- Milestone 8 desktop verification (Windows/MSVC, GitHub Actions, synthetic data): packaged-app smoke 53/53 checks passed (launch, all 10 existing screens, v6 backup restore/export round-trip, large-image import, bilingual switch, Meditation print/PDF page sizing and `.docx` OpenXML content, CSP/no-outbound-network, graceful-restart and forced-kill persistence, data-boundary location); NSIS installer/upgrade/data-retention smoke 17/17 checks passed (install, first launch, restart, same-identifier upgrade without orphaning IndexedDB, same-version reinstall, silent uninstall with data retention, reinstall re-attaching to kept data).
- GitHub Actions now provides independent CI evidence for every subsequent change, with the risk routing described above.
- Milestone 10 (local, synthetic data): TypeScript checking; 72 automated tests, including the end-to-end UI flow driven through the new workspace composition, a navigation-IA suite, and dialog focus/dismissal tests; production build. Every M10 surface was measured at 1280×820 and at the 900×600 minimum, in English and Chinese, with zero horizontal overflow. It was inspected in light and dark themes, over a personal background, and in the real Tauri window launched through `OPEN_DAILY_CANVAS_DEV.cmd`. Domain services, Dexie schema, backup format v6, and the Tauri adapter boundary were unchanged at that historical milestone.
- The packaged-app and installer smokes (`desktop-verify/`) drive the UI and were ported to the new workspace composition in M10-B. They had been stale since M10-A, because M10-A changed no desktop-routed path and CI never ran them. Screen coverage grew to 11 destinations, so the packaged-app smoke has 54 checks.
- Milestone 10 final PR CI (run on the merged head of PR #4) and the independent post-merge CI run `35782091580` on `main` at `2730bbf` both passed in full: Classify, Core, Desktop (Windows/MSVC), and PR Gate all green, including the 54-check packaged-app smoke and the 17-check installer/upgrade smoke.
- Milestone 11 verification (synthetic data): TypeScript checking; 86/86 automated tests across 15 suites; production build; Windows/MSVC Tauri build; packaged-app smoke 58/58 checks passed using an isolated WebView2 profile; NSIS installer/upgrade/data-retention smoke 17/17 checks passed. Coverage includes schema/backup format v7, v1-v6 migration, Inbox triage, approved Search sources and Inbox exclusion, recurrence boundaries, forward-only Replan with anchor transition and gap semantics, active start tracking, all 12 M11 desktop surfaces, bilingual operation, print/Word, restart persistence, and forced-kill durability. The smoke verifies that the real Daily Canvas profile metadata fingerprint is unchanged. Remote GitHub Actions CI confirms all tiers green (Classify, Core, Desktop Windows/MSVC, PR Gate).

## Known Risks Entering v1.0

- Desktop shell selection is now evidence-backed (Milestone 8); remaining desktop risk is about hardening, not shell choice.
- No code signing yet: a real release will show an unsigned-publisher SmartScreen prompt until Milestone 14/15 addresses it.
- Uninstall does not currently offer to delete user data (the NSIS default); whether to add that option is an open product decision for later hardening, not a defect.
- Only a Windows per-user NSIS install was exercised; a machine-wide install mode, MSI packaging, and non-English Windows locales are not yet covered.
- Desktop CI verification runs on a single GitHub-hosted Windows runner image, not a version matrix.
- Large multi-year history performance and full release-level accessibility remain to be hardened later (Milestone 14).
- The production build still has the previously recorded large-chunk advisory.
- **Unresolved:** path-based CI routing can miss UI-driving verification. A change confined to `src/` classifies as `core` only and does not select the `desktop` tier, so the packaged-app and installer smokes — which drive the actual rendered UI through CDP — do not run even when the change reshapes every screen. M10-A demonstrated this directly: its navigation rewrite touched only `src/`, so CI never exercised the desktop smokes against it, and they were later found stale (selectors from the old ten-view shell) and had to be repaired by hand in M10-B before they would run at all. This is a real, currently open gap, not a solved risk. Any future milestone that changes UI structure or selectors should manually run or update the desktop smokes rather than relying on the classifier to select them.
- Release-level accessibility (contrast audit, screen-reader pass, full keyboard journey) is still Milestone 14 work. M10 applied the structural requirements: labelled navigation, selection not conveyed by color alone, named and focus-managed dialogs, and keyboard alternatives to drag.

## Next Engineering Objective

Start **Milestone 12: Timeline and Desktop Execution**. Scope: optional Day/Week Timeline, simple Time Blocks, local reminders, and the approved small shortcut set while preserving schedule semantics. It has not started.

## Post-Merge Repository State

- Branch: `main` (Milestone 11 integrated; developed from baseline `98129cdae48b0441b4970d771d86a59c763eeca7` via PR #6)
- Current application version: `0.7.0`
- Current Dexie schema and backup format: `v7`
- Current implementation baseline: Milestone 7.1 + Milestone 8 desktop foundation + Milestone 9 frozen blueprint + Milestone 10 desktop UI migration + Milestone 11 capture/task enrichment
- Desktop identifier: `io.github.peter-s-shi.dailycanvas`; packaged origin: `https://tauri.localhost` (both frozen)
- Desktop build target: Windows/MSVC (`x86_64-pc-windows-msvc`), statically linked CRT
- Local desktop development: `OPEN_DAILY_CANVAS_DEV.cmd` (requires Visual Studio Build Tools with the x64 MSVC toolset and a Windows SDK, the `stable-x86_64-pc-windows-msvc` Rust toolchain, Node.js, and pnpm)
- v1.0 product scope: approved; Milestones 8–11 complete (of 15); Milestone 12 next, not started
- Feature Complete: not reached
- Feature Freeze: inactive
