import assert from "node:assert/strict";
import { getProjectDateKey, getProjectDayStart, formatRelativeTime } from "../src/lib/date-time.ts";
import { calculateProgress, PARTIAL_COMPLETION_WEIGHT } from "../src/lib/progress.ts";
import { getTaskEarnedPoints, getTaskPartialPoints } from "../src/lib/points.ts";
import { getTaskDetailElapsedSeconds } from "../src/lib/task-details.ts";
import { calculateStreak } from "../src/lib/streak.ts";
import { activityEvents } from "../src/mocks/activity.ts";
import { createActivityEvent } from "../src/domain/activity/activity-factory.ts";
import { createNotification } from "../src/domain/notifications/notification-factory.ts";
import { cancelFocusTimer, createFocusTimer, finishFocusTimer, pauseFocusTimer, resumeFocusTimer, startFocusTimer } from "../src/domain/focus/focus-domain.ts";
import { completeTaskOutcome, deriveDayStatus, transitionTaskDetail, transitionTaskStatus, updateMeasuredTaskProgress } from "../src/domain/tasks/task-domain.ts";
import { filterTasks, getTaskPrimaryAction } from "../src/domain/tasks/task-presentation.ts";
import { addParticipant, changeParticipantRole, deleteParticipant, renameParticipant, setParticipantPin } from "../src/domain/participants/participant-domain.ts";
import { MockAIAdapter } from "../src/data/ai/mock-ai-adapter.ts";
import { createEmptyJourneyState, isJourneyPersistedState } from "../src/lib/storage.ts";
import { dailyReflections, getDailyReflection, getDailyReflectionIndex } from "../src/lib/daily-reflection.ts";
import { getDetailCompletionFeedbackPriority, getTaskDetailOutcomeFeedback, getTaskOutcomeFeedback, isFullDayCompletion } from "../src/lib/feedback.ts";
import { getAchievementFeedback, getNewStreakMilestones, getUnseenAchievementFeedback, hasParticipantCompletedTask, planAchievementFeedbackDelivery } from "../src/lib/achievement-feedback.ts";
import { getEarnedTitleCards, getHonorHighlights, getPersonalHonorSummary } from "../src/lib/honors.ts";
import { calculateRankings, calculateRankingScore } from "../src/lib/ranking.ts";
import { getDayCompletionPresentation, getTaskStreakPresentation } from "../src/lib/streak-presentation.ts";
import { queryReport } from "../src/lib/report-query.ts";
import { createExportArtifact, serializePdf } from "../src/lib/export.ts";

const task = (status, overrides = {}) => ({ id: status, status, target: 10, current: 3, actualMinutes: 0, type: "general", fullPoints: 10, ...overrides });

assert.equal(PARTIAL_COMPLETION_WEIGHT, 0.5);
assert.equal(calculateRankingScore({ participantId: "zero", score: 0, progress: 80, streak: 4, actualMinutes: 60 }), 0);
assert.equal(calculateRankingScore({ participantId: "points", score: 845, progress: 0, streak: 0, actualMinutes: 0 }), 845);
assert.equal(calculateRankingScore({ participantId: "fallback", progress: 80, streak: 4, actualMinutes: 60 }) > 0, true);
const rankingFixture = calculateRankings([
  { id: "admin", name: "Admin", initials: "A", avatarColor: "teal", role: "admin", score: 9999, progress: 100, streak: 99 },
  { id: "a", name: "A", initials: "A", avatarColor: "teal", role: "participant", score: 100, progress: 70, streak: 4 },
  { id: "b", name: "B", initials: "B", avatarColor: "teal", role: "participant", score: 100, progress: 80, streak: 2 },
]);
assert.deepEqual(rankingFixture.map((entry) => entry.participantId), ["b", "a"]);
const rankingFallback = calculateRankings([{ id: "fallback", name: "Fallback", initials: "F", avatarColor: "teal", role: "participant", progress: 80, streak: 4, actualMinutes: 60 }]);
assert.equal(rankingFallback[0].rankScore > 0, true);
assert.equal(getTaskStreakPresentation({ current: 4, isTodaySuccessful: false, isAtRisk: false }).tone, "teal");
assert.deepEqual(getTaskStreakPresentation({ current: 4, isTodaySuccessful: false, isAtRisk: true }), { tone: "warning", body: "لم يُسجل نجاح هذه المهمة لليوم بعد." });
assert.equal(getTaskStreakPresentation({ current: 4, isTodaySuccessful: true, isAtRisk: false }).tone, "success");
assert.equal(getDayCompletionPresentation("complete", 100).kind, "full");
assert.equal(getDayCompletionPresentation("complete", 50).kind, "terminal-incomplete");
assert.equal(getDayCompletionPresentation("in_progress", 50).kind, "active");
assert.equal(calculateProgress([task("completed"), task("partial"), task("not_completed")]).percent, 50);
assert.equal(getTaskEarnedPoints(task("completed")), 10);
assert.equal(getTaskEarnedPoints(task("partial")), 5);
assert.equal(getTaskEarnedPoints(task("not_completed")), 0);
assert.equal(getTaskPartialPoints(task("partial", { fullPoints: 11 })), 5.5);
assert.equal(getTaskPrimaryAction("not_started"), "ابدأ المهمة");
assert.equal(getTaskPrimaryAction("running"), "متابعة المهمة");
assert.equal(getTaskPrimaryAction("closed"), "عرض التفاصيل");
const filteredTasks = [
  task("running", { id: "faith-morning", category: "faith", group: "morning" }),
  task("paused", { id: "health", category: "health" }),
  task("completed", { id: "faith-done", category: "faith", group: "morning" }),
];
assert.deepEqual(filterTasks(filteredTasks, "morning", "faith").map((item) => item.id), ["faith-morning", "faith-done"]);
assert.deepEqual(filterTasks(filteredTasks, "active", "health").map((item) => item.id), ["health"]);
const timedOutcome = task("running", { actualMinutes: 12 });
assert.equal(completeTaskOutcome(timedOutcome, "not_completed")?.actualMinutes, 12);
assert.equal(completeTaskOutcome(timedOutcome, "closed")?.actualMinutes, 12);

