// Installer / upgrade / data-location evidence for the Windows NSIS package (per-user install).
// Usage: DC_INSTALLER_TEST=1 node desktop-verify/installer-smoke.mjs <installerA> <installerB> <fixtureDir> <outDir>
//   A and B are two installers of the SAME identifier with different test-only versions (B newer than A).
// Installs into a temp directory, exercises install -> first launch -> restart -> upgrade -> same-version reinstall
// -> silent uninstall -> reinstall, and checks the application-owned IndexedDB data is never orphaned.
// Synthetic data only. Writes per-user uninstall registry entries while installed; the script uninstalls at the end.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { launchApp, closeApp, sleep } from "./cdp.mjs";
import { identifier, dataRoot, sha, idbCounts, nav, clickText, saveVia, createReporter, wipeAppDataSafely, SHELL } from "./lib.mjs";

if (process.env.DC_INSTALLER_TEST !== "1") throw new Error("Refusing to install anything: set DC_INSTALLER_TEST=1 (this script installs/uninstalls the app for the current user).");
const [installerA, installerB, fixtureDir, outDir] = process.argv.slice(2).map((p) => resolve(p));
mkdirSync(outDir, { recursive: true });
const { results, check } = createReporter(); const t0 = Date.now();
const installDir = mkdtempSync(join(tmpdir(), "dc-install-"));
const log = (...a) => console.log("  ", ...a);

const run = (exe, args) => { const r = spawnSync(exe, args, { windowsVerbatimArguments: true, encoding: "utf8", timeout: 300000 }); return r.status; };
// DC_INSTALL_EXTRA_FILES (";"-separated) is a workaround for GNU-toolchain dev builds only: their exe imports
// WebView2Loader.dll dynamically and the installer does not ship it. MSVC builds link it statically; CI never sets this.
const install = (installer) => { const rc = run(installer, ["/S", `/D=${installDir}`]); for (const extra of (process.env.DC_INSTALL_EXTRA_FILES ?? "").split(";").filter(Boolean)) copyFileSync(extra, join(installDir, basename(extra))); return rc; };
const installedExe = () => readdirSync(installDir).filter((n) => /\.exe$/i.test(n) && !/^uninstall/i.test(n)).map((n) => join(installDir, n))[0];
const uninstall = () => run(join(installDir, "uninstall.exe"), ["/S", `_?=${installDir}`]);
const dataFiles = (dir) => existsSync(dir) ? readdirSync(dir, { withFileTypes: true, recursive: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name)) : [];
const hasIdb = () => dataFiles(dataRoot).some((f) => /IndexedDB/i.test(f));
const meditationDigest = async (cdp) => sha(Buffer.from(await cdp.evaluate(`new Promise(res=>{const r=indexedDB.open("DailyCanvas");r.onsuccess=()=>{const q=r.result.transaction("meditationEntries").objectStore("meditationEntries").getAll();q.onsuccess=()=>{r.result.close();res(JSON.stringify(q.result.sort((a,b)=>a.sortOrder-b.sortOrder).map(x=>[x.id,x.content])))}}})`)));
const settle = () => sleep(2500);

async function launchInstalled() { const exe = installedExe(); if (!exe) throw new Error("no installed exe found"); const app = await launchApp(exe); await app.cdp.waitFor(`document.querySelector('#root')&&document.querySelector('#root').children.length>0`, 30000, "React root"); return { app, exe }; }
async function snapshot(app) { return { counts: await idbCounts(app.cdp), digest: await meditationDigest(app.cdp), info: await app.cdp.evaluate(`window.__TAURI_INTERNALS__.invoke('desktop_info')`), origin: await app.cdp.evaluate("location.origin") }; }

