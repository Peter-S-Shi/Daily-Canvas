/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLatestRelease, isDesktop, printPage, ReleaseNotFoundError, revealInFolder, saveBlob, saveBlobWithPath, UpdateCheckFailedError, UpdateNetworkError } from "./desktopAdapter";

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

  it("saveBlobWithPath reports success but no known path through a plain browser download (Issue #23)", async () => {
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {});
    await expect(saveBlobWithPath(new Blob(["hi"]), "meditations.docx")).resolves.toEqual({ saved: true, path: undefined });
  });

  it("revealInFolder is a no-op outside the desktop shell", async () => {
    await expect(revealInFolder("C:/some/path.docx")).resolves.toBeUndefined();
  });
});

describe("fetchLatestRelease response classification (Issue #15)", () => {
  it("resolves release metadata on a 200 response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ tag_name: "v0.9.0", html_url: "https://example.invalid/releases/v0.9.0" }), { status: 200 })));
    await expect(fetchLatestRelease()).resolves.toEqual({ tagName: "v0.9.0", releaseUrl: "https://example.invalid/releases/v0.9.0" });
  });

  it("throws ReleaseNotFoundError on a 404 (no published Release yet), distinct from a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    await expect(fetchLatestRelease()).rejects.toBeInstanceOf(ReleaseNotFoundError);
  });

  it("throws UpdateNetworkError when fetch itself throws (DNS/timeout/offline)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(fetchLatestRelease()).rejects.toBeInstanceOf(UpdateNetworkError);
  });

  it("throws UpdateCheckFailedError on other non-200/404 statuses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("server error", { status: 500 })));
    await expect(fetchLatestRelease()).rejects.toBeInstanceOf(UpdateCheckFailedError);
  });

  it("throws UpdateCheckFailedError on malformed release JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ nope: true }), { status: 200 })));
    await expect(fetchLatestRelease()).rejects.toBeInstanceOf(UpdateCheckFailedError);
  });
});
