# Daily Canvas

Daily Canvas is a private, local-first personal planning, habit, and reflection tracker built around a vivid calendar. It combines flexible planning, full daily reflections, optional habit experience notes, personal backgrounds, rewards, and editable history in one responsive interface.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

## Milestone status

**Milestone 5: Daily Canvas v0.5 Calendar and Human-Friendly Reviews — Completed**

Milestone 5 adds arbitrary inclusive date-range reviews, factual bilingual summaries, inspectable completion evidence, distinct fixed/Floating/Quota facts, and a filterable Calendar evidence surface. Reviews are derived locally from existing records; database and backup format v4 remain unchanged.

See [ROADMAP.md](ROADMAP.md) for the completed milestones and the planned Milestone 6 through Milestone 8 path.

## Milestone 5 delivered

- Review this week, last week, this month, last month, or any valid custom date range with inclusive date semantics.
- Read concise English or Chinese summaries centered on completed work, never coaching or prescriptions.
- Inspect repeated task completions by source date, with distinct fixed, Floating Task, and Quota Goal counts.
- Review Area and schedule-type distributions, completed quota periods, and optional reflection, emotion, and experience context.
- Filter Calendar evidence by task, Area, task kind, schedule type, and record type; use aggregate, single-task, or single-Area mode.
- Read Calendar cells without color alone through labels, shapes, counts, a full legend, keyboard navigation, and a date-detail evidence view.
- Copy a readable local review without uploading it.

## Milestone 4 delivered

- Begin a reflection with several built-in or user-authored emotions, then move into an unrestricted, multi-paragraph journal editor.
- Reopen and edit one reflection per date from Reflection or Calendar without duplicating records.
- Rotate optional bilingual prompts locally with a persisted shuffle bag; prompts can be skipped or disabled.
- Add an optional, dismissible micro-reflection after a check-in, separate from completion data.
- Assign local images to App, Today, Calendar, or Reflection with fit, position, overlay, blur, replace, and clear controls.
- Preserve old journal text and the previous global background through Dexie v4 and backup format v4 migrations.

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
- Write a complete local daily reflection with preserved paragraphs.
- Plan rewards for dates or streak milestones.
- Switch between Chinese and English, light and dark themes, and reduced motion.
- Start in English by default while retaining the complete Chinese interface.
- Use private local background images for supported product surfaces.
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

Version 0.5 does not include recommendations, causal or predictive claims, diagnosis, coaching, notifications, habit lifecycle flows, accounts, cloud sync, remote AI, recursive subtasks, or team project management.
