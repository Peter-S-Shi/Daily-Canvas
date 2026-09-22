# Daily Canvas — Desktop Behavior & State Specification

**Milestone:** M9 — Desktop Information Architecture and UI Blueprint  
**Status:** Frozen v1.0 — final M9 behavior contract  
**Target:** Daily Canvas v1.0 desktop product  
**Implementation baseline:** v0.7 product semantics + M8 Tauri 2 desktop foundation  
**Visual reference:** `visual-reference/Daily_Canvas_Desktop_UI_Visual_Reference_Frozen.pdf` (10-page frozen visual reference)

---

## 0. Purpose and Authority

This document defines the behavior, state, navigation, interaction, accessibility, and staging contract for the Daily Canvas desktop UI.

It exists to prevent implementation agents from inferring product semantics from screenshots alone.

**Freeze note:** The four M9 product decisions previously tracked as D1–D4 were explicitly approved by the product owner on 2026-09-22 and are part of this contract. The HTML Interaction Blueprint v0.3 passed human visual review and was frozen as v1.0 on the same date.

**Errata (2026-09-22, reconciled at M10 Human Gate 1):** wording only; no product decision changed. The visual-reference citation above now names the frozen file actually in the repository (it previously cited a working-draft filename). §7.5 previously described Avoidance-habit Time Block eligibility as an open M12 decision, contradicting frozen Decision D2; it now states D2. Appendix C now names the visual-reference file and location.

### 0.1 Authority order

When sources appear to conflict, use this order:

1. Approved domain/product semantics in `ARCHITECTURE.md`, `ROADMAP.md`, and current domain services/types.
2. This behavior/state specification.
3. Frozen M9 visual reference.
4. Implementation convenience.

The visual reference is authoritative for composition and visual language, but **not** for any sample text, sample data, or behavior that conflicts with the domain contract.

### 0.2 M9 is not a feature implementation milestone

M9 freezes the target desktop product structure and interaction contract.

M9 must not implement Inbox, Search, richer recurrence, Timeline, reminders, automatic backup, update awareness, or other approved v1.0 features.

### 0.3 Target-state blueprint vs staged implementation

The frozen M9 blueprint describes the **v1.0 target state**. Capabilities become active only in their implementation milestone.

- M10: desktop shell/UI migration using already-implemented product capabilities.
- M11: Inbox / Quick Capture, Search, task enrichment, richer recurrence, Replan.
- M12: Timeline / Time Blocking, reminders, desktop shortcuts.
- M13: Reflection Templates, On This Day, Reflection/Review export, automatic backup, update awareness.

M10 must not create fake, nonfunctional, or misleading placeholders for later milestone features.

---

# 1. Global Product Interaction Principles

## 1.1 Local-first

All normal product data remains local.

No UI interaction may imply that account sign-in, cloud sync, remote storage, or a backend is required.

## 1.2 Primary navigation represents user intent

The v1.0 target sidebar contains exactly seven primary destinations:

1. Today
2. Inbox
3. Plan
4. Tasks
5. Reflect
6. Review
7. Settings

Global Search and Quick Capture are global actions, not primary destinations.

Secondary navigation lives inside its workspace and must not expand the primary sidebar into a tree.

## 1.3 Optional structure stays optional

Timeline and Time Blocking are optional planning aids.

A user must remain able to use Today, Floating, Quota, Calendar, Reflection, and Review without creating Time Blocks.

## 1.4 History is not rewritten for convenience

Replan, schedule edits, lifecycle changes, and Timeline changes affect the future unless an existing domain rule explicitly says otherwise.

A missed or unrecorded historical occurrence must not be silently rewritten into a success.

## 1.5 Missing data is not success

Especially:

- missing avoidance-habit check-in is not a safe day;
- missing Reflection is not a negative Reflection;
- missing Experience Log is not evidence of an experience state.

## 1.6 Read before edit

Where practical, desktop surfaces should show readable state first and require an explicit edit action before exposing full editing controls.

This is especially important for Task Detail.

