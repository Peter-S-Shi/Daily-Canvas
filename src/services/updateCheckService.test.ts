import { describe, expect, it } from "vitest";
import { ReleaseNotFoundError, UpdateCheckFailedError, UpdateNetworkError } from "../desktop/desktopAdapter";
import { checkForUpdate, compareVersions } from "./updateCheckService";

describe("updateCheckService", () => {
  it("compares dotted versions numerically, ignoring an optional leading 'v'", () => {
    expect(compareVersions("0.7.0", "v0.7.0")).toBe(0);
    expect(compareVersions("0.7.0", "0.8.0")).toBe(-1);
    expect(compareVersions("1.0.0", "0.9.9")).toBe(1);
    expect(compareVersions("0.10.0", "0.9.0")).toBe(1); // numeric, not lexical
  });

  it("reports up-to-date when the installed version matches or exceeds the latest Release", async () => {
    const result = await checkForUpdate("0.7.0", async () => ({ tagName: "v0.7.0", releaseUrl: "https://example.invalid/releases/v0.7.0" }));
    expect(result).toEqual({ state: "up-to-date", currentVersion: "0.7.0" });
  });

  it("reports update-available with the release URL when a newer tag exists", async () => {
    const result = await checkForUpdate("0.7.0", async () => ({ tagName: "v0.8.0", releaseUrl: "https://example.invalid/releases/v0.8.0" }));
    expect(result).toEqual({ state: "update-available", currentVersion: "0.7.0", latestVersion: "v0.8.0", releaseUrl: "https://example.invalid/releases/v0.8.0" });
  });

  it("reports no-release (non-throwing) when GitHub has no published Release yet (404)", async () => {
    const result = await checkForUpdate("0.7.0", async () => { throw new ReleaseNotFoundError(); });
    expect(result).toEqual({ state: "no-release", currentVersion: "0.7.0" });
  });

  it("reports network-failure (non-throwing) on a genuine network/timeout/DNS failure", async () => {
    const result = await checkForUpdate("0.7.0", async () => { throw new UpdateNetworkError(new TypeError("Failed to fetch")); });
    expect(result).toEqual({ state: "network-failure", currentVersion: "0.7.0" });
  });

  it("reports network-failure for a raw TypeError even if not pre-classified", async () => {
    const result = await checkForUpdate("0.7.0", async () => { throw new TypeError("Failed to fetch"); });
    expect(result).toEqual({ state: "network-failure", currentVersion: "0.7.0" });
  });

  it("reports network-failure on an aborted/timed-out request", async () => {
    const result = await checkForUpdate("0.7.0", async () => { throw new DOMException("The operation was aborted", "AbortError"); });
    expect(result).toEqual({ state: "network-failure", currentVersion: "0.7.0" });
  });

  it("reports check-failed (non-throwing, not claiming a network problem) for other HTTP/API failures", async () => {
    const result = await checkForUpdate("0.7.0", async () => { throw new UpdateCheckFailedError("GitHub returned 500"); });
    expect(result).toEqual({ state: "check-failed", currentVersion: "0.7.0" });
  });

  it("never throws even for unclassified/malformed metadata errors, and does not call it a network failure", async () => {
    await expect(checkForUpdate("0.7.0", async () => { throw new Error("malformed"); })).resolves.toEqual({ state: "check-failed", currentVersion: "0.7.0" });
  });
});
