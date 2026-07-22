import { db, defaultBackgroundPreferences } from "../db";
import type { AppearanceAsset, BackgroundPreference, BackgroundSlot } from "../types";
import type { CSSProperties } from "react";

export async function importBackground(file: File): Promise<AppearanceAsset> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5_000_000) throw new Error("Choose a JPG, PNG, or WebP image under 5 MB.");
  const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Image could not be read.")); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
  const asset: AppearanceAsset = { id: crypto.randomUUID(), kind: "background", mimeType: file.type, dataUrl, createdAt: new Date().toISOString() };
  await db.appearanceAssets.add(asset); return asset;
}

export async function setBackgroundPreference(slot: BackgroundSlot, changes: Partial<Omit<BackgroundPreference, "slot">>): Promise<void> {
  const settings = await db.settings.get("app"); if (!settings) throw new Error("Settings are unavailable.");
  const base = settings.backgroundPreferences.find((item) => item.slot === slot) ?? defaultBackgroundPreferences().find((item) => item.slot === slot)!;
  const backgroundPreferences = settings.backgroundPreferences.filter((item) => item.slot !== slot).concat({ ...base, ...changes, slot });
  await db.settings.update("app", { backgroundPreferences });
}

export async function deleteAppearanceAsset(id: string): Promise<void> {
  await db.transaction("rw", db.appearanceAssets, db.settings, async () => {
    await db.appearanceAssets.delete(id);
    const settings = await db.settings.get("app");
    if (settings) await db.settings.update("app", { backgroundPreferences: settings.backgroundPreferences.map((item) => item.assetId === id ? { ...item, assetId: undefined } : item) });
  });
}

export function backgroundStyle(preference?: BackgroundPreference, asset?: AppearanceAsset): CSSProperties | undefined {
  if (!preference?.assetId || !asset) return undefined;
  const image = `linear-gradient(rgba(20,18,17,${preference.overlayOpacity}),rgba(20,18,17,${preference.overlayOpacity})),url(${asset.dataUrl})`;
  return { backgroundImage: image, backgroundSize: preference.fit, backgroundPosition: preference.position, "--personal-background": image, "--personal-fit": preference.fit, "--personal-position": preference.position, "--personal-blur": `${preference.blurPx}px` } as CSSProperties;
}
