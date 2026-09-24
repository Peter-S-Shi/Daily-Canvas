/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../../db";
import "../../i18n";
import { todayKey } from "../../lib/dates";
import { saveTask } from "../../services/taskService";
import { createTimeBlock } from "../../services/timeBlockService";
import { TimelineView } from "./TimelineView";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
// jsdom does not implement scrollTo; TimelineView calls it purely for a convenience scroll position (not domain behavior).
if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};

const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); };

describe("TimelineView Day View current-time line date-gating (Issue #20)", () => {
  let root: Root;
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  const render = async (initialDate: string) => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => {
      root = createRoot(document.getElementById("root")!);
      root.render(<TimelineView weekStartsOn={1} initialDate={initialDate} onOpenTask={() => {}}/>);
    });
    await pause(); await pause();
  };

  it("shows the current-time line when the viewed date is the real-world current day", async () => {
    await render(todayKey());
    expect(document.querySelector('[data-testid="timeline-now-line"]')).not.toBeNull();
  });

  it("never shows the current-time line for a date other than today, even a nearby one", async () => {
    await render("2020-06-15");
    expect(document.querySelector('[data-testid="timeline-now-line"]')).toBeNull();
  });
});

describe("TimelineView Available Work has-a-block indicator (Issue #20)", () => {
  let root: Root;
  const date = "2026-02-10";
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  const render = async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => {
      root = createRoot(document.getElementById("root")!);
      root.render(<TimelineView weekStartsOn={1} initialDate={date} onOpenTask={() => {}}/>);
    });
    await pause(); await pause();
  };

  it("indicates a Task already has a Time Block on the viewed date without hiding the Schedule action", async () => {
    const scheduled = await saveTask({ title: "Scheduled task", kind: "task", starred: false, archived: false, startDate: date, schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    const unscheduled = await saveTask({ title: "Unscheduled task", kind: "task", starred: false, archived: false, startDate: date, schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    await createTimeBlock({ taskId: scheduled.id, date, startMinutes: 9 * 60, durationMinutes: 30 });
    await render();
    expect(document.querySelector(`[data-testid="has-block-${scheduled.id}"]`)).not.toBeNull();
    expect(document.querySelector(`[data-testid="has-block-${unscheduled.id}"]`)).toBeNull();
    // Still offers to add more blocks -- the indicator never removes the Schedule action.
    const scheduleButtons = [...document.querySelectorAll(".available-work-panel button")].filter((el) => el.textContent?.includes("Schedule"));
    expect(scheduleButtons.length).toBeGreaterThanOrEqual(2);
  });
});

describe("TimelineView drag overlap confirmation (Issue #21)", () => {
  let root: Root;
  const date = "2026-02-10";
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  it("warns on an overlapping drop and moves only the dragged block after Save anyway", async () => {
    const anchorTask = await saveTask({ title: "Anchor", kind: "task", starred: false, archived: false, startDate: date, schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    const movingTask = await saveTask({ title: "Moving", kind: "task", starred: false, archived: false, startDate: date, schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false });
    const anchor = await createTimeBlock({ taskId: anchorTask.id, date, startMinutes: 9 * 60, durationMinutes: 60 });
    const moving = await createTimeBlock({ taskId: movingTask.id, date, startMinutes: 12 * 60, durationMinutes: 30 });
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => {
      root = createRoot(document.getElementById("root")!);
      root.render(<TimelineView weekStartsOn={1} initialDate={date} onOpenTask={() => {}}/>);
    });
    await pause(); await pause();

    let draggedId = "";
    const dataTransfer = { setData: (_type: string, value: string) => { draggedId = value; }, getData: () => draggedId };
    const movingChip = [...document.querySelectorAll<HTMLButtonElement>(".time-block-chip")].find((item) => item.textContent?.includes("Moving"))!;
    movingChip.dispatchEvent(Object.assign(new Event("dragstart", { bubbles: true }), { dataTransfer }));
    const overlappingRow = document.querySelectorAll<HTMLElement>(".timeline-row")[9 * 4 + 1];
    await act(async () => { overlappingRow.dispatchEvent(Object.assign(new Event("drop", { bubbles: true }), { dataTransfer })); });
    await pause();

    expect(document.body.textContent).toContain("overlaps one or more existing Time Blocks");
    const saveAnyway = [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.trim() === "Save anyway");
    expect(saveAnyway).toBeTruthy();
    expect((await db.timeBlocks.get(moving.id))?.startMinutes).toBe(12 * 60);

    await act(async () => { saveAnyway!.click(); });
    await pause();
    expect((await db.timeBlocks.get(moving.id))?.startMinutes).toBe(9 * 60 + 15);
    expect(await db.timeBlocks.get(anchor.id)).toEqual(anchor);
  });
});
