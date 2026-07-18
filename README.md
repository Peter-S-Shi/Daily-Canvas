# Daily Canvas

Daily Canvas is a private, local-first task and habit tracker built around a vivid calendar. It combines one-time tasks, positive habits, habits to avoid, daily notes, milestone rewards, and editable history in one responsive interface.

中文说明见 [README.zh-CN.md](README.zh-CN.md).

## Version 0.1 features

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

See [ARCHITECTURE.md](ARCHITECTURE.md) for the data model and extension boundaries.

## Status semantics

- Positive habit or task: `done`, `skipped`, or unrecorded.
- Habit to avoid: explicit safe day (`done` internally), `lapse`, `skipped`, or unrecorded.
- A missing check-in is never treated as a successful avoidance day.
- Skipped scheduled days neither increase nor break a streak and are excluded from completion-rate denominators.

## Current boundaries

Version 0.1 does not include accounts, cross-device sync, system notifications, a native mobile wrapper, collaboration, or a points store. These can be added later without replacing the current task/check-in model.