const startedAt = "2026-09-22T10:00:00.000Z";
assert.equal(getTaskDetailElapsedSeconds({ elapsedSeconds: 30, status: "running", lastStartedAt: startedAt }, Date.parse("2026-09-22T10:02:00.000Z")), 150);
assert.equal(getTaskDetailElapsedSeconds({ elapsedSeconds: 150, status: "paused" }, Date.parse("2026-09-22T11:00:00.000Z")), 150);

assert.equal(getProjectDateKey("2026-09-21T21:30:00.000Z"), "2026-09-22");
assert.equal(getProjectDayStart("2026-09-22").toISOString(), "2026-09-21T21:00:00.000Z");
assert.equal(formatRelativeTime("2026-09-22T09:58:00.000Z", "2026-09-22T10:00:00.000Z"), "منذ 2 دقيقة");

assert.equal(getDailyReflection("2026-09-22").id, getDailyReflection("2026-09-22").id);
assert.notEqual(getDailyReflectionIndex("2026-09-22"), getDailyReflectionIndex("2026-09-23"));
assert.equal(dailyReflections.length >= 7, true);
assert.equal(getTaskOutcomeFeedback("completed").tone, "success");
assert.equal(getTaskOutcomeFeedback("partial").tone, "info");
assert.equal(getTaskOutcomeFeedback("not_completed").tone, "neutral");
assert.equal(getTaskOutcomeFeedback("closed").tone, "neutral");
assert.equal(getTaskDetailOutcomeFeedback("completed", "الفجر").celebrate, null);
assert.equal(getTaskDetailOutcomeFeedback("completed", "الفجر").sound, null);
assert.equal(hasParticipantCompletedTask([{ userId: "user-a", status: "completed" }], "user-b"), false);
assert.equal(hasParticipantCompletedTask([{ userId: "user-a", status: "completed" }], "user-a"), true);
assert.equal(getAchievementFeedback({ hasCompletedTaskBefore: hasParticipantCompletedTask([{ userId: "user-a", status: "completed" }], "user-b"), previousStreak: 0, nextStreak: 0 }).some((item) => item.id === "achievement:first-task"), true);
assert.equal(isFullDayCompletion("in_progress", 100), true);
assert.equal(isFullDayCompletion("in_progress", 50), false);
assert.equal(isFullDayCompletion("complete", 100), false);
assert.equal(isFullDayCompletion("in_progress", calculateProgress([task("completed"), task("completed")]).percent), true);
assert.equal(isFullDayCompletion("in_progress", calculateProgress([task("partial"), task("closed")]).percent), false);
assert.equal(isFullDayCompletion("in_progress", calculateProgress([task("not_completed"), task("closed")]).percent), false);
assert.equal(getDetailCompletionFeedbackPriority({ parentBecameCompleted: false, dayStatus: "in_progress", nextProgressPercent: 100 }), "detail");
assert.equal(getDetailCompletionFeedbackPriority({ parentBecameCompleted: true, dayStatus: "in_progress", nextProgressPercent: 80 }), "task");
assert.equal(getDetailCompletionFeedbackPriority({ parentBecameCompleted: true, dayStatus: "in_progress", nextProgressPercent: 100 }), "day");
const delivery = planAchievementFeedbackDelivery([
  { id: "achievement", kind: "achievement", title: "A", body: "A" },
  { id: "milestone", kind: "milestone", title: "M", body: "M" },
  { id: "title", kind: "title", title: "T", body: "T" },
]);
assert.equal(delivery.toast?.id, "title");
assert.equal(delivery.notifications.length, 2);
assert.equal(delivery.delivered.length, 3);
assert.deepEqual(delivery.delivered.map((item) => item.id).sort(), ["achievement", "milestone", "title"]);
const validStorage = createEmptyJourneyState();
assert.equal(isJourneyPersistedState(validStorage), true);
const storageWithoutSeenFeedbackIds = { ...validStorage };
delete storageWithoutSeenFeedbackIds.seenFeedbackIds;
assert.equal(isJourneyPersistedState(storageWithoutSeenFeedbackIds), false);
assert.equal(isJourneyPersistedState({ ...validStorage, seenFeedbackIds: [123] }), false);
assert.deepEqual(getNewStreakMilestones(2, 3), [3]);
assert.deepEqual(getNewStreakMilestones(3, 3), []);
assert.deepEqual(getNewStreakMilestones(6, 7), [7]);
assert.deepEqual(getNewStreakMilestones(7, 8), []);
assert.equal(getUnseenAchievementFeedback([{ id: "first-task" }], ["razi:first-task"], "razi").length, 0);

