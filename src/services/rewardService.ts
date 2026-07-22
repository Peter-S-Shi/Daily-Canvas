import { db } from "../db";
import type { Reward } from "../types";

export async function createReward(reward: Reward): Promise<void> { await db.rewards.add(reward); }
export async function claimReward(id: string): Promise<void> { await db.rewards.update(id, { claimedAt: new Date().toISOString() }); }
export async function deleteReward(id: string): Promise<void> { await db.rewards.delete(id); }
