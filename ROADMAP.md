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

## Milestone 8: Desktop Foundation and CI Guardrails

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

---

## Milestone 9: Desktop Information Architecture and UI Blueprint

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

---

## Milestone 10: Desktop UI Migration

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

---

## Milestone 11: Capture and Task Enrichment

**Goal:** Make it fast to capture work, find history, and add useful task detail without turning Daily Canvas into a recursive project manager.

### Planned scope

- Quick Capture / Inbox with explicit triage into real task semantics.
- Global Search across appropriate local content.
- Task Notes.
- One-level Checklist items.
- Richer recurrence rules.
- Task duration estimates.
- Explicit Replan flow for unfinished work.

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

---

## Milestone 12: Timeline and Optional Execution Planning

**Goal:** Bridge planning and execution for users who want clock-based structure without forcing time blocking on everyone.

### Planned scope

- Day Timeline.
- Week Timeline.
- Optional Time Blocks referencing tasks.
- Task-duration-aware placement.
- Clear rescheduling/replanning interaction.
- Basic local reminders.
- High-value desktop keyboard shortcuts, including quick capture and search.

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

---

## Milestone 13: Reflection, Preservation, and Desktop Utilities

**Goal:** Strengthen long-term personal value and desktop reliability without turning the product into a cloud journal or self-tracking platform.

### Planned scope

- Lightweight Reflection Templates while preserving unrestricted free-form Reflection.
- On This Day / historical resurfacing from appropriate local history.
- Local Reflection / Review export.
- Automatic rotating local backups.
- GitHub Release update awareness.

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

---

# Feature Complete Gate

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

Feature Freeze begins only after the v1.0 Feature Complete Gate is explicitly accepted and recorded in both `ROADMAP.md` and `PROJECT_STATUS.md`.

During freeze:

- release-blocking defects must be fixed;
- data-integrity, privacy, security, migration, backup, desktop-persistence, and core-workflow defects must be fixed;
- severe accessibility or UX failures in promised workflows must be fixed;
- nonessential new functionality moves to later-version planning;
- reopening product scope requires an explicit recorded decision.

---

## Milestone 14: Product Hardening and Full Regression

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
