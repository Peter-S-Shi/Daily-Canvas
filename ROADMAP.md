# Daily Canvas Milestone Roadmap

Daily Canvas is developed through outcome-based milestones. A milestone is complete only when its user-facing outcome, engineering safeguards, documentation, migration path, and validation criteria are all satisfied.

This roadmap is intentionally architectural rather than procedural. It defines what each milestone must accomplish and what it must not accidentally become. Detailed implementation choices should remain with the codebase and the Codex development session unless a decision affects product semantics, privacy, data compatibility, or future extension boundaries.

## Product Direction

Daily Canvas is evolving from a local task-and-habit tracker into a private personal rhythm, action, and reflection system.

The product should help a user:

1. decide what matters across several life areas;
2. act through fixed, flexible, and quota-based plans;
3. record outcomes and subjective experience without turning daily use into paperwork;
4. understand longer-term patterns through calendars, structured statistics, and plain-language summaries;
5. preserve ownership of private data through a local-first architecture.

The intended progression is:

```text
Flexible Planning
        ↓
Structured Reflection
        ↓
Human-Friendly Insights
```

## Cross-Cutting Principles

Every milestone must preserve the following principles:

- **Local-first remains the default.** Core product data stays on the user's device unless a later milestone explicitly introduces an opt-in alternative.
- **Existing history must survive upgrades.** Schema changes require explicit migrations and backup-version compatibility.
- **Domain rules must not live only in UI components.** Scheduling, quota evaluation, statistics, reflection, and backup behavior belong in reusable application services.
- **Missing data is not success.** This remains especially important for avoidance habits, quota goals, and emotional or experience records.
- **Statistics must not overclaim.** The product may describe patterns and correlations, but it must not present simple data as diagnosis, causation, or predictive certainty.
- **Reflection must remain optional and compassionate.** No prompt, questionnaire, streak, or recovery flow should shame the user.
- **Color is never the only carrier of meaning.** Labels, shapes, icons, and accessible text must remain available.
- **Milestones should add coherent capabilities, not isolated widgets.**

---

## Milestone 1: Daily Canvas v0.1 Foundation — Completed

**Goal:** Establish a usable, private, local-first foundation for daily tasks, habits, reflection, and calendar tracking.

**Delivered:**

- One-time tasks, positive habits, and habits to avoid.
- Daily, selected-weekday, and every-N-days schedules with optional end dates.
- Categories, colors, stars, archiving, deletion, and per-day drag-and-drop ordering.
- Explicit check-in semantics for completed, safe, lapsed, skipped, and unrecorded days.
- Monthly calendar, editable historical check-ins, per-task heatmap, current streak, personal best, and completion rate.
- Daily journal entries.
- Date-based and streak-based rewards.
- English-first interface with a complete Chinese interface, themes, reduced motion, and a local background image.
- IndexedDB persistence, JSON backup and restore, privacy-oriented ignore rules, bilingual documentation, tests, production builds, and a Windows launcher.

**Completion evidence:** The application builds successfully, its core tests pass, the local launcher opens a working browser experience, and the source is synchronized to the private GitHub repository.

---

## Milestone 2: Daily Canvas v0.2 Trustworthy Daily Core — Completed

**Goal:** Make the existing daily workflow and data layer dependable enough for long-term personal use before expanding the product model.

**Delivered scope:**

- Introduce application services for tasks, check-ins, schedules, statistics, settings, and backups so UI components no longer own business rules.
- Add explicit Dexie database migrations and versioned backup migrations.
- Validate imports before replacing data, show a restoration summary, and create a safety backup before destructive restore.
- Add an application error boundary, database initialization recovery, visible save states, and actionable failure messages.
- Expand recurrence, timezone, date-boundary, avoidance, skipped-day, milestone, archive, and backup tests.
- Respect the configured first day of the week throughout all date and calendar calculations.
- Replace the dense task form with a progressive creation flow and optional advanced settings.
- Add first-run onboarding, editable starter examples, and clear empty states.
- Add automated browser smoke coverage for launch, task creation, check-in, history editing, backup, restoration, and language switching.
- Establish clean extension seams for future Areas, flexible schedules, quota evaluation, reflection records, and insight generation without implementing those full feature sets prematurely.

**Exit criteria:**

- No silent blank-screen failure.
- Existing data survives schema and backup-format upgrades.
- Core date rules have boundary coverage.
- A new user can create and complete a habit without instruction.
- Later milestones can extend domain entities through services and migrations rather than rewriting page components.