---

# 2. Desktop Shell

## 2.1 Persistent structure

The desktop shell contains:

- persistent left sidebar;
- workspace header;
- global Search affordance when Search is implemented;
- global Quick Capture affordance when Quick Capture is implemented;
- workspace content area;
- restrained `Local · Private` cue;
- Settings anchored toward the lower portion of the sidebar.

## 2.2 Primary navigation state

Exactly one primary destination is selected at a time.

Selection is indicated by more than color alone.

The selected state should remain understandable under reduced motion and common color-vision differences.

## 2.3 Workspace header

The workspace header may contain:

- workspace title;
- workspace-level secondary navigation;
- Search;
- Quick Capture;
- context-specific actions.

The header must not become a second global navigation bar.

## 2.4 Staged visibility

Target-state destinations/actions must appear only when they are real and usable.

Recommended staged activation:

- M10: Today, Plan, Tasks, Reflect, Review, Settings.
- M11: Inbox, Search, Quick Capture, richer Task Detail capabilities, Replan.
- M12: Timeline, Notifications-related controls, shortcut controls.
- M13: On This Day, automatic-backup controls, update awareness, Reflection/Review export.

If a later milestone chooses a different activation sequence, it must not expose dead controls.

---

# 3. Global Search

**Implementation milestone:** M11

## 3.1 Entry

Search opens from:

- the persistent Search affordance;
- approved keyboard shortcut, expected to be `Ctrl/Cmd + K`.

It opens as an overlay over the current workspace.

It does not navigate to a dedicated Search page.

## 3.2 Guaranteed v1 result groups

The M9 blueprint guarantees Search support for:

- Tasks, including task title and approved searchable task notes;
- Daily Reflections;
- Meditations;
- Areas.

Additional record types require explicit approval rather than implicit expansion.

## 3.3 Search behavior

Search is local-only.

Results update from authoritative local records or rebuildable derived indexes.

Search must not create a second authoritative copy of user content.

## 3.4 Context jump

Selecting a result opens its natural destination:

- Task → Tasks → selected Task Detail;
- Reflection → Reflect → Daily Reflection → source date;
- Meditation → Reflect → Meditations → selected entry;
- Area → Tasks → All Tasks filtered to the Area.

The user should not have to find the same object a second time after selecting a Search result.

## 3.5 Keyboard and focus

When Search opens:

- focus moves to the query input;
- Arrow Up / Arrow Down may move through results;
- Enter activates the focused result;
- Escape closes Search and restores focus to the invoking control when practical.

Mouse/pointer use must remain fully supported.

## 3.6 Empty / no-result state

No results must be represented as a neutral state.

Do not infer recommendations, related content, or remote search suggestions.

---

# 4. Quick Capture

**Implementation milestone:** M11

## 4.1 Purpose

Quick Capture answers one question:

> What do you want to remember?

The default interaction is:

```text
Open
→ type title
→ Save to Inbox
→ close
```

## 4.2 Default surface

Default Quick Capture contains:

- one required title/text field;
- `Save to Inbox`;
- secondary `Create full task instead`;
- close action.

Do not add the following to the default surface:

- Area;
- recurrence;
- reminder;
- duration;
- priority;
- checklist;
- lifecycle;
- reward;
- Timeline placement.

## 4.3 Save success

After successful capture:

- a new unresolved Inbox item exists;
- the overlay closes;
- focus returns to a sensible location;
- optional brief local confirmation may appear.

## 4.4 Save failure

If persistence fails:

- do not close and discard the typed content;
- show an accessible error state;
- permit retry or copy/manual recovery.

---

# 5. Inbox

**Implementation milestone:** M11

## 5.1 Definition

Inbox contains lightweight, unresolved captures.

An Inbox item is **not** a Task.

It has no Task schedule, check-in history, streak, lifecycle, reward, reminder, Area ownership, or quota semantics until triage succeeds.

Storage representation remains an implementation decision, but the UI/domain boundary above is mandatory.

## 5.2 Inbox list

