# Daily Canvas — M9 Frozen Blueprint Manifest

Status: Frozen v1.0
Approved: 2026-09-22
Milestone: M9 — Desktop Information Architecture and UI Blueprint

## Frozen artifact set

1. `Daily_Canvas_M9_Desktop_Behavior_State_Spec_Frozen_v1.0.md`
   - Authoritative behavior/state contract beneath product/domain governance docs.

2. `Daily_Canvas_M9_HTML_Interaction_Blueprint_Frozen_v1.0.html`
   - Interactive target-state desktop blueprint.
   - Human visual pass approved from v0.3 before freeze.

3. `Daily_Canvas_M9_Frozen_UI_Snapshot_v1.0.pdf`
   - Ten-page fixed snapshot generated from the frozen HTML blueprint.
   - Review artifact only; it does not override the behavior contract.

4. `Daily_Canvas_Desktop_UI_Visual_Reference_Frozen.pdf`
   - Frozen Claude Design visual reference used during M9 visual exploration.

## Authority order

1. `ARCHITECTURE.md`, `ROADMAP.md`, and current approved domain semantics
2. Frozen Behavior & State Specification
3. Frozen HTML Interaction Blueprint
4. Frozen visual/PDF references
5. Implementation convenience

## Milestone staging reminder

- M10: desktop shell / IA migration using existing capabilities
- M11: Inbox, Quick Capture, Search, task enrichment, richer recurrence, Replan
- M12: Timeline / Time Blocking, reminders, desktop shortcuts
- M13: Reflection Templates, On This Day, local Reflection/Review export, automatic backup, update awareness

M10 must not expose dead placeholders or pull M11-M13 feature implementation forward merely to match the target-state visual reference.

## Recommended repository locations

- `docs/m9-desktop-ui-blueprint/behavior-spec/`
- `docs/m9-desktop-ui-blueprint/html-blueprint/`
- `docs/m9-desktop-ui-blueprint/frozen-pdf/`
- `docs/m9-desktop-ui-blueprint/visual-reference/`

## Status

M9 is complete. The artifact set was integrated in PR #3 and accepted as the M10 implementation contract at M10 Human Gate 1. Any later change to these artifacts is an explicit errata or a new recorded decision, not remaining M9 work.

Errata (2026-09-22, reconciled at M10 Human Gate 1): the visual-reference location above previously pointed to a pre-freeze working folder, and this section previously described integration and review as still outstanding. The Behavior & State Specification carries its own errata note. No product decision changed.
