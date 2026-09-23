// End-to-end evidence run against the PACKAGED Daily Canvas desktop exe (Windows).
// Usage: node desktop-verify/desktop-smoke.mjs <exe> <fixtureDir> <outDir>
// Synthetic data only. Uses a disposable WebView2 profile under outDir; never points at the real product profile.
//
// Milestone 13 note: Automatic Backup writes real files to the app-owned `app_local_data_dir()/backups`
// directory (`dataRoot`), which is a genuine OS per-user-per-identifier path, NOT covered by the isolated
// WebView2 `userDataDir` above (that only isolates IndexedDB/browser storage). This smoke run therefore
// takes ownership of `dataRoot` the same safe way installer-smoke.mjs already does (refuse unless empty
// or previously created by desktop-verify; always clean up afterward) instead of asserting it stays
// byte-identical, which would be incompatible with a legitimate desktop-native feature that needs it.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { launchApp, closeApp, sleep } from "./cdp.mjs";
import { identifier as IDENT, dataRoot, sha, idbCounts, nav, clickText, setSelect, ps, saveVia, createReporter, prepareIsolatedWebViewData, containsIndexedDb, wipeAppDataSafely, SHELL } from "./lib.mjs";

const [exe, fixtureDir, outDir] = process.argv.slice(2).map((p) => resolve(p));
mkdirSync(outDir, { recursive: true });
const userDataDir = prepareIsolatedWebViewData(outDir);
wipeAppDataSafely(); // takes safe, disposable ownership of dataRoot (see Milestone 13 note above) for Automatic Backup's real files
const { results, check } = createReporter(); const t0 = Date.now();
const shot = async (app, name) => writeFileSync(join(outDir, `${name}.png`), await app.cdp.screenshot());
const pdfInfo = (b64) => { const raw = Buffer.from(b64, "base64").toString("latin1"); const m = raw.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/); return { width: m && Math.round(Number(m[1])), height: m && Math.round(Number(m[2])), pages: (raw.match(/\/Type\s*\/Page[^s]/g) ?? []).length, bytes: raw.length }; };

