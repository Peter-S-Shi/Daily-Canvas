# Daily Canvas Milestone Roadmap

Daily Canvas is developed through outcome-based milestones. A milestone is complete only when its user-facing outcome, engineering safeguards, documentation, migration path, and validation criteria are satisfied.

This roadmap records the **approved v1.0 desktop program** as of 2026-09-21. It supersedes the former plan that moved directly from Milestone 7 to browser-oriented Product Hardening and a browser/launcher v1.0 candidate.

The completed Milestones 1–7 remain valid engineering history. Only the future release path has been replaced.

## Product Direction

Daily Canvas is a free, account-free, local-first personal system for:

```text
Plan
  ↓
Act / Track
  ↓
Reflect
  ↓
Review
  ↓
Preserve
```

The existing product is already strong in habit semantics, lifecycle, reflection, review, and personal preservation. The v1.0 expansion therefore concentrates on the weaker bridge between planning and execution while turning the application into a real desktop product.

## Cross-Cutting Principles

Every milestone must preserve these rules:

- **Local-first is the default and local-only use remains complete.**
- **No account system is required.**
- **Existing history must survive upgrades.** Schema and backup changes require versioned migration and validation.
- **Domain rules stay outside React components.** UI renders and delegates; services own semantics.
- **Missing data is not success.** This remains especially important for avoidance habits, quota goals, reflection, and experience records.
- **Reflection remains optional and non-diagnostic.**
- **Statistics remain traceable and cautious.** No causal, predictive, or clinical overclaiming.
- **Color is never the sole carrier of meaning.**
- **Optional structure must remain optional.** Timeline and Time Blocking must not punish users who prefer flexible planning.
- **Milestones add coherent capability, not isolated feature clutter.**
- **The v1.0 desktop migration must not become a database rewrite without evidence.**

---

# Completed Baseline

## Milestone 1 — v0.1 Foundation — Completed

Delivered the initial React/TypeScript application, fixed recurrence, task/habit/avoidance semantics, Today, Calendar/history, streaks, rewards, daily journal, bilingual UI, local appearance, IndexedDB persistence, JSON backup/restore, tests, and Windows browser launcher.

## Milestone 2 — v0.2 Trustworthy Daily Core — Completed

Added reusable domain services, explicit Dexie and backup migrations, restore validation and safety backup, startup recovery, onboarding, progressive task creation, week-start correctness, and broader automated coverage.

## Milestone 3 — v0.3 Flexible Planning and Mainlines — Completed

Added first-class Areas, Floating Tasks, weekly/monthly Quota Goals, explicit fixed/floating/quota schedule semantics, quota-period streaks, and compatible v3 migrations/backups.

## Milestone 4 — v0.4 Reflection and Personalization — Completed

Added Daily Reflections, emotions, local prompt rotation, separate Experience Logs, local appearance assets and background slots, and v4 data migration.

## Milestone 5 — v0.5 Calendar and Human-Friendly Reviews — Completed

Added evidence-oriented Calendar modes and filters, arbitrary inclusive review ranges, deterministic local review facts, bilingual plain-language summaries, and drill-down to source dates.

## Milestone 6 / 6.1 — v0.6 Habit Lifecycle and Corrections — Completed

Added lifecycle states, milestone decisions, pause/vacation/recovery semantics, milestone events, preserved personal bests, reward integration, and corrective continuation/resume behavior with v5 migration compatibility.

## Milestone 7 / 7.1 — v0.7 Personal Meditations and Print Collection — Completed

Added independent ordered Meditations, deterministic mixed-language length rules, all/selected export, print/PDF, editable local Word generation, v6 migration/backup support, and print/restore contract corrections.

The detailed historical evidence remains in repository history and `DEVLOG.md`.

---

# v1.0 Approved Scope

## Planning and execution capabilities

The following are approved for v1.0:

- Quick Capture / Inbox.
- Global Search.
- Task Notes.
- One-level Checklist items.
- Richer recurrence rules.
- Task duration estimates.
- Explicit Replan for unfinished work.
- Optional Day / Week Timeline.
- Optional simple Time Blocking on that Timeline.

### Hierarchy boundary

Daily Canvas remains intentionally shallow:

```text
Area
  └── Task
       └── Checklist item
```

Checklist items are local steps, not miniature Tasks. They do not receive independent Area ownership, schedule, quota, streak, lifecycle, reward, reflection history, or recursive children. If a step needs those semantics, it becomes a real Task.

### Timeline boundary

Timeline and Time Blocking are optional planning layers. They must not replace fixed/floating/quota semantics and must not require users to schedule every task to a specific clock time.

External Google/Outlook calendar integration is not part of v1.0.

## Reflection and preservation capabilities

Approved for v1.0:

- Lightweight reusable Reflection Templates.
- On This Day / historical resurfacing.
- Local Reflection / Review export.

Free-form reflection remains first-class. Templates must not turn Reflection into a mandatory questionnaire system.

## Desktop-native and reliability capabilities

Approved for v1.0:

