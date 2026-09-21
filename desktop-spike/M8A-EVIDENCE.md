# M8-A Desktop Shell Feasibility Spike — Evidence

Question: can Tauri 2 be a thin desktop shell around the existing React/Vite app while keeping the current
services and Dexie/IndexedDB storage unchanged?

Scope: bounded spike only. No Inbox, Search, Timeline, reminders, automatic backup, update awareness, new UI
design, or installer work. Not a milestone-complete claim.

## What was built

- `src-tauri/`: Tauri 2 shell (Rust). Three narrow app commands, no filesystem/shell/network plugin
  permissions for the web layer (`capabilities/default.json` grants nothing).
  - `save_export` — native Save dialog (default folder: Downloads, pre-filled name) then writes the raw bytes.
  - `print_page` — opens the WebView2 print surface.
  - `desktop_info` — reports version, identifier and the app data folders.
- `src/desktop/desktopAdapter.ts`: `isDesktop`, `saveBlob`, `printPage`. Web behavior is unchanged
  (anchor download / `window.print()`); covered by `desktopAdapter.test.ts`.
- Call sites moved onto the adapter: manual backup export, safety backup before restore, Meditation Word export,
  Meditation print. Domain services and Dexie code are untouched.
- Window/security choices that become permanent data contracts: identifier `app.dailycanvas.desktop`,
  `useHttpsScheme: true` (origin `https://tauri.localhost`), strict CSP, `dragDropEnabled: false`
  (the app uses pointer-based drag and drop, and file input for imports).
- `desktop-spike/`: throwaway verification tooling (synthetic fixture generator, CDP driver, native dialog driver,
  end-to-end script). Spike code, not product code.

## Reproduce

```text
pnpm install
pnpm desktop:fixture          # writes a synthetic v6 backup + image to desktop-spike/out (git-ignored)
pnpm desktop:build            # tauri build --no-bundle -> src-tauri/target/release/daily-canvas-desktop.exe
node desktop-spike/desktop-smoke.mjs <exe> <fixtureDir> <outDir>
```

The smoke run deletes only `%LOCALAPPDATA%\app.dailycanvas.desktop`, launches the packaged exe with a local
WebView2 debug port, and drives it. Native Save dialogs are completed through Win32 messages on that app's own
dialog; the script moves each saved file out of Downloads afterwards. It uses synthetic data only.

## Result: 53 / 53 checks passed (one clean run, ~44 s), Windows 11, WebView2 153

| Area | Evidence |
| --- | --- |
| Launch | Packaged exe renders the React shell in ~0.7 s; origin `https://tauri.localhost`; exe 3.6 MB; ~243 MB working set including WebView2 child processes |
| Existing screens | Today, Floating, Calendar, Review, Lifecycle, Reflection, Meditations, Tasks, Rewards, Settings all render from restored data |
| v6 restore | 11 MB synthetic backup (3 Areas, 6 Tasks, 435 check-ins, 120 reflections, 30 Meditations with CJK/emoji, 2 x ~4 MB background images) restored through the real Settings UI; every table count matches |
| JSON export | 11 MB export through the native dialog; round trip is content-identical for all collections including both large image data URLs |
| Large assets | 4 MB PNG imported through the file input; restored 4 MB backgrounds applied to the UI |
| Word export | `.docx` generated locally and saved via native dialog; OpenXML holds Chinese and English text, paragraphs and A4 page size |
| Print / PDF | Print CSS resolves to A4 595x842 pt and Letter 612x792 pt (4 pages) in WebView2; `print_page` opens the real WebView2 print surface (Microsoft Print to PDF, "Total: 4 sheets") with the Chinese cover rendered |
| Bilingual | UI switches to Chinese, persists across restart; Chinese user content renders |
| Persistence | All records identical after a graceful restart and after a forced process kill (a committed marker write survived) |
| Data boundary | Data lives in `%LOCALAPPDATA%\app.dailycanvas.desktop\EBWebView\...\IndexedDB`; nothing under `%APPDATA%` |
| Local-only | No non-local resource loaded; outbound `fetch` is blocked by CSP; no console errors or CSP violations from the app itself |

Baseline after the changes: `pnpm build` (type check + production build) passes; `pnpm test` 63 / 63
(60 existing + 3 adapter tests).

## Findings

1. **IndexedDB is sufficient.** Restart, forced-kill and 11 MB restore/export all worked on Dexie/IndexedDB. No
   evidence supports a SQLite rewrite.
2. **Browser API gaps were adapter-sized.** Blob downloads and `window.print()` are the only ones met so far; both
   moved behind `desktopAdapter`. `print_page` blocks until the print surface is closed.
3. **Behavior change to note:** cancelling the safety-backup Save dialog now aborts the restore (previously a
   browser download could not be cancelled). This keeps the "safety backup before destructive restore" rule intact.
4. **Origin and identifier are permanent.** IndexedDB is keyed by origin inside the identifier's WebView2 profile.
   Changing the identifier or the https/http scheme later would orphan user data. `tauri dev` uses another origin
   (`http://localhost:4173`), and the browser-era origin is different again, so browser-era data reaches the desktop
   only through backup import (v1-v6 migration already exists and is unit-tested; only v6 was driven end to end here).
5. **Toolchain risk.** This machine's Rust default is the GNU toolchain and no MSVC build tools are installed. The
   Tauri build works under GNU (cold ~4.6 min, incremental ~2 min) but the linker warns `.rsrc merge failure:
   multiple non-default manifests` (the exe embeds two manifests; Common-Controls v6 is present and the native dialogs
   render themed). Tauri's supported Windows target is MSVC. The MSVC build could not be tried locally.

## Not verified / limits

- MSVC build and any GitHub-hosted CI build (no MSVC locally).
- Installer, uninstall, reinstall and upgrade behavior (bundling is off; polishing is out of scope).
- Actually printing to a PDF file from the print surface (only the surface opening and CDP `printToPDF` page sizes
  were verified). Printer-driver specifics remain a later manual check.
- Windows 10 / machines without the WebView2 runtime; DPI awareness is not declared in the manifest.
- Large multi-year histories; only a ~11 MB dataset was exercised.
- Automated driving used a WebView2 debug port and Win32 messages; a human visual pass of the dialogs is still advised.

## Assessment

Tauri 2 is suitable for continuing M8. No blocker found that would justify an Electron comparison. The open items
above are environment and packaging questions for M8-B, not shell-design defects.
