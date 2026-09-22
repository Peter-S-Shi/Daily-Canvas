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
const waitForButton = async (label: string) => { for (let attempt = 0; attempt < 20; attempt += 1) { const found = button(label); if (found) return found; await pause(); } return undefined; };
const click = async (element?: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => { element!.click(); }); await pause(); };
const change = async (element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) => {
  await act(async () => {
    const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await pause();
};

describe("Milestone 4 critical browser flow", () => {
  let root: Root;
  beforeAll(async () => {
    await db.delete();
    document.body.innerHTML = '<div id="root"></div>';
    root = createRoot(document.getElementById("root")!);
    await act(async () => { root.render(<App />); });
    await pause();
  });

  afterAll(async () => {
    await act(async () => root.unmount());
    db.close();
  });

  it("launches and uses Areas, fixed, floating, and quota planning before backup restore", async () => {
    await click(await waitForButton("Start empty"));
    expect(button("New")).toBeTruthy();

    await click(button("Quick Capture"));
    await change(document.querySelector('#quick-capture-title + p')?.parentElement?.parentElement?.querySelector('input[maxlength="160"]') as HTMLInputElement || document.querySelector('input[maxlength="160"]') as HTMLInputElement, "Captured thought");
    await click(button("Save to Inbox"));
    expect(await db.inboxCaptures.filter((item) => item.title === "Captured thought").count()).toBe(1);
    await click(button("Inbox"));
    expect(document.querySelector(".inbox-list")?.textContent).toContain("Captured thought");
    await click(button("Today"));

    await click(button("New"));
    await change(document.querySelector('input[required][maxlength="80"]') as HTMLInputElement, "Smoke-test habit");
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    await change(document.querySelector('input[type="date"]') as HTMLInputElement, toDateKey(yesterday));
    await click(button("Continue"));
    await click(button("Save"));
    expect((await db.tasks.toArray()).filter((item) => item.title === "Smoke-test habit")).toHaveLength(1);

    await click(document.querySelector('button[aria-label="Done"]') as HTMLButtonElement);
    expect(await db.checkIns.count()).toBe(1);

    await click(button("Plan"));
    await click(button("Calendar"));
    const dayCell = [...document.querySelectorAll(".calendar-cell:not(.outside)")].find((cell) => cell.querySelector("span")?.textContent === String(yesterday.getDate())) as HTMLButtonElement;
    await click(dayCell);
    await click(button("Skip"));
    expect(await db.checkIns.where("date").equals(toDateKey(yesterday)).first()).toMatchObject({ status: "skipped" });

    await click(button("Tasks"));
    await click(button("Areas"));
    await click(button("New Area"));
    await change(document.querySelector('.area-form input[maxlength="40"]') as HTMLInputElement, "Wellbeing");
    await click(document.querySelector('.area-form button[type="submit"]') as HTMLButtonElement);
    const area = await db.areas.where("name").equals("Wellbeing").first();
    expect(area).toBeTruthy();

    await click(button("All tasks"));
    await click(button("New task"));
    await change(document.querySelector('input[required][maxlength="80"]') as HTMLInputElement, "Flexible errand");
    await click(button("Floating task"));
    await click(button("Continue"));
    await change(document.querySelector('.task-form select') as HTMLSelectElement, area!.id);
    await click(button("Save"));
    expect((await db.tasks.toArray()).find((item) => item.title === "Flexible errand")).toMatchObject({ areaId: area!.id, schedule: { mode: "floating" } });
    await click(button("Plan"));
    await click(button("Floating"));
    await click(button("Complete today"));
    expect(await db.checkIns.get(`${(await db.tasks.filter((item) => item.title === "Flexible errand").first())!.id}:${toDateKey(new Date())}`)).toMatchObject({ status: "done" });

    await click(button("Today"));
    await click(button("New task"));
    await change(document.querySelector('input[required][maxlength="80"]') as HTMLInputElement, "Weekly practice");
    await click(button("Quota goal"));
    await change(document.querySelector('.task-form input[type="number"]') as HTMLInputElement, "2");
    await click(button("Continue"));
    await change(document.querySelector('.task-form select') as HTMLSelectElement, area!.id);
    await click(button("Save"));
    expect((await db.tasks.toArray()).find((item) => item.title === "Weekly practice")).toMatchObject({ areaId: area!.id, schedule: { mode: "quota", period: "week", targetCount: 2 } });
    await click(button("Today"));
    await click(document.querySelector('.quota-card .round-check') as HTMLButtonElement);

    const backup = await createBackup();
    expect(backup).toMatchObject({ version: 7 });
    expect(backup.areas).toHaveLength(1);
    const task = (await db.tasks.toArray()).find((item) => item.title === "Smoke-test habit");
    await db.tasks.update(task!.id, { title: "Temporary change" });
    await restoreBackup(backup);
    expect((await db.tasks.toArray()).filter((item) => item.title === "Smoke-test habit")).toHaveLength(1);

    await click(button("Reflect"));
    await click(button("Calm"));
    await click(button("Skip prompt"));
    expect(button("Skip prompt")).toBeUndefined();
    await change(document.querySelector(".full-journal") as HTMLTextAreaElement, "A complete reflection.\n\nWith another paragraph.");
    await click(button("Save daily reflection"));
    expect((await db.dailyReflections.toArray())[0]).toMatchObject({ note: "A complete reflection.\n\nWith another paragraph." });

    await click(button("Review"));
    await click(button("Custom"));
    const rangeInputs = [...document.querySelectorAll(".range-fields input")] as HTMLInputElement[];
    await change(rangeInputs[0], toDateKey(new Date()));
    await change(rangeInputs[1], toDateKey(new Date()));
    expect(document.querySelector(".review-summary")?.textContent).toContain("You completed");
    await click(document.querySelector(".completion-groups summary") as HTMLElement);
    await click(document.querySelector(".evidence-dates button") as HTMLButtonElement);
    expect(document.querySelector(".date-detail")?.textContent).toContain("Supporting records");

    await click(button("Settings"));
    await click(button("中文"));
    expect(document.documentElement.lang).toBe("zh-CN");
  });
});
