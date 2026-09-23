import type { DailyProgress, Participant, Task, TaskStatus } from "../types/models.ts";
import type { DailyTaskRecord, DayStatusSnapshot, ProgressSnapshot } from "./storage.ts";
import { DEFAULT_SUCCESS_THRESHOLD } from "./progress.ts";
import { getProjectDateKey } from "./date-time.ts";

export type ReportPeriod = "daily" | "weekly" | "monthly";
export interface ReportFilters { period: ReportPeriod; participantId: string | "all"; taskId: string | "all"; }
export interface ReportTaskRow { taskId: string; title: string; completionRate: number; actualMinutes: number; completed: number; partial: number; notCompleted: number; closed: number; }
export interface ReportPoint { label: string; date?: string; progress: number; minutes: number; hasData: boolean; }
export interface ReportParticipantRow { participantId: string; name: string; completionRate: number; successfulDays: number; actualMinutes: number; }
export interface ReportDataset {
  filters: ReportFilters; hasData: boolean; dateRange: { start: string; end: string }; recordedDays: number; completionRate: number; totalMinutes: number; successfulDays: number; successfulWeeks: number; averageDailyMinutes: number; mostTimeConsumingTask?: string; topParticipant?: string; points: ReportPoint[]; taskRows: ReportTaskRow[]; participantRows: ReportParticipantRow[];
}

type Input = { participants: readonly Participant[]; tasks: readonly Task[]; dailyTaskRecords: readonly DailyTaskRecord[]; progress: readonly ProgressSnapshot[]; dayStatuses?: readonly DayStatusSnapshot[]; currentTasks?: readonly Task[]; currentParticipantId?: string; currentDayStatus?: DayStatusSnapshot["status"]; currentProgress?: DailyProgress; today?: string; };
const safe = (n: unknown) => typeof n === "number" && Number.isFinite(n) ? n : 0;
const addDays = (date: string, amount: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10); };
function datesFor(period: ReportPeriod, today: string) { if (period === "daily") return [today]; if (period === "weekly") return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)); const start = `${today.slice(0, 7)}-01`; const out: string[] = []; for (let d = start; d <= today; d = addDays(d, 1)) out.push(d); return out; }
function statusProgress(status: TaskStatus) { return status === "completed" ? 100 : status === "partial" ? 50 : 0; }
function weekBucket(date: string) { return Math.min(5, Math.floor((Number(date.slice(8, 10)) - 1) / 7) + 1); }
function hasActivity(row: Pick<DailyTaskRecord, "status" | "current" | "actualMinutes">) { return row.status !== "not_started" || safe(row.current) > 0 || safe(row.actualMinutes) > 0; }

