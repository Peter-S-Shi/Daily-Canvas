# Daily Canvas architecture

## Product boundary

Version 0.1 is a local-first single-user web application. IndexedDB is authoritative for product data. UI language and theme are settings, while authored task titles, categories, notes, and rewards remain independent of the selected interface language.

## Domain model

```text
Task ── owns one Recurrence rule
  │
  ├── CheckIn[taskId + date] ── dated outcome
  ├── DailyOrder[date] ──────── per-day presentation order
  └── Reward[taskId?] ───────── date or streak milestone

JournalEntry[date] ──────────── one note per day
AppSettings[app] ────────────── language, theme, background, motion
```

### Task

A task stores identity, type, display metadata, schedule, milestone, and lifecycle fields. `kind` is `task`, `habit`, or `avoidance`. Archiving hides future occurrences without deleting history.

### Recurrence

Supported rules are once, daily, selected weekdays, and every N calendar days. Occurrences are calculated when a date is viewed. No future occurrence rows are materialized.

### Check-in

The stable identifier is `taskId:date`, so editing history replaces one deterministic record. `done` means completion for tasks and positive habits, and an explicitly confirmed safe day for avoidance habits. `lapse` is available only to avoidance habits. `skipped` is neutral.

### Statistics

Statistics are derived from scheduled dates and dated check-ins. Skipped days are excluded from completion-rate denominators and do not break a streak. Unrecorded past scheduled days and lapses break a streak.

## Extension boundaries

- Notification scheduling should consume recurrence and milestone services rather than UI components.
- Optional cloud sync should replicate the existing entities and retain deterministic check-in identifiers.
- Authentication and ownership fields can be introduced in a database migration without changing recurrence semantics.
- New recurrence rules belong in the date-domain module and its tests.
- New languages belong in complete locale dictionaries; authored user content is never auto-translated.

## Privacy boundary

No application data leaves the browser in version 0.1. Export is initiated by the user and produces a local JSON file. Background images are read locally into IndexedDB. The application makes no runtime requests to analytics, advertising, font, account, or sync services.
