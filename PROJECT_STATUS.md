# Daily Canvas Project Status

Status reviewed: 2026-09-21

## Current Phase

**v1.0 Desktop Program — Scope Approved, Pre-Implementation**

The previous v0.7 Feature Complete Gate was not accepted. Before Feature Freeze, the project intentionally reopened scope, completed competitive research, approved the v1.0 feature boundary, and selected a migration-first desktop strategy.

Milestones 1–7 remain completed engineering history. The current codebase remains the v0.7.0 browser-served baseline until the desktop program begins implementation.

## Current Milestone

No new implementation milestone has started yet.

The next engineering milestone is **Milestone 8: Desktop Foundation and CI Guardrails**.

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

## Desktop Migration Decision

The project will migrate before broad feature expansion, but the migration starts with a thin technical foundation rather than a rewrite.

- Preserve React, TypeScript, Vite, service boundaries, and existing domain semantics.
- Preserve Dexie/IndexedDB initially.
- Do not replace the database merely because the product becomes desktop software.
- Use a bounded desktop-shell feasibility spike before locking the shell choice.
- A lightweight shell is the first candidate; an alternative remains available if evidence exposes blockers.
- Validate local persistence, backup/restore, document export, restart behavior, and upgrade safety before expanding features.

## UI Decision

Broad desktop UI migration must follow an approved design blueprint rather than agent-led freeform redesign.

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

Visual design tooling may explore candidates within this boundary. It does not own product structure.

## CI and Branching Decision

The repository currently has no independent GitHub Actions evidence on the v0.7 baseline. Milestone 8 will establish risk-scaled CI.

Target policy:

- documentation-only changes: cheap classification and pass; no Node installation or full test suite;
- ordinary app changes: typecheck, tests, production build;
- migration/backup changes: core checks plus targeted migration/restore regressions;
- desktop-shell/packaging changes: core checks plus Windows desktop smoke where relevant;
- RC/release: packaging, clean-install, upgrade, artifact, and release validation.

A stable PR Gate should remain present while expensive jobs run conditionally. Outdated CI runs should be cancelled when a newer commit supersedes them.

Branching should remain lightweight: `main` plus short-lived milestone/feature branches and PR-based integration. A permanent `develop` branch is not currently justified.

## Feature Complete and Freeze Status

**Feature Complete: not reached for v1.0.**

**Feature Freeze: not active.**

Feature Freeze can begin only after the approved v1.0 scope is implemented and the new Feature Complete Gate is explicitly accepted.

## Verification Status of Current Baseline

- Milestone 7.1 remains the latest completed implementation baseline.
- That baseline passed TypeScript checking, 60 automated tests, production build, focused print checks, live print-dialog validation, and the earlier bilingual/OpenXML checks recorded in project history.
- Dexie migrations and backup compatibility are implemented through version 6.
- No v1.0 desktop-shell, installer, upgrade, automatic-backup, reminder, or desktop shortcut validation has occurred yet.
- No GitHub Actions workflow currently provides independent CI evidence for the baseline.

## Known Risks Entering v1.0

- Browser-origin storage remains the current persistence model until the desktop foundation proves its final behavior.
- Desktop shell selection is not yet evidence-backed for this application.
- Final user-data location, installer behavior, upgrade retention, OS notification behavior, and automatic-backup policy are not yet validated.
- Large multi-year history performance and full release-level accessibility remain to be hardened later.
- The production build still has the previously recorded large-chunk advisory.

## Next Engineering Objective

Start **Milestone 8: Desktop Foundation and CI Guardrails** only after this documentation reset is merged.

Milestone 8 must not begin broad feature expansion. Its job is to establish the desktop execution boundary, preserve the v0.7 data contract, and create proportionate GitHub-hosted verification.

## Repository State

- Branch: `main`
- Current application version: `0.7.0`
- Current Dexie schema and backup format: `v6`
- Current implementation baseline: Milestone 7.1
- v1.0 product scope: approved
- v1.0 implementation: not started
- Feature Freeze: inactive
