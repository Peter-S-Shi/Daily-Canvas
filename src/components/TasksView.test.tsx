/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../db";
import "../i18n";
import { todayKey } from "../lib/dates";
import { TasksView } from "./TasksView";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const button = (label: string) => [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === label) as HTMLButtonElement | undefined;
// The bulk selection bar's Select All / Clear All / Apply / Cancel controls are icon-only in the narrow
// pane (Issue #16 overflow fix); they're findable by their required aria-label, not by glyph text.
const iconButton = (label: string) => document.querySelector(`.bulk-actions button[aria-label="${label}"]`) as HTMLButtonElement | undefined;
const click = async (element?: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => { element!.click(); }); await pause(); };
const change = async (element: HTMLSelectElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await pause();
};
const rowCheckboxes = () => [...document.querySelectorAll<HTMLInputElement>(".task-select input[type=checkbox]")];
const rowText = (title: string) => [...document.querySelectorAll(".task-row, .task-row-copy")].find((item) => item.textContent?.includes(title))?.textContent ?? "";

const now = new Date().toISOString();
const baseTask = { archived: false, starred: false, stopReminderAtTarget: false, createdAt: now, updatedAt: now };

const render = async () => {
  let root!: Root;
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => { root = createRoot(document.getElementById("root")!); root.render(<TasksView selectedTaskId="" onSelectTask={() => {}} onCreateTask={() => {}} onEditTask={() => {}} onInspectDate={() => {}} onOpenLifecycle={() => {}}/>); });
  await pause();
  return root;
};

describe("TasksView type-aware state grammar (Issue #17)", () => {
  let root: Root;
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  it("shows Incomplete / Completed with date for a one-time Task", async () => {
    await db.tasks.bulkAdd([
      { ...baseTask, id: "t1", title: "Pending errand", kind: "task", startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } } },
      { ...baseTask, id: "t2", title: "Done errand", kind: "task", startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } } },
    ]);
    await db.checkIns.put({ id: "t2:2026-01-02", taskId: "t2", date: "2026-01-02", status: "done", updatedAt: now });
    root = await render();
    expect(rowText("Pending errand")).toContain("Incomplete");
    expect(rowText("Done errand")).toContain("2026-01-02");
  });

  it("shows Done / Unrecorded / Skipped today's state for a recurring good Habit", async () => {
    await db.tasks.bulkAdd([
      { ...baseTask, id: "h1", title: "Read", kind: "habit", startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21 },
      { ...baseTask, id: "h2", title: "Stretch", kind: "habit", startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21 },
    ]);
    await db.checkIns.put({ id: `h1:${todayKey()}`, taskId: "h1", date: todayKey(), status: "done", updatedAt: now });
    await db.checkIns.put({ id: `h2:${todayKey()}`, taskId: "h2", date: todayKey(), status: "skipped", updatedAt: now });
    root = await render();
    expect(rowText("Read")).toContain("Done");
    expect(rowText("Stretch")).toContain("Skipped");
  });

  it("shows Safe / Lapse / Unrecorded today's state for an Avoidance Habit", async () => {
    await db.tasks.bulkAdd([
      { ...baseTask, id: "a1", title: "No sugar", kind: "avoidance", startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21 },
      { ...baseTask, id: "a2", title: "No caffeine", kind: "avoidance", startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21 },
    ]);
    await db.checkIns.put({ id: `a1:${todayKey()}`, taskId: "a1", date: todayKey(), status: "done", updatedAt: now });
    await db.checkIns.put({ id: `a2:${todayKey()}`, taskId: "a2", date: todayKey(), status: "lapse", updatedAt: now });
    root = await render();
    expect(rowText("No sugar")).toContain("Safe");
    expect(rowText("No caffeine")).toContain("Log a lapse");
  });

  it("shows current-period progress for a Quota Habit, reusing quotaService", async () => {
    await db.tasks.add({ ...baseTask, id: "q1", title: "Gym", kind: "habit", startDate: "2026-01-01", schedule: { mode: "quota", period: "week", targetCount: 3, availableFrom: "2026-01-01" } });
    await db.checkIns.put({ id: "q1:2026-01-01", taskId: "q1", date: todayKey(), status: "done", updatedAt: now });
    root = await render();
    expect(rowText("Gym")).toContain("/3");
  });

  it("shows a neutral not-scheduled state for a weekly Habit on a non-occurrence day, and real state on its occurrence day", async () => {
    const today = new Date();
    const occurrenceWeekday = today.getDay();
    const nonOccurrenceWeekday = (occurrenceWeekday + 1) % 7;
    await db.tasks.bulkAdd([
      { ...baseTask, id: "w1", title: "Weekly review (off day)", kind: "habit", startDate: "2020-01-01", schedule: { mode: "fixed", recurrence: { type: "weekdays", weekdays: [nonOccurrenceWeekday] } }, targetDays: 21 },
      { ...baseTask, id: "w2", title: "Weekly review (on day)", kind: "habit", startDate: "2020-01-01", schedule: { mode: "fixed", recurrence: { type: "weekdays", weekdays: [occurrenceWeekday] } }, targetDays: 21 },
    ]);
    root = await render();
    expect(rowText("Weekly review (off day)")).toContain("Not scheduled today");
    expect(rowText("Weekly review (off day)")).not.toContain("Unrecorded");
    expect(rowText("Weekly review (on day)")).toContain("Unrecorded");
  });

  it("shows a neutral not-scheduled state for a Habit whose start date is in the future", async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    const futureKey = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;
    await db.tasks.add({ ...baseTask, id: "f1", title: "Not yet started", kind: "habit", startDate: futureKey, schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21 });
    root = await render();
    expect(rowText("Not yet started")).toContain("Not scheduled today");
  });

  it("shows optional step progress for a checklist-heavy one-time Task without auto-completing it", async () => {
    await db.tasks.add({ ...baseTask, id: "c1", title: "Trip prep", kind: "task", startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, checklist: [
      { id: "i1", title: "Pack", completed: true, createdAt: now, updatedAt: now },
      { id: "i2", title: "Book", completed: false, createdAt: now, updatedAt: now },
    ] });
    root = await render();
    expect(rowText("Trip prep")).toContain("1/2");
    expect(rowText("Trip prep")).not.toContain("Completed");
    expect((await db.tasks.get("c1"))?.archived).toBe(false);
  });
});

