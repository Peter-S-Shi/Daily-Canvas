# M8-B Desktop Foundation Consolidation — Evidence

Continues the accepted M8-A result (`desktop-spike/M8A-EVIDENCE.md`: Tauri 2 is a suitable thin shell over the
unchanged React/Vite app and Dexie/IndexedDB). This batch finalizes the desktop identity and establishes
independent GitHub-hosted verification. It does not implement any approved v1.0 product feature.

Branch: `m8-desktop-foundation`. PR: [#2](https://github.com/Peter-S-Shi/Daily-Canvas/pull/2) (Draft — not
merge-ready; M8 is not complete). Verified commit: `4565b51`.

## 1. Final desktop identity (locked before installer/persistence evidence made it costly to change)

- Identifier: `io.github.peter-s-shi.dailycanvas` (`src-tauri/tauri.conf.json`), replacing the provisional
  M8-A `app.dailycanvas.desktop`.
- Packaged origin: `https://tauri.localhost`, unchanged from M8-A (`useHttpsScheme: true` in `tauri.conf.json`).
- M8-A data under the old identifier was synthetic spike data; nothing needed migration.
- Every place that referenced the old identifier was updated: `desktop-verify/lib.mjs` reads it live from
  `tauri.conf.json` (`identifier`, `dataRoot`) rather than hardcoding it, so smoke/installer scripts, CI, and
  evidence cannot drift from the shipped config.

## 2. Windows/MSVC as the authoritative build

- CI installs the Rust `stable` toolchain on `windows-latest`, whose default host is
  `x86_64-pc-windows-msvc`, and asserts this (`rustc -vV | grep -q '^host: x86_64-pc-windows-msvc$'`).
- `src-tauri/.cargo/config.toml` sets `target-feature=+crt-static` for that target, so the shipped exe does not
  depend on the VC++ redistributable.
- CI runs `dumpbin /dependents` on the release exe and fails the job if it imports `vcruntime*`, `msvcp*`,
  `WebView2Loader.dll`, or any GNU-toolchain artifact (`libgcc`, `libwinpthread`, `libstdc++`).
  Actual CI output (run `35673357380`, commit `4565b51`) lists only OS-owned DLLs:
  `bcryptprimitives, ntdll, kernel32, api-ms-win-core-synch-l1-2-0, user32, comctl32, oleaut32, ole32, shlwapi,
  dwmapi, advapi32, gdi32, shell32, api-ms-win-crt-*` (WebView2 itself is loaded at runtime through the OS-installed
  Evergreen runtime, not linked).
- This machine's local development builds remain on the GNU toolchain (no MSVC install here); those were used only
  to iterate on the verification tooling (see §7). MSVC is authoritative and is what CI, and any future release,
  builds with.

## 3. Risk-scaled CI (`.github/workflows/ci.yml`)

```text
classify (ubuntu, no toolchains)
    -> docs_only / core / migration / desktop flags
core (ubuntu): typecheck, tests, production build [+ targeted migration/backup regression when migration=true]
desktop (windows-latest, MSVC): shell build, dependency check, packaged-app smoke, NSIS installers, installer/upgrade smoke
PR Gate (ubuntu): asserts every needed job succeeded and every unneeded job was skipped — never accidentally run, never silently failed
```

- `.github/scripts/classify.sh` classifies each changed path; `classify-selftest.sh` runs 16 fixed cases in the
  `classify` job on every run (bash only, no Node/pnpm/Rust). All 16 passed on `4565b51`, including the docs-only
  design guarantee: `README.md` alone routes to `docs_only=true core=false migration=false desktop=false` — a
  documentation-only PR never installs Node, pnpm, or Rust.
- `core` and `desktop` are conditioned on the classifier's flags (`if: needs.classify.outputs.core == 'true'`, etc.).
  `PR Gate` fails if a needed job did not succeed, or if a job that should have been skipped ran or failed instead —
  this was exercised for real: earlier failing runs on this branch (`ad41efc`, `0f4ca6f`) correctly produced
  `desktop=failure` -> `PR Gate=failure`.
- `concurrency: cancel-in-progress: true` cancels superseded runs per PR/branch.
- Only `desktop-evidence` (installers + JSON results + a handful of screenshots) is uploaded, 7-day retention, and
  only `if: always()` with `if-no-files-found: ignore` — no artifacts on an ordinary docs-only or app-only PR.