**Not included:** Mainlines/Areas, floating tasks, quota goals, emotion tracking, experience questionnaires, advanced insights, cloud accounts, cross-device sync, or public deployment.

**Completion evidence:** Dexie and backup migrations are versioned and tested; imports are previewed before a transactional restore and current data is exported first; first-run and failure recovery screens replace silent loading; task creation is progressive; calendar layout follows the week-start setting; and an automated browser-like smoke test covers launch, creation, check-in, history editing, backup/restore, and language switching. Type checking, 14 automated tests, production build, and a live local-browser smoke pass succeeded.

---

## Milestone 3: Daily Canvas v0.3 Flexible Planning and Mainlines — Completed

**Goal:** Support real-life plans that do not always belong to a predetermined date, while organizing daily action around meaningful life areas.

**Delivered scope:**

### Mainlines / Areas

- Replace the current free-text category concept with a first-class `Area` model.
- Migrate existing category values into Areas without losing task history.
- Allow tasks and habits to belong to one optional Area such as French, Job Search, Piano, Health, or Personal Administration.
- Give each Area a name, color, icon, sort order, and archive state.
- Let tasks inherit an Area color while allowing an explicit task-level override.
- Group and filter the Today, Tasks, Calendar, and later Insights views by Area.

### Flexible Schedule Model

- Preserve existing fixed schedule behavior for once, daily, selected weekdays, and every-N-days recurrence.
- Add **Floating Tasks** for one-time work that has no predetermined completion date.
- Add **Quota Goals** for requirements such as “once per week” or “four times per month.”
- Model weekly and monthly quota periods explicitly rather than pretending every day is a scheduled day.
- Show clear progress such as `0 / 1 this week` or `2 / 4 this month`.
- Evaluate quota success only when enough of the period has elapsed to make the result meaningful.
- Define period-based streaks for quota goals, such as consecutive successful weeks or months.
- Preserve the existing deterministic one-check-in-per-task-per-date rule for this release.

### Daily Workflow

- Present fixed scheduled items and relevant quota progress without making the Today view feel crowded.
- Keep Floating Tasks in a dedicated discoverable list where they can be completed without converting them into fixed schedules.
- Keep drag-and-drop ordering compatible with Area grouping and mixed schedule types.
- Provide clear wording for due, available, completed, skipped, partial quota, and expired states.

### Statistics Semantics

- Separate daily completion statistics from quota-period success statistics.
- Ensure an unchosen floating task is not counted as a daily failure.
- Ensure quota goals are not penalized on individual dates before their period closes.
- Add tests for week boundaries, month boundaries, first-day-of-week settings, leap dates, and timezone transitions.

**Exit criteria:**

- A user can represent “eat vegetarian once this week” and “go to the gym four times this month” without choosing dates in advance.
- A user can organize daily work under several Areas and understand each Area through consistent colors and labels.
- Fixed, floating, and quota-based plans produce correct and distinct completion semantics.
- Existing Milestone 1 tasks and check-ins remain valid after migration.

**Not included:** Unlimited nested subtasks, project-management dependencies, kanban boards, team collaboration, or arbitrary multi-level task trees.

**Completion evidence:** The v2-to-v3 Dexie migration converts unique categories into editable Areas, preserves task and history identities, and converts recurrence into the fixed schedule union. Dedicated services implement Area color resolution, Floating Task availability and overdue semantics, weekly/monthly quota periods, progress, outcomes, and period streaks. Backup format v3 migrates supported older exports. Today, Floating Tasks, Tasks, Calendar, history, and statistics distinguish schedule modes. Type checking, 21 automated tests, production build, and a live local-browser smoke check passed.

---

## Milestone 4: Daily Canvas v0.4 Reflection and Personalization — Completed

**Goal:** Turn daily notes and habit check-ins into a lightweight, warm, and structured reflection practice without increasing daily friction.

**Delivered scope:**

### Daily Reflection

- Evolve the existing one-note-per-day journal into a `DailyReflection`.
- Allow several emotion selections per day.
- Provide reusable built-in emotion labels and user-created emotion labels.
- Support an optional intensity value and a short free-text reflection.
- Preserve all existing journal text during migration.
- Keep reflection optional; an empty day must never be treated as a negative outcome.

### Warm Reflection Prompts

- Provide bilingual, locally stored prompt templates that invite self-expression without diagnosing, pressuring, or forcing positivity.
- Use a persisted shuffle-bag strategy so prompts do not repeat until the current prompt set has been exhausted.
- Allow prompts to be skipped or disabled.
- Record the prompt identifier used for a reflection so later review remains understandable.

### Habit Experience Micro-Reflection

