/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, initializeDb } from "../db";
import "../i18n";
import { MeditationsView } from "./MeditationsView";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const button = (label: string) => [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === label) as HTMLButtonElement | undefined;
const click = async (element?: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => { element!.click(); }); await pause(); };
const checkboxes = () => [...document.querySelectorAll<HTMLInputElement>(".meditation-select input[type=checkbox]")];
const selectedCountText = () => document.querySelector(".selection-bar strong")?.textContent ?? "";

const seed = async (count: number) => {
  const now = new Date().toISOString();
  await db.meditationEntries.bulkAdd(Array.from({ length: count }, (_, index) => ({ id: `m${index}`, content: `Entry ${index}`, sortOrder: index, createdAt: now, updatedAt: now })));
};

describe("Meditations Select All / Clear All (M14-B blocker #12)", () => {
  let root: Root;
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDb(); document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.getElementById("root")!); });
  afterEach(async () => { await act(() => root.unmount()); await db.delete(); });

  const openSelectionMode = async () => { await act(async () => root.render(<MeditationsView />)); await pause(); await click(button("Select")); };

  it("Select All checks every entry and reports the correct selected count", async () => {
    await seed(5);
    await openSelectionMode();
    expect(selectedCountText()).toBe("0 selected");
    await click(button("Select All"));
    expect(checkboxes().every((box) => box.checked)).toBe(true);
    expect(selectedCountText()).toBe("5 selected");
  });

  it("Clear All unchecks every entry and resets the selected count to zero", async () => {
    await seed(4);
    await openSelectionMode();
    await click(button("Select All"));
    await click(button("Clear All"));
    expect(checkboxes().every((box) => !box.checked)).toBe(true);
    expect(selectedCountText()).toBe("0 selected");
  });

  it("individual selection still works, including after Select All and Clear All", async () => {
    await seed(3);
    await openSelectionMode();
    await click(checkboxes()[0]);
    expect(selectedCountText()).toBe("1 selected");
    await click(button("Select All"));
    await click(checkboxes()[1]);
    expect(selectedCountText()).toBe("2 selected");
    await click(button("Clear All"));
    await click(checkboxes()[2]);
    expect(selectedCountText()).toBe("1 selected");
    expect(checkboxes()[2].checked).toBe(true);
  });

  it("Export Selected exports exactly the current selected set after using Select All and deselecting one", async () => {
    await seed(6);
    await openSelectionMode();
    await click(button("Select All"));
    await click(checkboxes()[2]);
    await click(button("Export Selected"));
    await pause();
    const exportHint = document.querySelector(".meditation-export-modal")?.textContent ?? "";
    expect(exportHint.includes("5 Meditations")).toBe(true);
  });

  it("Select All and Clear All are reachable via keyboard (plain buttons, no custom widget)", async () => {
    await seed(2);
    await openSelectionMode();
    const selectAll = button("Select All")!, clearAll = button("Clear All")!;
    expect(selectAll.tagName).toBe("BUTTON");
    expect(selectAll.getAttribute("type")).toBe("button");
    expect(clearAll.tagName).toBe("BUTTON");
    expect(clearAll.getAttribute("type")).toBe("button");
  });
});
