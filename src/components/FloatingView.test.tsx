/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../db";
import "../i18n";
import { todayKey } from "../lib/dates";
import { FloatingView } from "./FloatingView";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const button = (label: string) => [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === label) as HTMLButtonElement | undefined;
const click = async (element?: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => { element!.click(); }); await pause(); };

const now = new Date().toISOString();

describe("FloatingView in-context Undo (Issue #17)", () => {
  let root: Root;
  beforeEach(async () => {
    await db.delete(); await db.open(); await initializeDb();
    await db.tasks.add({ id: "f1", title: "Return library book", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "floating", availableFrom: "2026-01-01" }, stopReminderAtTarget: false, createdAt: now, updatedAt: now });
  });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  const render = async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => { root = createRoot(document.getElementById("root")!); root.render(<FloatingView onCreateTask={() => {}} onOpenTask={() => {}}/>); });
    await pause();
  };

  it("offers Undo right on a completed Floating item, without requiring a trip to Calendar", async () => {
    await db.checkIns.put({ id: `f1:${todayKey()}`, taskId: "f1", date: todayKey(), status: "done", updatedAt: now });
    await render();
    const undo = button("Undo");
    expect(undo).toBeTruthy();
    await click(undo);
    expect(await db.checkIns.get(`f1:${todayKey()}`)).toBeUndefined();
  });

  it("does not show Undo for a Floating item that is not yet completed", async () => {
    await render();
    expect(button("Undo")).toBeFalsy();
  });
});
