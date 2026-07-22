# Daily Canvas

Daily Canvas is a private, local-first personal planning and habit tracker built around a vivid calendar. It combines Mainline Areas, fixed schedules, Floating Tasks, weekly and monthly Quota Goals, habits, daily notes, rewards, and editable history in one responsive interface.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

## Milestone status

**Milestone 3: Daily Canvas v0.3 Flexible Planning and Mainlines — Completed**

Milestone 3 adds editable Mainline Areas, dedicated Floating Tasks, and weekly/monthly Quota Goals. Fixed days, flexible work, and quota periods now have distinct scheduling and statistical semantics, backed by a v3 database and backup migration.

See [ROADMAP.md](ROADMAP.md) for the completed milestones and the planned Milestone 4 through Milestone 7 path.

## Milestone 3 delivered

- Create, edit, order, archive, restore, and safely delete Mainline Areas without deleting their tasks or history.
- Assign a task to one optional Area and inherit its color, with an optional task-level color override.
- Keep fixed schedules compatible with existing once, daily, weekday, and interval recurrence.
- Keep undated Floating Tasks in a dedicated list; optional deadlines indicate overdue state without creating missed days.
- Track weekly or monthly Quota Goals by completion count, with current progress and successful-period streaks.
- Respect Monday or Sunday week starts in quota boundaries and calendar layout.
- Preserve supported older data through Dexie schema version 3 and backup format version 3 migrations.

## Milestone 1 delivered

- Create, edit, archive, restore, star, categorize, and delete tasks.
- Track one-time tasks, positive habits, and habits to avoid with distinct language and outcomes.
- Repeat daily, on selected weekdays, or every N days, with optional end dates.
- Set a milestone length such as 7, 21, 30, 66, 90, or a custom number of days.
- Reorder today's items with pointer, touch, or keyboard drag and drop.
- Review a color-filled monthly calendar and a per-task history heatmap.
- Edit past check-ins and distinguish completed, safe, lapsed, skipped, and unrecorded days.
- See current streak, personal best, and completion rate.
- Write one local daily note of up to 500 characters.
- Plan rewards for dates or streak milestones.
- Switch between Chinese and English, light and dark themes, and reduced motion.
- Start in English by default while retaining the complete Chinese interface.
- Use a private local background image.
- Export and restore a JSON backup.

## Privacy model

Daily Canvas has no account, analytics, advertising, cloud database, or remote font dependency. Product data is stored in the browser's IndexedDB database on the current device and origin. A locally selected background is saved in the same database.

Browser data can be cleared by browser settings, so regular JSON exports are recommended. A future sync feature should be opt-in and designed separately rather than silently changing this local-first model.

Do not commit personal backup exports, screenshots containing real data, `.env` files, databases, logs, or credentials. The included `.gitignore` blocks common local-only files.

## Development

Requirements:

- Node.js 20.19 or newer
- pnpm

### Windows quick start

Double-click `start-daily-canvas.cmd`. It locates either a normal Node.js installation or the bundled Codex runtime, installs dependencies when needed, starts the local server, and opens Daily Canvas in the default browser.

Opening `index.html` directly is not supported because this is a Vite application; use the launcher or development command instead.

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

## Architecture

The application uses React, TypeScript, Vite, Dexie/IndexedDB, i18next, date-fns, and dnd kit. A task definition is separate from its dated check-ins; recurring tasks are calculated from schedules rather than duplicated into an unlimited list of daily records.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the data model and extension boundaries, and [ROADMAP.md](ROADMAP.md) for milestone sequencing and completion criteria.

## Status semantics

- Positive habit or task: `done`, `skipped`, or unrecorded.
- Habit to avoid: explicit safe day (`done` internally), `lapse`, `skipped`, or unrecorded.
- A missing check-in is never treated as a successful avoidance day.
- Skipped scheduled days neither increase nor break a streak and are excluded from completion-rate denominators.

## Current boundaries

Version 0.3 does not include emotion tracking, structured reflection, Experience Logs, human-friendly insight summaries, notifications, accounts, cloud sync, recursive subtasks, or team project management. Later milestones introduce capabilities only after their supporting reliability and privacy foundations are complete.