- After a task or habit check-in, optionally ask one brief question rather than opening a mandatory form.
- Support a compact comparison such as easier, similar, or harder than the previous recorded experience.
- Support optional effort and, for avoidance habits, urge-intensity ratings.
- Support an optional short note about what helped or what made the action difficult.
- Compare with the previous relevant record, not automatically with yesterday.

### Background and Visual Personalization

- Extend the existing global background feature into a limited set of supported background slots such as App, Today, Calendar, and Reflection.
- Keep imported images local.
- Add controls for overlay strength, positioning, fit, and readability.
- Protect contrast and interaction clarity regardless of the selected image.
- Leave Area-specific backgrounds as an optional extension if the base slot system proves useful.

**Exit criteria:**

- A user can record emotions and a short daily reflection in less than a minute.
- A user can optionally add structured experience data after a habit check-in without being blocked from completing the check-in.
- Prompt rotation avoids immediate repetition and remains fully local.
- Existing journal entries and the current background survive migration.
- Reflection and appearance features remain usable with keyboard navigation, reduced motion, and high-contrast needs.

**Not included:** Mental-health diagnosis, clinical screening, mandatory mood scoring, AI therapy, or remote image storage.

**Completion evidence:** Existing journals migrate without text changes into one editable `DailyReflection` per date, and the prior app background becomes a local appearance asset. Built-in and custom emotions, optional persisted prompt rotation, separate Experience Logs, and App/Today/Calendar/Reflection background slots are implemented through reusable services. Backup format v4 migrates all supported older versions and includes every Milestone 4 entity. Type checking, 27 automated tests, and a production build passed; the English and Chinese critical reflection flow is covered by browser-like automation.

---

## Milestone 5: Daily Canvas v0.5 Calendar and Human-Friendly Reviews — Completed

**Goal:** Help the user clearly understand what they completed during a user-selected period, with Calendar as the inspectable evidence surface.

**Delivered scope:**

### Calendar

- Add a clear legend for complete, partial, missed, skipped, safe, lapsed, quota-progress, and unrecorded states.
- Separate aggregate calendar mode from single-task and single-Area history modes.
- Add a date-detail drawer for check-ins, quota progress, experience notes, daily reflections, edits, and later backfills.
- Add task, Area, schedule-type, and record-type filters.
- Keep a focused monthly evidence grid with direct multi-year month navigation; arbitrary week, month, quarter, year, and custom periods are handled by the shared Review range model.
- Use labels, shapes, and patterns in addition to color.
- Improve keyboard navigation, touch interaction, performance, and multi-year queries.

### Structured Reviews

- Add weekly, monthly, and first-class custom-range reviews for task completion, quota achievement, Area distribution, experience records, reflections, and recorded emotions.
- Distinguish facts from interpretation.
- Show sample size and missing-data context when a conclusion would otherwise look stronger than the underlying evidence.
- Allow the user to move from a summary statement to the underlying dates and records.

### Plain-Language Review Engine

- Build insights from deterministic local statistics and rule-based templates.
- Generate concise, pleasant, bilingual summaries rather than presenting only technical dashboards.
- Center summaries on what was completed, using calm factual language without recommendations or next-step prescriptions.
- Describe associations cautiously and never present correlation as causation.
- Avoid mental-health diagnosis, personality labeling, or predictive coaching.
- Keep AI or LLM rewriting outside the default engine. Any future AI-assisted language layer must be explicit, optional, privacy-reviewed, and unable to alter the underlying facts.

**Exit criteria:**

- A user can understand any calendar cell without guessing.
- A user can review a week or month in one place and inspect the records behind each summary.
- Plain-language summaries remain grounded in reproducible structured facts.
- The experience remains useful even for users who dislike dense charts or professional analytics terminology.
- Several years of records remain responsive.

**Not included:** Claims of causation, clinical interpretation, automated life decisions, or opaque AI-generated conclusions.

**Completion evidence:** Arbitrary inclusive ranges and Monday/Sunday week presets feed a deterministic `reviewService` that separates fixed completions, Floating Tasks, Quota credits and period outcomes, Areas, active days, and optional reflection/emotion/experience context. Review statements retain source ids and dates for Calendar drill-down and suppress weak emotion or Area claims. Calendar supplies aggregate, single-task, and single-Area modes; filters; a color-independent legend; keyboard navigation; and a source-record detail surface. Application version is v0.5.0; Dexie and backup format remain at v4 because reviews are derived.

---

## Milestone 6: Daily Canvas v0.6 Habit Lifecycle and Rewards — Completed