const honorsRankings = [
  { participantId: "a", rank: 1, name: "A", initials: "A", avatarColor: "teal", score: 100, streak: 3, progress: 70 },
  { participantId: "b", rank: 2, name: "B", initials: "B", avatarColor: "mint", score: 80, streak: 8, progress: 90 },
];
const honorsHighlights = getHonorHighlights(honorsRankings);
assert.equal(honorsHighlights.find((item) => item.id === "score")?.leaders[0].participantId, "a");
assert.equal(honorsHighlights.find((item) => item.id === "streak")?.leaders[0].participantId, "b");
assert.equal(honorsHighlights.find((item) => item.id === "progress")?.leaders[0].participantId, "b");
assert.equal(getHonorHighlights([{ ...honorsRankings[0] }, { ...honorsRankings[0], participantId: "c", name: "C" }])[0].leaders.length, 2);
const honorTitles = getEarnedTitleCards({ generalStreak: 5, quranTaskId: "quran", taskStreaks: [{ taskId: "quran", current: 6 }] });
assert.equal(honorTitles.find((item) => item.id === "emerald")?.earned, true);
assert.equal(honorTitles.find((item) => item.id === "continuity")?.earned, false);
assert.equal(honorTitles.find((item) => item.id === "quran")?.earned, false);
assert.equal(getEarnedTitleCards({ generalStreak: 7, quranTaskId: "quran", taskStreaks: [{ taskId: "quran", current: 7 }] }).every((item) => item.earned), true);
assert.equal(getPersonalHonorSummary({ generalStreakTitle: { label: "ملتزم", days: 7, nextMilestone: 14, progress: 0 }, successfulDays: 7, historyDays: [{ progress: 100 }] }).title.label, "ملتزم");

assert.equal(calculateStreak([
  { date: "2026-09-20", status: "successful" },
  { date: "2026-09-21", status: "successful" },
  { date: "2026-09-22", status: "successful" },
], { today: "2026-09-22" }).current, 3);
const parentCompletedFromDetail = transitionTaskDetail(task("running", {
  detailItems: [{ id: "only-detail", title: "detail", target: 1, current: 0, unit: "step", fullPoints: 10, status: "running", elapsedSeconds: 30 }],
}), "only-detail", "completed", "2026-09-22T10:00:00.000Z");
assert.equal(parentCompletedFromDetail?.status, "completed");
assert.ok(activityEvents.every((event) => !Number.isNaN(new Date(event.createdAt).getTime())));