- Automatic rotating local backups.
- Basic local reminders.
- Desktop keyboard shortcuts.
- GitHub Release update awareness.

Update awareness may compare the installed version with stable GitHub Release metadata and open the release page. v1.0 does not silently download, replace, or restart the application to self-update.

---

# Deferred and Rejected Scope

## Post-v1 / Re-evaluate Later

These may be useful later but are intentionally outside v1.0:

- Focus Timer / Pomodoro.
- External calendar integration.
- App Lock / product-managed encryption.
- Quantitative habits with multiple daily units.
- Generic personal metrics such as arbitrary health/self-tracking fields.
- Desktop widgets or tray mini-UI.
- Full automatic self-updater.
- Cross-device/cloud sync, which would require a separate privacy and ownership design.

## Not Planned Product Directions

- Accounts or user-management infrastructure.
- Team collaboration or shared workspaces.
- Recursive project/task trees.
- Social feeds or competitive leaderboards.
- Complex points/levels/virtual-economy gamification.
- Remote AI coach / AI therapist behavior.
- Automated diagnosis or prediction from personal data.
- Mandatory cloud backup.
- PWA-first v1.0 release delivery.

---

# v1.0 Milestone Sequence

## Milestone 8: Desktop Foundation and CI Guardrails — Completed

**Goal:** Prove that the existing v0.7 application can become a reliable desktop product without prematurely rewriting its data model or expanding feature scope.

### Planned scope

- Run a bounded desktop-shell feasibility spike using the existing React/Vite application.
- Evaluate the preferred lightweight shell first and retain a practical fallback if application-specific blockers appear.
- Preserve current service boundaries and Dexie/IndexedDB unless evidence shows a release-blocking limitation.
- Establish desktop adapters for native concerns rather than leaking shell APIs through domain logic.
- Verify packaged-app startup, restart persistence, current v6 data access, backup/restore, appearance assets, Meditation print/PDF/Word paths, and clean failure handling.
- Define the desktop user-data boundary and confirm that uninstall/reinstall/upgrade behavior can be made predictable.
- Establish short-lived milestone branches and PR-based integration.
- Add risk-scaled GitHub Actions.

### CI policy

The CI topology should scale with change risk rather than run the same expensive workflow for every commit.

```text
Cheap change classification
        ↓
Docs only ───────────────→ stable PR Gate passes without Node install
Core app ────────────────→ typecheck + tests + production build
Data/migration/backup ───→ core + targeted migration/restore regressions
Desktop/packaging ───────→ core + relevant Windows desktop smoke
RC/release ──────────────→ installer + clean install + upgrade + artifact validation
```

Requirements:

- avoid whole-workflow skip patterns that make required-check behavior ambiguous;
- keep a stable final PR Gate while expensive jobs are conditional;
- use concurrency cancellation so obsolete runs do not consume time;
- do not upload heavy artifacts for ordinary PRs unless they are needed for inspection;
- documentation-only macro edits must not install the full JavaScript toolchain merely to pass CI.

### Exit criteria

- A desktop shell choice is evidence-backed for Daily Canvas rather than selected by fashion.
- Existing v0.7 user data remains readable and persistent across restart.
- Current backup/restore and Meditation document flows remain functional in the desktop environment or have explicit adapter plans.
- No database rewrite has occurred without a documented blocker and explicit approval.
- GitHub Actions provide proportionate independent verification.
- The next milestone can design the desktop UI against a stable technical boundary.

**Not included:** new v1.0 product features, broad UI redesign, cloud sync, final installer polish, or release-candidate packaging.

### Completion evidence

Delivered in two batches, both merged through PR #2 from branch `m8-desktop-foundation`:

- **M8-A (feasibility spike):** Tauri 2 evaluated and accepted as the thin desktop shell around the unchanged React/Vite application. Dexie/IndexedDB retained; no evidence found to justify a storage rewrite. A narrow desktop-adapter boundary (`src/desktop/desktopAdapter.ts` + three Rust commands: save-file dialog, print surface, data-location info) replaced direct shell-API use, with no filesystem/shell/network capability granted to the web layer. Packaged-app smoke on a first build: 53/53 checks (launch, existing screens, v6 backup restore/export, restart and forced-kill persistence, Meditation print/PDF/Word paths, bilingual operation). Full detail: `desktop-spike/M8A-EVIDENCE.md`.
- **M8-B (foundation consolidation):** froze the desktop identity — identifier `io.github.peter-s-shi.dailycanvas`, packaged origin `https://tauri.localhost` — before installer/persistence evidence made it costly to change. Established risk-scaled GitHub Actions (`.github/workflows/ci.yml`) with a self-tested cheap classifier and a fail-closed `PR Gate`. Windows/MSVC (`x86_64-pc-windows-msvc`, static CRT) proven as the authoritative build, with an automated check that the shipped executable has no unexpected runtime dependency. A current-user NSIS installer answered the foundation's install/upgrade/data-retention questions: 53/53 packaged-app checks and 17/17 installer/upgrade/data-retention checks passed on Windows/MSVC in CI, including a same-identifier upgrade that did not orphan IndexedDB and a silent uninstall/reinstall cycle. Full detail: `desktop-verify/M8B-EVIDENCE.md`.

