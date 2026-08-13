import type {
  AppState,
  DayRecord,
  DayStats,
  InsightSummary,
  Language,
  LeaderboardRow,
  MonthStats,
  TaskEntry,
  TaskInterval,
} from '../types'
import { addDays, formatCompactDuration, monthKeyOf, monthWeekList, todayKey, weekDaysOf, weekStartOf } from './date'
import { text } from './text'

export function activeTasks(state: AppState) {
  return state.tasks.filter((task) => !task.archived).sort((a, b) => a.pos - b.pos)
}

export function taskById(state: AppState, taskId: number) {
  return state.tasks.find((task) => task.id === taskId) ?? null
}

export function participantById(state: AppState, pid: number | null) {
  return state.participants.find((participant) => participant.id === pid) ?? null
}

export function isDaySuccess(done: number, total: number, target = 90) {
  return total > 0 && done * 100 >= total * target
}

export function percent(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 1000) / 10 : 0
}

export function neededForTarget(done: number, total: number, target = 90) {
  return total > 0 ? Math.max(0, Math.ceil((total * target) / 100) - done) : 0
}

export function activeMs(intervals: TaskInterval[], now: number) {
  return intervals.reduce((sum, interval) => {
    const end = interval.end ?? now
    return end > interval.start ? sum + end - interval.start : sum
  }, 0)
}

export function taskMs(record: DayRecord | null, taskId: number, now: number) {
  if (!record) return 0
  return activeMs(record.intervals.filter((interval) => interval.taskId === taskId), now)
}

export function openIntervalFor(record: DayRecord | null, taskId: number) {
  return record?.intervals.find((interval) => interval.taskId === taskId && interval.end == null) ?? null
}

export function dayRecord(state: AppState, pid: number, day: string) {
  return state.days[String(pid)]?.[day] ?? null
}

export function dayStats(state: AppState, pid: number, day: string, now: number): DayStats {
  const record = dayRecord(state, pid, day)
  if (!record) {
    const total = day === todayKey() ? activeTasks(state).filter((task) => task.counts).length : 0
    return { record: null, done: 0, total, attempted: 0, ms: 0, pass: false, percent: 0 }
  }
  const entries = Object.values(record.tasks)
  const counting = entries.filter((entry) => entry.counts)
  const done = counting.filter((entry) => entry.status === 'completed').length
  const total = counting.length
  const attempted = entries.filter((entry) => entry.status === 'attempted').length
  const pass = isDaySuccess(done, total, state.settings.dailyTarget)
  return {
    record,
    done,
    total,
    attempted,
    ms: activeMs(record.intervals, now),
    pass,
    percent: percent(done, total),
  }
}

export function successMap(state: AppState, pid: number, now: number) {
  const days = state.days[String(pid)] ?? {}
  return Object.keys(days).reduce<Record<string, boolean>>((map, day) => {
    map[day] = dayStats(state, pid, day, now).pass
    return map
  }, {})
}

export function dailyStreak(map: Record<string, boolean>, anchor = todayKey()) {
  let day = map[anchor] ? anchor : addDays(anchor, -1)
  let count = 0
  while (map[day]) {
    count += 1
    day = addDays(day, -1)
  }
  return count
}

export function weekDone(map: Record<string, boolean>, anchor: string) {
  return weekDaysOf(anchor).filter((day) => map[day]).length
}

export function monthWeeks(state: AppState, map: Record<string, boolean>, anchor: string) {
  return monthWeekList(monthKeyOf(anchor)).filter((week) => weekDone(map, week) >= state.settings.weeklyRequiredDays).length
}

export function leaderboard(state: AppState, day: string, now: number): LeaderboardRow[] {
  return state.participants
    .filter((participant) => participant.active)
    .map((participant) => {
      const stats = dayStats(state, participant.id, day, now)
      const map = successMap(state, participant.id, now)
      return {
        participant,
        done: stats.done,
        total: stats.total,
        attempted: stats.attempted,
        ms: stats.ms,
        percent: stats.percent,
        pass: stats.pass,
        state: stats.record?.state ?? 'not_started',
        streak: dailyStreak(map, day),
        week: weekDone(map, day),
        month: monthWeeks(state, map, day),
      }
    })
    .sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent
      if (b.done !== a.done) return b.done - a.done
      if (a.done > 0 && a.ms !== b.ms) return a.ms - b.ms
      if (a.done === 0 && a.ms !== b.ms) return b.ms - a.ms
      return a.participant.name.localeCompare(b.participant.name)
    })
}

