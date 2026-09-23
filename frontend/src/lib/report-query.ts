import type { Participant, Task, TaskStatus } from "../types/models.ts";
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

type Input = { participants: readonly Participant[]; tasks: readonly Task[]; dailyTaskRecords: readonly DailyTaskRecord[]; progress: readonly ProgressSnapshot[]; dayStatuses?: readonly DayStatusSnapshot[]; currentTasks?: readonly Task[]; currentParticipantId?: string; today?: string; };
const safe = (n: unknown) => typeof n === "number" && Number.isFinite(n) ? n : 0;
const addDays = (date: string, amount: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10); };
function datesFor(period: ReportPeriod, today: string) { if (period === "daily") return [today]; if (period === "weekly") return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)); const start = `${today.slice(0, 7)}-01`; const out: string[] = []; for (let d = start; d <= today; d = addDays(d, 1)) out.push(d); return out; }
function statusProgress(status: TaskStatus) { return status === "completed" ? 100 : status === "partial" ? 50 : 0; }
function weekBucket(date: string) { return Math.min(5, Math.floor((Number(date.slice(8, 10)) - 1) / 7) + 1); }

export function queryReport(input: Input, filters: ReportFilters): ReportDataset {
  const today = input.today ?? getProjectDateKey(); const dates = datesFor(filters.period, today);
  const participants = input.participants.filter((p) => p.role === "participant" && (filters.participantId === "all" || p.id === filters.participantId));
  const taskDefs = input.tasks.filter((task) => filters.taskId === "all" || task.id === filters.taskId);
  const allowedUsers = new Set(participants.map((p) => p.id)); const allowedTasks = new Set(taskDefs.map((t) => t.id));
  const records = input.dailyTaskRecords.filter((r) => allowedUsers.has(r.userId) && allowedTasks.has(r.taskId) && dates.includes(r.localDate));
  const current = input.currentParticipantId && allowedUsers.has(input.currentParticipantId) ? (input.currentTasks ?? []).filter((t) => allowedTasks.has(t.id)) : [];
  const recordMap = new Map(records.map((r) => [`${r.userId}:${r.taskId}:${r.localDate}`, r]));
  current.forEach((task) => recordMap.set(`${input.currentParticipantId}:${task.id}:${today}`, { userId: input.currentParticipantId!, taskId: task.id, localDate: today, status: task.status, current: task.current, actualMinutes: task.actualMinutes, updatedAt: new Date().toISOString() }));
  const selected = [...recordMap.values()].filter((r) => allowedUsers.has(r.userId) && allowedTasks.has(r.taskId) && dates.includes(r.localDate));
  const dayGroups = new Map<string, typeof selected>(); selected.forEach((r) => dayGroups.set(r.localDate, [...(dayGroups.get(r.localDate) ?? []), r]));
  const dayProgress = (rows: typeof selected) => rows.length ? Math.round(rows.reduce((sum, r) => sum + statusProgress(r.status), 0) / rows.length) : 0;
  const points: ReportPoint[] = filters.period === "monthly"
    ? Array.from({ length: Math.min(5, Math.ceil(Number(today.slice(8, 10)) / 7)) }, (_, i) => { const rows = selected.filter((r) => weekBucket(r.localDate) === i + 1); return { label: `الأسبوع ${i + 1}`, progress: dayProgress(rows), minutes: rows.reduce((s, r) => s + Math.max(0, safe(r.actualMinutes)), 0), hasData: rows.length > 0 }; })
    : dates.map((date) => { const rows = dayGroups.get(date) ?? []; return { label: date === today ? "اليوم" : date.slice(5), date, progress: dayProgress(rows), minutes: rows.reduce((s, r) => s + Math.max(0, safe(r.actualMinutes)), 0), hasData: rows.length > 0 }; });
  const totalMinutes = selected.reduce((sum, r) => sum + Math.max(0, safe(r.actualMinutes)), 0);
  const recordedDays = new Set(selected.map((r) => `${r.userId}:${r.localDate}`)).size;
  const completionRate = selected.length ? Math.round(selected.reduce((sum, r) => sum + statusProgress(r.status), 0) / selected.length) : 0;
  const successfulDays = [...new Set(selected.map((r) => `${r.userId}:${r.localDate}`))].filter((key) => { const rows = selected.filter((r) => `${r.userId}:${r.localDate}` === key); return rows.length > 0 && dayProgress(rows) >= DEFAULT_SUCCESS_THRESHOLD; }).length;
  const successfulWeeks = filters.period === "monthly" ? points.filter((p) => p.hasData && p.progress >= DEFAULT_SUCCESS_THRESHOLD).length : 0;
  const taskRows = taskDefs.map((task) => { const rows = selected.filter((r) => r.taskId === task.id); const count = rows.length || 1; return { taskId: task.id, title: task.title, completionRate: rows.length ? Math.round(rows.reduce((s, r) => s + statusProgress(r.status), 0) / count) : 0, actualMinutes: rows.reduce((s, r) => s + Math.max(0, safe(r.actualMinutes)), 0), completed: rows.filter((r) => r.status === "completed").length, partial: rows.filter((r) => r.status === "partial").length, notCompleted: rows.filter((r) => r.status === "not_completed").length, closed: rows.filter((r) => r.status === "closed").length }; }).filter((row) => row.actualMinutes > 0 || selected.some((r) => r.taskId === row.taskId));
  const participantRows = participants.map((participant) => { const rows = selected.filter((r) => r.userId === participant.id); const byDay = new Map<string, typeof rows>(); rows.forEach((r) => byDay.set(r.localDate, [...(byDay.get(r.localDate) ?? []), r])); return { participantId: participant.id, name: participant.name, completionRate: rows.length ? Math.round(rows.reduce((s, r) => s + statusProgress(r.status), 0) / rows.length) : 0, successfulDays: [...byDay.values()].filter((day) => day.length && dayProgress(day) >= DEFAULT_SUCCESS_THRESHOLD).length, actualMinutes: rows.reduce((s, r) => s + Math.max(0, safe(r.actualMinutes)), 0) }; }).filter((row) => row.completionRate > 0 || row.actualMinutes > 0 || selected.some((r) => r.userId === row.participantId));
  const top = [...participantRows].sort((a, b) => b.completionRate - a.completionRate || b.successfulDays - a.successfulDays || b.actualMinutes - a.actualMinutes || a.participantId.localeCompare(b.participantId))[0];
  const longest = [...taskRows].sort((a, b) => b.actualMinutes - a.actualMinutes || a.taskId.localeCompare(b.taskId))[0];
  return { filters, hasData: selected.length > 0, dateRange: { start: dates[0], end: dates.at(-1) ?? today }, recordedDays, completionRate, totalMinutes, successfulDays, successfulWeeks, averageDailyMinutes: recordedDays ? Math.round(totalMinutes / recordedDays) : 0, mostTimeConsumingTask: longest?.title, topParticipant: filters.participantId === "all" ? top?.name : undefined, points, taskRows, participantRows };
}
