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
import { completeTaskOutcome, deriveDayStatus, transitionTaskDetail, transitionTaskStatus } from "../src/domain/tasks/task-domain.ts";
import { addParticipant, changeParticipantRole, deleteParticipant, renameParticipant } from "../src/domain/participants/participant-domain.ts";

const task = (status, overrides = {}) => ({ id: status, status, target: 10, current: 3, actualMinutes: 0, type: "general", fullPoints: 10, ...overrides });

assert.equal(PARTIAL_COMPLETION_WEIGHT, 0.5);
assert.equal(calculateProgress([task("completed"), task("partial"), task("not_completed")]).percent, 50);
assert.equal(getTaskEarnedPoints(task("completed")), 10);
assert.equal(getTaskEarnedPoints(task("partial")), 5);
assert.equal(getTaskEarnedPoints(task("not_completed")), 0);
assert.equal(getTaskPartialPoints(task("partial", { fullPoints: 11 })), 5.5);

const startedAt = "2026-09-22T10:00:00.000Z";
assert.equal(getTaskDetailElapsedSeconds({ elapsedSeconds: 30, status: "running", lastStartedAt: startedAt }, Date.parse("2026-09-22T10:02:00.000Z")), 150);
assert.equal(getTaskDetailElapsedSeconds({ elapsedSeconds: 150, status: "paused" }, Date.parse("2026-09-22T11:00:00.000Z")), 150);

assert.equal(getProjectDateKey("2026-09-21T21:30:00.000Z"), "2026-09-22");
assert.equal(getProjectDayStart("2026-09-22").toISOString(), "2026-09-21T21:00:00.000Z");
assert.equal(formatRelativeTime("2026-09-22T09:58:00.000Z", "2026-09-22T10:00:00.000Z"), "منذ 2 دقيقة");

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

console.log("logic tests passed");
