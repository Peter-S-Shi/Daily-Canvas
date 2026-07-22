/** @vitest-environment jsdom */
import "fake-indexeddb/auto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import App from "./App";
import { db } from "./db";
import "./i18n";
import { createBackup, restoreBackup } from "./services/backupService";
import { toDateKey } from "./lib/dates";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const pause = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 25)); }); };
const button = (label: string) => [...document.querySelectorAll("button")].find((item) => item.textContent?.trim().includes(label)) as HTMLButtonElement | undefined;
const click = async (element?: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => { element!.click(); }); await pause(); };
const change = async (element: HTMLInputElement | HTMLSelectElement, value: string) => {
  await act(async () => {
    const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await pause();
};

describe("Milestone 2 critical browser flow", () => {
  let root: Root;
  beforeAll(async () => {
    document.body.innerHTML = '<div id="root"></div>';
    root = createRoot(document.getElementById("root")!);
    await act(async () => { root.render(<App />); });
    await pause();
  });

  afterAll(async () => {
    await act(async () => root.unmount());
    db.close();
  });

  it("launches, creates, checks in, edits history, restores a backup, and changes language", async () => {
    await click(button("Start empty"));
    expect(button("New")).toBeTruthy();

    await click(button("New"));
    await change(document.querySelector('input[required][maxlength="80"]') as HTMLInputElement, "Smoke-test habit");
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    await change(document.querySelector('input[type="date"]') as HTMLInputElement, toDateKey(yesterday));
    await click(button("Continue"));
    await click(button("Save"));
    expect((await db.tasks.toArray()).filter((item) => item.title === "Smoke-test habit")).toHaveLength(1);

    await click(document.querySelector('button[aria-label="Done"]') as HTMLButtonElement);
    expect(await db.checkIns.count()).toBe(1);

    await click(button("Calendar"));
    const dayCell = [...document.querySelectorAll(".calendar-cell:not(.outside)")].find((cell) => cell.querySelector("span")?.textContent === String(yesterday.getDate())) as HTMLButtonElement;
    await click(dayCell);
    await click(button("Skip"));
    expect(await db.checkIns.where("date").equals(toDateKey(yesterday)).first()).toMatchObject({ status: "skipped" });

    const backup = await createBackup();
    const task = (await db.tasks.toArray()).find((item) => item.title === "Smoke-test habit");
    await db.tasks.update(task!.id, { title: "Temporary change" });
    await restoreBackup(backup);
    expect((await db.tasks.toArray()).filter((item) => item.title === "Smoke-test habit")).toHaveLength(1);

    await click(button("Settings"));
    await change(document.querySelector(".setting-row select") as HTMLSelectElement, "zh-CN");
    expect(document.documentElement.lang).toBe("zh-CN");
  });
});
