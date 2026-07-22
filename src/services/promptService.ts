import { db } from "../db";
import { updateSettings } from "./settingsService";

export const PROMPT_SET_VERSION = 1;
export const REFLECTION_PROMPTS = [
  { id: "notice", en: "What would you like to remember about today?", "zh-CN": "今天有什么是你想记住的？" },
  { id: "energy", en: "Where did your energy go today?", "zh-CN": "今天，你把精力花在了哪里？" },
  { id: "moment", en: "Which moment is still with you?", "zh-CN": "此刻，还有哪个瞬间留在你心里？" },
  { id: "needed", en: "What felt important or needed today?", "zh-CN": "今天，什么让你觉得重要或有所需要？" },
  { id: "space", en: "Write whatever this day needs room to hold.", "zh-CN": "把今天需要被容纳的任何事写下来。" },
  { id: "different", en: "What felt different from an ordinary day?", "zh-CN": "今天有什么和平常不太一样？" },
] as const;

const shuffle = (ids: string[], random: () => number) => {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};

export async function nextReflectionPrompt(random: () => number = Math.random): Promise<(typeof REFLECTION_PROMPTS)[number] | undefined> {
  const settings = await db.settings.get("app");
  if (!settings?.reflectionPromptsEnabled) return undefined;
  let remaining = settings.promptRotationState?.promptSetVersion === PROMPT_SET_VERSION ? [...settings.promptRotationState.remainingPromptIds] : [];
  if (!remaining.length) remaining = shuffle(REFLECTION_PROMPTS.map((item) => item.id), random);
  const id = remaining.shift()!;
  await updateSettings({ promptRotationState: { remainingPromptIds: remaining, promptSetVersion: PROMPT_SET_VERSION } });
  return REFLECTION_PROMPTS.find((item) => item.id === id);
}

export function getPrompt(id?: string) { return REFLECTION_PROMPTS.find((item) => item.id === id); }
