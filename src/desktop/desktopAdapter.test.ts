/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { isDesktop, printPage, saveBlob } from "./desktopAdapter";

afterEach(() => vi.restoreAllMocks());

describe("desktop adapter in a plain browser", () => {
  it("does not report a desktop shell", () => {
    expect(isDesktop()).toBe(false);
  });

  it("saves through an anchor download with the requested file name", async () => {
    const created: HTMLAnchorElement[] = [];
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { created.push(this); });
    await expect(saveBlob(new Blob(["{}"]), "daily-canvas-backup-2026-01-01.json")).resolves.toBe(true);
    expect(created[0].download).toBe("daily-canvas-backup-2026-01-01.json");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("prints with the browser print dialog", async () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    await printPage();
    expect(print).toHaveBeenCalledOnce();
  });
});
