# Daily Canvas milestone roadmap

Daily Canvas is developed through outcome-based milestones. A milestone is complete only when its user-facing goal, engineering safeguards, documentation, and validation criteria are all satisfied.

## Milestone 1: Daily Canvas v0.1 Foundation — Completed

**Goal:** Establish a usable, private, local-first foundation for daily tasks, habits, reflection, and calendar tracking.

**Delivered:**

- One-time tasks, positive habits, and habits to avoid.
- Daily, selected-weekday, and every-N-days schedules with optional end dates.
- Categories, colors, stars, archiving, deletion, and per-day drag-and-drop ordering.
- Explicit check-in semantics for completed, safe, lapsed, skipped, and unrecorded days.
- Monthly calendar, editable historical check-ins, per-task heatmap, current streak, personal best, and completion rate.
- Daily journal entries limited to 500 characters.
- Date-based and streak-based milestone rewards.
- English-first interface with an existing complete Chinese interface, themes, reduced motion, and local background images.
- IndexedDB persistence, JSON backup and restore, privacy-oriented ignore rules, and bilingual documentation.
- Type checking, core recurrence and streak tests, production builds, and a reliable Windows launcher.

**Completion evidence:** The application builds successfully, its core tests pass, the local launcher opens a working browser experience, and the source is synchronized to the private GitHub repository.

---

## Milestone 2: Daily Canvas v0.2 Trustworthy Daily Core

**Goal:** Make the existing daily workflow dependable enough for long-term personal use before expanding the feature surface.

**Planned scope:**

- Introduce application services for tasks, check-ins, schedules, statistics, and backups so UI components no longer own business rules.
- Add explicit database migrations and versioned backup migrations.
- Validate an import before replacing data, show an import summary, and create a safety backup before restoration.
- Add an application error boundary, database initialization recovery, visible save states, and actionable failure messages.
- Expand recurrence, timezone, date-boundary, avoidance, skipped-day, milestone, archive, and backup tests.
- Respect the configured first day of the week throughout calendar calculations.
- Replace the dense task form with a progressive task-creation flow and optional advanced settings.
- Add first-run onboarding, editable starter templates, and a clear empty-state path.
- Add automated browser smoke coverage for launch, task creation, check-in, history editing, and language switching.

**Exit criteria:** No silent blank-screen failure; existing data survives schema upgrades; core date rules have boundary coverage; a new user can create and complete a habit without instruction.

**Not included:** Cloud accounts, cross-device sync, or public deployment.

---

## Milestone 3: Daily Canvas v0.3 Calendar and Insights

**Goal:** Turn the calendar from a supporting page into the product's primary reflection and progress surface.

**Planned scope:**

- Add a clear legend for complete, partial, missed, skipped, safe, and lapsed states.
- Separate aggregate calendar mode from single-task history mode.
- Add a date-detail drawer with check-ins, notes, edits, and a visible indicator for later backfills.
- Add task and category filters, week/month/quarter/year ranges, and an annual heatmap.
- Add weekly and monthly reviews with completion trends, strongest days, difficult days, and milestone progress.
- Use shapes, labels, and patterns in addition to color for accessible state recognition.
- Improve calendar keyboard navigation, mobile interaction, performance, and large-history queries.

**Exit criteria:** A user can understand any calendar cell without guessing, review a month in one place, and inspect several years of records without degraded responsiveness.

**Not included:** Predictive coaching or claims of causation from simple correlations.

---

## Milestone 4: Daily Canvas v0.4 Habit Lifecycle and Rewards

**Goal:** Support the full lifecycle of building, maintaining, pausing, recovering, and completing a habit.

**Planned scope:**

- Model habit states such as starting, building, milestone reached, maintenance, paused, completed, and archived.
- Replace silent disappearance after a target with a milestone-completion decision.
- Offer continue daily, switch to maintenance, extend the target, complete, or archive actions.
- Add pause, vacation, and planned-break handling without corrupting statistics.
- Add a compassionate lapse-recovery flow that preserves previous progress and personal bests.
- Move rewards closer to task milestones and add restrained, reduced-motion-aware celebrations.
- Add a milestone timeline and structured notes for what helped or made the habit difficult.

**Exit criteria:** Reaching or missing a milestone always leads to a clear next action; no lifecycle transition deletes valid history; rewards support motivation without becoming a separate points economy.

**Not included:** Competitive leaderboards or punitive streak mechanics.

---

## Milestone 5: Daily Canvas v0.5 Installable Experience and Reminders

**Goal:** Make Daily Canvas convenient to open and useful at the right time while preserving local-first privacy.

**Planned scope:**

- Add Progressive Web App installation and an offline application shell.
- Add opt-in local reminders derived from schedule and milestone services.
- Add quiet hours, reminder dismissal, permission education, and notification health checks.
- Add update availability, safe refresh, and offline/online status feedback.
- Add scheduled backup reminders and a lightweight backup-health indicator.
- Polish desktop, tablet, and mobile layouts and startup performance.

**Exit criteria:** The application can be installed, reopened offline, updated safely, and deliver only user-approved reminders without sending product data to a server.

**Not included:** Mandatory accounts or remote push-notification infrastructure.

---

## Milestone 6: Daily Canvas v1.0 Stable Local-First Release

**Goal:** Produce a polished, documented, accessible release that can be trusted as a durable personal tracker.

**Planned scope:**

- Complete accessibility review for keyboard use, screen readers, contrast, color independence, touch targets, and reduced motion.
- Complete performance review for multi-year histories and larger task collections.
- Add end-to-end coverage for the critical daily, calendar, backup, restore, migration, and milestone journeys.
- Finalize onboarding, empty states, recovery flows, release documentation, and data ownership explanations.
- Define compatibility, upgrade, support, and release-checklist policies.
- Resolve all release-blocking defects discovered during an extended real-use trial.

**Exit criteria:** All release checks pass; privacy boundaries are documented; upgrade and restore paths are verified; no critical workflow depends on developer tooling.

---

## Milestone 7: Optional Private Sync and Accounts — Not scheduled

**Goal:** Add cross-device continuity only if sustained use demonstrates that it is worth the security and operational complexity.

**Possible scope:**

- Explicitly opt-in accounts and encrypted synchronization.
- Offline-first conflict resolution with deterministic check-in identities.
- Device management, export, account deletion, and complete remote-data deletion.
- A documented privacy model, retention policy, and recovery strategy.

**Entry criteria:** The local-first v1.0 product is stable, the need is validated, and the encryption, conflict, ownership, and operating-cost design has been reviewed before implementation.

This milestone is intentionally optional. Local-only use remains a supported product mode even if sync is added later.