Each item shows enough to identify the capture, such as:

- captured text/title;
- capture time/date when useful;
- primary `Triage` action;
- restrained overflow for safe secondary actions such as delete.

Do not provide workspace-routing buttons such as `Plan`, `Tasks`, or `Reflect`.

## 5.3 Triage lifecycle

```text
Inbox item
→ Triage
→ choose valid Task semantics
→ create real Task
→ only after successful Task creation, remove/resolve Inbox item
```

If Task creation fails, the Inbox item remains intact.

## 5.4 Triage: schedule selection

Triage chooses one of:

- Fixed
- Floating
- Quota

### Fixed

A valid Fixed task needs the minimum information required by the Task domain.

Current baseline rules:

- Task kind is required: Task / Habit / Avoidance.
- A regular Task uses a one-time fixed occurrence in the current model.
- Habit / Avoidance currently support Daily / Weekdays / Interval recurrence.
- Start date is required.
- Richer recurrence is an M11 product capability; M9 does not invent its grammar.

### Floating

Current baseline rules:

- Floating is a regular Task, not Habit/Avoidance.
- `availableFrom` is required and may default to Today.
- deadline is optional.
- absence on earlier/other days is neutral.

### Quota

Current baseline rules:

- Quota is Habit or Avoidance, not regular Task.
- `targetCount >= 1`.
- period is Week or Month.
- `availableFrom` is required.
- optional end date may remain an advanced/full-editor field unless needed by the final M11 design.

## 5.5 Optional Area

Area is optional during triage.

Area must never be required merely to empty Inbox.

## 5.6 Open full editor

`Open full editor` is an explicit escape path for advanced configuration.

It must not turn the default Triage path into the full Task Editor.

---

# 6. Today

## 6.1 Purpose

Today is the execution surface.

It answers:

> What should I act on today?

It is not the authoritative Task library and not the Timeline editor.

## 6.2 Authoritative schedule grouping

Today must respect existing schedule semantics.

### Fixed occurrences

All active, non-archived, non-paused Fixed tasks scheduled for today are eligible for the Today execution list.

Clock time is not part of Fixed schedule semantics.

If the same task has a Time Block, a subtle secondary label such as `Planned 1:00–1:30 PM` may appear.

### Quota goals

Active Quota goals available today may show current period progress and today’s check-in action.

A missing day remains neutral; quota success/failure is evaluated at the period level.

### Floating

Floating tasks do not appear on Today merely because they exist or are available.

They require an explicit user action/path that makes them part of today’s plan, if such behavior is approved in M11/M12.

## 6.3 Avoidance habit actions

Avoidance habits use explicit:

- Safe;
- Lapse;
- Skip/neutral behavior where supported.

Missing data must never render as Safe.

## 6.4 Daily order

Where current drag ordering is preserved, reordering Today affects Today’s display order only.

It does not change recurrence, lifecycle, Area, or Timeline state.

## 6.5 Replan

**Implementation milestone:** M11

Replan appears contextually when unfinished work requires a forward-looking decision.

Replan must:

- preserve historical truth;
- never convert an earlier miss into success;
- make the next plan explicit;
- avoid creating a permanent primary navigation destination.

## 6.6 Today’s Plan

**Implementation milestone:** M12

`Today’s Plan` is a lightweight summary of Time Blocks.

It is optional.

If the user has no Time Blocks or does not use Timeline, Today must remain visually complete without an empty mandatory panel.

The Plan/Timeline workspace remains the authoritative editor for Time Blocks.

---

# 7. Plan Workspace

## 7.1 Secondary navigation

Target-state Plan navigation:

- Floating
- Calendar
- Timeline

Timeline appears only when implemented in M12.

## 7.2 Floating

Floating preserves current semantics:

- intentionally flexible one-time work;
- `availableFrom`;
- optional deadline;
- no daily failure semantics;
- completion closes the item.

Floating is not Inbox.

## 7.3 Calendar

Calendar remains a date/evidence surface.

It is not replaced by Timeline.