All five exit criteria above are met. Deferred to later milestones as planned: signing, updater infrastructure, installer branding/polish, and release-candidate packaging (Milestones 14–15); any v1.0 product feature (Milestones 9–13).

---

## Milestone 9: Desktop Information Architecture and UI Blueprint — Completed

**Goal:** Freeze the desktop product structure and visual/interaction contract before broad UI implementation.

### Planned scope

- Re-evaluate navigation and surface responsibilities across Today, Floating, Calendar, Review, Lifecycle, Reflection, Meditations, Tasks, Rewards, Settings, and the approved new capabilities.
- Decide where Inbox, Search, Timeline, Replan, notes, checklist editing, reminders, and desktop utilities belong.
- Produce low-fidelity wireframes.
- Produce Markdown behavior/state specifications.
- Produce HTML visual/interaction blueprints for key surfaces.
- Freeze approved visual snapshots as PDF for stable review reference.
- Use visual design tools for constrained exploration where useful, without allowing them to redefine product semantics or information architecture.

### Exit criteria

- Every major surface has an explicit responsibility.
- New capabilities have a home without bloating the primary navigation.
- The optional Timeline path remains optional.
- Task editing does not become an uncontrolled monolithic form.
- English/Chinese layout, accessibility, keyboard use, reduced motion, and local personalization are represented in the blueprint.
- The blueprint is sufficiently concrete that implementation agents do not need to invent product structure.

**Not included:** broad implementation of the redesigned desktop UI.

### Completion evidence

The frozen artifact set is in `docs/m9-desktop-ui-blueprint/`, integrated through PR #3. It contains the Behavior & State Specification, the HTML Interaction Blueprint, the frozen PDF snapshot, the selected visual reference, and `M9_FROZEN_BLUEPRINT_MANIFEST.md`.

- The exit review found no blocking contradiction with domain governance. Preserved: the seven-destination target navigation; the Fixed / Floating / Quota / Avoidance / Lifecycle / Reflection / Review boundaries; and the Task Schedule / Time Block distinction.
- The M10–M13 staging boundary is explicit in spec §19 and the Resolved Decision Register (D1–D4).
- Three wording errata were reconciled at M10 Human Gate 1, and each file records them: a stale visual-reference filename; §7.5 describing Avoidance Time Block eligibility as open when Decision D2 had frozen it; and the manifest's stale path and "remaining work" text. No product decision changed.

---

## Milestone 10: Desktop UI Migration — Completed

**Goal:** Implement the approved desktop information architecture and visual system while preserving all completed v0.7 behavior.

### Planned scope

- Migrate navigation, shell layout, primary surfaces, dialogs, and responsive desktop behavior to the approved blueprint.
- Preserve current task, schedule, lifecycle, reflection, review, Meditation, reward, backup, and appearance semantics.
- Introduce desktop-appropriate keyboard/focus behavior where it is part of shell usability, without yet implementing the full shortcut feature set.
- Keep the UI implementation downstream of domain services.

### Exit criteria

- All Milestones 1–7 workflows remain reachable and semantically unchanged unless the approved blueprint explicitly changes presentation only.
- No data-model migration is introduced solely for visual redesign.
- The application can proceed to new feature work without another major shell rewrite.

### Completion evidence

Delivered through PR #4 from branch `m10-desktop-ui-migration`, merged into `main` at `2730bbf49e669db8a3022182dd72711ea8540fb7`.

- **M10-A — migration skeleton.** Replaced the flat ten-view navigation with the M9 workspace architecture, declared once in `src/navigation/workspaceModel.ts`. Accepted at Human Gate 1 after architecture review and human inspection of the real Tauri window.
- **M10-B — full UI migration.** Every M10-capable surface followed the blueprint's visual system and composition:
  - shell, Today, Plan (Floating, Calendar), Tasks (read-first master/detail, Areas, Lifecycle, Rewards), Reflect (single-surface Daily Reflection, Meditations), Review, and Settings;
  - the Task Editor and other modals, moved onto a shared accessible dialog;
  - empty states and responsive behavior at 1280×820 and the 900×600 minimum, repairing an HG1-flagged horizontal-scroll defect at the minimum size;
  - a durable local desktop dev launcher (`OPEN_DAILY_CANVAS_DEV.cmd`) so `pnpm desktop:dev` works reliably from a clean machine;
  - reconciliation of three wording-only M9 governance errata (visual-reference path, §7.5/Decision D2 alignment, manifest path and status text) with no product decision changed.
- **Verification.** 72/72 automated tests; full CI on the final PR head and again on the post-merge `main` commit, both green across Classify, Core, Desktop (Windows/MSVC), and PR Gate, including the 54-check packaged-app smoke and the 17-check installer/upgrade smoke.
- **Unchanged.** M11–M13 capabilities are absent rather than stubbed. Domain services, Dexie schema, backup format v6, and the Tauri boundary are unchanged.