const clock = "2026-09-22T10:00:00.000Z";
const participant = { id: "p1", name: "سارة أحمد", initials: "سأ", avatarColor: "teal", role: "participant", presence: "idle", currentStatus: "", progress: 0, streak: 0, score: 0, pin: "1234" };
assert.equal(createActivityEvent({ participant, kind: "started", action: "بدأ", task: "قراءة", createdAt: clock }).createdAt, clock);
assert.equal(createNotification({ kind: "info", title: "تنبيه", body: "اختبار", createdAt: clock, read: false }).createdAt, clock);
assert.equal(renameParticipant([participant], "p1", "نورة علي")[0].initials, "نع");
assert.equal(changeParticipantRole([participant], "p1", "admin")[0].role, "admin");
assert.equal(deleteParticipant([participant], "p1").length, 0);
assert.equal(addParticipant([], "نورة", "1234").length, 1);
assert.equal(setParticipantPin([participant], "p1", "0000")[0].pin, "0000");

let focusTimer = createFocusTimer("p1", "2026-09-22", clock);
focusTimer = startFocusTimer(focusTimer, clock);
focusTimer = pauseFocusTimer(focusTimer, "2026-09-22T10:02:00.000Z", Date.parse("2026-09-22T10:02:00.000Z"));
assert.equal(focusTimer.elapsedSeconds, 120);
focusTimer = resumeFocusTimer(focusTimer, "2026-09-22T10:03:00.000Z");
assert.equal(finishFocusTimer(focusTimer, "2026-09-22T10:04:00.000Z", Date.parse("2026-09-22T10:04:00.000Z")).status, "completed");
assert.equal(cancelFocusTimer(focusTimer, clock).status, "cancelled");

const timedTask = { ...task("not_started"), detailItems: [{ id: "detail", title: "جلسة", target: 1, current: 0, unit: "جلسة", fullPoints: 10, status: "not_started", elapsedSeconds: 0 }] };
assert.equal(transitionTaskStatus(timedTask, "running", clock).status, "running");
assert.equal(transitionTaskDetail(timedTask, "detail", "start", clock)?.detailItems?.[0].status, "running");
assert.equal(completeTaskOutcome(task("partial"), "partial")?.current, 3);
assert.equal(deriveDayStatus([task("completed"), task("partial")]), "complete");
const detailOutcomeTask = task("running", {
  id: "detail-outcome",
  current: 4,
  actualMinutes: 2,
  durationMinutes: 45,
  detailItems: [{ id: "running-detail", title: "Session", target: 10, current: 4, unit: "step", fullPoints: 10, status: "running", elapsedSeconds: 90, lastStartedAt: "2026-09-22T10:00:00.000Z" }],
});
const finalizedAt = Date.parse("2026-09-22T10:02:30.000Z");
const partialDetailOutcome = completeTaskOutcome(detailOutcomeTask, "partial", finalizedAt);
assert.equal(partialDetailOutcome?.status, "partial");
assert.equal(partialDetailOutcome?.current, 4);
assert.equal(partialDetailOutcome?.detailItems?.[0].elapsedSeconds, 240);
assert.equal(partialDetailOutcome?.detailItems?.[0].lastStartedAt, undefined);
assert.equal(partialDetailOutcome?.actualMinutes, 4);
assert.equal(partialDetailOutcome?.awardedPoints, 5);
const notCompletedDetailOutcome = completeTaskOutcome(detailOutcomeTask, "not_completed", finalizedAt);
assert.equal(notCompletedDetailOutcome?.status, "not_completed");
assert.equal(notCompletedDetailOutcome?.actualMinutes, 4);
assert.equal(notCompletedDetailOutcome?.detailItems?.[0].lastStartedAt, undefined);
assert.equal(notCompletedDetailOutcome?.awardedPoints, 0);
const closedDetailOutcome = completeTaskOutcome(detailOutcomeTask, "closed", finalizedAt);
assert.equal(closedDetailOutcome?.status, "closed");
assert.equal(closedDetailOutcome?.detailItems?.[0].elapsedSeconds, 240);
assert.equal(closedDetailOutcome?.detailItems?.[0].lastStartedAt, undefined);
assert.equal(closedDetailOutcome?.awardedPoints, 0);
const completedDetailOutcome = completeTaskOutcome(detailOutcomeTask, "completed", finalizedAt);
assert.equal(completedDetailOutcome?.status, "completed");
assert.equal(completedDetailOutcome?.detailItems?.[0].status, "completed");
assert.equal(completedDetailOutcome?.detailItems?.[0].lastStartedAt, undefined);
assert.equal(completedDetailOutcome?.actualMinutes, 4);
assert.equal(completedDetailOutcome?.actualMinutes < (detailOutcomeTask.durationMinutes ?? Infinity), true);
assert.equal(transitionTaskDetail(closedDetailOutcome, "running-detail", "start", "2026-09-22T10:03:00.000Z"), null);

