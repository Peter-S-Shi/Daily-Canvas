import { fetchLatestRelease, ReleaseNotFoundError, type ReleaseMetadata, UpdateNetworkError } from "../desktop/desktopAdapter";

/** Strips an optional leading "v" and compares dotted numeric segments; non-numeric/malformed tags compare as unequal but never throw. */
export function compareVersions(current: string, latest: string): -1 | 0 | 1 {
  const clean = (value: string) => value.trim().replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const a = clean(current);
  const b = clean(latest);
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export type UpdateCheckResult =
  | { state: "up-to-date"; currentVersion: string }
  | { state: "update-available"; currentVersion: string; latestVersion: string; releaseUrl: string }
  | { state: "no-release"; currentVersion: string }
  | { state: "network-failure"; currentVersion: string }
  | { state: "check-failed"; currentVersion: string };

/** True for a genuine network/timeout/DNS failure: fetch itself never got a response. */
function isNetworkFailure(error: unknown): boolean {
  if (error instanceof UpdateNetworkError) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return false;
}

/**
 * On-demand only: called when Settings -> About & Updates opens or "Check for updates" is
 * clicked -- never on a timer, never at startup. Every failure mode is non-blocking (never
 * throws) and classified distinctly (Issue #15):
 *  - a 404 (no Release published yet) is a neutral "no-release" state, not a failure;
 *  - a genuine network/timeout/DNS failure is reported as "network-failure";
 *  - any other unexpected failure (HTTP 5xx, malformed JSON, etc.) is reported as the generic
 *    "check-failed" -- it must never falsely claim a network problem.
 */
export async function checkForUpdate(currentVersion: string, fetchRelease: () => Promise<ReleaseMetadata> = fetchLatestRelease): Promise<UpdateCheckResult> {
  try {
    const release = await fetchRelease();
    if (compareVersions(currentVersion, release.tagName) < 0) return { state: "update-available", currentVersion, latestVersion: release.tagName, releaseUrl: release.releaseUrl };
    return { state: "up-to-date", currentVersion };
  } catch (error) {
    if (error instanceof ReleaseNotFoundError) return { state: "no-release", currentVersion };
    if (isNetworkFailure(error)) return { state: "network-failure", currentVersion };
    return { state: "check-failed", currentVersion };
  }
}
