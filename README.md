# Daily Canvas

![Daily Canvas banner](assets/readme/daily-canvas-banner.png)

**Daily Canvas is an account-free, local-first Windows desktop system for planning, habits, reflection, review, and personal preservation.**

It is designed for people who want structure without turning every part of life into a rigid project-management system. Daily Canvas connects what you plan, what you actually do, what you notice, and what you want to preserve — while keeping the history and data on your own device.

**Windows · Local-first · React + TypeScript · Tauri 2 · v1.0.0**

[Download v1.0.0](https://github.com/Peter-S-Shi/Daily-Canvas/releases/tag/v1.0.0) · [Architecture](ARCHITECTURE.md) · [Release evidence](PROJECT_STATUS.md) · [中文说明](README.zh-CN.md)

---

## See the real product

The screens below come from the released **v1.0.0** Windows build using synthetic portfolio data.

![Daily Canvas product proof](assets/readme/daily-canvas-product-proof.png)

Daily Canvas is intentionally broader than a to-do list. It connects daily execution with longer-term evidence instead of treating tasks, habits, reflection, and review as separate tools.

---

## Why Daily Canvas

| Flexible, not rigid | History stays honest | Your data stays yours |
| --- | --- | --- |
| Fixed schedules, Floating Tasks, Quota Goals, Inbox capture, and an optional Timeline can coexist. You do not have to force every task into a clock. | Missing is not silently treated as success. Replan moves unfinished work forward without rewriting the past, and habit pauses, milestones, and recovery remain part of the record. | Core data stays on-device. Daily Canvas requires no account, no cloud database, no analytics service, and no remote AI dependency. |

---

## One system, five connected layers

### Plan

Use ordinary tasks, positive habits, avoidance habits, fixed schedules, Floating Tasks, weekly or monthly Quota Goals, Inbox capture, and optional Time Blocking.

### Act / Track

Check work in, record safe or lapse outcomes for avoidance habits, replan unfinished work, place tasks into Time Blocks, and use restrained local reminders.

### Reflect

Write a Daily Reflection, optionally use lightweight reflection templates, attach subjective Experience Logs to completed work, and record emotions without turning them into diagnoses.

### Review

Inspect deterministic weekly, monthly, or custom-range summaries backed by traceable task and habit evidence. Review describes what was recorded; it does not infer personality, causes, or mental state.

### Preserve

Keep Meditations, revisit earlier reflections through On This Day, export locally, and preserve the full product state through versioned backups and automatic rotating local backup.

---

## Long-term memory, not just today's tasks

Daily Canvas is built around continuity over time. **On This Day** resurfaces Daily Reflections and Meditations from the same month and day in earlier years, so past records can become useful again instead of disappearing into an archive.

![On This Day in Daily Canvas](assets/readme/daily-canvas-on-this-day.png)

---

## Engineering depth

Daily Canvas is a portfolio project because of the engineering decisions behind the product, not because of its dependency list.

### Local-first architecture

Core personal data remains local and the product stays fully usable without an account, cloud backend, telemetry system, or remote AI service. The only network exception in v1.0 is a narrow, on-demand GitHub Release metadata check for update awareness.

### Explicit domain semantics

Scheduling, quota evaluation, habit lifecycle, pause/resume behavior, review generation, backup, migration, reminders, and desktop-native concerns live behind reusable service boundaries rather than being hidden inside React components.

### Versioned data evolution

Dexie schema changes and backup formats evolve through explicit versions and migration logic. Restore validates incoming data first, creates a safety backup before destructive replacement, and rejects unsupported newer formats safely.

### Risk-scaled verification

CI depth follows change risk: documentation-only changes take the cheap path; ordinary application changes run typecheck/tests/build; migration and backup changes add targeted regressions; desktop or packaging changes add Windows/MSVC build, packaged-app smoke, and installer/upgrade verification.

### Desktop release discipline

The v1.0.0 release was delivered through a verified Windows NSIS candidate, clean-install and restart evidence, upgrade/uninstall/reinstall checks, backup/restore verification, and a final provenance chain connecting the accepted commit, tag, GitHub Release, and distributed installer artifact.

For the full verification record, see [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Engineering journey

Daily Canvas evolved through a complete product lifecycle rather than a single implementation pass.

![Daily Canvas engineering journey](assets/readme/daily-canvas-engineering-journey.png)

The detailed milestone history remains available in [ROADMAP.md](ROADMAP.md) and [DEVLOG.md](DEVLOG.md); it is intentionally kept out of the main product story here.

---

## Task and habit depth

The product model keeps long-term task and habit state explicit: recurrence, lifecycle state, completion history, personal bests, streaks, checklist items, notes, and scheduling semantics remain inspectable rather than being collapsed into a single “done” flag.

![Task detail and habit lifecycle evidence](assets/readme/daily-canvas-task-detail.png)

---

## Local-first and data ownership

```text
Tasks · habits · reflections · meditations · settings · backups
                              │
                              ▼
                        Your device

Only network exception in v1.0:
an on-demand GitHub Release metadata check for update awareness
```

Daily Canvas does **not** upload your tasks, habits, reflections, Meditations, usage analytics, or other personal content. Update awareness reads only stable-release metadata when you open **Settings → About & Updates** or explicitly request a check.

Manual JSON export/import remains available alongside automatic rotating local backups.

---

## Try Daily Canvas

### Windows v1.0.0

1. Open the [v1.0.0 GitHub Release](https://github.com/Peter-S-Shi/Daily-Canvas/releases/tag/v1.0.0).
2. Download `Daily.Canvas_1.0.0_x64-setup.exe`.
3. Run the per-user installer.
4. Launch **Daily Canvas** from the Start Menu.

No administrator rights are required for the normal per-user installation.

### Current limitations

- **Windows only.** The v1.0 release is verified on the Windows/MSVC path used by CI; other Windows versions and non-English Windows locales are not separately certified.
- **Unsigned installer.** Windows SmartScreen may show an “unrecognized publisher” warning.
- **Per-user installer only.** There is no MSI or machine-wide installation option in v1.0.
- **Uninstall preserves local data.** The current NSIS uninstall behavior removes the application but does not offer an in-flow “delete my data” option.
- **No automatic self-update.** Daily Canvas can tell you that a newer GitHub Release exists, but it never silently downloads or installs one.

---

## Intentional boundaries

Daily Canvas deliberately does **not** aim to become:

- an account-driven SaaS product;
- a team or collaboration platform;
- a recursive project-management tree;
- a social habit leaderboard;
- a mandatory cloud-sync application;
- a remote-AI-dependent experience;
- a clinical mental-health tool or AI therapist;
- a silent automatic updater.

The core hierarchy stays deliberately shallow:

```text
Area
  └── Task
       └── optional one-level Checklist items
```

If a checklist item needs its own schedule, lifecycle, quota, reward, or history, it should become a real Task rather than another recursive level.

---

## Technology

**Frontend:** React 19 · TypeScript · Vite  
**Desktop:** Tauri 2 · Rust · Windows/MSVC · NSIS  
**Local data:** Dexie · IndexedDB  
**Testing:** Vitest · packaged-app smoke · installer/upgrade smoke  
**Delivery:** GitHub Actions · GitHub Releases

Technology choices support the product architecture; they are not the product story by themselves.

---

## Build from source

Requirements:

- Node.js 20.19+
- pnpm
- Rust toolchain for Tauri desktop work
- Windows/MSVC for the authoritative desktop build path

```bash
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Desktop:

```bash
pnpm desktop:dev
pnpm desktop:build
pnpm desktop:bundle
```

On Windows, `OPEN_DAILY_CANVAS_DEV.cmd` can prepare and explain the expected Visual Studio Build Tools / MSVC environment.

---

## Deeper technical documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — architecture, persistence, domain boundaries, desktop/native boundaries, testing and CI model
- [PROJECT_STATUS.md](PROJECT_STATUS.md) — authoritative release state and verification evidence
- [ROADMAP.md](ROADMAP.md) — product and engineering milestone history
- [DEVLOG.md](DEVLOG.md) — implementation history and hardening notes
- [`desktop-verify/`](desktop-verify/) — packaged desktop verification infrastructure and evidence
- [v1.0.0 Release](https://github.com/Peter-S-Shi/Daily-Canvas/releases/tag/v1.0.0) — stable installer and release notes

---

## License

No open-source license has been declared for this repository yet. Until that changes, the source remains publicly viewable but should not be treated as granting reuse rights by default.