Calendar may expose historical check-ins, Reflection evidence, and approved record filters consistent with the existing Calendar contract.

## 7.4 Timeline

**Implementation milestone:** M12

Timeline contains:

- Day mode;
- Week mode;
- Available Work;
- Time Blocks.

A Time Block represents intended execution time.

It does not redefine:

- Task recurrence;
- Fixed/Floating/Quota schedule mode;
- check-in status;
- lifecycle;
- completion.

Deleting a Time Block does not delete its linked Task.

Completing a Task is not an automatic consequence of the Time Block ending.

## 7.5 Available Work

Available Work is a planning source list, not a second Task database.

At minimum it may derive eligible items from:

- Floating work available on the selected date;
- Fixed work scheduled on the selected date;
- active Quota goals where task placement is meaningful.

Completed, archived, or paused items should not appear as ordinary available work.

Avoidance habits are not offered as ordinary Time Block work in v1.0 (Resolved Decision D2); the blueprint must not imply that every Task kind is blockable.

## 7.6 Drag behavior

Persistent fake drop zones are not rendered as if they were scheduled blocks.

During an active drag:

- legal drop regions may become visible;
- hover/drop feedback must be clear without relying only on color;
- reduced-motion mode avoids decorative motion.

---

# 8. Tasks Workspace

## 8.1 Purpose

Tasks is the authoritative task-management workspace.

Target-state secondary navigation:

- All Tasks
- Areas
- Lifecycle
- Rewards

## 8.2 All Tasks

The Task library supports existing safe filters such as:

- All;
- Starred;
- Archived;
- Area;
- schedule mode.

M9 may reorganize controls visually but must not change the filtering semantics without explicit approval.

## 8.3 Master-detail behavior

Selecting a Task opens readable Task Detail.

Selecting a Task does **not** immediately open edit mode.

Task Detail and Task Editor are distinct states.

## 8.4 Task Detail target-state local navigation

Target-state destinations:

- Overview
- Schedule
- Checklist
- Notes
- Lifecycle
- Reminder
- History

At narrower desktop widths these do not need to remain seven permanently visible horizontal tabs.

A compact overflow such as `More` or an equivalent local-navigation treatment is allowed.

They must never become app-level primary navigation.

## 8.5 Overview

Overview is read-first.

It may summarize:

- Area;
- Task kind;
- schedule;
- duration estimate;
- current relevant status;
- streak/progress where valid;
- checklist preview;
- notes preview.

It should not render as a wall of editable form controls.

## 8.6 Edit

`Edit` explicitly enters an editing state or focused editor.

Existing saved values must be preserved until a successful save.

Cancel must not mutate the Task.

## 8.7 Checklist

**Implementation milestone:** M11

Checklist is exactly one level deep.

Checklist items do not independently own:

- Area;
- schedule;
- recurrence;
- quota;
- streak;
- lifecycle;
- reward;
- Reflection/Experience history;
- recursive children.

If a step requires those semantics, it must become a real Task.

## 8.8 Notes

**Implementation milestone:** M11

Task Notes are part of the Task record or another authoritative Task-owned representation.

Notes must remain local.

Search may index them, but Search indexes remain derived/rebuildable.

## 8.9 Duration estimate

**Implementation milestone:** M11

Duration is an estimate, not measured actual time.

Timeline may use it to suggest/size placement, but it is not proof of time spent.

## 8.10 Lifecycle

Lifecycle remains backed by the existing lifecycle model and behavior.

The new Task Detail location must not change:

- starting/building/milestone-reached/maintenance/paused/completed/archived semantics;
- planned break/vacation/retroactive pause rules;
- resume/history behavior;
- personal-best preservation.

## 8.11 Rewards

Rewards remain an existing product capability and may move under Tasks as a secondary workspace without changing reward semantics.

---

# 9. Reflect Workspace

## 9.1 Secondary navigation

Target-state Reflect navigation:

- Daily Reflection
- Meditations
- On This Day

On This Day appears only when implemented in M13.

