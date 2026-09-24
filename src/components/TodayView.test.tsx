/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, initializeDb } from "../db";
import "../i18n";
import { TodayView } from "./TodayView";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const button = (label: string) => [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === label) as HTMLButtonElement | undefined;
const click = async (element?: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => { element!.click(); }); await pause(); };

const now = new Date().toISOString();

describe("TodayView explicit Skip wording (Issue #17)", () => {
  let root: Root;
  beforeEach(async () => {
    await db.delete(); await db.open(); await initializeDb();
    await db.tasks.add({ id: "d1", title: "Daily habit", kind: "habit", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "fixed", recurrence: { type: "daily" } }, targetDays: 21, stopReminderAtTarget: false, createdAt: now, updatedAt: now });
  });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  const render = async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => { root = createRoot(document.getElementById("root")!); root.render(<TodayView onCreateTask={() => {}} onOpenTask={() => {}} onOpenTimeline={() => {}} onOpenFloating={() => {}}/>); });
    await pause();
  };

  it("shows the explicit Skip action label, not an opaque dash", async () => {
    await render();
    const skipButton = document.querySelector(".skip-button") as HTMLButtonElement;
    expect(skipButton.textContent?.trim()).toBe("Skip");
  });

  it("shows the explicit Skipped state label once toggled", async () => {
    await render();
    await click(document.querySelector(".skip-button") as HTMLButtonElement);
    const skipButton = document.querySelector(".skip-button") as HTMLButtonElement;
    expect(skipButton.textContent?.trim()).toBe("Skipped");
  });
});

describe("TodayView Floating discoverability (Issue #19)", () => {
  let root: Root;
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  const render = async (onOpenFloating: () => void) => {
    document.body.innerHTML = '<div id="root"></div>';
    await act(async () => { root = createRoot(document.getElementById("root")!); root.render(<TodayView onCreateTask={() => {}} onOpenTask={() => {}} onOpenTimeline={() => {}} onOpenFloating={onOpenFloating}/>); });
    await pause();
  };

  it("shows a count of available Floating work and links to Floating, without inserting it into Today", async () => {
    await db.tasks.bulkAdd([
      { id: "fa", title: "Errand A", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "floating", availableFrom: "2026-01-01" }, stopReminderAtTarget: false, createdAt: now, updatedAt: now },
      { id: "fb", title: "Errand B", kind: "task", archived: false, starred: false, startDate: "2026-01-01", schedule: { mode: "floating", availableFrom: "2026-01-01" }, stopReminderAtTarget: false, createdAt: now, updatedAt: now },
    ]);
    const onOpenFloating = vi.fn();
    await render(onOpenFloating);
    expect([...document.querySelectorAll("*")].some((element) => element.textContent?.includes("2") && element.textContent?.toLowerCase().includes("floating"))).toBe(true);
    expect(document.querySelectorAll(".today-item")).toHaveLength(0);
    await click(button("Choose from Floating"));
    expect(onOpenFloating).toHaveBeenCalled();
  });

  it("shows no affordance when there is no available Floating work", async () => {
    await render(() => {});
    expect(button("Choose from Floating")).toBeFalsy();
  });
});