export function queryReport(input: Input, filters: ReportFilters): ReportDataset {
  const today = input.today ?? getProjectDateKey(); const dates = datesFor(filters.period, today);
  const participants = input.participants.filter((p) => p.role === "participant" && (filters.participantId === "all" || p.id === filters.participantId));
  const taskDefs = input.tasks.filter((task) => filters.taskId === "all" || task.id === filters.taskId);
  const allowedUsers = new Set(participants.map((p) => p.id)); const allowedTasks = new Set(taskDefs.map((t) => t.id));
  const records = input.dailyTaskRecords.filter((r) => allowedUsers.has(r.userId) && allowedTasks.has(r.taskId) && dates.includes(r.localDate));
  const recordMap = new Map(records.map((r) => [`${r.userId}:${r.taskId}:${r.localDate}`, r]));
  const currentParticipantIsSelected = Boolean(input.currentParticipantId && allowedUsers.has(input.currentParticipantId));
  const currentHasEvidence = currentParticipantIsSelected && (input.currentDayStatus !== "not_started" || (input.currentTasks ?? []).some(hasActivity));
  if (currentHasEvidence) (input.currentTasks ?? []).filter((t) => allowedTasks.has(t.id) && hasActivity(t)).forEach((task) => recordMap.set(`${input.currentParticipantId}:${task.id}:${today}`, { userId: input.currentParticipantId!, taskId: task.id, localDate: today, status: task.status, current: task.current, actualMinutes: task.actualMinutes, updatedAt: new Date().toISOString() }));
  const selected = [...recordMap.values()].filter((r) => allowedUsers.has(r.userId) && allowedTasks.has(r.taskId) && dates.includes(r.localDate));
  const snapshots = new Map(input.progress.filter((p) => allowedUsers.has(p.userId) && dates.includes(p.localDate)).map((p) => [`${p.userId}:${p.localDate}`, p]));
  if (currentParticipantIsSelected && input.currentProgress && currentHasEvidence) snapshots.set(`${input.currentParticipantId}:${today}`, { userId: input.currentParticipantId!, localDate: today, ...input.currentProgress, updatedAt: new Date().toISOString() });
  const statusMap = new Map((input.dayStatuses ?? []).filter((s) => allowedUsers.has(s.userId) && dates.includes(s.localDate)).map((s) => [`${s.userId}:${s.localDate}`, s.status]));
  if (currentParticipantIsSelected && input.currentDayStatus) statusMap.set(`${input.currentParticipantId}:${today}`, input.currentDayStatus);
  const metrics: Array<{ userId: string; date: string; percent: number; minutes: number }> = [];
  participants.forEach((participant) => dates.forEach((date) => {
    const key = `${participant.id}:${date}`;
    const rows = selected.filter((r) => r.userId === participant.id && r.localDate === date);
    const snapshot = filters.taskId === "all" ? snapshots.get(key) : undefined;
    const evidence = rows.some(hasActivity) || (statusMap.get(key) !== undefined && statusMap.get(key) !== "not_started");
    if (!evidence) return;
    if (snapshot) metrics.push({ userId: participant.id, date, percent: Math.max(0, Math.min(100, safe(snapshot.percent))), minutes: Math.max(0, safe(snapshot.actualMinutes)) });
    else { const active = rows.filter(hasActivity); metrics.push({ userId: participant.id, date, percent: active.length ? Math.round(active.reduce((sum, r) => sum + statusProgress(r.status), 0) / active.length) : 0, minutes: active.reduce((sum, r) => sum + Math.max(0, safe(r.actualMinutes)), 0) }); }
  }));
  const dayProgress = (rows: Array<{ percent: number }>) => rows.length ? Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / rows.length) : 0;
  const points: ReportPoint[] = filters.period === "monthly"
    ? Array.from({ length: 5 }, (_, i) => { const rows = metrics.filter((r) => weekBucket(r.date) === i + 1); return { label: `الأسبوع ${i + 1}`, progress: dayProgress(rows), minutes: rows.reduce((s, r) => s + r.minutes, 0), hasData: rows.length > 0 }; })
    : dates.map((date) => { const rows = metrics.filter((r) => r.date === date); return { label: date === today ? "اليوم" : date.slice(5), date, progress: dayProgress(rows), minutes: rows.reduce((s, r) => s + r.minutes, 0), hasData: rows.length > 0 }; });
  const totalMinutes = metrics.reduce((sum, r) => sum + r.minutes, 0);
  const recordedDays = new Set(metrics.map((r) => `${r.userId}:${r.date}`)).size;
  const completionRate = dayProgress(metrics);
  const successfulDays = metrics.filter((r) => r.percent >= DEFAULT_SUCCESS_THRESHOLD).length;
  const successfulWeeks = filters.period === "monthly" ? points.filter((p) => p.hasData && p.progress >= DEFAULT_SUCCESS_THRESHOLD).length : 0;
  const taskRows = taskDefs.map((task) => { const rows = selected.filter((r) => r.taskId === task.id); const count = rows.length || 1; return { taskId: task.id, title: task.title, completionRate: rows.length ? Math.round(rows.reduce((s, r) => s + statusProgress(r.status), 0) / count) : 0, actualMinutes: rows.reduce((s, r) => s + Math.max(0, safe(r.actualMinutes)), 0), completed: rows.filter((r) => r.status === "completed").length, partial: rows.filter((r) => r.status === "partial").length, notCompleted: rows.filter((r) => r.status === "not_completed").length, closed: rows.filter((r) => r.status === "closed").length }; }).filter((row) => row.actualMinutes > 0 || selected.some((r) => r.taskId === row.taskId));
  const participantRows = participants.map((participant) => { const rows = metrics.filter((r) => r.userId === participant.id); return { participantId: participant.id, name: participant.name, completionRate: dayProgress(rows), successfulDays: rows.filter((r) => r.percent >= DEFAULT_SUCCESS_THRESHOLD).length, actualMinutes: rows.reduce((s, r) => s + r.minutes, 0) }; }).filter((row) => row.completionRate > 0 || row.actualMinutes > 0 || metrics.some((r) => r.userId === row.participantId));
  const top = [...participantRows].sort((a, b) => b.completionRate - a.completionRate || b.successfulDays - a.successfulDays || b.actualMinutes - a.actualMinutes || a.participantId.localeCompare(b.participantId))[0];
  const longest = [...taskRows].sort((a, b) => b.actualMinutes - a.actualMinutes || a.taskId.localeCompare(b.taskId))[0];
  return { filters, hasData: metrics.length > 0, dateRange: { start: dates[0], end: dates.at(-1) ?? today }, recordedDays, completionRate, totalMinutes, successfulDays, successfulWeeks, averageDailyMinutes: recordedDays ? Math.round(totalMinutes / recordedDays) : 0, mostTimeConsumingTask: longest?.title, topParticipant: filters.participantId === "all" ? top?.name : undefined, points, taskRows, participantRows };
}
