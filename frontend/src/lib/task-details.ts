import type { Task, TaskDetail, TaskStatus, TaskType } from "@/types/models";
import { getTaskFullPoints, withTaskPoints } from "./points.ts";
import { PARTIAL_COMPLETION_WEIGHT } from "./progress.ts";

const PRAYER_DETAILS = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];
const PRAYER_DETAIL_IDS = PRAYER_DETAILS.map((_, index) => "prayer-" + String(index + 1));

function detailSpecs(task: Pick<Task, "type" | "target" | "unit" | "title" | "config">) {
  const common = (id: string, title: string, target = task.target, unit = task.unit) => ({ id, title, target: Math.max(1, target), unit });
  const byType: Partial<Record<TaskType, Array<{ id: string; title: string; target: number; unit: string }>>> = {
    prayer: (task.config?.type === "prayer" ? task.config.prayers : PRAYER_DETAILS).map((title) => common(`prayer-${PRAYER_DETAILS.indexOf(title) + 1}`, title, 1, "صلاة")),
    quran: [common("quran-reading", "قراءة القرآن")],
    reading: [common("book-reading", "قراءة الكتاب")],
    adhkar: [common("adhkar-session", task.title)],
    sport: [common("sport-session", "التمرين")],
    water: [common("water-intake", "شرب الماء")],
    sleep: [common("sleep-session", "النوم")],
    general: [common("general-action", task.title)],
  };
  return byType[task.type] ?? [common("general-action", task.title)];
}

function distributePoints(total: number, count: number) {
  const safeTotal = Math.max(0, Math.round(total));
  const base = count ? Math.floor(safeTotal / count) : 0;
  const remainder = count ? safeTotal % count : 0;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function withTaskDetails(task: Task): Task {
  if (task.detailItems?.length) {
    const legacyElapsedSeconds = Math.round(Math.max(0, task.actualMinutes) * 60);
    const isSingleDetail = task.detailItems.length === 1;
    return {
      ...task,
      detailItems: task.detailItems.map((detail) => ({
        ...detail,
        elapsedSeconds: isSingleDetail ? Math.max(detail.elapsedSeconds, legacyElapsedSeconds) : detail.elapsedSeconds,
      })),
    };
  }
  const specs = detailSpecs(task);
  const points = distributePoints(getTaskFullPoints(task), specs.length);
  const initialCompleted = task.status === "completed" && specs.length === 1;
  return {
    ...task,
    detailItems: specs.map((spec, index): TaskDetail => ({
      ...spec,
      fullPoints: points[index],
      current: initialCompleted ? spec.target : specs.length > 1 ? (index < task.current ? spec.target : 0) : Math.min(spec.target, Math.max(0, task.current)),
      status: initialCompleted || (specs.length > 1 && index < task.current) ? "completed" : task.status === "partial" && task.current > 0 ? "partial" : "not_started",
      elapsedSeconds: specs.length === 1 ? Math.round(Math.max(0, task.actualMinutes) * 60) : 0,
    })),
  };
}

export function getTaskDetailElapsedSeconds(detail: Pick<TaskDetail, "elapsedSeconds" | "status" | "lastStartedAt">, now = Date.now()) {
  const base = Math.max(0, detail.elapsedSeconds || 0);
  if (detail.status !== "running" || !detail.lastStartedAt) return base;
  const started = new Date(detail.lastStartedAt).getTime();
  return base + (Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : 0);
}

export function getTaskElapsedSeconds(task: Pick<Task, "detailItems" | "actualMinutes">, now = Date.now()) {
  if (!task.detailItems?.length) return Math.max(0, Math.round(task.actualMinutes * 60));
  return task.detailItems.reduce((sum, detail) => sum + getTaskDetailElapsedSeconds(detail, now), 0);
}

export function getTaskDetailEarnedPoints(detail: Pick<TaskDetail, "fullPoints" | "status" | "target" | "current">) {
  if (detail.status === "completed") return Math.max(0, detail.fullPoints);
  if (detail.status !== "partial") return 0;
  return Math.max(0, detail.fullPoints) * PARTIAL_COMPLETION_WEIGHT;
}

export function getDetailsEarnedPoints(task: Pick<Task, "detailItems">) {
  return (task.detailItems ?? []).reduce((sum, detail) => sum + getTaskDetailEarnedPoints(detail), 0);
}

export function getDetailStatusAfterResult(result: Extract<TaskStatus, "completed" | "partial" | "not_completed">) {
  return result;
}

function hasPrayerDetails(task: Task) {
  const expected = task.config?.type === "prayer"
    ? task.config.prayers.map((name) => `prayer-${PRAYER_DETAILS.indexOf(name) + 1}`)
    : PRAYER_DETAIL_IDS;
  return task.detailItems?.length === expected.length
    && task.detailItems.every((detail, index) => detail.id === expected[index]);
}

function normalizeCanonicalPrayerTask(task: Task) {
  const requiredPrayers = task.config?.type === "prayer" ? task.config.prayers : PRAYER_DETAILS;
  const detailsAreValid = hasPrayerDetails(task);
  const previousElapsedSeconds = Math.max(
    Math.round(Math.max(0, task.actualMinutes) * 60),
    (task.detailItems ?? []).reduce((total, detail) => total + Math.max(0, detail.elapsedSeconds || 0), 0),
  );
  const savedCompletedPrayers = task.details?.completedPrayers;
  const completedPrayers = Array.isArray(savedCompletedPrayers)
    ? savedCompletedPrayers.filter((item): item is string => typeof item === "string" && requiredPrayers.includes(item))
    : requiredPrayers.slice(0, Math.max(0, Math.min(requiredPrayers.length, task.current)));
  const repairedTask: Task = {
    ...task,
    type: "prayer",
    ...(detailsAreValid ? {} : {
      detailItems: undefined,
      current: completedPrayers.length,
      details: { ...(task.details ?? {}), completedPrayers },
    }),
  };
  const normalized = withTaskDetails(withTaskPoints(repairedTask));

  if (detailsAreValid || previousElapsedSeconds === 0 || !normalized.detailItems?.length) return normalized;
  return {
    ...normalized,
    actualMinutes: Math.max(normalized.actualMinutes, previousElapsedSeconds / 60),
    detailItems: normalized.detailItems.map((detail, index) => index === 0
      ? { ...detail, elapsedSeconds: Math.max(detail.elapsedSeconds, previousElapsedSeconds) }
      : detail),
  };
}

export function normalizeTask(task: Task) {
  if (task.id === "prayer") return normalizeCanonicalPrayerTask(task);
  return withTaskDetails(withTaskPoints(task));
}