assert.equal(updateMeasuredTaskProgress(task("not_started"), 3).status, "partial");
assert.equal(updateMeasuredTaskProgress(task("partial"), 0).status, "not_started");
assert.equal(updateMeasuredTaskProgress(task("partial"), 10).status, "completed");
assert.equal(updateMeasuredTaskProgress(task("completed"), 5).status, "partial");
assert.equal(updateMeasuredTaskProgress(task("running"), 5).status, "running");
assert.equal(updateMeasuredTaskProgress(task("paused"), 5).status, "paused");

const measuredDetailTask = task("not_started", {
  current: 0,
  detailItems: [{ id: "measured-detail", title: "قراءة", target: 10, current: 0, unit: "صفحة", fullPoints: 10, status: "not_started", elapsedSeconds: 0 }],
});
const partialMeasuredDetail = updateMeasuredTaskProgress(measuredDetailTask, 3);
assert.equal(partialMeasuredDetail.status, "partial");
assert.equal(partialMeasuredDetail.detailItems?.[0].current, 3);
assert.equal(partialMeasuredDetail.detailItems?.[0].status, "partial");
const resetMeasuredDetail = updateMeasuredTaskProgress(partialMeasuredDetail, 0);
assert.equal(resetMeasuredDetail.status, "not_started");
assert.equal(resetMeasuredDetail.detailItems?.[0].status, "not_started");
const pausedMeasuredDetail = updateMeasuredTaskProgress({ ...measuredDetailTask, status: "paused", detailItems: [{ ...measuredDetailTask.detailItems[0], status: "paused" }] }, 5);
assert.equal(pausedMeasuredDetail.status, "paused");
assert.equal(pausedMeasuredDetail.detailItems?.[0].status, "paused");

const aiResponse = await new MockAIAdapter(0).sendMessage({ message: "رتب يومي", participant, tasks: [task("not_started", { title: "قراءة" })], progress: { percent: 0, completed: 0, total: 1, remaining: 1 }, streak: 2 });
assert.ok(aiResponse.content.includes("قراءة"));

const reportParticipants = [{ ...participant, id: "a", name: "A" }, { ...participant, id: "b", name: "B" }];
const reportTasks = [task("not_started", { id: "reading", title: "Reading" }), task("not_started", { id: "sport", title: "Sport" })];
const reportRecords = [
  { userId: "a", taskId: "reading", localDate: "2026-09-22", status: "completed", current: 1, actualMinutes: 100, updatedAt: clock },
  { userId: "a", taskId: "sport", localDate: "2026-09-22", status: "closed", current: 0, actualMinutes: 12, updatedAt: clock },
  { userId: "b", taskId: "reading", localDate: "2026-09-21", status: "partial", current: 1, actualMinutes: 50, updatedAt: clock },
];
const reportInput = { participants: reportParticipants, tasks: reportTasks, dailyTaskRecords: reportRecords, progress: [], today: "2026-09-22" };
const filteredReport = queryReport(reportInput, { period: "weekly", participantId: "a", taskId: "reading" });
assert.equal(filteredReport.totalMinutes, 100);
assert.equal(filteredReport.completionRate, 100);
assert.equal(filteredReport.taskRows.length, 1);
const groupReport = queryReport(reportInput, { period: "weekly", participantId: "all", taskId: "all" });
assert.equal(groupReport.totalMinutes, 162);
assert.equal(groupReport.participantRows.length, 2);
assert.equal(groupReport.topParticipant, "A");
const monthlyReport = queryReport(reportInput, { period: "monthly", participantId: "all", taskId: "all" });
assert.equal(monthlyReport.points[monthlyReport.points.length - 1].label, "الأسبوع 4");
assert.equal(queryReport({ ...reportInput, dailyTaskRecords: [] }, { period: "daily", participantId: "a", taskId: "all" }).hasData, false);
const xlsxArtifact = createExportArtifact({ data: [{ "نسبة الإنجاز": 100 }], format: "xlsx", filename: "test-report" });
assert.equal(xlsxArtifact.filename.endsWith(".xlsx"), true);
assert.equal(xlsxArtifact.mimeType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
assert.equal((await xlsxArtifact.blob.arrayBuffer()).byteLength > 100, true);
assert.equal(serializePdf([{ title: "تقرير عربي" }], { title: "تقرير عربي" }).includes("?"), false);

console.log("logic tests passed");