**Goal:** Support the full lifecycle of starting, building, maintaining, pausing, recovering, and completing a habit.

**Delivered scope:**

- Model lifecycle states such as starting, building, milestone reached, maintenance, paused, completed, and archived.
- Replace silent disappearance after a target with a milestone-completion decision.
- Offer continue, switch to maintenance, extend the target, complete, or archive actions.
- Add pause, vacation, and planned-break handling without corrupting statistics.
- Add a compassionate lapse-recovery flow that preserves previous progress and personal bests.
- Move rewards closer to task milestones and add restrained, reduced-motion-aware celebrations.
- Add a milestone timeline.
- Reuse Experience Logs and Daily Reflections for structured notes about what helped, what became easier, and what remained difficult.
- Support lifecycle behavior for both daily habits and quota goals.

**Exit criteria:**

- Reaching or missing a milestone always leads to a clear next action.
- No lifecycle transition deletes valid history.
- A lapse or difficult period can be acknowledged without resetting the user's entire identity or previous progress.
- Rewards support motivation without becoming a separate points economy.

**Not included:** Competitive leaderboards, punitive streak mechanics, public social comparison, or gambling-like reward systems.

**Completion evidence:** Dexie and backup format v5 add one lifecycle profile per supported task, neutral pause periods, and append-only milestone events while preserving v1–v4 data. Reaching fixed-habit or Quota milestones opens a restrained bilingual celebration followed by continue, maintenance, extend, complete, or archive choices. Planned breaks and vacations freeze streak calculations; retroactive pauses take effect no earlier than their creation date and cannot repair earlier misses. Personal best is monotonic, interruption recovery retains cumulative facts and history, Calendar shows pause evidence, and eligible task rewards appear beside milestone choices.

---

## Milestone 7: Daily Canvas v0.7 Installable Experience and Reminders

**Goal:** Make Daily Canvas convenient to open and useful at the right time while preserving local-first privacy.

**Planned scope:**

- Add Progressive Web App installation and an offline application shell.
- Add opt-in local reminders derived from schedule, quota, milestone, and lifecycle services.
- Add quiet hours, reminder dismissal, permission education, and notification health checks.
- Support gentle quota-progress reminders near the end of a week or month without treating them as failure notices.
- Add update availability, safe refresh, and offline/online status feedback.
- Add scheduled backup reminders and a lightweight backup-health indicator.
- Polish desktop, tablet, and mobile layouts and startup performance.

**Exit criteria:**

- The application can be installed, reopened offline, updated safely, and deliver only user-approved reminders.
- Reminder behavior is consistent with fixed, floating, quota, pause, and lifecycle semantics.
- No product data is sent to a server for local reminders.

**Not included:** Mandatory accounts or remote push-notification infrastructure.

---

## Milestone 8: Daily Canvas v1.0 Stable Local-First Release

**Goal:** Produce a polished, documented, accessible release that can be trusted as a durable personal planning and reflection system.

**Planned scope:**

- Complete accessibility review for keyboard use, screen readers, contrast, color independence, touch targets, and reduced motion.
- Complete performance review for multi-year histories, larger task collections, emotion records, experience logs, and local image assets.
- Add end-to-end coverage for daily action, quota evaluation, calendar review, reflection, backup, restore, migration, reminders, and milestone journeys.
- Finalize onboarding, empty states, recovery flows, release documentation, and data-ownership explanations.
- Define compatibility, upgrade, support, and release-checklist policies.
- Resolve all release-blocking defects discovered during an extended real-use trial.

**Exit criteria:**

- All release checks pass.
- Privacy boundaries are documented.
- Upgrade and restore paths are verified.
- No critical workflow depends on developer tooling.
- A user can understand how planning, tracking, reflection, insights, and data ownership fit together.

---

## Milestone 9: Optional Private Sync and Accounts — Not Scheduled

**Goal:** Add cross-device continuity only if sustained use demonstrates that it is worth the security and operational complexity.

**Possible scope:**

- Explicitly opt-in accounts and encrypted synchronization.
- Offline-first conflict resolution with deterministic check-in identities.
- Device management, export, account deletion, and complete remote-data deletion.
- A documented privacy model, retention policy, and recovery strategy.
- Clear handling for local images, reflection records, emotions, and experience logs.

**Entry criteria:**

- The local-first v1.0 product is stable.
- The need is validated through real use.
- Encryption, conflict resolution, ownership, operating cost, and deletion semantics have been reviewed before implementation.

This milestone is intentionally optional. Local-only use remains a fully supported product mode even if sync is added later.
