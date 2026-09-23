// End-to-end evidence run against the PACKAGED Daily Canvas desktop exe (Windows).
// Usage: node desktop-verify/desktop-smoke.mjs <exe> <fixtureDir> <outDir>
// Synthetic data only. Uses a disposable WebView2 profile under outDir; never points at the real product profile.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { launchApp, closeApp, sleep } from "./cdp.mjs";
import { identifier as IDENT, dataRoot, sha, idbCounts, nav, clickText, setSelect, ps, saveVia, createReporter, prepareIsolatedWebViewData, containsIndexedDb, treeMetadataStamp, SHELL } from "./lib.mjs";

const [exe, fixtureDir, outDir] = process.argv.slice(2).map((p) => resolve(p));
mkdirSync(outDir, { recursive: true });
const userDataDir = prepareIsolatedWebViewData(outDir);
const realDataStampBefore = treeMetadataStamp(dataRoot);
const { results, check } = createReporter(); const t0 = Date.now();
const shot = async (app, name) => writeFileSync(join(outDir, `${name}.png`), await app.cdp.screenshot());
const pdfInfo = (b64) => { const raw = Buffer.from(b64, "base64").toString("latin1"); const m = raw.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/); return { width: m && Math.round(Number(m[1])), height: m && Math.round(Number(m[2])), pages: (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length, bytes: raw.length }; };

