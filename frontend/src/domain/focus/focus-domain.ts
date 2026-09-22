import type { FocusTimerSnapshot } from "../../lib/storage.ts";

export function createFocusTimer(userId: string, localDate: string, updatedAt: string, durationSeconds = 25 * 60): FocusTimerSnapshot {
  return { id: `focus-${userId}-${localDate}`, userId, localDate, durationSeconds, elapsedSeconds: 0, status: "idle", updatedAt };
}

export function getFocusElapsedSeconds(timer: FocusTimerSnapshot, at = Date.now()): number {
  if (timer.status !== "running" || !timer.startedAt) return timer.elapsedSeconds;
  return Math.min(timer.durationSeconds, timer.elapsedSeconds + Math.max(0, Math.floor((at - new Date(timer.startedAt).getTime()) / 1000)));
}

export function chooseFocusDuration(timer: FocusTimerSnapshot, minutes: number, updatedAt: string): FocusTimerSnapshot {
  if (!Number.isFinite(minutes) || minutes <= 0 || timer.status === "running") return timer;
  return { ...timer, durationSeconds: Math.round(minutes * 60), elapsedSeconds: 0, status: "idle", startedAt: undefined, pausedAt: undefined, finishedAt: undefined, updatedAt };
}

export function startFocusTimer(timer: FocusTimerSnapshot, updatedAt: string): FocusTimerSnapshot {
  if (timer.status === "running") return timer;
  const fresh = timer.status === "completed" || timer.status === "cancelled" || timer.elapsedSeconds >= timer.durationSeconds;
  return { ...timer, elapsedSeconds: fresh ? 0 : timer.elapsedSeconds, status: "running", startedAt: updatedAt, pausedAt: undefined, finishedAt: undefined, updatedAt };
}

export function pauseFocusTimer(timer: FocusTimerSnapshot, updatedAt: string, at?: number): FocusTimerSnapshot {
  if (timer.status !== "running") return timer;
  return { ...timer, elapsedSeconds: getFocusElapsedSeconds(timer, at), status: "paused", pausedAt: updatedAt, updatedAt };
}

export function resumeFocusTimer(timer: FocusTimerSnapshot, updatedAt: string): FocusTimerSnapshot {
  return timer.status === "paused" ? { ...timer, status: "running", startedAt: updatedAt, pausedAt: undefined, updatedAt } : timer;
}

export function finishFocusTimer(timer: FocusTimerSnapshot, updatedAt: string, at?: number): FocusTimerSnapshot {
  return { ...timer, elapsedSeconds: getFocusElapsedSeconds(timer, at), status: "completed", finishedAt: updatedAt, updatedAt };
}

export function cancelFocusTimer(timer: FocusTimerSnapshot, updatedAt: string, at?: number): FocusTimerSnapshot {
  return { ...timer, elapsedSeconds: getFocusElapsedSeconds(timer, at), status: "cancelled", updatedAt };
}
