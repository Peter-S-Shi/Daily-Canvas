# Daily Canvas Project Status

Status reviewed: 2026-09-22

## Current Phase

**v1.0 Desktop Program — Milestone 8 Complete, Implementation In Progress**

The previous v0.7 Feature Complete Gate was not accepted. Before Feature Freeze, the project intentionally reopened scope, completed competitive research, approved the v1.0 feature boundary, selected a migration-first desktop strategy, and has now completed Milestone 8, the desktop foundation and CI guardrails.

Milestones 1–7 remain completed engineering history. The Tauri 2 desktop foundation from Milestone 8 is now the accepted implementation baseline; the application feature set and version remain v0.7.0 pending the v1.0 product milestones (9–13).

## Current Milestone

**Milestone 8: Desktop Foundation and CI Guardrails — Completed.**

The next engineering milestone is **Milestone 9: Desktop Information Architecture and UI Blueprint**.

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

None of the above is implemented yet; Milestone 8 built only the desktop foundation these will later sit on.

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

## UI Decision

Broad desktop UI migration must follow an approved design blueprint rather than agent-led freeform redesign. Milestone 8 did not touch UI design or layout.

The planned design chain is:

```text
Information architecture
    ↓
Wireframes
    ↓
Markdown behavior specification
    ↓
HTML visual / interaction blueprint
    ↓
Frozen PDF snapshot
    ↓
Implementation
```

Visual design tooling may explore candidates within this boundary. It does not own product structure. This is the subject of Milestone 9.

## CI and Branching Decision — Established by Milestone 8

Risk-scaled GitHub Actions CI is live (`.github/workflows/ci.yml`), gated by a cheap path classifier (`.github/scripts/classify.sh`, self-tested on every run):

- documentation-only changes: classification and a stable PR Gate pass without installing Node, pnpm, or Rust;
- ordinary app changes: typecheck, tests, production build;
- migration/backup changes: the above plus targeted migration/restore regression and fixture validation;
- desktop-shell/CI/dependency changes: the above plus a Windows/MSVC Tauri build, a runtime-dependency check, a packaged-app smoke run, and an NSIS installer/upgrade/data-retention smoke run;
- RC/release packaging validation remains for Milestone 15.

A stable `PR Gate` job always runs and fails closed: it requires every needed job to have succeeded and every unneeded job to have been skipped (never silently run, never silently failed). `concurrency: cancel-in-progress` cancels superseded runs. Only short-retention (7-day) evidence artifacts are uploaded, and only when produced.

Branching remained lightweight for Milestone 8: `main` plus the short-lived `m8-desktop-foundation` branch, integrated through PR #2. A permanent `develop` branch is not currently justified.

## Feature Complete and Freeze Status

**Feature Complete: not reached for v1.0.**

**Feature Freeze: not active.**

Feature Freeze can begin only after the approved v1.0 scope is implemented and the new Feature Complete Gate is explicitly accepted. Completing Milestone 8 (a foundation milestone, not a product-feature milestone) does not change this.

## Verification Status of Current Baseline

- Milestone 7.1 remains the latest completed **product-feature** baseline; Milestone 8 added the desktop foundation around it without changing product semantics.
- The v0.7 baseline passed TypeScript checking, 60 automated tests, production build, focused print checks, live print-dialog validation, and the earlier bilingual/OpenXML checks recorded in project history.
- Dexie migrations and backup compatibility are implemented through version 6, unchanged by Milestone 8.
- Milestone 8 desktop verification (Windows/MSVC, GitHub Actions, synthetic data): packaged-app smoke 53/53 checks passed (launch, all 10 existing screens, v6 backup restore/export round-trip, large-image import, bilingual switch, Meditation print/PDF page sizing and `.docx` OpenXML content, CSP/no-outbound-network, graceful-restart and forced-kill persistence, data-boundary location); NSIS installer/upgrade/data-retention smoke 17/17 checks passed (install, first launch, restart, same-identifier upgrade without orphaning IndexedDB, same-version reinstall, silent uninstall with data retention, reinstall re-attaching to kept data).
- GitHub Actions now provides independent CI evidence for every subsequent change, with the risk routing described above.

## Known Risks Entering v1.0

- Desktop shell selection is now evidence-backed (Milestone 8); remaining desktop risk is about hardening, not shell choice.
- No code signing yet: a real release will show an unsigned-publisher SmartScreen prompt until Milestone 14/15 addresses it.
- Uninstall does not currently offer to delete user data (the NSIS default); whether to add that option is an open product decision for later hardening, not a defect.
- Only a Windows per-user NSIS install was exercised; a machine-wide install mode, MSI packaging, and non-English Windows locales are not yet covered.
- Desktop CI verification runs on a single GitHub-hosted Windows runner image, not a version matrix.
- Large multi-year history performance and full release-level accessibility remain to be hardened later (Milestone 14).
- The production build still has the previously recorded large-chunk advisory.

## Next Engineering Objective

Start **Milestone 9: Desktop Information Architecture and UI Blueprint**.

Milestone 9 must freeze the desktop product structure and visual/interaction contract (navigation, surface responsibilities, wireframes, behavior specification, HTML blueprint, frozen PDF snapshot) before broad UI implementation begins in Milestone 10. It must not implement approved v1.0 product features or expand desktop-shell architecture.

A frozen M9 blueprint artifact set has been integrated at `docs/m9-desktop-ui-blueprint/` on branch `m9-desktop-ui-blueprint` (Draft PR) and passed an exit review against this document, `ROADMAP.md`, and `ARCHITECTURE.md` with no blocking finding. Milestone 9 is **not yet marked complete**: this awaits independent final review before the post-merge governance rewrite.

## Repository State

- Branch: `main` (Milestone 8 delivered via PR #2 from `m8-desktop-foundation`)
- Current application version: `0.7.0`
- Current Dexie schema and backup format: `v6`
- Current implementation baseline: Milestone 7.1 (product) + Milestone 8 (desktop foundation)
- Desktop identifier: `io.github.peter-s-shi.dailycanvas`; packaged origin: `https://tauri.localhost` (both frozen)
- Desktop build target: Windows/MSVC (`x86_64-pc-windows-msvc`), statically linked CRT
- v1.0 product scope: approved; implementation in progress (Milestone 8 of 15 complete)
- Feature Freeze: inactive
