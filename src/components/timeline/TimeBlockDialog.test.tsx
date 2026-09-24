/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../../db";
import "../../i18n";
import { saveTask } from "../../services/taskService";
import { createTimeBlock } from "../../services/timeBlockService";
import type { Task } from "../../types";
import { TimeBlockDialog } from "./TimeBlockDialog";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const button = (label: string) => [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === label) as HTMLButtonElement | undefined;
const click = async (element?: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => { element!.click(); }); await pause(); };
const setTime = async (value: string) => {
  const input = document.querySelector('input[type="time"]') as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await pause();
};

const fixedTask = (overrides: Partial<Task> = {}): Omit<Task, "id" | "createdAt" | "updatedAt"> => ({
  title: "Write report", kind: "task", starred: false, archived: false, startDate: "2026-01-05",
  schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false, ...overrides,
});

describe("TimeBlockDialog overlap warning flow (Issue #21)", () => {
  let root: Root;
  let task: Task;
  let other: Task;

  beforeEach(async () => {
    await db.delete(); await db.open(); await initializeDb();
    task = await saveTask(fixedTask());
    other = await saveTask(fixedTask({ title: "Other" }));
    await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 60 });
  });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  const render = async () => {
    document.body.innerHTML = '<div id="root"></div>';
    let saved = 0;
    await act(async () => {
      root = createRoot(document.getElementById("root")!);
      root.render(<TimeBlockDialog task={other} defaultDate="2026-01-05" defaultStartMinutes={9 * 60 + 30} onClose={() => {}} onSaved={() => { saved += 1; }}/>);
    });
    await pause();
    return { savedCount: () => saved };
  };

  it("shows a warning with Adjust time / Save anyway instead of a hard rejection when the placement overlaps", async () => {
    const { savedCount } = await render();
    await click(button("Save"));
    expect(document.body.textContent).toContain("overlaps one or more existing Time Blocks");
    expect(button("Adjust time")).toBeTruthy();
    expect(button("Save anyway")).toBeTruthy();
    expect(button("Save")).toBeFalsy();
    expect(savedCount()).toBe(0);
    // The other, already-existing block must remain untouched.
    const untouched = (await db.timeBlocks.where("taskId").equals(task.id).toArray())[0];
    expect(untouched.startMinutes).toBe(9 * 60);
  });

  it("Adjust time returns to plain editing without saving anything", async () => {
    const { savedCount } = await render();
    await click(button("Save"));
    await click(button("Adjust time"));
    expect(button("Save anyway")).toBeFalsy();
    expect(button("Save")).toBeTruthy();
    expect(savedCount()).toBe(0);
    expect((await db.timeBlocks.where("taskId").equals(other.id).toArray())).toHaveLength(0);
  });

  it("Save anyway commits the overlapping block without mutating the conflicting one", async () => {
    const { savedCount } = await render();
    await click(button("Save"));
    await click(button("Save anyway"));
    expect(savedCount()).toBe(1);
    const created = (await db.timeBlocks.where("taskId").equals(other.id).toArray())[0];
    expect(created.startMinutes).toBe(9 * 60 + 30);
    const untouched = (await db.timeBlocks.where("taskId").equals(task.id).toArray())[0];
    expect(untouched.startMinutes).toBe(9 * 60);
    expect(untouched.durationMinutes).toBe(60);
  });

  it("changing a field after the warning clears it, requiring a fresh Save attempt", async () => {
    await render();
    await click(button("Save"));
    expect(button("Save anyway")).toBeTruthy();
    await setTime("11:00");
    expect(button("Save anyway")).toBeFalsy();
    expect(button("Save")).toBeTruthy();
  });

  it("shows the conflicting Task's title, its time range, the proposed time, and the exact intersection interval", async () => {
    await render();
    await click(button("Save"));
    const text = document.body.textContent ?? "";
    // Existing conflicting block: task "Write report", 09:00-10:00.
    expect(text).toContain("Write report");
    expect(text).toContain("09:00");
    expect(text).toContain("10:00");
    // Proposed block (from defaultStartMinutes 9:30, default 30-minute duration): 09:30-10:00.
    expect(text).toContain("09:30");
    // Intersection of 09:00-10:00 and 09:30-10:00 is 09:30-10:00.
    expect(document.querySelectorAll("[data-testid='overlap-conflict']")).toHaveLength(1);
  });
});

describe("TimeBlockDialog Start Time free-minute fidelity (corrective pass)", () => {
  let root: Root;
  let task: Task;

  beforeEach(async () => {
    await db.delete(); await db.open(); await initializeDb();
    task = await saveTask(fixedTask());
  });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  it("preserves an exact non-15-multiple typed Start Time on save instead of silently rounding it", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    let saved = 0;
    await act(async () => {
      root = createRoot(document.getElementById("root")!);
      root.render(<TimeBlockDialog task={task} defaultDate="2026-01-05" onClose={() => {}} onSaved={() => { saved += 1; }}/>);
    });
    await pause();

    await setTime("10:07");
    await click(button("Save"));

    expect(saved).toBe(1);
    const created = (await db.timeBlocks.where("taskId").equals(task.id).toArray())[0];
    // 10:07 = 607 minutes since midnight -- must be saved exactly, not rounded to 10:00 (600) or 10:15 (615).
    expect(created.startMinutes).toBe(607);
  });
});

describe("TimeBlockDialog overlap warning flow with multiple simultaneous conflicts (Issue #21)", () => {
  let root: Root;
  let task: Task;
  let other: Task;
  let third: Task;

  beforeEach(async () => {
    await db.delete(); await db.open(); await initializeDb();
    task = await saveTask(fixedTask());
    other = await saveTask(fixedTask({ title: "Other" }));
    third = await saveTask(fixedTask({ title: "Third" }));
    // Two existing blocks that will both conflict with the proposed 09:30-10:30 placement.
    await createTimeBlock({ taskId: task.id, date: "2026-01-05", startMinutes: 9 * 60, durationMinutes: 60 });
    await createTimeBlock({ taskId: third.id, date: "2026-01-05", startMinutes: 10 * 60, durationMinutes: 45 }, { allowOverlap: true });
  });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  it("renders one conflict-detail line per simultaneous overlapping block", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => {
      root = createRoot(document.getElementById("root")!);
      root.render(<TimeBlockDialog task={other} defaultDate="2026-01-05" defaultStartMinutes={9 * 60 + 30} onClose={() => {}} onSaved={() => {}}/>);
    });
    await pause();
    // Widen the default 30-minute duration so the proposed block spans both existing blocks (09:30-10:30).
    const durationInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(durationInput, "60");
      durationInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await pause();
    await click(button("Save"));
    const conflictLines = document.querySelectorAll("[data-testid='overlap-conflict']");
    expect(conflictLines).toHaveLength(2);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Write report");
    expect(text).toContain("Third");
  });
});