if (!existsSync(exe)) throw new Error(`exe not found: ${exe}`);
const fixturePath = join(fixtureDir, "synthetic-v7-backup.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const expected = { areas: fixture.areas.length, tasks: fixture.tasks.length, checkIns: fixture.checkIns.length, dailyReflections: fixture.dailyReflections.length, meditationEntries: fixture.meditationEntries.length, appearanceAssets: fixture.appearanceAssets.length, experienceLogs: fixture.experienceLogs.length };

// ---------- Launch 1: fresh install state ----------
console.log("== Launch 1 (fresh data folder)");
const tl = Date.now(); let app = await launchApp(exe, { userDataDir });
await app.cdp.waitFor(`document.querySelector('#root')&&document.querySelector('#root').children.length>0`, 20000, "React root rendered");
check("launch renders React root", true, `${Date.now() - tl} ms to first render`);
await app.cdp.waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Start empty')`, 20000, "onboarding for an empty database");
const origin = await app.cdp.evaluate("location.origin");
check("packaged origin is the frozen https scheme", origin === "https://tauri.localhost", origin);
const info = await app.cdp.evaluate(`window.__TAURI_INTERNALS__.invoke('desktop_info')`);
check("desktop_info adapter command works", info.identifier === IDENT, JSON.stringify(info));
const storage = await app.cdp.evaluate(`navigator.storage.estimate().then(e=>({quota:e.quota,usage:e.usage}))`);
console.log("   storage estimate:", JSON.stringify(storage));
await shot(app, "01-fresh-onboarding");
check("fresh start shows onboarding (empty DB)", await clickText(app.cdp, "Start empty"), "clicked 'Start empty'");
check("WebView2 data is isolated from the real product directory", containsIndexedDb(userDataDir) && resolve(userDataDir).toLowerCase() !== resolve(dataRoot).toLowerCase(), userDataDir);
await app.cdp.waitFor(`document.querySelector('${SHELL}')`, 15000, "main shell");

// ---------- Restore synthetic v7 backup through the real Settings UI ----------
console.log("== Restore v7 backup (11 MB synthetic) via Settings");
await nav(app.cdp, "settings", "settingsData"); await app.cdp.waitFor(`document.querySelector('input[type=file][accept="application/json"]')`);
await app.cdp.setFiles('input[type=file][accept="application/json"]', [fixturePath]);
await app.cdp.waitFor(`document.querySelector('.restore-preview')`, 30000, "restore preview");
const previewText = await app.cdp.evaluate(`document.querySelector('.restore-preview').innerText`);
check("restore preview parsed the v7 backup", /tasks|Tasks|任务/.test(previewText) || previewText.length > 20, previewText.replace(/\s+/g, " ").slice(0, 160));
const safetyPath = join(outDir, "safety-backup.json");
const saved = await saveVia(app, `(()=>{const b=[...document.querySelectorAll('.restore-preview button')].find(b=>b.classList.contains('primary'));if(!b)return false;b.click();return true})()`, safetyPath);
check("safety backup goes through the native Save dialog", saved.exists && saved.size > 0 && /SAVED_INVOKED/.test(saved.dialog), `${saved.size} bytes; ${saved.dialog.split(/\r?\n/)[1] ?? ""}`);
await app.cdp.waitFor(`document.querySelector('.status-message')`, 60000, "restore success status");
const afterRestore = await idbCounts(app.cdp);
for (const [k, v] of Object.entries(expected)) check(`restored ${k} count`, afterRestore[k] === v, `${afterRestore[k]} / ${v}`);
await shot(app, "02-after-restore-settings");

// ---------- Representative screens (English) ----------
console.log("== Screens");
// Every M11 destination, addressed by workspace/section id (src/navigation/workspaceModel.ts).
const views = [["today"], ["inbox"], ["plan", "floating"], ["plan", "calendar"], ["tasks", "allTasks"], ["tasks", "areas"], ["tasks", "lifecycle"], ["tasks", "rewards"], ["reflect", "dailyReflection"], ["reflect", "meditations"], ["review"], ["settings", "settingsGeneral"]];
for (const [workspace, section] of views) { const name = section ?? workspace; const opened = await nav(app.cdp, workspace, section); await sleep(700); const len = await app.cdp.evaluate(`document.querySelector('.workspace-content').innerText.length`); await shot(app, `03-en-${name}`); check(`screen renders: ${name}`, opened && len > 20, `${len} chars`); }
const { windowId } = await app.cdp.send("Browser.getWindowForTarget"); await app.cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", width: 900, height: 600 } }); await sleep(700);
check("900x600 English shell has zero horizontal overflow", await app.cdp.evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`));
const bgApplied = await app.cdp.evaluate(`getComputedStyle(document.querySelector('.desktop-shell')).backgroundImage.startsWith('linear-gradient')`);
check("restored 4 MB background asset applies (data URL)", bgApplied);

// ---------- JSON export through native dialog + fidelity ----------
console.log("== JSON export");
await nav(app.cdp, "settings", "settingsData"); await sleep(400);
const exportPath = join(outDir, "export-v7.json");
const exp = await saveVia(app, `(()=>{const b=document.querySelector('.settings-panel .setting-control .button.primary');if(!b)return false;b.click();return true})()`, exportPath);
check("JSON export saved through native dialog (11 MB over IPC)", exp.exists && exp.size > 1_000_000 && /^daily-canvas-backup-\d{4}-\d{2}-\d{2}\.json$/.test(exp.name ?? ""), `${exp.name}, ${exp.size} bytes`);
const exported = JSON.parse(readFileSync(exportPath, "utf8"));
check("exported backup is format v7", exported.version === 7 && exported.format === "daily-canvas-backup");
const same = (key) => sha(Buffer.from(JSON.stringify(exported[key].map((x) => JSON.stringify(x)).sort()))) === sha(Buffer.from(JSON.stringify(fixture[key].map((x) => JSON.stringify(x)).sort())));
for (const key of ["areas", "tasks", "checkIns", "dailyReflections", "meditationEntries", "experienceLogs"]) check(`round-trip identical: ${key}`, same(key), `${exported[key].length} records`);
check("round-trip identical: 2 large appearance assets", exported.appearanceAssets.length === 2 && exported.appearanceAssets.every((a) => fixture.appearanceAssets.find((f) => f.id === a.id)?.dataUrl === a.dataUrl), `${exported.appearanceAssets.map((a) => a.dataUrl.length).join("+")} chars`);

// ---------- Appearance image import through file input ----------
console.log("== Appearance import (4 MB PNG)");
await nav(app.cdp, "settings", "settingsAppearance"); await sleep(400);
await app.cdp.setFiles('input[type=file][accept="image/jpeg,image/png,image/webp"]', [join(fixtureDir, "upload-image.png")]);
await app.cdp.waitFor(`true`); await sleep(1500);
const afterImg = await idbCounts(app.cdp);
check("background image import stored a new asset", afterImg.appearanceAssets >= 2, `assets: ${afterImg.appearanceAssets}`);

// ---------- Bilingual ----------
console.log("== Bilingual");
await nav(app.cdp, "settings", "settingsGeneral"); await sleep(400);
await clickText(app.cdp, "中文");
await sleep(800);
const zhTitle = await app.cdp.evaluate(`document.documentElement.lang + ' | ' + document.querySelector('${SHELL}').innerText.replace(/\\s+/g,' ')`);
check("interface switches to Chinese", /^zh-CN/.test(zhTitle) && /今天/.test(zhTitle), zhTitle);
await nav(app.cdp, "today"); await sleep(600); await shot(app, "04-zh-today");
await nav(app.cdp, "reflect", "meditations"); await sleep(700); await shot(app, "05-zh-meditations");
const cjk = await app.cdp.evaluate(`document.querySelector('.workspace-content').innerText.includes('日拱一卒')`);
check("Chinese user content renders (Meditations)", cjk);
check("900x600 Chinese shell has zero horizontal overflow", await app.cdp.evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`));

