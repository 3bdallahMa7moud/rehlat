import type { Task, TaskDetail, TaskStatus, TaskType } from "@/types/models";
import { getTaskFullPoints, withTaskPoints } from "@/lib/points";

const PRAYER_DETAILS = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];

function detailSpecs(task: Pick<Task, "type" | "target" | "unit" | "title">) {
  const common = (id: string, title: string, target = task.target, unit = task.unit) => ({ id, title, target: Math.max(1, target), unit });
  const byType: Partial<Record<TaskType, Array<{ id: string; title: string; target: number; unit: string }>>> = {
    prayer: PRAYER_DETAILS.map((title, index) => common(`prayer-${index + 1}`, title, 1, "صلاة")),
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
    return { ...task, detailItems: task.detailItems.map((detail) => ({ ...detail })) };
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
      elapsedSeconds: 0,
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
  if (detail.target <= 0) return Math.round(detail.fullPoints * 0.5);
  return Math.min(detail.fullPoints, Math.round(detail.fullPoints * Math.max(0, Math.min(1, detail.current / detail.target))));
}

export function getDetailsEarnedPoints(task: Pick<Task, "detailItems">) {
  return (task.detailItems ?? []).reduce((sum, detail) => sum + getTaskDetailEarnedPoints(detail), 0);
}

export function getDetailStatusAfterResult(result: Extract<TaskStatus, "completed" | "partial" | "not_completed">) {
  return result;
}

export function normalizeTask(task: Task) { return withTaskDetails(withTaskPoints(task)); }
