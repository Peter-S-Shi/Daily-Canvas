import { fetchLatestRelease, type ReleaseMetadata } from "../desktop/desktopAdapter";

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
  | { state: "unable-to-check"; currentVersion: string };

/**
 * On-demand only: called when Settings -> About & Updates opens or "Check for updates" is
 * clicked -- never on a timer, never at startup. A network failure is non-blocking and reported
 * as "unable-to-check" rather than thrown, matching the reminder/backup failure-isolation pattern.
 */
export async function checkForUpdate(currentVersion: string, fetchRelease: () => Promise<ReleaseMetadata> = fetchLatestRelease): Promise<UpdateCheckResult> {
  try {
    const release = await fetchRelease();
    if (compareVersions(currentVersion, release.tagName) < 0) return { state: "update-available", currentVersion, latestVersion: release.tagName, releaseUrl: release.releaseUrl };
    return { state: "up-to-date", currentVersion };
  } catch {
    return { state: "unable-to-check", currentVersion };
  }
}