export function monthStats(state: AppState, pid: number, month: string, now: number): MonthStats {
  const map = successMap(state, pid, now)
  const days = Object.keys(state.days[String(pid)] ?? {}).filter((day) => monthKeyOf(day) === month)
  let ms = 0
  let done = 0
  let total = 0
  let attempted = 0
  let pauses = 0
  let reopens = 0

  for (const day of days) {
    const stats = dayStats(state, pid, day, now)
    ms += stats.ms
    done += stats.done
    total += stats.total
    attempted += stats.attempted
    for (const entry of Object.values(stats.record?.tasks ?? {})) {
      pauses += entry.pauses
      reopens += entry.reopens
    }
  }

  const weeks = monthWeekList(month).map((week) => {
    const successfulDays = weekDone(map, week)
    return {
      week,
      successfulDays,
      ok: successfulDays >= state.settings.weeklyRequiredDays,
    }
  })

  return {
    weeks,
    goodWeeks: weeks.filter((week) => week.ok).length,
    successDays: days.filter((day) => map[day]).length,
    activeDays: days.length,
    ms,
    done,
    total,
    attempted,
    pauses,
    reopens,
    rate: percent(done, total),
  }
}

export function availableReportMonths(state: AppState) {
  const months = new Set<string>()
  for (const daySet of Object.values(state.days)) {
    for (const day of Object.keys(daySet)) months.add(monthKeyOf(day))
  }
  months.add(monthKeyOf(todayKey()))
  months.add(monthKeyOf(addDays(todayKey(), 32)))
  return Array.from(months).sort().reverse()
}

export function progressSeries(state: AppState, pid: number, now: number, length = 14) {
  const anchor = todayKey()
  return Array.from({ length }, (_, index) => {
    const day = addDays(anchor, index - length + 1)
    const stats = dayStats(state, pid, day, now)
    return {
      day,
      completion: Math.round(stats.percent),
      workMinutes: Math.round(stats.ms / 60000),
      successful: stats.pass,
      done: stats.done,
      total: stats.total,
    }
  })
}

function aggregateEntries(state: AppState, pid: number, now: number) {
  const result: Record<number, { ms: number; done: number; attempted: number; pauses: number; reopens: number; seen: number }> = {}
  for (const record of Object.values(state.days[String(pid)] ?? {})) {
    for (const entry of Object.values(record.tasks)) {
      const current = result[entry.taskId] ?? { ms: 0, done: 0, attempted: 0, pauses: 0, reopens: 0, seen: 0 }
      current.ms += taskMs(record, entry.taskId, now)
      current.seen += 1
      if (entry.status === 'completed') current.done += 1
      if (entry.status === 'attempted') current.attempted += 1
      current.pauses += entry.pauses
      current.reopens += entry.reopens
      result[entry.taskId] = current
    }
  }
  return result
}