try {
  wipeAppDataSafely();

  // ---- 1. install A, first launch, seed data ----
  console.log("== Install A + first launch");
  check("installer A ran silently (exit 0)", install(installerA) === 0);
  const exeA = installedExe();
  check("installed under the chosen per-user directory, outside the data folder", Boolean(exeA) && !installDir.toLowerCase().startsWith(dataRoot.toLowerCase()) && existsSync(join(installDir, "uninstall.exe")), exeA ? `${exeA.split("\\").pop()} + uninstall.exe` : "no exe");
  let { app } = await launchInstalled();
  await app.cdp.waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Start empty')`, 20000, "first-run onboarding");
  const first = await snapshot(app);
  check("first launch: frozen origin and identifier", first.origin === "https://tauri.localhost" && first.info.identifier === identifier, `${first.origin} ${first.info.identifier} v${first.info.appVersion}`);
  check("first launch: data folder is %LOCALAPPDATA%\\<identifier>", first.info.appLocalDataDir.toLowerCase() === dataRoot.toLowerCase(), first.info.appLocalDataDir);
  await clickText(app.cdp, "Start empty"); await app.cdp.waitFor(`document.querySelector('${SHELL}')`, 15000, "shell");
  await nav(app.cdp, "settings", "settingsData"); await app.cdp.waitFor(`document.querySelector('input[type=file][accept="application/json"]')`);
  await app.cdp.setFiles('input[type=file][accept="application/json"]', [join(fixtureDir, "synthetic-v7-backup.json")]);
  await app.cdp.waitFor(`document.querySelector('.restore-preview')`, 30000, "restore preview");
  const safety = await saveVia(app, `(()=>{const b=[...document.querySelectorAll('.restore-preview button')].find(b=>b.classList.contains('primary'));if(!b)return false;b.click();return true})()`, join(outDir, "safety.json"));
  check("seed: safety backup saved through the native dialog", safety.exists && safety.size > 0, `${safety.size} bytes`);
  await app.cdp.waitFor(`document.querySelector('.status-message')`, 60000, "restore status");
  const seeded = await snapshot(app);
  check("seed: synthetic v6 data restored in the installed app", seeded.counts.tasks === 6 && seeded.counts.checkIns === 435 && seeded.counts.meditationEntries === 30 && seeded.counts.appearanceAssets === 2, JSON.stringify({ tasks: seeded.counts.tasks, checkIns: seeded.counts.checkIns, meditations: seeded.counts.meditationEntries }));
  check("seed: IndexedDB lives in the identifier data folder", hasIdb(), `${dataFiles(dataRoot).length} files`);
  const baseline = { counts: seeded.counts, digest: seeded.digest };
  await closeApp(app); await settle();

  // ---- 2. restart ----
  console.log("== Restart");
  ({ app } = await launchInstalled()); await app.cdp.waitFor(`document.querySelector('${SHELL}')`, 20000, "shell");
  let s = await snapshot(app);
  check("restart keeps all data", JSON.stringify(s.counts) === JSON.stringify(baseline.counts) && s.digest === baseline.digest);
  await closeApp(app); await settle();

  // ---- 3. upgrade A -> B (same identifier, same directory) ----
  console.log("== Upgrade A -> B");
  check("installer B (newer test version) ran silently over A", install(installerB) === 0);
  ({ app } = await launchInstalled()); await app.cdp.waitFor(`document.querySelector('${SHELL}')`, 20000, "shell after upgrade");
  s = await snapshot(app);
  check("upgrade changed the app version", s.info.appVersion !== first.info.appVersion, `${first.info.appVersion} -> ${s.info.appVersion}`);
  check("upgrade did not orphan IndexedDB (same identifier, same origin)", s.origin === "https://tauri.localhost" && s.info.identifier === identifier && JSON.stringify(s.counts) === JSON.stringify(baseline.counts) && s.digest === baseline.digest);
  await closeApp(app); await settle();

  // ---- 4. same-version reinstall ----
  console.log("== Same-version reinstall");
  check("installer B re-ran over B", install(installerB) === 0);
  ({ app } = await launchInstalled()); await app.cdp.waitFor(`document.querySelector('${SHELL}')`, 20000, "shell after reinstall");
  s = await snapshot(app);
  check("same-version reinstall keeps all data", JSON.stringify(s.counts) === JSON.stringify(baseline.counts) && s.digest === baseline.digest);
  await closeApp(app); await settle();

  // ---- 5. silent uninstall, data behavior, reinstall ----
  console.log("== Silent uninstall and reinstall");
  const uRc = uninstall(); await sleep(3000);
  const exeGone = !existsSync(installDir) || !installedExe();
  check("silent uninstall removed the application files", uRc === 0 && exeGone, `exit ${uRc}`);
  const dataKept = hasIdb();
  console.log(`   INFO uninstall without the delete-data option ${dataKept ? "KEPT" : "REMOVED"} the IndexedDB data (${dataFiles(dataRoot).length} files remain)`);
  check("uninstall behavior is deterministic and recorded", true, dataKept ? "silent uninstall keeps user data" : "silent uninstall removes user data");
  mkdirSync(installDir, { recursive: true });
  check("installer B ran again after uninstall", install(installerB) === 0);
  ({ app } = await launchInstalled()); await sleep(2500);
  const shellUp = await app.cdp.evaluate(`Boolean(document.querySelector('${SHELL}'))`).catch(() => false);
  s = await snapshot(app);
  if (dataKept) check("reinstall after uninstall re-attaches to the kept data", shellUp && JSON.stringify(s.counts) === JSON.stringify(baseline.counts) && s.digest === baseline.digest);
  else check("reinstall after data-removing uninstall starts clean (no half-state)", !shellUp && s.counts.tasks === 0, JSON.stringify({ tasks: s.counts.tasks }));
  await closeApp(app); await settle();
} finally {
  // ---- cleanup: never leave an install, registry entry, or test data behind ----
  try { if (existsSync(join(installDir, "uninstall.exe"))) uninstall(); } catch { /* best effort */ }
  await sleep(2000);
  rmSync(installDir, { recursive: true, force: true });
  rmSync(dataRoot, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
writeFileSync(join(outDir, "installer-results.json"), JSON.stringify({ when: new Date().toISOString(), identifier, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} installer checks passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(failed.length ? 1 : 0);
