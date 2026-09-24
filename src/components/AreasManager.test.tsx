/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, initializeDb } from "../db";
import "../i18n";
import { AreasManager } from "./AreasManager";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const button = (label: string) => [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === label) as HTMLButtonElement | undefined;
const click = async (element?: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => { element!.click(); }); await pause(); };

const now = new Date().toISOString();

describe("AreasManager member drill-down (Issue #16)", () => {
  let root: Root;
  beforeEach(async () => {
    await db.delete(); await db.open(); await initializeDb();
    await db.areas.add({ id: "area-1", name: "Work", color: "#000", sortOrder: 0, archived: false, createdAt: now, updatedAt: now });
    await db.tasks.bulkAdd([
      { id: "t1", title: "Write report", kind: "task", areaId: "area-1", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false, createdAt: now, updatedAt: now },
      { id: "t2", title: "Review PR", kind: "task", areaId: "area-1", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false, createdAt: now, updatedAt: now },
      { id: "t3", title: "Unrelated", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "once" } }, stopReminderAtTarget: false, createdAt: now, updatedAt: now },
    ]);
  });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  const render = async (onOpenTask: (id: string) => void) => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => { root = createRoot(document.getElementById("root")!); root.render(<AreasManager onOpenTask={onOpenTask}/>); });
    await pause();
  };

  it("expands an Area row to list only its member Tasks by title", async () => {
    await render(() => {});
    expect(document.querySelector(".area-row")?.textContent).not.toContain("Write report");
    await click(button("Expand"));
    const memberList = document.querySelector(".area-members");
    expect(memberList?.textContent).toContain("Write report");
    expect(memberList?.textContent).toContain("Review PR");
    expect(memberList?.textContent).not.toContain("Unrelated");
  });

  it("collapses back when toggled again", async () => {
    await render(() => {});
    await click(button("Expand"));
    expect(document.querySelector(".area-members")).toBeTruthy();
    await click(button("Collapse"));
    expect(document.querySelector(".area-members")).toBeFalsy();
  });

  it("clicking a member Task navigates directly to that Task's detail", async () => {
    const onOpenTask = vi.fn();
    await render(onOpenTask);
    await click(button("Expand"));
    await click(button("Write report"));
    expect(onOpenTask).toHaveBeenCalledWith("t1");
  });

  it("shows an empty hint when the Area has no member Tasks", async () => {
    await db.areas.add({ id: "area-2", name: "Empty", color: "#111", sortOrder: 1, archived: false, createdAt: now, updatedAt: now });
    await render(() => {});
    const expandButtons = [...document.querySelectorAll("button")].filter((item) => item.textContent?.trim() === "Expand");
    await click(expandButtons[1]);
    expect(document.querySelectorAll(".area-members")[0]?.textContent ?? "").toContain("No Tasks in this Area yet.");
  });
});
