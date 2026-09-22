import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { claimReward, createReward, deleteReward } from "../services/rewardService";
import { todayKey } from "../lib/dates";
import { calculateTaskStats } from "../services/statisticsService";
import type { RewardTrigger } from "../types";
import { HeaderActions } from "./shell/WorkspaceHeader";

export function RewardsView() {
  const { t } = useTranslation();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const rewards = useLiveQuery(() => db.rewards.toArray(), []) ?? [];
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []) ?? [];
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [trigger, setTrigger] = useState<RewardTrigger>("streak");
  const [taskId, setTaskId] = useState("");
  const [rewardDate, setRewardDate] = useState(todayKey());
  const [streakDays, setStreakDays] = useState(7);

  const isUnlocked = (reward: (typeof rewards)[number]) => {
    if (reward.trigger === "date") return Boolean(reward.rewardDate && reward.rewardDate <= todayKey());
    const task = tasks.find((item) => item.id === reward.taskId);
    if (!task) return false;
    return calculateTaskStats(task, checkIns.filter((item) => item.taskId === task.id)).longestStreak >= (reward.streakDays ?? 0);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    await createReward({
      id: globalThis.crypto.randomUUID(),
      title: title.trim(),
      trigger,
      taskId: trigger === "streak" ? taskId : undefined,
      rewardDate: trigger === "date" ? rewardDate : undefined,
      streakDays: trigger === "streak" ? streakDays : undefined,
      createdAt: new Date().toISOString(),
    });
    setTitle("");
    setShowForm(false);
  };

  return (
    <div className="page page-narrow">
      <HeaderActions><button type="button" className="button primary" onClick={() => setShowForm((value) => !value)} aria-expanded={showForm}>＋ {t("addReward")}</button></HeaderActions>
      <div className="page-intro"><h2 className="page-title">{t("rewardTitle")}</h2><p className="muted">{t("rewardHint")}</p></div>
      {showForm && (
        <form className="panel reward-form" onSubmit={save} aria-label={t("addReward")}>
          <label className="field"><span>{t("rewardName")}</span><input autoFocus required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="field"><span>{t("trigger")}</span><select value={trigger} onChange={(event) => setTrigger(event.target.value as RewardTrigger)}><option value="streak">{t("onStreak")}</option><option value="date">{t("onDate")}</option></select></label>
          {trigger === "date" ? (
            <label className="field"><span>{t("onDate")}</span><input type="date" required value={rewardDate} onChange={(event) => setRewardDate(event.target.value)} /></label>
          ) : (
            <>
              <label className="field"><span>{t("relatedTask")}</span><select required value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="" disabled>{t("relatedTask")}</option>{tasks.filter((task) => !task.archived).map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label>
              <label className="field"><span>{t("targetDays")}</span><input type="number" min="1" max="999" value={streakDays} onChange={(event) => setStreakDays(Number(event.target.value))} /></label>
            </>
          )}
          <div className="form-actions field-wide"><button className="button secondary" type="button" onClick={() => setShowForm(false)}>{t("cancel")}</button><button className="button primary" type="submit">{t("save")}</button></div>
        </form>
      )}
      {rewards.length === 0 ? <div className="empty-state"><p>{t("noRewards")}</p></div> : <div className="reward-grid">
        {rewards.map((reward) => {
          const unlocked = isUnlocked(reward);
          const task = tasks.find((item) => item.id === reward.taskId);
          return (
            <article key={reward.id} className={`reward-card ${unlocked ? "unlocked" : ""} ${reward.claimedAt ? "claimed" : ""}`}>
              <span className="pill">{reward.claimedAt ? t("claimed") : unlocked ? t("rewardUnlocked") : t("locked")}</span>
              <h3>{reward.title}</h3>
              <p className="muted small">{reward.trigger === "date" ? reward.rewardDate : `${task?.title ?? ""} · ${reward.streakDays} ${t("days")}`}</p>
              <div className="reward-actions">
                {unlocked && !reward.claimedAt ? <button type="button" className="button primary compact" onClick={() => claimReward(reward.id)}>{t("claim")}</button> : <span/>}
                <button type="button" className="button text-button danger-text" onClick={() => globalThis.confirm(t("rewardDeleteConfirm")) && deleteReward(reward.id)}>{t("delete")}</button>
              </div>
            </article>
          );
        })}
      </div>}
    </div>
  );
}