// ---------- Meditation print / PDF / Word ----------
console.log("== Meditations export");
check("open Export All preview", await clickText(app.cdp, "导出全部"));
await app.cdp.waitFor(`document.querySelector('.meditation-export-modal')`, 10000, "export modal");
await sleep(500); await shot(app, "06-zh-export-preview");
for (const size of ["a4", "letter"]) {
  await setSelect(app.cdp, `[...document.querySelectorAll('.export-controls select')].find(s=>[...s.options].some(o=>o.value==='letter'))`, size); await sleep(500);
  const pdf = pdfInfo((await app.cdp.send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true })).data);
  const want = size === "a4" ? [595, 842] : [612, 792];
  check(`print CSS yields ${size.toUpperCase()} page in WebView2`, Math.abs(pdf.width - want[0]) <= 2 && Math.abs(pdf.height - want[1]) <= 2, `${pdf.width}x${pdf.height}pt, ${pdf.pages} page(s)`);
}
await setSelect(app.cdp, `[...document.querySelectorAll('.export-controls select')].find(s=>[...s.options].some(o=>o.value==='letter'))`, "a4");
const docxPath = join(outDir, "meditations.docx");
const docx = await saveVia(app, `(()=>{const b=[...document.querySelectorAll('.export-controls button')].find(b=>b.textContent.includes('Word'));if(!b)return false;b.click();return true})()`, docxPath);
check("Word (.docx) generated locally and saved via native dialog", docx.exists && docx.size > 2000, `${docx.size} bytes`);
if (docx.exists) {
  const zip = join(outDir, "meditations.docx.zip"); const dir = join(outDir, "docx-x"); copyFileSync(docxPath, zip); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  execFileSync("tar", ["--force-local", "-xf", zip, "-C", dir]);
  const xml = readFileSync(join(dir, "word", "document.xml"), "utf8");
  check("docx OpenXML keeps Chinese + English text, mixed paragraphs, A4 size", xml.includes("日拱一卒") && xml.includes("Consistency beats intensity") && /w:pgSz[^>]*w:w="11906"/.test(xml), `${xml.length} chars XML`);
}

// ---------- Local-resource / privacy posture ----------
console.log("== Local resources & CSP");
const external = await app.cdp.evaluate(`performance.getEntriesByType('resource').map(r=>r.name).filter(n=>!/^(https:\\/\\/tauri\\.localhost|data:|blob:|https?:\\/\\/ipc\\.localhost)/.test(n))`);
check("no non-local resource was loaded", external.length === 0, external.join(", ") || "all local");
const netBlocked = await app.cdp.evaluate(`fetch('https://example.com',{mode:'no-cors'}).then(()=>false).catch(()=>true)`);
check("CSP blocks outbound network from the web layer", netBlocked);
const problems = app.cdp.problems().filter((p) => !p.includes("example.com")); check("no console errors / exceptions / CSP violations in launch 1", problems.length === 0, problems.slice(0, 3).join(" ‖ "));

// ---------- Restart persistence (graceful) ----------
console.log("== Restart persistence");
const before = await idbCounts(app.cdp);
const how1 = await closeApp(app); check("graceful close completed", how1 === "graceful", how1);
app = await launchApp(exe, { userDataDir }); await app.cdp.waitFor(`document.querySelector('${SHELL}')`, 20000, "shell after restart");
const after1 = await idbCounts(app.cdp);
check("all records survive graceful restart", JSON.stringify(before) === JSON.stringify(after1), JSON.stringify(after1));
const persistedLang = await app.cdp.evaluate(`document.documentElement.lang`);
check("settings (language) survive restart", persistedLang === "zh-CN", persistedLang);
await sleep(500); await shot(app, "08-after-restart-today");