## 9.2 Daily Reflection

Daily Reflection remains date-based and local.

The desktop composition may show emotions and free-form writing on the same surface rather than forcing the existing two-step presentation.

This is a presentation change, not a data-model change.

## 9.3 Emotions

Emotions support multi-select.

Custom emotions remain supported.

Archived custom emotions remain visible when already referenced by an existing Reflection, consistent with current behavior.

## 9.4 Intensity

Intensity remains optional.

The UI must not pressure the user into choosing a value.

## 9.5 Prompt

Reflection prompt remains optional.

The user can skip it.

Prompts remain controlled by the existing global Reflection prompt preference until M13 extends the writing experience.

## 9.6 Save

Daily Reflection retains an explicit Save action unless a future milestone explicitly approves autosave.

Do not infer autosave from the visual design.

On save success:

- show a restrained local success state;
- persist the exact authored content;
- do not rewrite the user’s words.

On save failure:

- preserve the in-memory content;
- show an accessible error state.

## 9.7 Reflection Templates

**Implementation milestone:** M13

Templates are optional writing aids inside Daily Reflection.

They are not a separate primary workspace.

They must not make free-form writing second-class or require every field.

## 9.8 Meditations

Meditations remain independent from dated Daily Reflections.

Existing rules remain authoritative, including:

- plain-text content;
- immutable creation time;
- edited state;
- manual order;
- 150-unit mixed-language limit;
- local print/PDF/Word export.

## 9.9 On This Day

**Implementation milestone:** M13

The frozen design approves historical resurfacing within Reflect.

At minimum, Daily Reflections and Meditations may be resurfaced where date matching is meaningful.

On This Day:

- is optional and non-judgmental;
- does not mutate source records;
- does not create duplicate authoritative records;
- does not diagnose growth, mood, personality, or meaning;
- provides `Open original` or equivalent source navigation.

---

# 10. Review Workspace

## 10.1 Purpose

Review answers:

> What happened during this period, based on recorded evidence?

Review remains deterministic, traceable, and non-diagnostic.

## 10.2 Presets

Approved blueprint presets:

- This Week
- Last Week
- This Month
- Last Month
- Custom

Custom uses an inclusive validated date range.

## 10.3 Progressive disclosure

Review follows:

```text
Summary
→ Supporting facts
→ Evidence
→ Source date / Calendar
```

The first screen should be readable without dumping every source record.

## 10.4 Summary language

Summary text must be reproducible from structured facts.

Avoid:

- ambiguous percentages with unclear denominators;
- causal language;
- predictive language;
- clinical/diagnostic language;
- motivational judgment presented as fact.

Preferred examples:

- `You recorded 24 completed check-ins during this period.`
- `Exercise reached its weekly quota in 3 of 4 completed weeks.`
- `You wrote reflections on 18 of 22 days.`

## 10.5 Evidence preview

If only part of the evidence is visible, the state must be explicit, for example:

`Showing 3 of 12 · View all`

Do not label evidence as collapsed while simultaneously showing expanded rows.

## 10.6 Source navigation

Evidence rows may jump to:

- Calendar/date detail;
- Task detail/history;
- source Reflection;

depending on record type.

Source navigation must not mutate the record.

## 10.7 Reflection context

Reflection context is optional and visually subordinate to factual review evidence.

Review may describe recorded emotion/reflection facts under existing guardrails.

It must not convert text into diagnosis or causal explanation.

## 10.8 Copy / Export

Copy preserves the existing deterministic local text behavior.

Reflection/Review local export is implemented in M13.

Export must remain local and must not mutate source records.

---

# 11. Settings

## 11.1 Internal categories

Target-state Settings categories:

1. General
2. Appearance
3. Data & Backup
4. Notifications
5. Shortcuts
6. About & Updates

These are local Settings navigation, not primary app navigation.

## 11.2 Staged category visibility

Categories should become visible when they contain real user-facing controls.

Suggested staging:

### M10

- General
- Appearance
- Data & Backup

### M12

- Notifications
- Shortcuts

