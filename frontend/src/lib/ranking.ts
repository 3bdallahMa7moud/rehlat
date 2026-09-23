import type { Participant, RankingEntry, Task } from "@/types/models";
import { clamp } from "./progress.ts";

export interface RankingMetrics {
  participantId: string;
  score?: number;
  progress?: number;
  streak?: number;
  actualMinutes?: number;
}

export interface RankingWeights {
  /** Weight for an externally awarded points score. */
  score: number;
  /** Weight for daily completion percentage when no score exists. */
  progress: number;
  /** Weight for consecutive days when no score exists. */
  streak: number;
  /** Weight for active minutes when no score exists. */
  actualMinutes: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  score: 1,
  progress: 1,
  streak: 1,
  actualMinutes: 0.1,
};

export interface RankingCalculationOptions {
  includeAdmins?: boolean;
  weights?: Partial<RankingWeights>;
  metrics?: readonly RankingMetrics[] | Readonly<Record<string, Partial<Omit<RankingMetrics, "participantId">>>>;
  tasksByParticipant?: Readonly<Record<string, readonly Task[]>>;
}

export interface CalculatedRankingEntry extends RankingEntry {
  actualMinutes: number;
  /** Score used for sorting, which may be derived when no points exist. */
  rankScore: number;
}

type ParticipantLike = Pick<Participant, "id" | "name" | "initials" | "avatarColor" | "role" | "progress" | "streak" | "score"> & Partial<Pick<Participant, "pin" | "presence" | "currentStatus" | "currentTask">> & {
  actualMinutes?: number;
};

function finite(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getMetrics(participant: ParticipantLike, options: RankingCalculationOptions): RankingMetrics {
  const metricMap = options.metrics && !Array.isArray(options.metrics)
    ? options.metrics as Readonly<Record<string, Partial<Omit<RankingMetrics, "participantId">>>>
    : undefined;
  const source = Array.isArray(options.metrics)
    ? options.metrics.find((metric) => metric.participantId === participant.id)
      : metricMap?.[participant.id];
  const tasksMinutes = options.tasksByParticipant?.[participant.id]?.reduce((total, task) => total + Math.max(0, finite(task.actualMinutes)), 0);
  return {
    participantId: participant.id,
    score: finite(source?.score ?? participant.score),
    progress: clamp(source?.progress ?? participant.progress),
    streak: Math.max(0, finite(source?.streak ?? participant.streak)),
    actualMinutes: Math.max(0, finite(source?.actualMinutes ?? participant.actualMinutes ?? tasksMinutes)),
  };
}

/**
 * Standalone ranking formula. A provided points score remains authoritative;
 * when points are absent, the normalized progress/streak/time components are
 * combined so the same rule can be moved to a backend service later.
 */
export function calculateRankingScore(metrics: RankingMetrics, weights: Partial<RankingWeights> = {}) {
  const merged = { ...DEFAULT_RANKING_WEIGHTS, ...weights };
  if (metrics.score !== undefined && Number.isFinite(metrics.score)) return metrics.score * merged.score;
  return clamp(finite(metrics.progress)) * merged.progress
    + Math.max(0, finite(metrics.streak)) * merged.streak
    + Math.max(0, finite(metrics.actualMinutes)) * merged.actualMinutes;
}

export function calculateRankings(
  participants: readonly ParticipantLike[] = [],
  options: RankingCalculationOptions = {},
): CalculatedRankingEntry[] {
  const weights = { ...DEFAULT_RANKING_WEIGHTS, ...options.weights };
  const entries = participants
    .filter((participant) => options.includeAdmins || participant.role !== "admin")
    .map((participant) => {
      const metrics = getMetrics(participant, options);
      const rankScore = calculateRankingScore(metrics, weights);
      const score = metrics.score !== undefined && Number.isFinite(metrics.score) ? metrics.score : Math.round(rankScore);
      return {
        participantId: participant.id,
        rank: 0,
        name: participant.name,
        initials: participant.initials,
        avatarColor: participant.avatarColor,
        score,
      progress: clamp(finite(metrics.progress)),
        streak: Math.max(0, Math.round(metrics.streak ?? 0)),
        actualMinutes: Math.round(metrics.actualMinutes ?? 0),
        rankScore,
      } satisfies CalculatedRankingEntry;
    });

  entries.sort((a, b) => b.rankScore - a.rankScore
    || b.progress - a.progress
    || b.streak - a.streak
    || b.actualMinutes - a.actualMinutes
    || a.name.localeCompare(b.name)
    || a.participantId.localeCompare(b.participantId));
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export const calculateRanking = calculateRankings;
export const rankParticipants = calculateRankings;
