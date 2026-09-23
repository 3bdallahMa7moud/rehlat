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
import { dailyReflections, getDailyReflection, getDailyReflectionIndex } from "../src/lib/daily-reflection.ts";
import { getTaskOutcomeFeedback } from "../src/lib/feedback.ts";
import { getNewStreakMilestones, getUnseenAchievementFeedback } from "../src/lib/achievement-feedback.ts";

const task = (status, overrides = {}) => ({ id: status, status, target: 10, current: 3, actualMinutes: 0, type: "general", fullPoints: 10, ...overrides });

assert.equal(PARTIAL_COMPLETION_WEIGHT, 0.5);
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
assert.deepEqual(getNewStreakMilestones(2, 3), [3]);
assert.deepEqual(getNewStreakMilestones(3, 3), []);
assert.deepEqual(getNewStreakMilestones(6, 7), [7]);
assert.deepEqual(getNewStreakMilestones(7, 8), []);
assert.equal(getUnseenAchievementFeedback([{ id: "first-task" }], ["razi:first-task"], "razi").length, 0);

assert.equal(calculateStreak([
  { date: "2026-09-20", status: "successful" },
  { date: "2026-09-21", status: "successful" },
  { date: "2026-09-22", status: "successful" },
], { today: "2026-09-22" }).current, 3);
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

console.log("logic tests passed");
