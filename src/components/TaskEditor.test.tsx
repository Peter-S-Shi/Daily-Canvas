/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../db";
import "../i18n";
import type { Task } from "../types";
import { TaskEditor } from "./TaskEditor";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const button = (label: string) => [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === label) as HTMLButtonElement | undefined;
const click = async (element?: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => { element!.click(); }); await pause(); };
const type = async (element: HTMLInputElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await pause();
};

describe("TaskEditor Save & Schedule (Issue #20)", () => {
  let root: Root;
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  const render = (onSaveAndSchedule: (task: Task) => void, onClose: () => void) => {
    document.body.innerHTML = '<div id="root"></div>';
    return act(async () => {
      root = createRoot(document.getElementById("root")!);
      root.render(<TaskEditor onSaveAndSchedule={onSaveAndSchedule} onClose={onClose}/>);
    });
  };

  it("offers Save & Schedule for a new, schedulable Task and hands back the saved Task without closing into an inconsistent state", async () => {
    let scheduledTask: Task | undefined;
    let closed = false;
    await render((task) => { scheduledTask = task; }, () => { closed = true; });
    await pause();
    const titleInput = document.querySelector('input[maxlength="80"]') as HTMLInputElement;
    await type(titleInput, "Plan the launch");
    await click(button("Continue"));
    const scheduleButton = button("Save & Schedule");
    expect(scheduleButton).toBeTruthy();
    await click(scheduleButton);
    expect(closed).toBe(true);
    expect(scheduledTask?.title).toBe("Plan the launch");
    // The Task's own Schedule (recurrence/fixed-date config) is untouched by this action -- it is exactly what the form specified.
    expect(scheduledTask?.schedule.mode).toBe("fixed");
    const persisted = await db.tasks.get(scheduledTask!.id);
    expect(persisted?.title).toBe("Plan the launch");
  });

  it("does not offer Save & Schedule for an Avoidance habit, which cannot hold a Time Block", async () => {
    await render(() => {}, () => {});
    await pause();
    const titleInput = document.querySelector('input[maxlength="80"]') as HTMLInputElement;
    await type(titleInput, "No sugar");
    await click(button("Habit to avoid"));
    await click(button("Continue"));
    expect(button("Save & Schedule")).toBeFalsy();
  });
});