All exit criteria above are met.

---

## Milestone 11: Capture and Task Enrichment — Completed

**Goal:** Make it fast to capture work, find history, and add useful task detail without turning Daily Canvas into a recursive project manager.

### Delivered scope

- Quick Capture uses the frozen title-only flow: Save to Inbox, or explicitly open the full Task Editor.
- Inbox persists lightweight unresolved captures separately from Tasks and removes one only after successful Fixed/Floating/Quota triage.
- Local Global Search covers Task titles and notes, Daily Reflections, Meditations, and Areas; unresolved Inbox captures remain excluded and no authoritative index is stored.
- Task-owned Notes, one-level Checklist items, and duration estimates extend Task Detail without independent Task semantics or tracked-time claims.
- Habit/Avoidance recurrence adds every-N-weeks with selected weekdays and monthly day-of-month; short months use their final day. Regular Tasks remain one-time.
- Replan updates the future Task plan and appends a durable event while preserving earlier check-ins and missed/unrecorded history.
- Dexie schema and backup format v7 add Inbox captures and Replan events; v1-v6 restore compatibility is preserved and all new Task fields round-trip through backup.
- The packaged-app smoke now always uses an explicit disposable WebView2 profile, refuses unsafe cleanup of an existing real profile, and verifies that the real profile metadata is unchanged.

### Product rules

- Inbox means “captured but not yet classified”; Floating means “intentionally flexible one-time work.” They are not the same concept.
- Search indexes or derived search structures must not become a second authoritative copy of user data.
- Checklist items remain one level deep.
- Replan must preserve historical truth; it must not rewrite a missed occurrence into a success.

### Exit criteria

- Capture is materially faster than opening the full Task Editor.
- Users can find accumulated Tasks, Reflections, Meditations, and other approved searchable history without weakening privacy.
- New task detail survives backup/migration correctly.
- Current Fixed/Floating/Quota and lifecycle semantics remain intact.

### Completion evidence
 
- 86/86 automated tests across 15 suites, including focused recurrence, Inbox triage, Search exclusion, forward-only Replan with gap semantics and anchor transition, active start tracking, schema migration, and complete v7 backup/restore coverage.
- TypeScript checking and production build pass; the existing large-chunk advisory remains unchanged.
- Windows/MSVC Tauri build passes. The isolated packaged-app smoke passes 58/58 checks, and installer/upgrade smoke passes 17/17 checks, including every M11 destination, v7 restore/export, bilingual operation, restart and forced-kill durability, and proof that the real Daily Canvas profile was not modified.
- Independent GitHub Actions CI on the merged milestone branch/HEAD confirms all tiers green (Classify, Core, Desktop Windows/MSVC, PR Gate).
- Feature Complete is not reached and Feature Freeze remains inactive; Milestones 12 and 13 plus the explicit Feature Complete Gate are still required.

---

## Milestone 12: Timeline and Optional Execution Planning — Completed

**Goal:** Bridge planning and execution for users who want clock-based structure without forcing time blocking on everyone.

### Delivered scope

- Day Timeline and Week Timeline share one persistent Time Block collection: Day is the precise create/move/edit surface (rendering the full domain-legal 00:00-24:00 range in a bounded, scrollable viewport, never clipping an early-morning/late-night block); Week shows a seven-day distribution and supports cross-day moves. Neither expands into a full calendar app.
- Available Work is a planning source list derived from existing Fixed/Floating/Quota Task data (never a second authoritative task store); completed, archived, and paused items never appear, and Avoidance habits are excluded (frozen Decision D2).
- Every Time Block references a real Task, is placed and edited on a 15-minute grid, defaults its duration to `Task.estimatedMinutes` (else 30 minutes), and can never overlap another block on the same date -- a conflict is surfaced for the user to resolve explicitly, never auto-moved.
- Deleting a Time Block never deletes its Task; a block ending is not an automatic Task completion; moving/resizing/re-reminding a block never changes the Task's recurrence, quota, or schedule.
- Drag-and-drop is an optional convenience (move within Day, move across days in Week); every block also has a fully keyboard-accessible Date/Start time/Duration/Reminder dialog, which is the only path required to use the feature.
- Replan never silently moves or deletes a Task's existing future Time Blocks; if a block no longer fits the new plan it is flagged `needsReview` for the user to adjust, preserving historical truth.
- Today shows an optional, lightweight "Today's Plan" summary only when Time Blocks exist for the day; it disappears entirely otherwise, and Today itself remains independently complete.
- Local, in-app-only reminders on the frozen grammar (Off, At start, 5/10/15/30/60 minutes before) belong to a Time Block, not a second recurrence engine; Task Detail can view/edit the reminder on a Task's upcoming blocks. A minimal native notification command (`tauri-plugin-notification`, `notification:default` permission) fires while the app is running, with a restrained, non-repeating startup catch-up for reminders missed while closed. No resident process, tray, or OS task scheduler was added.
- The frozen small shortcut set is live: `Ctrl/Cmd+K` Search (unchanged), `Ctrl/Cmd+Shift+K` Quick Capture, `Ctrl/Cmd+1` Today, `Escape` closes the active dialog. All are guarded against firing while an input, textarea, select, or contenteditable element is focused. Settings -> Shortcuts is a read-only cheat sheet; no shortcut customization was added.
- Dexie schema and backup format move from v7 to v8, adding the `timeBlocks` collection; v1-v7 forward migration, restore validation, and export/restore fidelity are preserved, and every new field round-trips through backup.