### M13

- About & Updates

Do not expose empty settings sections merely to match the final screenshot.

## 11.3 General

Approved existing examples:

- App language;
- Start of week;
- Reduce motion;
- Reflection prompts.

Do not invent settings such as startup destination or Replan visibility without a separate product decision.

## 11.4 Appearance

Existing theme and local background behavior remains supported.

Appearance organization may change visually without changing stored semantics.

## 11.5 Data & Backup

Before M13, this contains the current manual portable backup/restore behavior.

M13 adds automatic rotating local backup controls.

Manual export remains available after automatic backup exists.

## 11.6 Notifications

**Implementation milestone:** M12

Contains global reminder-related preferences only.

A specific Task’s reminder belongs in Task Detail.

## 11.7 Shortcuts

**Implementation milestone:** M12

Expose a small approved set of high-value desktop shortcuts.

Do not create a large shortcut-customization subsystem unless separately approved.

## 11.8 About & Updates

**Implementation milestone:** M13

Contains:

- installed application version;
- local/desktop identity information where useful;
- GitHub Release update awareness state.

Update awareness may:

- query stable GitHub Release metadata;
- compare semantic versions;
- show Up to date / Update available;
- open the Release page.

It must not silently download, replace, or restart the application.

---

# 12. Overlays and Modal Surfaces

## 12.1 General rules

Overlays must:

- have an accessible dialog name;
- trap or appropriately manage focus while open;
- close on explicit close action;
- support Escape when safe;
- restore focus to a sensible invoking element;
- preserve unsaved user text when an operation fails.

## 12.2 Destructive actions

Delete/reset/restore-like destructive actions require existing confirmation/safety semantics.

A visual redesign must not weaken backup/restore safety behavior.

---

# 13. Keyboard Behavior

Keyboard use is a first-class desktop requirement.

## 13.1 Navigation

Every primary and secondary navigation item must be keyboard reachable.

Focus order follows the visible reading/interaction order.

## 13.2 Global actions

When implemented:

- Search uses the approved global shortcut.
- Quick Capture receives an approved shortcut in M12 if included in the final shortcut set.

Do not assign undocumented/conflicting global shortcuts opportunistically.

## 13.3 Lists and master-detail

Task lists, Inbox rows, Search results, and other selectable collections must expose a clear keyboard focus state.

Keyboard selection must not require drag-and-drop.

## 13.4 Drag-and-drop alternatives

Any reordering or Timeline placement that uses pointer drag must have a usable keyboard-accessible alternative or equivalent non-drag interaction.

Existing Today/Meditation keyboard reorder behavior must not regress.

---

# 14. Accessibility

## 14.1 Color independence

Color must not be the sole signal for:

- selected state;
- completion;
- lapse/safe;
- error/success;
- Area identity;
- Timeline block meaning.

## 14.2 Focus

Interactive elements require visible focus indication.

Focus must remain visible in light and dark themes.

## 14.3 Labels

Icon-only buttons require accessible labels.

Input controls require explicit programmatic labels.

## 14.4 Reduced motion

When `reduceMotion` is enabled:

- remove decorative motion;
- minimize animated transitions;
- preserve state changes through static visual cues;
- do not disable functionality.

## 14.5 Contrast and text

The final implementation must maintain readable contrast for normal text, muted text, disabled state, and focus state.

M14 performs release-level accessibility hardening; M10 must still avoid known structural accessibility regressions.

---

# 15. Language and Content

## 15.1 One UI language at a time

The product supports English and Chinese through language selection.

Do not display bilingual labels simultaneously merely to demonstrate support.

## 15.2 Layout resilience

Layouts must tolerate:

- longer Chinese/English equivalents;
- mixed Chinese/English user-authored content;
- long Task titles;
- long Area names;
- multiline Reflection and Meditation content.

## 15.3 User-authored content

Changing application language must never auto-translate user-authored content.

---

# 16. Narrow Desktop / Window Resilience

The M8 desktop shell currently defines:

