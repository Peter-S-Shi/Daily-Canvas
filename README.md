# Daily Canvas

Daily Canvas is a free, account-free, local-first personal planning, habit, reflection, review, and personal-preservation application.

`main` is currently at **v0.7.0**, a React/Vite application backed by Dexie/IndexedDB. Milestones 1–14 are complete, including the Tauri 2 Windows desktop foundation, frozen desktop UI blueprint, desktop UI migration, the first v1.0 capture/task-enrichment capabilities, Day/Week Timeline with Time Blocks and local reminders, Reflection Templates, On This Day, local export, automatic backup, and GitHub Release update awareness, a release-hardening pass across migration/backup, accessibility, performance, and CI verification coverage (Milestone 14-A), and a Human Using Experience Review that drove a further blocker-repair and hardening closeout (Milestone 14-B: Time Block minute-precision fix, Meditation blocker repair, Daily Work UX hardening, and final v1 hardening). The application runs both browser-served and as a packaged Windows desktop app. The v1.0 Feature Complete Gate is accepted and Feature Freeze is active. **Milestone 15 is in progress: a `1.0.0` Release Candidate is prepared on an open, unmerged PR** — see below for what it offers and its current limitations.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

## Current development state

The former v0.7 Feature Complete Gate was never accepted. Before Feature Freeze, the project deliberately reopened scope, approved a larger v1.0 desktop program, and completed Milestone 8, its desktop foundation: Tauri 2 as the desktop shell, a frozen desktop identifier/origin, Dexie/IndexedDB retained unchanged, narrow desktop adapters for native concerns, a Windows/MSVC-authoritative build, and risk-scaled GitHub Actions CI. See `desktop-spike/M8A-EVIDENCE.md` and `desktop-verify/M8B-EVIDENCE.md` for the verification evidence.

