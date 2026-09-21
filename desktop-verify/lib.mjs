// Shared helpers for the packaged-app verification scripts (desktop-smoke, installer-smoke).
// Synthetic data only. Talks to the app through a local WebView2 debug port and Win32 messages on its own dialogs.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { sleep } from "./cdp.mjs";

export const here = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
export const identifier = JSON.parse(readFileSync(join(here, "..", "src-tauri", "tauri.conf.json"), "utf8")).identifier;
export const dataRoot = join(process.env.LOCALAPPDATA ?? "", identifier);
export const downloads = join(process.env.USERPROFILE ?? "", "Downloads");
const marker = join(dataRoot, ".dc-verify-owned");

/**
 * The identifier folder is the real per-user data location of the product. Only wipe it when it is absent
 * (fresh CI runner) or was created by these scripts; otherwise refuse unless explicitly forced.
 */
export function wipeAppDataSafely() {
  if (existsSync(dataRoot) && !existsSync(marker) && process.env.DC_VERIFY_WIPE_DATA !== "1") {
    throw new Error(`Refusing to wipe ${dataRoot}: it exists and was not created by desktop-verify. Set DC_VERIFY_WIPE_DATA=1 only if it holds disposable data.`);
  }
  rmSync(dataRoot, { recursive: true, force: true });
  mkdirSync(dataRoot, { recursive: true });
  writeFileSync(marker, "created by desktop-verify; disposable test data\n");
  mkdirSync(downloads, { recursive: true });
}

export const sha = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 16);
export const idbCounts = (cdp) => cdp.evaluate(`new Promise((res)=>{const r=indexedDB.open("DailyCanvas");r.onsuccess=()=>{const d=r.result;const out={};const names=[...d.objectStoreNames];let n=names.length;names.forEach(nm=>{const q=d.transaction(nm).objectStore(nm).count();q.onsuccess=()=>{out[nm]=q.result;if(--n===0){d.close();res(out)}}})}})`);
export const nav = (cdp, i) => cdp.evaluate(`(()=>{const b=document.querySelectorAll('.sidebar nav button')[${i}];if(!b)return false;b.click();return true})()`);
export const clickText = (cdp, text) => cdp.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled);if(!b)return false;b.click();return true})()`);
export const setSelect = (cdp, sel, value) => cdp.evaluate(`(()=>{const s=${sel};const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(s,${JSON.stringify(value)});s.dispatchEvent(new Event('change',{bubbles:true}));return s.value})()`);
export const ps = (script, ...args) => spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(here, script), ...args], { encoding: "utf8" });

/** Click a button that opens the native Save dialog, accept its pre-filled name (default folder: Downloads), then move the file to `target`. */
export async function saveVia(app, clickExpr, target) {
  rmSync(target, { force: true });
  if (!(await app.cdp.evaluate(clickExpr))) throw new Error("trigger button not found");
  const r = ps("native-save-dialog.ps1", "-ProcessId", String(app.pid), "-ExpectedDir", downloads);
  console.log("   dialog:", r.stdout.trim().split(/\s*[\r\n]+\s*/).join(" | "));
  const name = (r.stdout.match(/PREFILLED_NAME=(.*)/) ?? [])[1]?.trim(); const landed = name && join(downloads, name);
  for (let i = 0; i < 60 && !(landed && existsSync(landed)); i++) await sleep(250);
  const exists = Boolean(landed && existsSync(landed)); const size = exists ? statSync(landed).size : 0;
  if (exists) { copyFileSync(landed, target); rmSync(landed, { force: true }); }
  return { dialog: r.stdout, name, exists, size };
}

export function createReporter() {
  const results = [];
  const check = (name, ok, detail = "") => { results.push({ name, ok: Boolean(ok), detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
  return { results, check };
}
