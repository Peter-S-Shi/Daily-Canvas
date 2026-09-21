// PROTOTYPE (M8-A spike): tiny CDP helper to drive the packaged Tauri/WebView2 app.
// Only talks to 127.0.0.1 and only to the app process this script launched.
import { spawn, execFileSync } from "node:child_process";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launchApp(exe, { port = 9333, env = {} } = {}) {
  const child = spawn(exe, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}`, ...env },
    stdio: "ignore",
  });
  let exited = false; child.on("exit", () => { exited = true; });
  let target;
  for (let i = 0; i < 100 && !target; i++) {
    await sleep(300);
    if (exited) throw new Error("app exited during launch");
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch { /* not up yet */ }
  }
  if (!target) throw new Error("no CDP page target");
  const cdp = await connect(target.webSocketDebuggerUrl);
  return { child, pid: child.pid, cdp, port, isExited: () => exited };
}

export async function connect(url) {
  const ws = new WebSocket(url); let id = 0; const pending = new Map(); const listeners = [];
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); } else listeners.forEach((l) => l(msg)); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const events = []; listeners.push((m) => { if (["Runtime.consoleAPICalled", "Runtime.exceptionThrown", "Log.entryAdded"].includes(m.method)) events.push(m); });
  for (const d of ["Runtime", "Page", "DOM", "Log"]) await send(`${d}.enable`);
  const evaluate = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
  const problems = () => events.filter((m) => (m.method === "Runtime.exceptionThrown") || (m.method === "Runtime.consoleAPICalled" && ["error", "assert"].includes(m.params.type)) || (m.method === "Log.entryAdded" && m.params.entry.level === "error")).map((m) => m.method === "Runtime.exceptionThrown" ? `exception: ${m.params.exceptionDetails.text} ${m.params.exceptionDetails.exception?.description ?? ""}` : m.method === "Log.entryAdded" ? `log: ${m.params.entry.text} ${m.params.entry.url ?? ""}` : `console.error: ${m.params.args.map((a) => a.value ?? a.description).join(" ")}`);
  const setFiles = async (selector, files) => { const { root } = await send("DOM.getDocument", { depth: 1 }); const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector }); if (!nodeId) throw new Error(`no node for ${selector}`); await send("DOM.setFileInputFiles", { nodeId, files }); };
  const screenshot = async () => Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64");
  const waitFor = async (expression, timeoutMs = 20000, what = expression) => { const t0 = Date.now(); while (Date.now() - t0 < timeoutMs) { try { if (await evaluate(`Boolean(${expression})`)) return true; } catch { /* retry */ } await sleep(200); } throw new Error(`timeout waiting for: ${what}`); };
  return { send, evaluate, problems, setFiles, screenshot, waitFor, close: () => ws.close() };
}

/** Graceful close (WM_CLOSE) then force after a grace period. Returns "graceful" | "forced". */
export async function closeApp(app, { force = false } = {}) {
  app.cdp.close();
  if (!force) { try { execFileSync("taskkill", ["/PID", String(app.pid)], { stdio: "ignore" }); } catch { /* may already be gone */ } for (let i = 0; i < 30 && !app.isExited(); i++) await sleep(200); if (app.isExited()) { await sleep(500); return "graceful"; } }
  try { execFileSync("taskkill", ["/PID", String(app.pid), "/T", "/F"], { stdio: "ignore" }); } catch { /* ignore */ }
  for (let i = 0; i < 30 && !app.isExited(); i++) await sleep(200);
  await sleep(1500);
  return "forced";
}