### Product rules

- Schedule semantics and Time Blocks are separate concepts.
- A Time Block says when the user plans to act; it does not redefine the task's recurrence or quota rules.
- Users may ignore Timeline entirely.
- Reminders are local and user-controlled.
- External calendar providers are outside this milestone.

### Exit criteria

- Structured users can place work into a day/week plan.
- Flexible users retain the existing Today/Floating/Quota workflow without additional required steps.
- Reminder and shortcut behavior works without an account or backend.

### Completion evidence

- A merge-readiness corrective pass fixed five confirmed seams before merge: Task duration estimates that aren't 15-minute multiples now round onto the grid instead of producing an unsavable default; Day Timeline renders the full 00:00-24:00 domain instead of clipping legitimate early-morning/late-night blocks; editing a block's Date, Start time, or Reminder clears a stale `reminderFiredAt` so a new future reminder is never suppressed; reminder/notification failures are caught inside `reminderService` and structurally isolated from the local-data startup/recovery path; and v8 backup restore now rejects a Time Block that violates the 15-minute grid, day boundary, or same-date overlap invariants rather than silently importing it.
- 114/114 automated tests across 19 suites, including 15-minute-grid and overlap invariants (createTimeBlock and backup restore), Avoidance exclusion, Available Work derivation, Replan `needsReview` flagging without history rewrite, restrained reminder catch-up and failure-isolation semantics, and full v1-v8 schema/backup migration and round-trip coverage.
- TypeScript checking and production build pass; the existing large-chunk advisory remains unchanged.
- `cargo check` and a release Windows/MSVC Tauri build (`tauri build --no-bundle`) pass locally with the `tauri-plugin-notification` dependency and its `notification:default` capability declaration.
- Manually verified in a live browser preview: creating and editing a Time Block including a 23:30-24:00 late-night block, overlap rejection, Week mode showing the same block correctly, the Today's Plan summary, Task Detail reminder editing, and the Settings Shortcuts cheat sheet, with zero console errors.
- The corrective implementation commit `9389c0b` passed GitHub Actions run `35820653400` with all tiers green: Classify, Core, Desktop Windows/MSVC (70/70 packaged-app smoke checks -- including the v8 backup restore/export round-trip, the Plan/Timeline Day and Week modes, the Settings/Shortcuts screen, shortcut behavior, and the notification boundary -- and 17/17 installer/upgrade/data-retention smoke checks), and PR Gate.
- Feature Complete is not reached and Feature Freeze remains inactive; Milestone 13 plus the explicit Feature Complete Gate are still required.