Result on `4565b51` (run [`35673357380`](https://github.com/Peter-S-Shi/Daily-Canvas/actions/runs/35673357380)):
**Classify changes: success · Core: success · Desktop (Windows, MSVC): success · PR Gate: success.**

## 4. Packaged-app smoke (Windows/MSVC, CI)

Same script family as M8-A (`desktop-verify/desktop-smoke.mjs`, moved from `desktop-spike/` and generalized —
see §7), run against the CI-built MSVC exe: **53/53 checks passed in 51 s.** Covers, on the new identifier and
origin: launch, `desktop_info`, 10 existing screens, v6 restore of an 11 MB synthetic backup (3 Areas, 6 Tasks,
435 check-ins, 120 reflections, 30 Meditations, 2 large background images), JSON export round-trip, image import,
bilingual switch, Meditation print/PDF page sizing (A4/Letter) and `.docx` OpenXML content, CSP/no-outbound-network,
graceful-restart and forced-kill persistence, and the data-boundary checks (`%LOCALAPPDATA%\io.github.peter-s-shi.
dailycanvas\EBWebView\...\IndexedDB`; nothing under `%APPDATA%`).

## 5. NSIS installer, upgrade, and data-retention evidence (Windows/MSVC, CI)

CI builds two per-user NSIS installers of the **same identifier**, differing only in a CI-supplied test version
(`0.7.0-installer-test.1` / `.2`; bundling is enabled only for this verification, not for a real release — see §6).
`desktop-verify/installer-smoke.mjs` then drives, silently (`/S`), against a throwaway install directory:
**17/17 checks passed in 36 s** on `4565b51`, specifically:

| Step | Result |
| --- | --- |
| Install A, first launch | exit 0; origin/identifier frozen; data folder is `%LOCALAPPDATA%\io.github.peter-s-shi.dailycanvas` |
| Seed synthetic v6 data + safety backup via native dialog | counts match; IndexedDB present in the identifier folder |
| Restart | all record counts and a content digest (Meditations) unchanged |
| Upgrade A -> B (same identifier, same install dir) | version changed; **IndexedDB not orphaned** — same origin, same identifier, identical data |
| Same-version reinstall | data unchanged |
| Silent uninstall | app files removed (exit 0); IndexedDB **kept** (NSIS default: no data-delete option offered) — recorded as a deterministic, not merely absent, behavior |
| Reinstall after uninstall | re-attaches to the kept data (counts/digest unchanged) |

The script refuses to touch a pre-existing, non-test data folder (`wipeAppDataSafely` in `desktop-verify/lib.mjs`)
and always uninstalls and deletes its temp install directory and data folder in a `finally` block, so CI (and any
local run) leaves no residue.

## 6. What was, and was not, enabled

- `tauri.conf.json` sets `bundle.active: true`, target `nsis`, `installMode: "currentUser"` — enough to answer the
  M8 foundation questions (does a real installer install/upgrade/uninstall correctly without orphaning data), not
  release polish.
- Explicitly **not** done in M8-B: code signing, updater infrastructure, release publishing, installer branding
  (icons are placeholders from M8-A), a distribution matrix, or a public version number. All installers built here
  carry a `-installer-test.N` pre-release version and are never published; CI does not upload them anywhere but the
  short-retention evidence artifact.

## 7. Tooling consolidation

- `desktop-spike/` (M8-A, prototype-only) was renamed to `desktop-verify/` and hardened: shared logic moved into
  `desktop-verify/lib.mjs` (identifier/data-root read from `tauri.conf.json`, a `saveVia` dialog helper, a data-wipe
  guard), and `desktop-verify/installer-smoke.mjs` was added.
- `desktop-verify/native-save-dialog.ps1` (the Win32 driver for the native Save dialog) was made resilient to two
  real environment differences found while diagnosing CI failures on this batch: Windows Server's Explorer view
  hides known file extensions in the pre-filled name (fixed by re-appending the expected extension) and its Save
  button was not reliably found by the classic Win32 control-ID lookup used on the client SKU used for local
  development (fixed by falling back to a UI Automation `Name = "Save"` invoke). This was root-caused and fixed
  within the existing architecture — it is a difference in a Windows shell dialog across SKUs, not a Tauri/MSVC
  problem, and did not require broadening any capability granted to the web layer.
- The debug port used by these scripts is enabled two different ways depending on environment: locally via
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` (works on this machine); on the GitHub-hosted (elevated) runner that
  environment variable was silently ignored by WebView2, so CI instead sets the documented per-executable
  `AdditionalBrowserArguments` registry policy for `daily-canvas-desktop.exe` under
  `HKLM/HKCU\SOFTWARE\Policies\Microsoft\Edge\WebView2`. This is verification-only tooling; it is not part of the
  shipped app and grants no capability to the web layer.
- Fixture generation (`desktop-verify/generate-fixture.fixture.ts`) now also runs the real `migrateBackup` on its
  own output and fails if the synthetic fixture is not itself a clean, unmigrated v6 backup — a second, cheap
  regression check on the backup/migration contract, run in both the `core` job (when migration-relevant paths
  change) and the `desktop` job.
- Reproduce locally: `pnpm desktop:fixture`, `pnpm desktop:build` (or `pnpm desktop:bundle` for an NSIS installer),
  `pnpm desktop:smoke <exe> <fixtureDir> <outDir>`, `DC_INSTALLER_TEST=1 pnpm desktop:installer <installerA>
  <installerB> <fixtureDir> <outDir>`. All scripts use synthetic data only and are safe to run repeatedly.

## 8. Remaining limitations / intentionally deferred

- No code signing; a real release will show an unsigned-publisher SmartScreen prompt. Deferred to hardening/RC.
- No updater infrastructure, reminders, or automatic-backup implementation — out of M8 scope entirely (M12/M13).
- Uninstall does not offer to delete user data; this is the current NSIS default and is documented above as a
  known, deterministic behavior rather than treated as a defect. Whether to add an explicit "also delete my data"
  uninstall option is a product decision for later, not assumed here.
- Installer branding (icons, license text, install-wizard copy) is placeholder from M8-A; explicitly deferred to
  RC polish (M15), per the M8 scope boundary.
- Only a Windows per-user NSIS install was exercised; a machine-wide install mode, MSI, and non-English Windows
  locales are not covered here.
- CI verification runs on a single GitHub-hosted Windows runner image; it is not a matrix across Windows versions.
- This machine cannot locally reproduce the MSVC build (no MSVC toolchain installed); all MSVC evidence in this
  document comes from the CI run cited above, not from a local run.

## 9. Status

M8-B closeout evidence only. Milestone 8 is **not** marked complete and PR #2 remains **Draft**. Independent review
of this branch is expected before any merge-readiness decision.