- default window: 1280 × 820;
- minimum window: 900 × 600.

The M9 blueprint must remain usable at the minimum desktop size.

## 16.1 Sidebar

The primary sidebar must not become a horizontal top-nav merely because the window narrows within the supported desktop range.

## 16.2 Secondary navigation

Secondary navigation may:

- use compact labels;
- use controlled overflow;
- wrap only where it remains clear;
- switch to a compact local navigation treatment.

It must not lose destinations.

## 16.3 Master-detail

At narrower widths, Tasks master-detail may adjust pane proportions or use a focus/detail transition pattern if needed.

The implementation must not make critical content inaccessible.

## 16.4 Timeline

Timeline must preserve readable time labels and block boundaries at supported widths.

Week mode may require different density from Day mode; it must not simply squeeze the Day layout seven times.

---

# 17. Failure and Loading States

## 17.1 Local database startup failure

Preserve the existing recovery philosophy:

- explain that local data could not open;
- offer safe reload/recovery;
- do not reset automatically;
- destructive reset remains explicit.

## 17.2 Loading

Loading indicators should be restrained and local to the affected surface where practical.

Do not block the entire application for an operation that can be scoped.

## 17.3 Save failure

For editable user content:

- keep unsaved content in memory;
- show an accessible error;
- permit retry.

## 17.4 Empty states

Empty states explain the next valid action without shaming or gamifying the user.

Examples:

- Inbox empty → capture when needed;
- no Today tasks → neutral empty day;
- no Meditations → invite writing without pressure;
- no Search results → neutral no-results state.

---

# 18. Appearance and Personalization

Existing local appearance assets remain supported.

Background slots currently include:

- App;
- Today;
- Calendar;
- Reflection.

M10 may adapt their visual treatment to the new shell while preserving local-only storage and current preference semantics.

The visual design must remain legible over user-selected backgrounds by using appropriate overlays/surface treatment.

---

# 19. M10 Scope Boundary

M10 implements the approved desktop information architecture and visual system **without pulling M11–M13 features forward**.

M10 may:

- implement the new desktop shell;
- consolidate existing Floating + Calendar under Plan;
- consolidate existing Tasks + Areas + Lifecycle + Rewards under Tasks;
- consolidate Reflection + Meditations under Reflect;
- reorganize existing Settings into implemented categories;
- implement master-detail presentation for existing Task information where feasible without new product data;
- improve focus/keyboard behavior that belongs to shell usability;
- preserve all M1–M8 product semantics.

M10 must not:

- create Inbox persistence;
- implement Quick Capture;
- implement Global Search;
- add Task Notes/Checklist/Duration fields;
- invent richer recurrence rules;
- implement Replan semantics;
- create Timeline/Time Blocks;
- add reminders;
- add automatic backups;
- add On This Day;
- add Reflection Templates;
- add update-awareness network behavior;
- alter Dexie merely to satisfy visual composition.

Where the v1 target visual contains a later feature, M10 should stage/hide that feature rather than implement a fake placeholder.

---

# 20. M9 Resolved Decision Register

The following decisions are frozen for the M9 blueprint and implementation contract.

## D1 — Today visual grouping — Frozen

The visual reference is illustrative; the domain model remains authoritative.

Frozen contract:

- Today uses one primary Fixed execution list containing all active Fixed occurrences due today;
- positive Tasks, positive Habits, and scheduled Avoidance habits share that Fixed execution list according to their existing domain semantics;
- Quota goals remain a separate section;
- Floating tasks remain outside Today unless a later approved interaction explicitly selects/plans them for today;
- the visual-reference label `Tasks & Habits` is not a new domain bucket and must not drive implementation.

## D2 — Timeline eligibility for Avoidance habits — Frozen

Avoidance habits are not offered as ordinary Time Block work in v1.0.

Frozen contract:

- regular Tasks may be blockable;
- positive Habits may be blockable when otherwise eligible;
- Avoidance habits do not appear as ordinary draggable/assignable work in Timeline;
- M12 may revisit this only if a concrete, semantics-preserving use case is explicitly approved.

