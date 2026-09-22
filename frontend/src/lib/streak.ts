import type { StreakDay } from "@/types/models";
import { DEFAULT_SUCCESS_THRESHOLD, clamp } from "./progress";

export type StreakStatus = "successful" | "partial" | "unsuccessful" | "today" | "future";

export interface StreakRecord {
  date?: string | Date;
  status?: StreakStatus;
  progress?: number;
  successful?: boolean;
  isSuccessful?: boolean;
  /** Optional human-readable explanation shown in a tooltip. */
  reason?: string;
}

export interface StreakCalculationOptions {
  successThreshold?: number;
  /** When enabled, a partial day keeps a streak alive. Defaults to false. */
  partialCountsAsSuccess?: boolean;
  /** Date used to identify a pending/current day. Defaults to the local day. */
  today?: Date | string;
}

export interface CalculatedStreak {
  current: number;
  best: number;
  successfulDays: number;
  partialDays: number;
  unsuccessfulDays: number;
  history: StreakHistoryDay[];
  isTodaySuccessful: boolean;
  isTodayPending: boolean;
  isAtRisk: boolean;
  reason: string;
}

export interface StreakHistoryDay extends Omit<StreakDay, "status" | "date"> {
  date: string;
  status: StreakStatus;
  reason?: string;
}

interface NormalizedRecord {
  sourceIndex: number;
  date: string;
  timestamp: number | undefined;
  status: StreakStatus;
  progress: number | undefined;
  successful: boolean;
  reason?: string;
}

function dateKey(value: string | Date | undefined) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.trim();
  // Date-only strings are interpreted as UTC by JavaScript. Construct a local
  // key from the supplied components to avoid a day shift in negative offsets.
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  return dateKey(parsed);
}

function localTodayKey(today: Date | string | undefined) {
  return dateKey(today ?? new Date());
}

function parseTimestamp(key: string) {
  const parsed = new Date(`${key}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getTime();
}

function dayDistance(previous: NormalizedRecord, current: NormalizedRecord) {
  if (previous.timestamp === undefined || current.timestamp === undefined) return 1;
  return Math.round((current.timestamp - previous.timestamp) / 86_400_000);
}

function isSuccessfulRecord(record: StreakRecord, threshold: number, partialCountsAsSuccess: boolean) {
  if (record.successful === true || record.isSuccessful === true) return true;
  if (record.status === "successful") return true;
  if (record.status === "partial") return partialCountsAsSuccess;
  return record.status === undefined && typeof record.progress === "number" && clamp(record.progress) >= threshold;
}

function normalizeRecord(record: StreakRecord | StreakDay, index: number, threshold: number, partialCountsAsSuccess: boolean): NormalizedRecord {
  const status = record.status ?? (isSuccessfulRecord(record, threshold, partialCountsAsSuccess) ? "successful" : "unsuccessful");
  const key = dateKey(record.date);
    const progress = "progress" in record && typeof record.progress === "number" ? clamp(record.progress) : undefined;
  const successful = isSuccessfulRecord({ ...record, status }, threshold, partialCountsAsSuccess);
  return {
    sourceIndex: index,
    date: key ?? String(record.date ?? index + 1),
    timestamp: key ? parseTimestamp(key) : undefined,
    status,
    progress,
    successful,
    reason: "reason" in record ? record.reason : undefined,
  };
}

function sortRecords(records: NormalizedRecord[]) {
  return [...records].sort((a, b) => {
    if (a.timestamp !== undefined && b.timestamp !== undefined && a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a.sourceIndex - b.sourceIndex;
  });
}

function toHistoryDay(record: NormalizedRecord): StreakHistoryDay {
  return { date: record.date, status: record.status, ...(record.reason ? { reason: record.reason } : {}) };
}

/**
 * Calculate a consecutive daily streak from outcomes ordered by date. Missing
 * calendar days break a streak when parseable dates are provided; opaque labels
 * (for example the existing Arabic mock labels) retain their input order.
 */
export function calculateStreak(
  records: readonly StreakRecord[] = [],
  options: StreakCalculationOptions = {},
): CalculatedStreak {
  const threshold = clamp(options.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD);
  const partialCountsAsSuccess = options.partialCountsAsSuccess ?? false;
  const normalized = sortRecords(records.map((record, index) => normalizeRecord(record, index, threshold, partialCountsAsSuccess)));
  const successfulDays = normalized.filter((record) => record.successful).length;
  const partialDays = normalized.filter((record) => record.status === "partial").length;
  const unsuccessfulDays = normalized.filter((record) => record.status === "unsuccessful").length;
  let best = 0;
  let run = 0;
  let previous: NormalizedRecord | undefined;

  for (const record of normalized) {
    if (record.status === "future") continue;
    const contiguous = !previous || dayDistance(previous, record) === 1;
    if (record.successful && contiguous) run += 1;
    else if (record.successful) run = 1;
    else run = 0;
    best = Math.max(best, run);
    previous = record;
  }

  const today = localTodayKey(options.today);
  const todayRecord = today ? normalized.find((record) => record.date === today) : undefined;
  const isTodaySuccessful = Boolean(todayRecord?.successful);
  const isTodayPending = Boolean(todayRecord && (todayRecord.status === "today" || (!todayRecord.successful && todayRecord.status !== "unsuccessful")));
  const candidates = normalized.filter((record) => record.status !== "future");
  let current = 0;
  let next: NormalizedRecord | undefined;
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const record = candidates[index];
    if (isTodayPending && todayRecord && record.date === todayRecord.date) continue;
    const contiguous = !next || dayDistance(record, next) === 1;
    if (!record.successful || !contiguous) break;
    current += 1;
    next = record;
  }

  const isAtRisk = isTodayPending && current > 0;
  const reason = isTodaySuccessful
    ? "today_successful"
    : isAtRisk
      ? "today_pending"
      : current > 0
        ? "streak_active"
        : successfulDays > 0
          ? "streak_broken"
          : "no_successful_days";

  return {
    current,
    best,
    successfulDays,
    partialDays,
    unsuccessfulDays,
    history: normalized.map(toHistoryDay),
    isTodaySuccessful,
    isTodayPending,
    isAtRisk,
    reason,
  };
}

export interface ProgressDay {
  date: string | Date;
  progress: number;
  status?: StreakStatus;
  reason?: string;
}

export function calculateStreakFromProgress(days: readonly ProgressDay[] = [], options: StreakCalculationOptions = {}) {
  return calculateStreak(days.map((day) => ({ date: day.date, progress: day.progress, status: day.status, reason: day.reason })), options);
}

/** Human-readable reason key kept separate so UI copy can be localized. */
export function getStreakReason(streak: Pick<CalculatedStreak, "reason">) {
  return streak.reason;
}
