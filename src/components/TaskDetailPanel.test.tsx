/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { useLiveQuery } from "dexie-react-hooks";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../db";
import "../i18n";
import { TaskDetailPanel } from "./TaskDetailPanel";
import type { Task } from "../types";

/** Mirrors how TasksView keeps the prop in sync with the live record, so Save/Cancel round-trips are observable here too. */
function Harness({ taskId }: { taskId: string }) {
  const task = useLiveQuery(() => db.tasks.get(taskId), [taskId]);
  return <TaskDetailPanel task={task} onEdit={() => {}} onDeleted={() => {}} onInspectDate={() => {}} onOpenLifecycle={() => {}}/>;
}

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const button = (label: string) => [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === label) as HTMLButtonElement | undefined;
const click = async (element?: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => { element!.click(); }); await pause(); };
const tab = async (label: string) => { for (let attempt = 0; attempt < 20; attempt += 1) { const found = [...document.querySelectorAll("[role=tab]")].find((item) => item.textContent === label) as HTMLElement | undefined; if (found) return found; await pause(); } return undefined; };
const change = async (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  await act(async () => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await pause();
};

const now = new Date().toISOString();
const task: Task = { id: "t1", title: "Trip prep", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false, notes: "Original note", checklist: [{ id: "i1", title: "Pack bags", completed: false, createdAt: now, updatedAt: now }], createdAt: now, updatedAt: now };

describe("TaskDetailPanel Notes local editing (Issue #18)", () => {
  let root: Root;
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); await db.tasks.put(task); });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  const render = async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => { root = createRoot(document.getElementById("root")!); root.render(<Harness taskId="t1"/>); });
    await pause(); await pause();
  };

  it("is read-only until Edit is pressed, then Save persists the change via updateTask", async () => {
    await render();
    await click(await tab("Notes"));
    expect(document.querySelector(".task-notes p")?.textContent).toBe("Original note");
    expect(document.querySelector(".task-notes textarea")).toBeFalsy();

    await click(document.querySelector(".notes-edit-toggle") as HTMLButtonElement);
    const textarea = document.querySelector(".task-notes textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    await change(textarea, "Updated note");
    await click(button("Save Notes"));

    expect((await db.tasks.get("t1"))?.notes).toBe("Updated note");
    expect(document.querySelector(".task-notes textarea")).toBeFalsy();
    expect(document.querySelector(".task-notes p")?.textContent).toBe("Updated note");
  });

  it("Cancel discards the draft and leaves the stored note untouched", async () => {
    await render();
    await click(await tab("Notes"));
    await click(document.querySelector(".notes-edit-toggle") as HTMLButtonElement);
    const textarea = document.querySelector(".task-notes textarea") as HTMLTextAreaElement;
    await change(textarea, "Discard me");
    await click(button("Cancel"));
    expect((await db.tasks.get("t1"))?.notes).toBe("Original note");
    expect(document.querySelector(".task-notes p")?.textContent).toBe("Original note");
  });
});

describe("TaskDetailPanel Checklist local editing (Issue #18)", () => {
  let root: Root;
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); await db.tasks.put(task); });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  const render = async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => { root = createRoot(document.getElementById("root")!); root.render(<Harness taskId="t1"/>); });
    await pause(); await pause();
  };

  it("adds a new checklist item", async () => {
    await render();
    await click(await tab("Checklist"));
    const input = document.querySelector(".checklist-add input") as HTMLInputElement;
    await change(input, "Book taxi");
    await click(button("Add checklist item"));
    const saved = await db.tasks.get("t1");
    expect(saved?.checklist?.map((item) => item.title)).toEqual(["Pack bags", "Book taxi"]);
  });

  it("renames an existing checklist item in place", async () => {
    await render();
    await click(await tab("Checklist"));
    await click(document.querySelector(".checklist-list button.quiet-action") as HTMLButtonElement);
    const renameInput = document.querySelector(".checklist-list input[type=text]") as HTMLInputElement;
    await change(renameInput, "Pack bags for trip");
    await click(document.querySelector(".checklist-list button[type=submit]") as HTMLButtonElement);
    const saved = await db.tasks.get("t1");
    expect(saved?.checklist?.[0].title).toBe("Pack bags for trip");
  });

  it("deletes a checklist item", async () => {
    await render();
    await click(await tab("Checklist"));
    await click(document.querySelectorAll(".checklist-list button.danger-text")[0] as HTMLButtonElement);
    const saved = await db.tasks.get("t1");
    expect(saved?.checklist).toHaveLength(0);
  });

  it("existing immediate checkbox-toggle completion keeps working", async () => {
    await render();
    await click(await tab("Checklist"));
    const checkbox = document.querySelector(".checklist-list input[type=checkbox]") as HTMLInputElement;
    await click(checkbox);
    const saved = await db.tasks.get("t1");
    expect(saved?.checklist?.[0].completed).toBe(true);
  });
});
