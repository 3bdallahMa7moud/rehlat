export type AchievementFeedbackKind = "achievement" | "milestone" | "title";

export type AchievementFeedback = {
  id: string;
  kind: AchievementFeedbackKind;
  title: string;
  body: string;
};

export const STREAK_MILESTONES = [3, 7, 14, 30] as const;

export function getNewStreakMilestones(previous: number, next: number) {
  return STREAK_MILESTONES.filter((milestone) => previous < milestone && next >= milestone);
}

export function getUnseenAchievementFeedback<T extends { id: string }>(items: readonly T[], seenIds: readonly string[], participantId: string) {
  const seen = new Set(seenIds);
  return items.filter((item) => !seen.has(`${participantId}:${item.id}`));
}

export function hasParticipantCompletedTask<T extends { userId: string; status: string }>(records: readonly T[], participantId: string) {
  return records.some((record) => record.userId === participantId && record.status === "completed");
}

export function planAchievementFeedbackDelivery(items: readonly AchievementFeedback[]) {
  const priority = { title: 3, milestone: 2, achievement: 1 } as const;
  const delivered = [...items].sort((left, right) => priority[right.kind] - priority[left.kind]);
  return {
    toast: delivered[0],
    notifications: delivered.slice(1),
    delivered,
  };
}

export function getAchievementFeedback(input: {
  hasCompletedTaskBefore: boolean;
  previousStreak: number;
  nextStreak: number;
}): AchievementFeedback[] {
  const feedback: AchievementFeedback[] = [];
  if (!input.hasCompletedTaskBefore) {
    feedback.push({ id: "achievement:first-task", kind: "achievement", title: "إنجاز جديد", body: "أكملت أول مهمة مسجلة في رحلتك." });
  }

  getNewStreakMilestones(input.previousStreak, input.nextStreak).forEach((milestone) => {
    if (milestone === 7) {
      feedback.push({ id: "title:continuity-guardian", kind: "title", title: "حصلت على لقب جديد", body: "حارس الاستمرارية — سبعة أيام من التقدم المتواصل." });
      return;
    }
    feedback.push({
      id: `milestone:streak-${milestone}`,
      kind: "milestone",
      title: "محطة استمرارية جديدة",
      body: `وصلت إلى سلسلة ${milestone} أيام. استمر بالوتيرة المناسبة لك.`,
    });
  });
  return feedback;
}