if (!existsSync(exe)) throw new Error(`exe not found: ${exe}`);
const fixturePath = join(fixtureDir, "synthetic-v9-backup.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const expected = { areas: fixture.areas.length, tasks: fixture.tasks.length, checkIns: fixture.checkIns.length, dailyReflections: fixture.dailyReflections.length, meditationEntries: fixture.meditationEntries.length, appearanceAssets: fixture.appearanceAssets.length, experienceLogs: fixture.experienceLogs.length, timeBlocks: fixture.timeBlocks.length };

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

// ---------- Restore synthetic v9 backup through the real Settings UI ----------
console.log("== Restore v9 backup (11 MB synthetic) via Settings");
await nav(app.cdp, "settings", "settingsData"); await app.cdp.waitFor(`document.querySelector('input[type=file][accept="application/json"]')`);
await app.cdp.setFiles('input[type=file][accept="application/json"]', [fixturePath]);
await app.cdp.waitFor(`document.querySelector('.restore-preview')`, 30000, "restore preview");
const previewText = await app.cdp.evaluate(`document.querySelector('.restore-preview').innerText`);
check("restore preview parsed the v9 backup", /tasks|Tasks|任务/.test(previewText) || previewText.length > 20, previewText.replace(/\s+/g, " ").slice(0, 160));
const safetyPath = join(outDir, "safety-backup.json");
const saved = await saveVia(app, `(()=>{const b=[...document.querySelectorAll('.restore-preview button')].find(b=>b.classList.contains('primary'));if(!b)return false;b.click();return true})()`, safetyPath);
check("safety backup goes through the native Save dialog", saved.exists && saved.size > 0 && /SAVED_INVOKED/.test(saved.dialog), `${saved.size} bytes; ${saved.dialog.split(/\r?\n/)[1] ?? ""}`);
await app.cdp.waitFor(`document.querySelector('.status-message')`, 60000, "restore success status");
const afterRestore = await idbCounts(app.cdp);
for (const [k, v] of Object.entries(expected)) check(`restored ${k} count`, afterRestore[k] === v, `${afterRestore[k]} / ${v}`);
await shot(app, "02-after-restore-settings");

// ---------- Representative screens (English) ----------
console.log("== Screens");
// Every M11/M12 destination, addressed by workspace/section id (src/navigation/workspaceModel.ts).
const views = [["today"], ["inbox"], ["plan", "floating"], ["plan", "calendar"], ["plan", "timeline"], ["tasks", "allTasks"], ["tasks", "areas"], ["tasks", "lifecycle"], ["tasks", "rewards"], ["reflect", "dailyReflection"], ["reflect", "onThisDay"], ["reflect", "meditations"], ["review"], ["settings", "settingsGeneral"], ["settings", "settingsShortcuts"], ["settings", "settingsAbout"]];
for (const [workspace, section] of views) { const name = section ?? workspace; const opened = await nav(app.cdp, workspace, section); await sleep(700); const len = await app.cdp.evaluate(`document.querySelector('.workspace-content').innerText.length`); await shot(app, `03-en-${name}`); check(`screen renders: ${name}`, opened && len > 20, `${len} chars`); }

// ---------- Timeline Week mode (Day mode is already covered by the screens loop above) ----------
console.log("== Timeline Week mode");
await nav(app.cdp, "plan", "timeline"); await sleep(400);
check("switch to Week mode", await clickText(app.cdp, "Week"));
await sleep(500); await shot(app, "03b-en-timeline-week");
const weekDayCount = await app.cdp.evaluate(`document.querySelectorAll('.timeline-week-day').length`);
check("Week mode renders a seven-day grid", weekDayCount === 7, `${weekDayCount} day columns`);
const weekLen = await app.cdp.evaluate(`document.querySelector('.timeline-week-grid').innerText.length`);
check("Week mode content renders", weekLen > 20, `${weekLen} chars`);
check("switch back to Day mode", await clickText(app.cdp, "Day"));
const { windowId } = await app.cdp.send("Browser.getWindowForTarget"); await app.cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", width: 900, height: 600 } }); await sleep(700);
check("900x600 English shell has zero horizontal overflow", await app.cdp.evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`));
const bgApplied = await app.cdp.evaluate(`getComputedStyle(document.querySelector('.desktop-shell')).backgroundImage.startsWith('linear-gradient')`);
check("restored 4 MB background asset applies (data URL)", bgApplied);

// ---------- Keyboard shortcuts (frozen M12 set) ----------
console.log("== Keyboard shortcuts");
const dispatchShortcut = (key, shift = false) => app.cdp.evaluate(`(()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(key)},ctrlKey:true,shiftKey:${shift},bubbles:true,cancelable:true}));return true})()`);
await nav(app.cdp, "tasks", "allTasks"); await sleep(300);
await dispatchShortcut("k", true); await sleep(400);
check("Ctrl+Shift+K opens Quick Capture", await app.cdp.evaluate(`document.getElementById('quick-capture-title')!==null`));
await app.cdp.evaluate(`(()=>{document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));return true})()`); await sleep(300);
check("Escape closes the transient Quick Capture dialog", await app.cdp.evaluate(`document.getElementById('quick-capture-title')===null`));
await dispatchShortcut("1"); await sleep(400);
check("Ctrl+1 navigates to Today", await app.cdp.evaluate(`document.querySelector('.nav-button[data-workspace="today"].active')!==null`));

// ---------- Notification boundary (local, in-app reminders only) ----------
console.log("== Notification boundary");
const notifyResult = await app.cdp.evaluate(`window.__TAURI_INTERNALS__.invoke('send_notification',{title:'Daily Canvas smoke',body:'synthetic reminder check'}).then(()=>'ok',(e)=>'error: '+e)`);
check("send_notification command completes without throwing", notifyResult === "ok", notifyResult);

// ---------- JSON export through native dialog + fidelity ----------
console.log("== JSON export");
await nav(app.cdp, "settings", "settingsData"); await sleep(400);
const exportPath = join(outDir, "export-v7.json");
const exp = await saveVia(app, `(()=>{const b=document.querySelector('.settings-panel .setting-control .button.primary');if(!b)return false;b.click();return true})()`, exportPath);
check("JSON export saved through native dialog (11 MB over IPC)", exp.exists && exp.size > 1_000_000 && /^daily-canvas-backup-\d{4}-\d{2}-\d{2}\.json$/.test(exp.name ?? ""), `${exp.name}, ${exp.size} bytes`);
const exported = JSON.parse(readFileSync(exportPath, "utf8"));
check("exported backup is format v9", exported.version === 9 && exported.format === "daily-canvas-backup");
const same = (key) => sha(Buffer.from(JSON.stringify(exported[key].map((x) => JSON.stringify(x)).sort()))) === sha(Buffer.from(JSON.stringify(fixture[key].map((x) => JSON.stringify(x)).sort())));
for (const key of ["areas", "tasks", "checkIns", "dailyReflections", "meditationEntries", "experienceLogs", "timeBlocks"]) check(`round-trip identical: ${key}`, same(key), `${exported[key].length} records`);
check("round-trip identical: 2 large appearance assets", exported.appearanceAssets.length === 2 && exported.appearanceAssets.every((a) => fixture.appearanceAssets.find((f) => f.id === a.id)?.dataUrl === a.dataUrl), `${exported.appearanceAssets.map((a) => a.dataUrl.length).join("+")} chars`);

// ---------- Milestone 13: Reflection Templates ----------
console.log("== Reflection Templates");
await nav(app.cdp, "reflect", "dailyReflection"); await sleep(500);
check("pick the Daily Check-in template", await clickText(app.cdp, "Daily Check-in"));
await app.cdp.evaluate(`(()=>{const ta=document.getElementById('daily-journal');const set=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;set.call(ta,'Smoke-test reflection using the Daily Check-in template.');ta.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
check("save the templated reflection", await clickText(app.cdp, "Save daily reflection"));
await app.cdp.waitFor(`document.querySelector('[role=status]') && document.querySelector('[role=status]').textContent.includes('Reflection saved')`, 10000, "reflection saved status");
const templateRoundTrip = await app.cdp.evaluate(`new Promise((res)=>{const today=new Date().toISOString().slice(0,10);const r=indexedDB.open("DailyCanvas");r.onsuccess=()=>{const q=r.result.transaction("dailyReflections").objectStore("dailyReflections").get(today);q.onsuccess=()=>{r.result.close();res(q.result&&q.result.templateId)}}})`);
check("templateId round-trips into the saved Daily Reflection", templateRoundTrip === "daily-checkin", String(templateRoundTrip));
const reflectionMdPath = join(outDir, "reflection-export.md");
const reflectionMd = await saveVia(app, `(()=>{const b=[...document.querySelectorAll('.journal-actions button')].find(b=>b.textContent.includes('Export as Markdown'));if(!b)return false;b.click();return true})()`, reflectionMdPath);
check("Reflection exported as a real local .md file via the native Save dialog", reflectionMd.exists && reflectionMd.size > 0 && /\.md$/.test(reflectionMd.name ?? ""), `${reflectionMd.name}, ${reflectionMd.size} bytes`);
if (reflectionMd.exists) { const md = readFileSync(reflectionMdPath, "utf8"); check("Reflection .md contains the user's own unedited text", md.includes("Smoke-test reflection using the Daily Check-in template.")); }

// ---------- Milestone 13: On This Day ----------
console.log("== On This Day");
// Seed two historical entries dated exactly 1 and 2 years before real "today" (wall-clock, computed in-app) so the
// check is correct regardless of which calendar day this smoke run actually happens on.
const seeded = await app.cdp.evaluate(`new Promise((res)=>{
  const today=new Date(); const y1=new Date(today); y1.setFullYear(y1.getFullYear()-1); const y2=new Date(today); y2.setFullYear(y2.getFullYear()-2);
  const key=(d)=>d.toISOString().slice(0,10);
  const r=indexedDB.open("DailyCanvas"); r.onsuccess=()=>{
    const db=r.result; const tx=db.transaction(["dailyReflections","meditationEntries"],"readwrite");
    tx.objectStore("dailyReflections").put({date:key(y1),emotionIds:[],note:"On This Day smoke reflection (1 year ago)",createdAt:y1.toISOString(),updatedAt:y1.toISOString()});
    tx.objectStore("meditationEntries").put({id:"otd-smoke-meditation",content:"On This Day smoke meditation (2 years ago)",sortOrder:9999,createdAt:y2.toISOString(),updatedAt:y2.toISOString()});
    tx.oncomplete=()=>{db.close();res({y1:key(y1),y2:key(y2)})};
  };
})`);
await nav(app.cdp, "reflect", "onThisDay"); await sleep(600); await shot(app, "03c-en-on-this-day");
const otdGroups = await app.cdp.evaluate(`document.querySelectorAll('.on-this-day-group').length`);
check("On This Day groups the seeded entries by year (2 groups: 1 and 2 years ago)", otdGroups === 2, `${otdGroups} groups`);
const otdText = await app.cdp.evaluate(`document.querySelector('.on-this-day-page').innerText`);
check("On This Day shows both the Reflection and Meditation excerpts", otdText.includes("On This Day smoke reflection") && otdText.includes("On This Day smoke meditation"));
check("Open original navigates back to the source Daily Reflection", await clickText(app.cdp, "Open original"));
await sleep(400);
const openedDate = await app.cdp.evaluate(`document.querySelector('.date-jump input')?.value`);
check("Open original opened the exact source date", openedDate === seeded.y1, `${openedDate} vs ${seeded.y1}`);

// ---------- Milestone 13: Review Markdown export ----------
console.log("== Review Markdown export");
await nav(app.cdp, "review"); await sleep(600);
const reviewMdPath = join(outDir, "review-export.md");
const reviewMd = await saveVia(app, `(()=>{const b=[...document.querySelectorAll('.review-filters button')].find(b=>b.textContent.includes('Export as Markdown'));if(!b)return false;b.click();return true})()`, reviewMdPath);
check("Review exported as a real local .md file via the native Save dialog", reviewMd.exists && reviewMd.size > 0 && /\.md$/.test(reviewMd.name ?? ""), `${reviewMd.name}, ${reviewMd.size} bytes`);
if (reviewMd.exists) { const md = readFileSync(reviewMdPath, "utf8"); check("Review .md contains the period and a Completed section", /Daily Canvas Review/.test(md) && md.includes("Completed")); }

// ---------- Milestone 13: Automatic Backup (native adapter + rotation + restore-from-automatic-backup) ----------
console.log("== Automatic Backup");
await nav(app.cdp, "settings", "settingsData"); await sleep(500);
const autoBackupToggledOn = await app.cdp.evaluate(`document.querySelector('.setting-row input.switch[aria-label="Enable automatic backup"]')?.checked`);
check("Automatic Backup is enabled by default", autoBackupToggledOn === true, String(autoBackupToggledOn));
const backupDir = await app.cdp.evaluate(`window.__TAURI_INTERNALS__.invoke('backup_directory')`);
check("backup_directory adapter returns an explicit app-owned backups path", typeof backupDir === "string" && backupDir.toLowerCase().includes("backups"), backupDir);
// Sentinel for the M13 corrective-pass fix: a non-namespaced .json file dropped directly into the
// real (disposable, desktop-verify-owned -- see the Milestone 13 note at the top of this file)
// backup directory, proving list/retention/delete stay scoped to the `daily-canvas-auto-backup-*`
// namespace and never touch, count, or delete an unrelated file that happens to sit alongside it.
const sentinelName = "unrelated-file-that-is-not-an-auto-backup.json";
const sentinelPath = join(backupDir, sentinelName);
mkdirSync(backupDir, { recursive: true });
writeFileSync(sentinelPath, JSON.stringify({ note: "not a Daily Canvas auto-backup" }));
// "Back up now" bypasses the once-per-day guard by design (a manual action), so clicking it repeatedly lets this
// smoke run exercise real retention pruning end to end through the native write/list/delete commands.
for (let i = 0; i < 9; i++) {
  check(`Back up now (${i + 1}/9)`, await clickText(app.cdp, "Back up now"));
  // Wait for the async write+prune to actually finish (button re-enabled) rather than a fixed sleep, so
  // consecutive clicks never race ahead of the previous write while it is still in flight.
  await app.cdp.waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Back up now'&&!b.disabled)`, 15000, `backup ${i + 1} button re-enabled`);
  await sleep(150);
}
const retained = await app.cdp.evaluate(`window.__TAURI_INTERNALS__.invoke('list_auto_backups')`);
check("retention keeps only the most recent 7 automatic backups", Array.isArray(retained) && retained.length === 7, `${retained?.length} files`);
check("list_auto_backups never returns the non-namespaced sentinel file", Array.isArray(retained) && !retained.some((r) => r.fileName === sentinelName), JSON.stringify(retained?.map((r) => r.fileName)));
check("the non-namespaced sentinel file survives 9 backup/retention cycles untouched on disk", existsSync(sentinelPath), sentinelPath);
await sleep(300); await shot(app, "09-en-settings-data-backup-history");
check("Settings shows the retained backup history", await app.cdp.evaluate(`document.querySelectorAll('.backup-history-list li').length`) === 7);
const lastAutoBackupShown = await app.cdp.evaluate(`document.querySelector('.fact-list dd')?.textContent`);
check("Settings shows a last-successful-backup time", Boolean(lastAutoBackupShown) && lastAutoBackupShown !== "Not yet run", lastAutoBackupShown);
// ---- Restore from one retained automatic backup, through the SAME preview/confirm pipeline as manual import ----
check("open Restore from this backup on the newest retained automatic backup", await clickText(app.cdp, "Restore from this backup"));
await app.cdp.waitFor(`document.querySelector('.restore-preview')`, 15000, "restore preview from an automatic backup");
const autoSafety = await saveVia(app, `(()=>{const b=[...document.querySelectorAll('.restore-preview button')].find(b=>b.classList.contains('primary'));if(!b)return false;b.click();return true})()`, join(outDir, "auto-backup-safety.json"));
check("safety backup before an automatic-backup restore goes through the native Save dialog", autoSafety.exists && autoSafety.size > 0);
await app.cdp.waitFor(`document.querySelector('.status-message')`, 60000, "restore-from-automatic-backup status");
const afterAutoRestore = await idbCounts(app.cdp);
check("restoring from an automatic backup lands on a consistent, non-empty dataset", afterAutoRestore.tasks > 0 && afterAutoRestore.dailyReflections > 0, JSON.stringify(afterAutoRestore));

// ---------- Milestone 13: About & Updates ----------
console.log("== About & Updates");
await nav(app.cdp, "settings", "settingsAbout"); await sleep(500);
const shownVersion = await app.cdp.evaluate(`document.querySelector('.fact-list dd')?.textContent`);
check("About & Updates shows the installed version", /^\d+\.\d+\.\d+$/.test(shownVersion ?? ""), shownVersion);
check("Check for updates is clickable", await clickText(app.cdp, "Check for updates"));
await app.cdp.waitFor(`document.querySelector('[role=status]')`, 20000, "update-check result");
await sleep(500); await shot(app, "10-en-about-updates");
const updateStatusText = await app.cdp.evaluate(`document.querySelector('[role=status]')?.textContent`);
check("update check settles into one of the three defined states without blocking the app", /Up to date|Unable to check|Update available/.test(updateStatusText ?? ""), updateStatusText);

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
  const zip = join(outDir, "meditations.docx.zip"); const dir = join(outDir, "docx-x"); copyFileSync(docxPath, zip); rmSync(dir, { recursive: true, force: true });
  execFileSync("powershell", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dir}' -Force`]);
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
check("Automatic Backup wrote only inside the disposable, desktop-verify-owned data folder", existsSync(join(dataRoot, "backups")) && existsSync(join(dataRoot, ".dc-verify-owned")), dataRoot);
// ---------- Print through the desktop adapter (native WebView2 print surface) ----------
console.log("== Print adapter (last: the print surface is modal)");
await nav(app.cdp, "reflect", "meditations"); await sleep(600); await clickText(app.cdp, "导出全部"); await sleep(800);
let printErr = null; try { await app.cdp.evaluate(`(()=>{window.__printResult='pending';window.__TAURI_INTERNALS__.invoke('print_page').then(()=>{window.__printResult='closed'},(e)=>{window.__printResult='error: '+e});return true})()`); } catch (e) { printErr = e.message; }
check("print_page command invokes the WebView2 print surface without error", printErr === null, printErr ?? "invoked");
await sleep(3500);
const printState = await Promise.race([app.cdp.evaluate(`window.__printResult`), sleep(3000).then(() => "page thread blocked while the modal print surface is open")]).catch(() => "unreachable"); console.log("   print_page promise state while the print surface is open:", printState);
const cap = ps("capture-window.ps1", "-ProcessId", String(app.pid), "-Out", join(outDir, "07-print-surface.png")); console.log("   capture:", cap.stdout.trim());

const closeHow = await closeApp(app, { force: true }); console.log(`   final close: ${closeHow}`);
rmSync(dataRoot, { recursive: true, force: true }); // Automatic Backup's real files live here; always clean up (see Milestone 13 note at top of file)

const failed = results.filter((r) => !r.ok);
writeFileSync(join(outDir, "results.json"), JSON.stringify({ when: new Date().toISOString(), exe, exeBytes, userDataDir, dataMB: total / 1e6, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(failed.length ? 1 : 0);