describe("TasksView bulk selection (Issue #16)", () => {
  let root: Root;
  let area1 = "";
  beforeEach(async () => {
    await db.delete(); await db.open(); await initializeDb();
    const area = await db.areas.add({ id: "area-work", name: "Work", color: "#000", sortOrder: 0, archived: false, createdAt: now, updatedAt: now } as never);
    area1 = String(area);
    await db.tasks.bulkAdd([
      { ...baseTask, id: "s1", title: "Alpha", kind: "task", startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } } },
      { ...baseTask, id: "s2", title: "Beta", kind: "task", startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } } },
      { ...baseTask, id: "s3", title: "Gamma", kind: "task", startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } } },
    ]);
  });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  it("Select All / Clear All only affect the current filtered scope, not the whole dataset", async () => {
    root = await render();
    await click(button("Select"));
    const search = document.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "Alpha"); search.dispatchEvent(new Event("input", { bubbles: true })); });
    await pause();
    expect(rowCheckboxes()).toHaveLength(1);
    await click(iconButton("Select All"));
    expect(rowCheckboxes().every((box) => box.checked)).toBe(true);
    await click(iconButton("Clear All"));
    expect(rowCheckboxes().every((box) => !box.checked)).toBe(true);
  });

  it("bulk Change Area moves only the selected Tasks", async () => {
    root = await render();
    await click(button("Select"));
    await click(rowCheckboxes()[0]);
    await click(rowCheckboxes()[1]);
    const areaSelect = document.querySelector(".bulk-actions select") as HTMLSelectElement;
    await change(areaSelect, area1);
    await click(iconButton("Apply"));
    const tasks = await db.tasks.toArray();
    const moved = tasks.filter((task) => task.areaId === area1);
    expect(moved.map((task) => task.id).sort()).toEqual(["s1", "s2"]);
    expect(tasks.find((task) => task.id === "s3")?.areaId).toBeUndefined();
  });

  it("Apply stays disabled while only the placeholder is chosen, and never clears Area implicitly", async () => {
    root = await render();
    await click(button("Select"));
    await click(rowCheckboxes()[0]);
    expect(iconButton("Apply")?.disabled).toBe(true);
    await click(iconButton("Apply"));
    expect((await db.tasks.get("s1"))?.areaId).toBeUndefined();
  });

  it("offers an explicit 'No Area' option distinct from the placeholder, and excludes archived Areas", async () => {
    await db.areas.add({ id: "area-old", name: "Retired", color: "#111", sortOrder: 1, archived: true, createdAt: now, updatedAt: now } as never);
    await db.tasks.update("s1", { areaId: area1 });
    root = await render();
    await click(button("Select"));
    const areaSelect = document.querySelector(".bulk-actions select") as HTMLSelectElement;
    const optionLabels = [...areaSelect.options].map((option) => option.textContent);
    expect(optionLabels).toContain("No Area");
    expect(optionLabels).not.toContain("Retired");
    await click(rowCheckboxes()[0]);
    const noAreaOption = [...areaSelect.options].find((option) => option.textContent === "No Area")!;
    await change(areaSelect, noAreaOption.value);
    expect(iconButton("Apply")?.disabled).toBe(false);
    await click(iconButton("Apply"));
    expect((await db.tasks.get("s1"))?.areaId).toBeUndefined();
  });

  it("drops now-hidden selected Tasks from Apply when the visible scope changes", async () => {
    root = await render();
    await click(button("Select"));
    await click(rowCheckboxes()[0]); // Alpha (s1)
    await click(rowCheckboxes()[1]); // Beta (s2)
    const search = document.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "Alpha"); search.dispatchEvent(new Event("input", { bubbles: true })); });
    await pause();
    // Only Alpha is visible now; Beta is selected-but-hidden.
    expect(rowCheckboxes()).toHaveLength(1);
    const areaSelect = document.querySelector(".bulk-actions select") as HTMLSelectElement;
    await change(areaSelect, area1);
    await click(iconButton("Apply"));
    const tasks = await db.tasks.toArray();
    expect(tasks.find((task) => task.id === "s1")?.areaId).toBe(area1);
    expect(tasks.find((task) => task.id === "s2")?.areaId).toBeUndefined();
  });

  it("the icon-only Select All/Clear All/Apply/Cancel controls carry a title tooltip and a matching aria-label, and stay plain keyboard-reachable buttons", async () => {
    root = await render();
    await click(button("Select"));
    for (const label of ["Select All", "Clear All", "Apply", "Cancel Selection"]) {
      const control = iconButton(label);
      expect(control, `${label} control should exist`).toBeTruthy();
      expect(control!.tagName).toBe("BUTTON");
      expect(control!.getAttribute("type")).toBe("button");
      expect(control!.getAttribute("title")).toBe(label);
      expect(control!.getAttribute("aria-label")).toBe(label);
    }
  });
});
