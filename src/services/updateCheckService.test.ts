import { describe, expect, it } from "vitest";
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

  it("reports unable-to-check (non-throwing) on a network/fetch failure", async () => {
    const result = await checkForUpdate("0.7.0", async () => { throw new Error("offline"); });
    expect(result).toEqual({ state: "unable-to-check", currentVersion: "0.7.0" });
  });

  it("never throws even for malformed metadata", async () => {
    await expect(checkForUpdate("0.7.0", async () => { throw new Error("malformed"); })).resolves.toEqual({ state: "unable-to-check", currentVersion: "0.7.0" });
  });
});
