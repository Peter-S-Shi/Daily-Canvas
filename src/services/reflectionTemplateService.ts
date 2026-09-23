import type { ReflectionTemplateId } from "../types";

/**
 * Lightweight writing scaffolding only -- never a form. Every prompt is skippable, nothing here is
 * ever written into the user's own `note` text, and Free Write (no prompts) is always available and
 * remains the default. `promptKeys` name bilingual i18n keys resolved by the caller; prompt text is
 * never hard-coded into the saved reflection body.
 */
export interface ReflectionTemplate { id: ReflectionTemplateId; labelKey: string; promptKeys: string[] }

export const REFLECTION_TEMPLATES: ReflectionTemplate[] = [
  { id: "free", labelKey: "template_free", promptKeys: [] },
  { id: "daily-checkin", labelKey: "template_dailyCheckin", promptKeys: ["template_dailyCheckin_prompt1", "template_dailyCheckin_prompt2", "template_dailyCheckin_prompt3"] },
  { id: "gratitude", labelKey: "template_gratitude", promptKeys: ["template_gratitude_prompt1", "template_gratitude_prompt2", "template_gratitude_prompt3"] },
];

export function getReflectionTemplate(id: ReflectionTemplateId | undefined): ReflectionTemplate {
  return REFLECTION_TEMPLATES.find((template) => template.id === id) ?? REFLECTION_TEMPLATES[0];
}