Completed work remains valid and is not being discarded. Milestone 9 froze the desktop information architecture and UI blueprint (`docs/m9-desktop-ui-blueprint/`), and Milestone 10 migrated the existing product onto it. **Milestone 11: Capture and Task Enrichment** adds Inbox/Quick Capture, local Global Search, Task Notes, one-level Checklist items, duration estimates, richer Habit/Avoidance recurrence, and forward-only Replan. **Milestone 12: Timeline and Desktop Execution** adds Day/Week Timeline, Available Work, Time Blocks with a mandatory keyboard-accessible editor, Replan-aware `needsReview` flagging, local reminders, and the frozen desktop shortcut set. **Milestone 13: Reflection, Preservation, and Desktop Utilities** adds lightweight Reflection Templates, On This Day, local Reflection/Review Markdown export, automatic rotating local backup, and GitHub Release update awareness. The approved v1.0 feature scope (Milestones 8–13) is fully implemented, and **Milestone 14: Product Hardening and Full Regression** converged the complete system on release-level correctness, resilience, accessibility, performance, and verification evidence without adding new features (PR #10). A subsequent **Human Using Experience Review** exercised the packaged app as a real user and drove a closeout sequence merged into `main`: PR #11 fixed a Time Block duration-precision blocker, PR #26 repaired a Meditation Select All/Clear All and print-pagination blocker, PR #27 ("H1") hardened Daily Work UX (Tasks bulk organization, Areas drill-down, type-aware state grammar, local Notes/Checklist editing, Today↔Floating discoverability), and PR #28 ("H2") delivered final v1 hardening (Quota Review retrospective correctness, GitHub Release 404-vs-network-failure distinction, Timeline UX including whole-minute Start precision and Day-view overlap grouping, overlap-as-warning rather than rejection, Light Theme sidebar, and language-agnostic Meditation export). No known release blocker remains. Milestone 15 (Release Candidate) is next.

See [ROADMAP.md](ROADMAP.md) for the new milestone sequence, [PROJECT_STATUS.md](PROJECT_STATUS.md) for the authoritative current state, and [ARCHITECTURE.md](ARCHITECTURE.md) for preserved and planned boundaries.

## Daily Canvas v1.0.0 — Release Candidate

**This is a Release Candidate, not yet a published release.** The `1.0.0` version is the candidate identity carried on the in-progress Milestone 15 branch/PR; no GitHub Release or tag has been published yet, and `main` itself remains at `0.7.0` until that PR is accepted and merged. Nothing below should be read as "you can download this today" — it describes what v1.0.0 is and will offer once released.

**What v1.0.0 brings together**, all of it running fully offline except one narrow, on-demand check:

- A full planning model — ordinary tasks, positive and avoidance habits, fixed schedules, Floating Tasks, and weekly/monthly Quota Goals, organized under an optional Area.
- Quick Capture/Inbox, local Global Search, Task Notes, one-level Checklists, richer recurrence, and forward-only Replan that never rewrites history.
- An optional Day/Week Timeline with a fully keyboard-accessible Time Block editor (whole-minute Start/Duration precision, and an overlap is an explicit, informed warning rather than a silent rejection), plus local reminders.
- Full habit lifecycle tracking, from starting through milestones, pauses, and archiving, without losing cumulative history.
- Daily Reflection with optional lightweight templates, deterministic local Review statistics, and On This Day historical resurfacing.
- A standalone Meditations / 感悟 collection with local print/PDF and Word export.
- Automatic rotating local backup, versioned JSON export/import, and on-demand GitHub Release update awareness — metadata only, never a silent download or install.
- A bilingual (English/Chinese) UI, light/dark/system themes, and keyboard accessibility throughout.

**Known limitations in this Release Candidate:**

- Windows only, currently verified against one Windows configuration in CI; other Windows versions and non-English Windows locales are not yet separately verified.
- The installer is not code-signed yet, so Windows SmartScreen will show an "unrecognized publisher" warning the first time you run it.
- Uninstalling does not currently offer to delete your local data (the Windows NSIS installer default) — your data stays on disk until you remove it yourself.
- Only a per-user installer is provided today; there is no machine-wide or MSI install option.
- No public download exists yet — this candidate is still under release-engineering verification.

**Installing and using Daily Canvas:** until the v1.0.0 GitHub Release is published, the only way to run Daily Canvas is to build it from source (see [Development](#development) below). Once released, using it will look like this: download the Windows installer from the project's GitHub Releases page, run it (a per-user install, no administrator rights required), and launch Daily Canvas from the Start Menu. All product data lives locally under your Windows user profile — see [Privacy model](#privacy-model) below for exactly what does and does not leave your machine. Settings → Data & Backup shows exactly where your data and automatic backups live, and lets you export or restore a backup at any time.

## What Daily Canvas already does

### Planning and task semantics

- Create, edit, archive, restore, star, organize, and delete tasks.
- Track ordinary tasks, positive habits, and habits to avoid with distinct completion semantics.
- Use fixed schedules, undated Floating Tasks, and weekly/monthly Quota Goals.
- Organize work under one optional Area / Mainline.
- Reorder Today's work without changing schedule semantics.
- Distinguish completed, safe, lapsed, skipped, and unrecorded days.
- Preserve the rule that missing data is never silently treated as success.
- Capture unresolved thoughts into a distinct Inbox and explicitly triage them into real Task semantics.
- Search Task titles/notes, Daily Reflections, Meditations, and Areas locally.
- Add Task Notes, one-level Checklist items, and duration estimates without creating recursive subtasks or time tracking.
- Use richer Habit/Avoidance recurrence and forward-looking Replan without rewriting history.

### Timeline and execution

- Place real Tasks into an optional Day or Week Timeline, on a 15-minute visual planning grid, with a mandatory keyboard-accessible Date/Start/Duration/Reminder editor that stores Start and Duration at whole-minute precision with no snapping (drag is an optional convenience, never the only way in).
- See Available Work for a date, derived from existing Fixed/Floating/Quota Tasks, never a second task database.
- Keep Time Blocks separate from schedule/recurrence/quota semantics: deleting a block never deletes its Task, and a block ending never auto-completes it.
- Save a Time Block that overlaps another as an explicit, informed choice: a detailed warning names the conflicting Task, its own time range, the proposed time, and the exact overlap interval (supporting multiple simultaneous conflicts), with `Adjust time` / `Save anyway` choices -- `Save anyway` never mutates the other block. The Day view groups genuinely-overlapping saved blocks into a clickable "N tasks overlapping" chip instead of rendering them stacked and hidden.
- See a lightweight, optional "Today's Plan" summary on Today whenever blocks exist for the day.
- Get local, in-app reminders on a fixed grammar (Off, At start, 5/10/15/30/60 minutes before), with a restrained catch-up for reminders missed while the app was closed.
- Use the fixed desktop shortcut set (Search, Quick Capture, Today, Escape) and a read-only Shortcuts reference in Settings.

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

### Reflection templates, historical resurfacing, and export

- Choose Free Write (default), Daily Check-in, or Gratitude & Perspective when writing a Daily Reflection; every prompt is skippable and prompt text is never written into the saved entry.
- Browse On This Day inside Reflect: Daily Reflections and Meditations from the exact same month and day in earlier years, grouped by year, with one-click navigation back to the original record.
- Export the current Daily Reflection or the current Review selection as a local Markdown (`.md`) file.

### Desktop reliability and awareness

- Automatic rotating local backup, enabled by default: at most one per calendar day, retaining the most recent 7, shown with their location and history in Settings, restorable through the same pipeline as manual import.
- Check installed-version-vs-latest-GitHub-Release status on demand from Settings -> About & Updates, with a manual "View Release" handoff -- never a silent download or self-install. The check distinguishes Up to date, Update available, no published Release yet ("No published release is available yet"), a genuine network/timeout/DNS failure, and any other check failure, so a repository with no published Release is never mistaken for a network problem.

### Data ownership and personalization

- Store product data locally in Dexie/IndexedDB.
- Export and restore versioned JSON backups with migration and validation.
- Preserve backup compatibility through format v9, including migration of supported v1-v8 backups.
- Keep local appearance assets on-device.
- Switch between English and Chinese, light/dark/system themes, week-start preferences, and reduced motion.

## Approved v1.0 direction

v1.0 keeps the existing product philosophy and expands the missing bridge between planning and execution. All approved v1.0 capabilities are now delivered (Milestones 8–13):

- Quick Capture / Inbox, Global Search, Task Notes, one-level Checklist items, richer recurrence rules, Task duration estimates, explicit replanning of unfinished work (Milestone 11).
- Optional Day / Week Timeline with Time Blocking, basic local reminders, and the desktop keyboard shortcut set (Milestone 12).
- Lightweight Reflection Templates, On This Day, local Reflection/Review export, automatic rotating local backup, and GitHub Release update awareness (Milestone 13).

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

## Desktop transition principles — resolved by Milestone 8

The desktop program started with a thin foundation rather than a rewrite. Milestone 8 answered each question below with evidence rather than assumption:

- React, TypeScript, Vite, services, and existing domain semantics are preserved unchanged.
- Dexie/IndexedDB is preserved; the feasibility spike found no evidence to justify a rewrite to SQLite.
- **Tauri 2** was evaluated and accepted as the desktop shell. Desktop identifier `io.github.peter-s-shi.dailycanvas` and packaged origin `https://tauri.localhost` are now frozen.
- Persistence (including forced process kill), backup/restore, local document export, and installer upgrade safety were proven on Windows/MSVC before any feature expansion begins.
- Desktop-native adapters (local files, print, local notifications, automatic-backup file operations, GitHub Release metadata, opening the release page) are separated from domain services behind `src/desktop/desktopAdapter.ts`; the web layer is granted only the minimal `notification:default`, `opener:default`, and a single-endpoint-scoped `http:default` permissions -- no filesystem or general shell/network capability.

## UI transition principles — resolved by Milestone 9

The v1.0 desktop UI was designed before broad implementation through an explicit blueprint process; the frozen result lives in `docs/m9-desktop-ui-blueprint/` and Milestone 10 implemented it:

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
pnpm desktop:dev       # development window (Vite + Tauri)
pnpm desktop:build     # release build without an installer
pnpm desktop:bundle    # per-user NSIS installer (test-only versions are supplied by CI)
```

On Windows, double-click `OPEN_DAILY_CANVAS_DEV.cmd` to start the development window. It loads the Visual Studio Build Tools x64 environment, uses the `stable-x86_64-pc-windows-msvc` Rust toolchain, and explains what is missing if the local toolchain is incomplete.

Packaged-app verification lives in `desktop-verify/` (see `desktop-verify/M8B-EVIDENCE.md`). It uses synthetic data only and refuses to wipe an existing user data folder it did not create.

Continuous integration is risk-scaled (`.github/workflows/ci.yml`): documentation-only changes install no toolchains, app changes run typecheck/tests/build, data and backup changes add targeted regression, and shell or CI changes add the Windows/MSVC desktop build and smoke checks. A stable `PR Gate` job summarizes the result. See [ROADMAP.md](ROADMAP.md).

## Privacy model

Core personal data remains local and the application must remain fully usable without an account or cloud service.

The update-awareness feature makes a narrow, non-personal request to GitHub Releases to compare application versions, on demand only (page open or an explicit "Check for updates" click, never on a timer or at startup). It reads only the tag name and release URL, never uploads tasks, habits, reflections, Meditations, usage analytics, or other personal content, and never silently downloads or installs anything.

Any future remote, sync, or AI capability would require separate explicit planning and must not silently remove local-only use.
