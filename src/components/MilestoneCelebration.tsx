import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { chooseMilestoneAction, milestoneTargetFor } from "../services/lifecycleService";
import { claimReward } from "../services/rewardService";
import type { Task, TaskLifecycle } from "../types";
import { Dialog } from "./Dialog";

export function MilestoneCelebration({ task, lifecycle }: { task: Task; lifecycle: TaskLifecycle }) {
  const { t } = useTranslation();
  const [extension, setExtension] = useState(milestoneTargetFor(task, lifecycle) + (task.schedule.mode === "quota" ? 2 : 7));
  const [showExtend, setShowExtend] = useState(false);
  const rewards = useLiveQuery(() => db.rewards.where("taskId").equals(task.id).toArray(), [task.id]) ?? [];
  const choose = (action: "continue" | "maintenance" | "extend" | "complete" | "archive") => chooseMilestoneAction(task.id, action, action === "extend" ? extension : undefined);

  return <Dialog labelledBy="milestone-title" className="dialog-small celebration-card"><div className="dialog-body"><div className="celebration-mark" aria-hidden="true">✦</div><span className="eyebrow">{t("milestoneReached")}</span><h2 id="milestone-title">{t("celebrationTitle", { title: task.title })}</h2><p>{t("celebrationBody")}</p><div className="celebration-facts"><span>{t("milestoneNumber", { count: lifecycle.milestoneSequence })}</span><span>{t(task.schedule.mode === "quota" ? "quotaMilestoneTarget" : "dayMilestoneTarget", { count: milestoneTargetFor(task, lifecycle) })}</span></div>{rewards.filter((reward) => !reward.claimedAt && reward.trigger === "streak" && (reward.streakDays ?? 0) <= lifecycle.personalBest).map((reward) => <div className="milestone-reward" key={reward.id}><span>✦</span><div><strong>{reward.title}</strong><small>{t("rewardUnlocked")}</small></div><button type="button" className="button primary" onClick={() => claimReward(reward.id)}>{t("claim")}</button></div>)}{showExtend && <label className="field"><span>{t(task.schedule.mode === "quota" ? "targetPeriods" : "targetDays")}</span><input type="number" min="1" value={extension} onChange={(event) => setExtension(Number(event.target.value))}/></label>}<div className="celebration-actions"><button type="button" className="button primary" onClick={() => choose("continue")}>{t("continueOriginal")}</button><button type="button" className="button secondary" onClick={() => choose("maintenance")}>{t("switchMaintenance")}</button><button type="button" className="button secondary" onClick={() => showExtend ? choose("extend") : setShowExtend(true)}>{t("extendTarget")}</button><button type="button" className="button secondary" onClick={() => choose("complete")}>{t("markComplete")}</button><button type="button" className="quiet-action" onClick={() => choose("archive")}>{t("archive")}</button></div></div></Dialog>;
}