> **Superseded by Milestone 14-B (PR #11, PR #28/Issue #20).** The 15-minute-grid Start rule and hard overlap rejection described above were the actual, correct contract **at Milestone 12's completion**. They were later superseded during the Milestone 14-B closeout: Time Block Start is now whole-minute precision with no snapping (matching duration, itself fixed to whole-minute precision by PR #11), and an overlap is a warned `Adjust time` / `Save anyway` choice rather than a rejection, with the Day view grouping genuinely-overlapping saved blocks into an "N tasks overlapping" chip. The 15-minute grid survives only as the Timeline's visual row/layout granularity, not as a storage constraint. This note is historical annotation; it does not rewrite what Milestone 12 actually shipped at the time.

---

## Milestone 13: Reflection, Preservation, and Desktop Utilities — Completed

**Goal:** Strengthen long-term personal value and desktop reliability without turning the product into a cloud journal or self-tracking platform.

### Delivered scope

- Three lightweight Reflection Templates (Free Write, Daily Check-in, Gratitude & Perspective) are optional writing scaffolding selected from Daily Reflection itself; every prompt is skippable, prompt text is never written into the saved `note`, and Free Write (no prompts) remains the default. `DailyReflection.templateId` is optional and additive.
- On This Day is a real destination inside Reflect: a read-only lens over Daily Reflections and Meditations matching the exact month+day from prior years only (never the current year), grouped by year with the most recent year first, each entry offering "Open original" navigation to the real source record. It never modifies or duplicates a source record and produces no growth/emotion/analysis framing.
- Local Reflection and Review export produce deterministic Markdown (`.md`) documents through the existing `saveBlob` desktop-adapter/native-Save-dialog seam; Review export uses the same period/filter selection the Review screen already shows. Neither export mutates source data, and the existing Meditation print/PDF/Word pipeline is untouched.
- Automatic Rotating Backup is enabled by default, runs at most once per local calendar day on successful startup (failure-isolated from the startup/recovery path, exactly like M12 reminders), and is also exposed as "Back up now" in Settings -> Data & Backup, which shows the toggle, last successful backup time, backup location, and the retained history. Backups write to a temp file and atomically rename into place, retain only the most recent 7, and prune only after a new backup is confirmed written. Restoring from a retained automatic backup reuses the exact same parse -> validate/migrate -> preview/warnings -> safety-backup -> confirm -> transactional-restore pipeline as manual import. Four narrow native commands (write/list/read/delete, all `std::fs`, no filesystem plugin) back this; no general-purpose filesystem capability was granted to the web layer.
- GitHub Release update awareness lives only in the new Settings -> About & Updates page: it shows the installed version and checks only on page open or an explicit "Check for updates" click (never on a timer or at startup), through the scoped `tauri-plugin-http` capability restricted to the single `GET /repos/Peter-S-Shi/Daily-Canvas/releases/latest` endpoint. States are Up to date / Update available (with "View Release", via the scoped `tauri-plugin-opener`) / Unable to check; a network failure is non-blocking.
- Dexie schema and backup format move from v8 to v9. No new table was needed for Reflection Templates (`templateId` is an additive optional field); v9 exists to mark the settings default (`autoBackupEnabled`, `lastAutoBackupAt`) and keep the versioned-migration/backup-format pattern intact. v1-v8 forward migration, restore validation, and export/restore fidelity are preserved.

### Product rules

- Historical resurfacing is optional and non-judgmental.
- Export remains local.
- Automatic backup does not replace manual portable export.
- Backup retention and location must be understandable and recoverable.
- Update awareness may retrieve version metadata only; no personal content is sent.
- v1.0 update awareness does not silently download or self-install releases.

### Exit criteria

- A user can recover from ordinary local data-loss scenarios using understandable automatic backup history.
- Reflection/Review material can be preserved locally without remote services.
- Update availability is visible without introducing an account or custom update server.

### Completion evidence

- 146/146 automated TypeScript/Vitest tests across 24 suites, including Reflection Template persistence and free-form primacy, On This Day month/day/year selection and source restriction, deterministic Reflection/Review Markdown export, backup rotation/retention/atomic-write-failure semantics, restore-from-automatic-backup reuse of the manual pipeline, update-check version comparison and network-failure handling, and full v1-v9 schema/backup migration and round-trip coverage; plus 4 Rust unit tests (`src-tauri/src/lib.rs`) scoping the Automatic Backup native `list_auto_backups`/retention/delete commands to the app's own `daily-canvas-auto-backup-*` file-naming namespace.
- TypeScript checking and production build pass; the existing large-chunk advisory remains unchanged.
- `cargo check` and a release Windows/MSVC Tauri build (`tauri build --no-bundle --target x86_64-pc-windows-msvc`) pass with the new `tauri-plugin-http` (scoped to the single GitHub Release endpoint) and `tauri-plugin-opener` dependencies alongside the existing dialog/notification plugins.
- The desktop packaged-app smoke (`desktop-verify/desktop-smoke.mjs`) was extended to exercise, on a disposable synthetic profile: Reflection Template selection/save/`templateId` round-trip and its Markdown export; On This Day as a real destination against two seeded historical records (1 and 2 years before the real run date) with year grouping and "Open original" navigation; Review Markdown export; Automatic Backup's native write/list/delete commands end to end, including 7-backup retention pruning, a sentinel non-namespaced `.json` file placed directly in the real backup directory that survives every cycle untouched and never appears in the backup history, and a full restore-from-automatic-backup through the shared restore pipeline; and About & Updates rendering one of its three defined states without blocking startup.
- A post-merge-readiness corrective pass fixed three confirmed seams: On This Day derived a Meditation's calendar day from a UTC ISO-string slice instead of the app's local-calendar-day convention (misfiling evening entries into the next local day); the native `list_auto_backups` command returned every `.json` file in the backup directory rather than only ones this app wrote (so retention pruning could delete unrelated files); and Reflection/Review Markdown export wrote an internal i18n key (e.g. `template_dailyCheckin`) or a raw internal id (`areaId`/`taskId`) into user-facing exported files instead of a resolved, human-readable name, now omitting the line entirely when a name cannot be resolved.

All exit criteria above are met.

> **Superseded by Milestone 14-B (PR #28, Issue #15).** The update-check states described above (Up to date / Update available / Unable to check, with a 404-no-Release response collapsed into the same "Unable to check" state as a real network failure) were the actual contract **at Milestone 13's completion**. This was later superseded: the check now distinguishes a 404/no-published-Release state ("No published release is available yet") from a genuine network/timeout/DNS failure and from any other check failure, so a repository with no published Release is never described as a network problem. This note is historical annotation; it does not rewrite what Milestone 13 actually shipped at the time.

---

# Feature Complete Gate

**Status: accepted.** Milestones 8–13 are implemented, and the v1.0 Feature Complete Gate was explicitly accepted at the start of Milestone 14. This acceptance is recorded here and in `PROJECT_STATUS.md`.

The v1.0 program becomes feature-complete only when Milestones 8–13 are implemented and explicitly accepted.

The gate requires:

- every approved v1.0 feature is present or explicitly removed from scope by recorded decision;
- all Milestones 1–7 capabilities still satisfy their product contracts;
- desktop persistence and native adapters are stable enough for hardening;
- migrations/backups cover the actual v1.0 data model;
- UI blueprint and implementation agree materially;
- documentation describes the post-merge product accurately;
- no known missing capability prevents the v1.0 release promise.

Feature Complete does not mean Release Ready.

# Feature Freeze Policy

**Status: active**, since the v1.0 Feature Complete Gate above was accepted. Milestone 14 was executed entirely under this policy: it added no new features and fixed only release-blocking and hardening-class defects.

Feature Freeze begins only after the v1.0 Feature Complete Gate is explicitly accepted and recorded in both `ROADMAP.md` and `PROJECT_STATUS.md`.

During freeze:

- release-blocking defects must be fixed;
- data-integrity, privacy, security, migration, backup, desktop-persistence, and core-workflow defects must be fixed;
- severe accessibility or UX failures in promised workflows must be fixed;
- nonessential new functionality moves to later-version planning;
- reopening product scope requires an explicit recorded decision.

---

## Milestone 14: Product Hardening and Full Regression — Completed

**Goal:** Converge the complete desktop v1.0 system on release-level correctness, resilience, accessibility, privacy, performance, and evidence.

### Planned scope

- Audit the complete v1.0 promise against implementation and documentation.
- Exercise all supported migrations and backup/restore paths.
- Test large histories and representative local assets.
- Verify accessibility, keyboard navigation, focus behavior, contrast, color independence, and reduced motion.
- Verify desktop persistence, automatic backups, reminders, shortcuts, local exports, update awareness, and failure recovery.
- Run the complete automated suite and production/desktop builds.
- Execute the defined manual acceptance journeys across all major product surfaces.

### Exit criteria

- No known release blocker remains.
- No known high-risk data-integrity, privacy, security, migration, backup, or desktop-persistence defect remains.
- Automated checks pass.
- Every defined core journey passes manual acceptance.
- Critical fixes have regression coverage or a repeatable documented verification procedure.
- Deferred issues are recorded.
- README files, `ROADMAP.md`, `PROJECT_STATUS.md`, `ARCHITECTURE.md`, and release notes agree.

### Completion evidence

- A systematic audit against a release-hardening evidence matrix (built from `ROADMAP.md`'s exit criteria, `PROJECT_STATUS.md`'s Known Risks, `ARCHITECTURE.md`'s testing boundaries, and every M1–M13 promised capability) covered v1–v9 migration/backup/restore, large multi-year histories, all major workspace journeys, the 900×600 minimum, English/Chinese bilingual coverage, keyboard-only journeys, focus trap/return, screen-reader semantics, color independence, reduced motion, Timeline/Reminder/Shortcuts, automatic and manual backup/restore, Meditation/Reflection/Review export, On This Day, update-awareness offline behavior, restart/forced-kill persistence, native-adapter failure isolation, the CSP/privacy/network boundary, and installer/upgrade/uninstall expectations.
- Two confirmed data-integrity release blockers were found and fixed with regression coverage: `deleteTask` left a deleted task's `experienceLogs` and `rewards` rows behind indefinitely (a streak-triggered Reward became permanently, invisibly unlockable-never), and backup restore never filtered `rewards` referencing a task missing from the restored set, letting the same dead-reference state re-enter through import. Neither changes the v9 schema/backup format.
- The known path-based CI routing gap (`PROJECT_STATUS.md`, "Known Risks") is closed: `.github/scripts/classify.sh` now fails closed for `src/` — only an explicit allowlist of non-visual, pure-logic paths stays core-only, and every other `src/` path (components, navigation, the app shell, i18n, global styles, anything unanticipated) also selects the desktop tier, so a UI-reshaping change can no longer silently skip packaged-app/installer evidence the way M10-A's navigation rewrite once did. The classifier self-test was extended to lock this in.
- A full accessibility and color-independence sweep (Dialog focus trap/return, reduced-motion honoring, icon-button labeling, and every status/lifecycle/streak/area indicator across Today, Floating, Task Detail, Rewards, Calendar, Review, Areas, Task Picker, and Timeline) found the existing implementation already correct against the frozen spec; no defect required a fix.
- Large-history performance was measured against a defined synthetic scale (6 years/2,190 days, ~36 tasks, ~11,900 check-ins, 2,190 daily reflections, 400 meditations, ~2,400 experience logs) run directly through the real service functions: Review's full-range model built in ~102 ms (a normal month-sized range in ~2.8 ms), Available Work in ~1.1 ms/day, per-task streak stats in ~92 ms across all fixed habits over the full range, and On This Day in ~1.5 ms — no O(n²) pattern or release-level stall was found; no performance fix was required.
- Deferred, non-blocking: DST-transition scheduling has no dedicated regression test (inherent to JS local-`Date` semantics, not an app defect); no code signing yet; NSIS uninstall does not offer to delete user data (open product decision, not a defect); only a single Windows runner image and a per-user install are exercised; the recorded large-chunk build advisory is unchanged. None of these block Feature Complete or Feature Freeze.
- 148/148 automated TypeScript/Vitest tests across 25 suites (up from 146/24 at Milestone 13), including new coverage for the `deleteTask`/restore orphan-cleanup fixes and an extended classifier self-test; 4 Rust unit tests (`src-tauri/src/lib.rs`, unchanged from Milestone 13's namespace-scoping coverage) continue to pass; TypeScript checking and the production build pass, with the existing large-chunk advisory unchanged.
- No known release blocker remains. The v1.0 Feature Complete Gate is accepted and Feature Freeze is active (see "Feature Complete Gate" and "Feature Freeze Policy" above).

### Milestone 14-B: Human Using Experience Review and blocker/hardening closeout — Completed

A Human Using Experience Review exercised the packaged desktop application as a real user would, in addition to the code-driven M14-A audit above, and surfaced further blockers and hardening gaps merged into `main` through four PRs:

- **PR #11** fixed a Time Block blocker: duration was forced onto the 15-minute grid, so an intended 1-minute-precision duration could not be saved. Duration is now whole-minute precision with no snapping.
- **PR #26** repaired a Meditations blocker: Select All/Clear All did not behave correctly and print pagination was broken.
- **PR #27 ("H1: Daily Work UX hardening")** added Tasks bulk organization, Areas drill-down, type-aware state grammar, local Notes/Checklist editing, and Today↔Floating discoverability.
- **PR #28 ("H2: final v1 hardening")** corrected Quota Review retrospective correctness (Issue #14), distinguished a GitHub Release 404 (no published Release) from a genuine network failure (Issue #15), hardened Timeline UX (Issue #20: Time Block Start became whole-minute precision with no snapping, matching PR #11's duration fix, plus Day-view overlap grouping), changed Time Block overlap from a hard rejection to an explicit warned choice (Issue #21), added the Light Theme sidebar (Issue #22), and made Meditation export language-agnostic (Issue #23).
- Final human acceptance was given after PR #28 merged. The authoritative Time Block contract is now: Start and Duration are both whole-minute precision, stored with no 15-minute snapping (the Timeline view keeps a 15-minute grid purely as a visual/layout detail, `TimelineView.tsx`'s `ROW_MINUTES`); an overlapping save is a warned, explicit `Adjust time` / `Save anyway` choice, never a silent rejection, and `Save anyway` never mutates the other block; the Day view groups genuinely-overlapping saved blocks into a clickable "N tasks overlapping" chip instead of rendering them stacked and occluding each other.
- **Diagnostic fact:** a manual `workflow_dispatch` CI run on `main` at `f8bf7e48e39bd9184c98395aa8927d8c3f7bd8ce` (run `36072432474`) failed Core/PR Gate. The sole cause was one stale test in `src/services/backupService.test.ts` still asserting the superseded 15-minute-grid Start rejection rule against the now-final whole-minute contract -- not a production defect; `migrateBackup`'s validation already implemented the correct whole-minute contract via `validateTimeBlockInput`. The `milestone/14b-closeout-docs-and-ci-fix` closeout PR fixes that one test and synchronizes this document and the other macro docs to the state described above.

---

## Milestone 15: Daily Canvas v1.0.0 Release Candidate and Delivery

**Goal:** Produce, verify, and release the first accepted desktop v1.0.0 candidate.

### Planned scope

- Build the final desktop artifact and installer for the supported release environment.
- Verify clean install, first run, normal restart, uninstall/reinstall expectations, and upgrade from representative prior desktop candidates where applicable.
- Verify import of supported browser-era backups into the desktop release.
- Verify automatic backup and manual restore on a clean environment.
- Verify Meditation, Reflection, and Review local export paths.
- Verify local reminders and keyboard shortcuts in the packaged application.
- Verify GitHub Release update awareness against release metadata.
- Finalize release notes, known limitations, privacy/data-ownership explanation, and end-user documentation.
- Confirm package version, UI version, docs, schema version, backup version, repository commit, tag, and published artifact all identify the same accepted candidate.

### Exit criteria

- All RC checks pass with recorded evidence.
- No release blocker remains open.
- The candidate can start, preserve data, export, restore, upgrade safely within the supported contract, and perform every promised v1.0 workflow without developer tooling.
- Release documentation and repository state identify the same accepted candidate.

Any release-blocking finding returns the project to Milestone 14 hardening. A new candidate must be produced after the fix.

---

# After v1.0.0

The accepted v1.0.0 scope becomes the maintenance baseline. Bug fixes should preserve it. New capability requires explicit later-version planning rather than silently reopening the completed release.
