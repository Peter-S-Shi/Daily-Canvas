/** @vitest-environment jsdom */
// Builds a synthetic, privacy-safe v6 backup via the real services (fixture only; never committed).
import "fake-indexeddb/auto";
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { it } from "vitest";
import { db, defaultSettings, initializeDb } from "../src/db";
import { createBackup, migrateBackup } from "../src/services/backupService";
import type { CheckIn, DailyReflection, ExperienceLog, MeditationEntry, Task } from "../src/types";

const OUT = process.env.FIXTURE_DIR ?? "desktop-verify/out";
const iso = (d: Date) => d.toISOString();
const day = (offset: number) => { const d = new Date(Date.UTC(2026, 8, 20)); d.setUTCDate(d.getUTCDate() - offset); return d.toISOString().slice(0, 10); };

function crc32(buf: Buffer): number { let c, crc = ~0; for (const byte of buf) { c = (crc ^ byte) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(type: string, data: Buffer): Buffer { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]); }
/** Deterministic noisy gradient PNG; noise keeps it incompressible so the size is realistic (below the 5 MB limit). */
function makePng(width: number, height: number, seed: number): Buffer {
  let s = seed; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) { const row = y * (width * 3 + 1); raw[row] = 0; for (let x = 0; x < width; x++) { const o = row + 1 + x * 3; raw[o] = (x * 255 / width + rnd() * 90) & 255; raw[o + 1] = (y * 255 / height + rnd() * 90) & 255; raw[o + 2] = ((x + y) * 128 / (width + height) + 90 + rnd() * 60) & 255; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 1 })), chunk("IEND", Buffer.alloc(0))]);
}

it("generates the synthetic v6 fixture", async () => {
  await initializeDb();
  const now = iso(new Date(Date.UTC(2026, 8, 20, 12)));
  await db.settings.clear(); await db.settings.put({ ...defaultSettings(), onboardingComplete: true });
  await db.areas.bulkAdd([
    { id: "area-lang", name: "French 法语", color: "#4f7cac", icon: "L", sortOrder: 0, archived: false, createdAt: now, updatedAt: now },
    { id: "area-health", name: "Health 健康", color: "#5d9c59", icon: "H", sortOrder: 1, archived: false, createdAt: now, updatedAt: now },
    { id: "area-admin", name: "Admin", color: "#9a6fb0", icon: "A", sortOrder: 2, archived: true, createdAt: now, updatedAt: now },
  ]);
  const base = { starred: false, archived: false, stopReminderAtTarget: false, createdAt: now, updatedAt: now };
  const tasks: Task[] = [
    { ...base, id: "t-french", title: "French practice 法语练习", kind: "habit", areaId: "area-lang", starred: true, startDate: day(200), targetDays: 100, schedule: { mode: "fixed", recurrence: { type: "daily" } } },
    { ...base, id: "t-walk", title: "Evening walk", kind: "habit", areaId: "area-health", startDate: day(200), schedule: { mode: "fixed", recurrence: { type: "weekdays", weekdays: [1, 3, 5] } } },
    { ...base, id: "t-sugar", title: "No sugary drinks 戒含糖饮料", kind: "avoidance", areaId: "area-health", startDate: day(200), schedule: { mode: "fixed", recurrence: { type: "daily" } } },
    { ...base, id: "t-water", title: "Water plants", kind: "habit", startDate: day(200), schedule: { mode: "fixed", recurrence: { type: "interval", intervalDays: 3 } } },
    { ...base, id: "t-gym", title: "Gym four times a month", kind: "habit", areaId: "area-health", startDate: day(200), schedule: { mode: "quota", period: "month", targetCount: 4, availableFrom: day(200) } },
    { ...base, id: "t-passport", title: "Renew documents", kind: "task", areaId: "area-admin", startDate: day(20), schedule: { mode: "floating", availableFrom: day(20) } },
  ];
  await db.tasks.bulkAdd(tasks);
  const checkIns: CheckIn[] = []; const logs: ExperienceLog[] = [];
  for (let i = 0; i < 200; i++) {
    const date = day(i);
    if (i % 7 !== 3) checkIns.push({ id: `t-french:${date}`, taskId: "t-french", date, status: "done", updatedAt: now });
    if (i % 9 !== 4) checkIns.push({ id: `t-sugar:${date}`, taskId: "t-sugar", date, status: i % 23 === 0 ? "lapse" : "done", updatedAt: now });
    if (i % 3 === 0) checkIns.push({ id: `t-water:${date}`, taskId: "t-water", date, status: "done", updatedAt: now });
    if (i % 11 === 0) checkIns.push({ id: `t-gym:${date}`, taskId: "t-gym", date, status: "done", updatedAt: now });
    if (i % 25 === 0) logs.push({ id: `log-${i}`, taskId: "t-french", date, comparison: "easier", effort: 2, note: "Felt lighter today 今天轻松一些", updatedAt: now });
  }
  await db.checkIns.bulkAdd(checkIns); await db.experienceLogs.bulkAdd(logs);
  const reflections: DailyReflection[] = Array.from({ length: 120 }, (_, i) => ({ date: day(i), emotionIds: ["system-calm"], intensity: 2, note: `Reflection ${i}: 今天我学到了很多 — steady progress 🌱`, createdAt: now, updatedAt: now }));
  await db.dailyReflections.bulkAdd(reflections);
  const meditations: MeditationEntry[] = [
    "静坐片刻，先照顾好呼吸。\n\nStart small, stay kind.",
    "Consistency beats intensity. 日拱一卒，功不唐捐。",
    "Notice the urge, name it, let it pass. 🌱",
    ...Array.from({ length: 27 }, (_, i) => `Meditation ${i + 1}: 慢即是快 — slow is smooth, smooth is fast.`),
  ].map((content, sortOrder) => ({ id: `med-${sortOrder}`, content, sortOrder, createdAt: now, updatedAt: now }));
  await db.meditationEntries.bulkAdd(meditations);
  // Two ~4 MB background images (per-image limit is 5 MB) to exercise large local assets.
  const assets = [makePng(1500, 950, 1), makePng(1500, 950, 2)].map((png, i) => ({ id: `asset-${i}`, kind: "background" as const, mimeType: "image/png", dataUrl: `data:image/png;base64,${png.toString("base64")}`, createdAt: now }));
  await db.appearanceAssets.bulkAdd(assets);
  const settings = (await db.settings.get("app"))!;
  await db.settings.put({ ...settings, backgroundPreferences: settings.backgroundPreferences.map((p) => p.slot === "app" ? { ...p, assetId: "asset-0" } : p.slot === "today" ? { ...p, assetId: "asset-1" } : p) });
  const payload = await createBackup();
  // the fixture must itself be a valid, current-version backup (this is also a cheap migration/backup regression)
  const preview = migrateBackup(JSON.parse(JSON.stringify(payload)));
  if (preview.sourceVersion !== 6 || preview.migrated || preview.warnings.length) throw new Error(`fixture is not a clean v6 backup: ${JSON.stringify(preview.warnings)}`);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/synthetic-v6-backup.json`, JSON.stringify(payload, null, 2));
  writeFileSync(`${OUT}/upload-image.png`, makePng(1500, 950, 3));
  console.log(JSON.stringify({ tasks: payload.tasks.length, checkIns: payload.checkIns.length, reflections: payload.dailyReflections.length, meditations: payload.meditationEntries.length, assets: payload.appearanceAssets.length, assetChars: assets.map((a) => a.dataUrl.length) }));
});
