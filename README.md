# Daily Canvas

Daily Canvas is a free, account-free, local-first personal planning, habit, reflection, review, and personal-preservation application.

The current codebase is **v0.7.0**, a React/Vite browser-served application backed by Dexie/IndexedDB. Milestones 1–7 are complete. The next approved program is **Daily Canvas v1.0.0**, which will turn the product into a real desktop application while preserving the current local-first data model and expanding the planning-to-execution workflow.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

## Current development state

The former v0.7 Feature Complete Gate was never accepted. Before Feature Freeze, the project deliberately reopened scope and approved a larger v1.0 desktop program.

Completed work remains valid and is not being discarded. The v0.7 application is the engineering baseline for the desktop transition.

See [ROADMAP.md](ROADMAP.md) for the new milestone sequence, [PROJECT_STATUS.md](PROJECT_STATUS.md) for the authoritative current state, and [ARCHITECTURE.md](ARCHITECTURE.md) for preserved and planned boundaries.

## What Daily Canvas already does

### Planning and task semantics

- Create, edit, archive, restore, star, organize, and delete tasks.
- Track ordinary tasks, positive habits, and habits to avoid with distinct completion semantics.
- Use fixed schedules, undated Floating Tasks, and weekly/monthly Quota Goals.
- Organize work under one optional Area / Mainline.
- Reorder Today's work without changing schedule semantics.
- Distinguish completed, safe, lapsed, skipped, and unrecorded days.
- Preserve the rule that missing data is never silently treated as success.

### Habit lifecycle

- Track starting, building, milestone reached, maintenance, paused, completed, and archived lifecycle states.
- Continue, extend, maintain, complete, or archive after a milestone.
- Record planned breaks, vacations, retroactive pauses, and manual resume without deleting history.
- Preserve cumulative completion facts, personal bests, pause evidence, and milestone events.

### Reflection and review

- Write one editable Daily Reflection per date with optional emotions, intensity, prompts, and free-form text.
- Add optional Experience Logs after check-ins without mixing subjective experience with completion truth.
- Review inclusive weekly, monthly, and custom ranges through deterministic local statistics and plain-language bilingual summaries.
- Inspect Calendar evidence behind review statements.
- Avoid diagnostic, causal, or predictive claims.

### Personal preservation

- Keep an independent ordered Meditations / 感悟 collection.
- Export selected or all Meditations using the persisted manual order.
- Print / Save as PDF locally and generate an editable local `.docx`.
- Keep personal writing local.

### Data ownership and personalization

- Store product data locally in Dexie/IndexedDB.
- Export and restore versioned JSON backups with migration and validation.
- Preserve backup compatibility through format v6.
- Keep local appearance assets on-device.
- Switch between English and Chinese, light/dark/system themes, week-start preferences, and reduced motion.

## Approved v1.0 direction

v1.0 keeps the existing product philosophy and expands the missing bridge between planning and execution.

Approved capabilities include:

- Quick Capture / Inbox.
- Global Search.
- Task Notes.
- One-level Checklist items only; no recursive task tree.
- Richer recurrence rules.
- Task duration estimates.
- Explicit replanning of unfinished work.
- Optional Day / Week Timeline.
- Optional simple Time Blocking on that Timeline.
- Automatic rotating local backups.
- Basic local reminders.
- Lightweight Reflection Templates.
- On This Day / historical resurfacing.
- Local Reflection / Review export.
- Desktop keyboard shortcuts.
- GitHub Release update awareness with manual release-page handoff rather than silent self-update.

The Timeline and Time Blocking layer is optional. Users who prefer flexible planning can continue using Today, Floating Tasks, Quota Goals, and Calendar without scheduling every task to a clock time.

## v1.0 product boundaries

Daily Canvas does **not** aim to become:

- an account-driven SaaS product;
- a team or collaboration platform;
- a recursive project-management system;
- a social network or competitive habit leaderboard;
- a clinical mental-health tool or AI therapist;
- a mandatory cloud-sync product;
- a PWA-first release;
- a remote-AI-dependent application.

The intended structural hierarchy remains deliberately shallow:

```text
Area
  └── Task
       └── optional one-level Checklist items
```

If a checklist item needs its own schedule, lifecycle, Area, quota, reward, or history, it should become a real Task rather than another recursive level.

## Desktop transition principles

The desktop program starts with a thin foundation rather than a rewrite.

- Preserve React, TypeScript, Vite, services, and existing domain semantics.
- Preserve Dexie/IndexedDB initially; do not rewrite the database to SQLite without evidence that the desktop spike requires it.
- Evaluate a lightweight desktop shell first, with an alternative retained if the feasibility spike exposes blockers.
- Prove persistence, backup/restore, local document export, and upgrade safety before feature expansion.
- Separate desktop-native adapters such as local files, notifications, and release awareness from domain services.

## UI transition principles

The v1.0 desktop UI will be designed before broad implementation through an explicit blueprint process:

```text
Product semantics
    ↓
Information architecture
    ↓
Wireframes
    ↓
Behavior specification (Markdown)
    ↓
Interactive / visual HTML blueprint
    ↓
Frozen PDF design snapshot
    ↓
Engineering implementation
```

Visual design tools may be used to explore alternatives, but they do not replace the approved information architecture or product semantics.

## Development

Current v0.7 requirements:

- Node.js 20.19 or newer
- pnpm

```bash
pnpm install
pnpm dev
```

Current quality commands:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Desktop shell (Tauri 2, Windows; MSVC is the authoritative build environment, in CI):

```bash
pnpm desktop:build     # release build without an installer
pnpm desktop:bundle    # per-user NSIS installer (test-only versions are supplied by CI)
```

Packaged-app verification lives in `desktop-verify/` (see `desktop-verify/M8B-EVIDENCE.md`). It uses synthetic data only and refuses to wipe an existing user data folder it did not create.

Continuous integration is risk-scaled (`.github/workflows/ci.yml`): documentation-only changes install no toolchains, app changes run typecheck/tests/build, data and backup changes add targeted regression, and shell or CI changes add the Windows/MSVC desktop build and smoke checks. A stable `PR Gate` job summarizes the result. See [ROADMAP.md](ROADMAP.md).

## Privacy model

Core personal data remains local and the application must remain fully usable without an account or cloud service.

The planned update-awareness feature may make a narrow, non-personal request to GitHub Releases to compare application versions. It must not upload tasks, habits, reflections, Meditations, usage analytics, or other personal content.

Any future remote, sync, or AI capability would require separate explicit planning and must not silently remove local-only use.