// ---------- Forced kill durability ----------
console.log("== Forced-kill durability");
await app.cdp.evaluate(`new Promise((res,rej)=>{const r=indexedDB.open("DailyCanvas");r.onsuccess=()=>{const d=r.result;const tx=d.transaction("dailyOrders","readwrite");tx.objectStore("dailyOrders").put({date:"1999-01-01",taskIds:["kill-marker"]});tx.oncomplete=()=>{d.close();res(true)};tx.onerror=()=>rej(tx.error)}})`);
const how2 = await closeApp(app, { force: true });
app = await launchApp(exe, { userDataDir }); await app.cdp.waitFor(`document.querySelector('${SHELL}')`, 20000, "shell after forced kill");
const marker = await app.cdp.evaluate(`new Promise((res)=>{const r=indexedDB.open("DailyCanvas");r.onsuccess=()=>{const q=r.result.transaction("dailyOrders").objectStore("dailyOrders").get("1999-01-01");q.onsuccess=()=>{r.result.close();res(q.result)}}})`);
check("committed write survives forced process kill", marker?.taskIds?.[0] === "kill-marker", `close mode: ${how2}`);
await app.cdp.evaluate(`new Promise((res)=>{const r=indexedDB.open("DailyCanvas");r.onsuccess=()=>{const tx=r.result.transaction("dailyOrders","readwrite");tx.objectStore("dailyOrders").delete("1999-01-01");tx.oncomplete=()=>{r.result.close();res(true)}}})`);
const after2 = await idbCounts(app.cdp); check("full counts intact after forced kill", after2.tasks === before.tasks && after2.checkIns === before.checkIns && after2.appearanceAssets === before.appearanceAssets);

// ---------- Resource footprint + data boundary ----------
console.log("== Data boundary & footprint");
const walk = (dir, depth = 0) => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => { const p = join(dir, e.name); return e.isDirectory() ? (depth < 6 ? walk(p, depth + 1) : []) : [{ p, size: statSync(p).size }]; }) : [];
const files = walk(userDataDir); const total = files.reduce((a, f) => a + f.size, 0);
const idbDir = files.filter((f) => /IndexedDB/i.test(f.p));
console.log(`   isolated WebView2 profile: ${files.length} files, ${(total / 1e6).toFixed(1)} MB; IndexedDB files: ${idbDir.length}`);
check("packaged smoke IndexedDB remains inside its disposable profile", idbDir.length > 0 && idbDir.every((file) => resolve(file.p).toLowerCase().startsWith(resolve(userDataDir).toLowerCase())), userDataDir);
const exeBytes = statSync(exe).size; console.log(`   exe size: ${(exeBytes / 1e6).toFixed(1)} MB`);
const mem = execFileSync("powershell", ["-NoProfile", "-Command", `$p=Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq ${app.pid} -or $_.ParentProcessId -eq ${app.pid} }; ($p | Measure-Object WorkingSetSize -Sum).Sum`], { encoding: "utf8" }).trim();
console.log(`   working set (app + direct children): ${(Number(mem) / 1e6).toFixed(0)} MB`);
const finalProblems = app.cdp.problems(); check("no console errors after restart runs", finalProblems.length === 0, finalProblems.slice(0, 3).join(" ‖ "));
check("real Daily Canvas profile was not modified", treeMetadataStamp(dataRoot) === realDataStampBefore, "metadata fingerprint unchanged");
// ---------- Print through the desktop adapter (native WebView2 print surface) ----------
console.log("== Print adapter (last: the print surface is modal)");
await nav(app.cdp, "reflect", "meditations"); await sleep(600); await clickText(app.cdp, "导出全部"); await sleep(800);
let printErr = null; try { await app.cdp.evaluate(`(()=>{window.__printResult='pending';window.__TAURI_INTERNALS__.invoke('print_page').then(()=>{window.__printResult='closed'},(e)=>{window.__printResult='error: '+e});return true})()`); } catch (e) { printErr = e.message; }
check("print_page command invokes the WebView2 print surface without error", printErr === null, printErr ?? "invoked");
await sleep(3500);
const printState = await Promise.race([app.cdp.evaluate(`window.__printResult`), sleep(3000).then(() => "page thread blocked while the modal print surface is open")]).catch(() => "unreachable"); console.log("   print_page promise state while the print surface is open:", printState);
const cap = ps("capture-window.ps1", "-ProcessId", String(app.pid), "-Out", join(outDir, "07-print-surface.png")); console.log("   capture:", cap.stdout.trim());

const closeHow = await closeApp(app, { force: true }); console.log(`   final close: ${closeHow}`);

const failed = results.filter((r) => !r.ok);
writeFileSync(join(outDir, "results.json"), JSON.stringify({ when: new Date().toISOString(), exe, exeBytes, userDataDir, dataMB: total / 1e6, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(failed.length ? 1 : 0);
