import { db } from "../db";
import type { Reward } from "../types";

export async function createReward(reward: Reward): Promise<void> { await db.rewards.add(reward); }
export async function claimReward(id: string): Promise<void> { const reward = await db.rewards.get(id); const createdAt = new Date().toISOString(); await db.rewards.update(id, { claimedAt: createdAt }); if (reward?.taskId) { const lifecycle = await db.taskLifecycles.get(reward.taskId); if (lifecycle) await db.milestoneEvents.add({ id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, taskId: reward.taskId, date: createdAt.slice(0, 10), type: "reward-claimed", sequence: lifecycle.milestoneSequence, note: reward.title, createdAt }); } }
export async function deleteReward(id: string): Promise<void> { await db.rewards.delete(id); }