export function analyseParticipant(state: AppState, pid: number, now: number, language: Language): InsightSummary | null {
  const records = state.days[String(pid)] ?? {}
  const days = Object.keys(records).sort()
  if (!days.length) return null

  const map = successMap(state, pid, now)
  const today = dayStats(state, pid, todayKey(), now)
  const perTask = aggregateEntries(state, pid, now)
  const strengths: string[] = []
  const weaknesses: string[] = []
  const advice: string[] = []
  const successDays = days.filter((day) => map[day]).length
  const streak = dailyStreak(map)
  const totalDone = Object.values(perTask).reduce((sum, entry) => sum + entry.done, 0)
  const totalAttempted = Object.values(perTask).reduce((sum, entry) => sum + entry.attempted, 0)
  const totalPauses = Object.values(perTask).reduce((sum, entry) => sum + entry.pauses, 0)
  const totalMs = Object.values(perTask).reduce((sum, entry) => sum + entry.ms, 0)
  const averageTaskMs = totalDone ? totalMs / totalDone : 0
  const recent = days.slice(-7)
  const prior = days.slice(-14, -7)
  const rateOf = (list: string[]) => {
    const totals = list.reduce(
      (acc, day) => {
        const stats = dayStats(state, pid, day, now)
        acc.done += stats.done
        acc.total += stats.total
        return acc
      },
      { done: 0, total: 0 },
    )
    return percent(totals.done, totals.total)
  }
  const recentRate = rateOf(recent)
  const priorRate = prior.length ? rateOf(prior) : null

  if (streak >= 2) {
    strengths.push(text(language, `سلسلتك الحالية ${streak} أيام ناجحة متتالية.`, `Your current streak is ${streak} successful days.`))
  }
  if (successDays > 0) {
    strengths.push(text(language, `حققت الهدف في ${successDays} من ${days.length} أيام مسجلة.`, `You reached the target on ${successDays} of ${days.length} recorded days.`))
  }
  if (priorRate != null && recentRate > priorRate) {
    strengths.push(text(language, `متوسط آخر 7 أيام ارتفع إلى ${recentRate.toFixed(0)}%.`, `Your last 7 days improved to ${recentRate.toFixed(0)}%.`))
  }
  if (averageTaskMs > 0) {
    strengths.push(text(language, `متوسط زمن المهمة المنجزة ${formatCompactDuration(averageTaskMs, language)}.`, `Average completed task time is ${formatCompactDuration(averageTaskMs, language)}.`))
  }

  if (priorRate != null && recentRate < priorRate) {
    weaknesses.push(text(language, `الأداء انخفض من ${priorRate.toFixed(0)}% إلى ${recentRate.toFixed(0)}% في آخر أسبوعين.`, `Performance dropped from ${priorRate.toFixed(0)}% to ${recentRate.toFixed(0)}% over the last two weeks.`))
  }

  const attemptedSinks = Object.entries(perTask)
    .filter(([, entry]) => entry.attempted > 0 && entry.ms > 0)
    .sort((a, b) => b[1].ms - a[1].ms)
    .slice(0, 2)

  for (const [taskId, entry] of attemptedSinks) {
    const task = taskById(state, Number(taskId))
    if (!task) continue
    weaknesses.push(text(language, `«${task.name}» استهلكت ${formatCompactDuration(entry.ms, language)} وانتهت دون إنجاز.`, `"${task.nameEn}" consumed ${formatCompactDuration(entry.ms, language)} and ended without completion.`))
    advice.push(text(language, `قسّم «${task.name}» إلى خطوة أولى صغيرة قبل البدء.`, `Break "${task.nameEn}" into a very small first step before starting.`))
  }

  const pauseHeavy = Object.entries(perTask).sort((a, b) => b[1].pauses - a[1].pauses)[0]
  if (pauseHeavy && pauseHeavy[1].pauses >= 3) {
    const task = taskById(state, Number(pauseHeavy[0]))
    if (task) weaknesses.push(text(language, `«${task.name}» تتوقف كثيراً (${pauseHeavy[1].pauses} مرات).`, `"${task.nameEn}" is paused frequently (${pauseHeavy[1].pauses} times).`))
  }

  const reopened = Object.entries(perTask).sort((a, b) => b[1].reopens - a[1].reopens)[0]
  if (reopened && reopened[1].reopens >= 2) {
    const task = taskById(state, Number(reopened[0]))
    if (task) weaknesses.push(text(language, `«${task.name}» أُعيد فتحها ${reopened[1].reopens} مرات.`, `"${task.nameEn}" was reopened ${reopened[1].reopens} times.`))
  }

  if (totalAttempted > totalDone && totalDone > 0) {
    weaknesses.push(text(language, `عدد المحاولات غير المكتملة أعلى من المهام المنجزة.`, `Unfinished attempts are higher than completed tasks.`))
  }

  const need = neededForTarget(today.done, today.total, state.settings.dailyTarget)
  const headline = !today.record
    ? text(language, 'لم تبدأ يومك بعد.', 'You have not started your day yet.')
    : today.pass
      ? text(language, `اليوم ${today.percent.toFixed(0)}% - وصلت للهدف.`, `Today is ${today.percent.toFixed(0)}% - target reached.`)
      : text(language, `تحتاج ${need} مهام للوصول إلى ${state.settings.dailyTarget}%.`, `You need ${need} tasks to reach ${state.settings.dailyTarget}%.`)

  if (!today.pass && streak > 0) {
    advice.push(text(language, `سلسلتك على المحك اليوم؛ ${need} مهام تحميها.`, `Your streak is at risk today; ${need} tasks protects it.`))
  }
  if (totalPauses > totalDone * 2 && totalDone > 0) {
    advice.push(text(language, 'جرّب جلسة عمل قصيرة بلا توقف قبل تبديل المهمة.', 'Try one short uninterrupted block before switching tasks.'))
  }
  if (!advice.length) {
    advice.push(text(language, 'استمر على نفس النمط؛ البيانات لا تظهر مشكلة جوهرية.', 'Keep the same rhythm; the data shows no major issue.'))
  }

  return { headline, strengths, weaknesses, advice }
}

export function taskEntriesForDay(state: AppState, record: DayRecord | null): Array<{ taskId: number; entry: TaskEntry }> {
  if (!record) return activeTasks(state).map((task) => ({ taskId: task.id, entry: { taskId: task.id, status: 'idle', completedAt: null, pauses: 0, reopens: 0, counts: task.counts, note: '' } }))
  return Object.values(record.tasks).sort((a, b) => {
    const taskA = taskById(state, a.taskId)
    const taskB = taskById(state, b.taskId)
    return (taskA?.pos ?? 0) - (taskB?.pos ?? 0)
  }).map((entry) => ({ taskId: entry.taskId, entry }))
}

export function currentWeekKey() {
  return weekStartOf(todayKey())
}