## D3 — Search and Inbox — Frozen

Unresolved Inbox captures are excluded from Global Search in v1.0.

Frozen contract:

- Global Search guarantees Tasks, Daily Reflections, Meditations, and Areas;
- unresolved Inbox captures remain discoverable within Inbox itself;
- adding Inbox to Global Search requires a later explicit product decision rather than opportunistic implementation.

## D4 — Later-feature navigation during M10 — Frozen

Target-state navigation is staged by implementation milestone.

Frozen contract:

- M10 does not render dead or disabled placeholders for M11–M13 capabilities merely to match the final v1.0 screenshots;
- destinations/actions become visible when they are real and usable;
- the final v1.0 information architecture remains the target contract even when the currently implemented milestone exposes only a subset.

---

# 21. M9 Behavior-Spec Exit Checklist

Before this behavior specification is marked frozen:

- [x] Primary and secondary navigation responsibilities are explicit.
- [x] Visual references do not override domain semantics.
- [x] Today, Inbox, Plan, Tasks, Reflect, Review, Settings behavior is specified.
- [x] Search and Quick Capture overlay behavior is specified.
- [x] Task Detail is read-first and distinct from editing.
- [x] Fixed / Floating / Quota boundaries remain intact.
- [x] Time Blocks remain separate from schedule semantics.
- [x] Replan preserves history.
- [x] Avoidance missing data is never Safe.
- [x] Reflection remains optional and non-diagnostic.
- [x] Review remains deterministic and traceable.
- [x] Settings categories do not invent features.
- [x] Keyboard, focus, reduced-motion, and color-independence requirements are explicit.
- [x] English/Chinese layout behavior is explicit.
- [x] 900 × 600 minimum-window resilience is represented.
- [x] M10 staging does not pull M11–M13 feature implementation forward.
- [x] Resolved Decision Register is frozen.
- [x] HTML blueprint is cross-checked against this specification.
- [x] Final PDF snapshot and behavior specification agree materially.

---

## Appendix A — Target Navigation Map

```text
Daily Canvas

Today

Inbox                         [M11]

Plan
├── Floating
├── Calendar
└── Timeline                  [M12]
    ├── Day
    └── Week

Tasks
├── All Tasks
├── Areas
├── Lifecycle
└── Rewards
    └── Task Detail
        ├── Overview
        ├── Schedule
        ├── Checklist         [M11]
        ├── Notes             [M11]
        ├── Lifecycle
        ├── Reminder          [M12]
        └── History

Reflect
├── Daily Reflection
├── Meditations
└── On This Day               [M13]

Review
└── Export                    [M13]

Settings
├── General
├── Appearance
├── Data & Backup
│   └── Automatic Backup      [M13]
├── Notifications             [M12]
├── Shortcuts                 [M12]
└── About & Updates           [M13]

Global
├── Search                    [M11]
└── Quick Capture             [M11]
```

## Appendix B — Stable Semantic Distinctions

```text
Inbox item ≠ Task
Floating ≠ Inbox
Task Schedule ≠ Time Block
Task Detail ≠ Task Editor
Reflection ≠ Review
Review Summary ≠ Evidence
Checklist item ≠ Task
Duration estimate ≠ tracked time
On This Day ≠ diagnosis
Update awareness ≠ self-updater
```


## Appendix C — Frozen M9 Artifact Set

- `Daily_Canvas_M9_Desktop_Behavior_State_Spec_Frozen_v1.0.md`
- `Daily_Canvas_M9_HTML_Interaction_Blueprint_Frozen_v1.0.html`
- `Daily_Canvas_M9_Frozen_UI_Snapshot_v1.0.pdf`
- `Daily_Canvas_Desktop_UI_Visual_Reference_Frozen.pdf` — the frozen 10-page Claude Design visual reference, in `visual-reference/`.

The HTML blueprint is the interaction-oriented implementation reference; the PDF is a fixed review snapshot, not a substitute for the behavior contract.
