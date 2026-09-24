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
});
