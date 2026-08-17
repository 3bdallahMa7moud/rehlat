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

export function weekOverWeekComparison(state: AppState, pid: number, now: number) {
  const today = todayKey()
  const currentWeekDays = weekDaysOf(today)
  const previousWeekStart = addDays(weekStartOf(today), -7)
  const previousWeekDays = weekDaysOf(previousWeekStart)

  const computeWeek = (days: string[]) => {
    let done = 0
    let total = 0
    let successDays = 0
    let workMs = 0
    for (const day of days) {
      const stats = dayStats(state, pid, day, now)
      done += stats.done
      total += stats.total
      if (stats.pass) successDays += 1
      workMs += stats.ms
    }
    const rate = percent(done, total)
    return { done, total, successDays, workMs, rate }
  }

  const current = computeWeek(currentWeekDays)
  const previous = computeWeek(previousWeekDays)
  const delta = Math.round((current.rate - previous.rate) * 10) / 10

  return {
    thisWeekRate: current.rate,
    lastWeekRate: previous.rate,
    delta,
    thisWeekDone: current.done,
    thisWeekTotal: current.total,
    lastWeekDone: previous.done,
    lastWeekTotal: previous.total,
    thisWeekSuccessDays: current.successDays,
    lastWeekSuccessDays: previous.successDays,
    thisWeekWorkMs: current.workMs,
    lastWeekWorkMs: previous.workMs,
  }
}

export function taskConsistencyBreakdown(state: AppState, pid: number, now: number) {
  const aggregated = aggregateEntries(state, pid, now)
  const tasks = activeTasks(state).map((task) => {
    const data = aggregated[task.id] ?? { ms: 0, done: 0, attempted: 0, pauses: 0, reopens: 0, seen: 0 }
    const rate = data.seen > 0 ? percent(data.done, data.seen) : 0
    return {
      task,
      seen: data.seen,
      done: data.done,
      attempted: data.attempted,
      pauses: data.pauses,
      reopens: data.reopens,
      ms: data.ms,
      rate,
    }
  })

  const sorted = tasks.slice().sort((a, b) => b.rate - a.rate || b.done - a.done)
  const strongest = sorted.filter((t) => t.seen > 0 && t.rate >= 70)
  const needsAttention = sorted.filter((t) => t.seen > 0 && (t.rate < 70 || t.attempted > 0 || t.pauses >= 3))

  return { tasks: sorted, strongest, needsAttention }
}

export function dayOfWeekPerformance(state: AppState, pid: number, now: number, language: Language) {
  const dayNamesAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayScores: Record<number, { done: number; total: number; count: number }> = {}

  for (let i = 0; i < 7; i++) {
    dayScores[i] = { done: 0, total: 0, count: 0 }
  }

  const days = Object.keys(state.days[String(pid)] ?? {})
  if (!days.length) return null

  for (const day of days) {
    const date = new Date(day + 'T00:00:00Z')
    const dayOfWeek = date.getUTCDay()
    const stats = dayStats(state, pid, day, now)
    if (stats.total > 0) {
      dayScores[dayOfWeek].done += stats.done
      dayScores[dayOfWeek].total += stats.total
      dayScores[dayOfWeek].count += 1
    }
  }

  const computedDays = Object.entries(dayScores)
    .filter(([, v]) => v.count > 0 && v.total > 0)
    .map(([d, v]) => {
      const dayIndex = Number(d)
      const rate = percent(v.done, v.total)
      return {
        dayIndex,
        name: language === 'ar' ? dayNamesAr[dayIndex] : dayNamesEn[dayIndex],
        rate,
        count: v.count,
      }
    })

  if (!computedDays.length) return null
  const overallAvg = computedDays.reduce((sum, d) => sum + d.rate, 0) / computedDays.length
  computedDays.sort((a, b) => b.rate - a.rate)
  const bestDay = computedDays[0]
  const worstDay = computedDays[computedDays.length - 1]
  const bestDelta = Math.round(bestDay.rate - overallAvg)

  return {
    bestDay,
    worstDay,
    overallAvg,
    bestDelta,
  }
}

export function analyseParticipant(state: AppState, pid: number, now: number, language: Language): InsightSummary | null {
  const records = state.days[String(pid)] ?? {}
  const days = Object.keys(records).sort()
  if (!days.length) return null

  const map = successMap(state, pid, now)
  const today = dayStats(state, pid, todayKey(), now)
  const perTask = aggregateEntries(state, pid, now)
  const wow = weekOverWeekComparison(state, pid, now)
  const dayPerf = dayOfWeekPerformance(state, pid, now, language)

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

  // 1. Streak & Success Rate Strengths
  if (streak >= 2) {
    strengths.push(
      text(
        language,
        `سلسلة مستمرة: ${streak} أيام متتالية محققة لهدف ${state.settings.dailyTarget}%. استمرارك يحافظ على العزم.`,
        `Active streak: ${streak} consecutive days reaching the ${state.settings.dailyTarget}% target.`,
      ),
    )
  }

  if (successDays > 0) {
    const totalRecordedDays = days.length
    const overallSuccessRate = Math.round((successDays / totalRecordedDays) * 100)
    strengths.push(
      text(
        language,
        `حققت الهدف في ${successDays} من ${totalRecordedDays} أيام مسجلة (${overallSuccessRate}% نسبة نجاح الأيام).`,
        `Reached the daily target on ${successDays} of ${totalRecordedDays} recorded days (${overallSuccessRate}% success rate).`,
      ),
    )
  }

  // 2. Week-over-Week comparative strengths & weaknesses
  if (wow.lastWeekTotal > 0) {
    if (wow.delta > 0) {
      strengths.push(
        text(
          language,
          `أداء هذا الأسبوع (${wow.thisWeekRate.toFixed(0)}%) أعلى بنسبة +${wow.delta.toFixed(0)}% مقارنة بالأسبوع الماضي (${wow.lastWeekRate.toFixed(0)}%).`,
          `This week's completion (${wow.thisWeekRate.toFixed(0)}%) is up +${wow.delta.toFixed(0)}% compared to last week (${wow.lastWeekRate.toFixed(0)}%).`,
        ),
      )
    } else if (wow.delta < -5) {
      weaknesses.push(
        text(
          language,
          `أداء هذا الأسبوع (${wow.thisWeekRate.toFixed(0)}%) انخفض بنسبة ${Math.abs(wow.delta).toFixed(0)}% مقارنة بالأسبوع السابق (${wow.lastWeekRate.toFixed(0)}%).`,
          `This week's completion (${wow.thisWeekRate.toFixed(0)}%) dropped ${Math.abs(wow.delta).toFixed(0)}% compared to last week (${wow.lastWeekRate.toFixed(0)}%).`,
        ),
      )
      advice.push(
        text(
          language,
          'اختر مهام الصباح أولاً لإعادة بناء الزخم وتعويض فارق الأسبوع الماضي.',
          'Start with early morning tasks to rebuild momentum and recover last week’s pace.',
        ),
      )
    }
  }

  // 3. Day of week actionable insights
  if (dayPerf && dayPerf.bestDelta > 5) {
    strengths.push(
      text(
        language,
        `يوم ${dayPerf.bestDay.name} هو أقوى أيامك بنسبة إنجاز ${dayPerf.bestDay.rate.toFixed(0)}% (أعلى بـ +${dayPerf.bestDelta}% من متوسطك الأسبوعي).`,
        `${dayPerf.bestDay.name} is your strongest day at ${dayPerf.bestDay.rate.toFixed(0)}% (+${dayPerf.bestDelta}% above your weekly average).`,
      ),
    )
  }

  if (averageTaskMs > 0) {
    strengths.push(
      text(
        language,
        `متوسط الوقت لإنجاز المهمة الواحدة هو ${formatCompactDuration(averageTaskMs, language)}.`,
        `Average completed task duration is ${formatCompactDuration(averageTaskMs, language)}.`,
      ),
    )
  }

  // 4. Task-level bottlenecks & actionable advice
  const attemptedSinks = Object.entries(perTask)
    .filter(([, entry]) => entry.attempted > 0 && entry.ms > 0)
    .sort((a, b) => b[1].ms - a[1].ms)
    .slice(0, 2)

  for (const [taskId, entry] of attemptedSinks) {
    const task = taskById(state, Number(taskId))
    if (!task) continue
    weaknesses.push(
      text(
        language,
        `«${task.name}» استهلكت ${formatCompactDuration(entry.ms, language)} وانتهت دون إكمال (${entry.attempted} محاولات).`,
        `"${task.nameEn}" took ${formatCompactDuration(entry.ms, language)} and ended without completion (${entry.attempted} attempts).`,
      ),
    )
    advice.push(
      text(
        language,
        `قسّم «${task.name}» إلى خطوة صغيرة محددة بـ 15 دقيقة لتجاوز عقبة البداية.`,
        `Break "${task.nameEn}" into a 15-minute starter milestone to overcome the initial block.`,
      ),
    )
  }

  const pauseHeavy = Object.entries(perTask).sort((a, b) => b[1].pauses - a[1].pauses)[0]
  if (pauseHeavy && pauseHeavy[1].pauses >= 3) {
    const task = taskById(state, Number(pauseHeavy[0]))
    if (task) {
      weaknesses.push(
        text(
          language,
          `«${task.name}» تشهد انقطاعات متكررة (${pauseHeavy[1].pauses} مرات إيقاف مؤقت).`,
          `"${task.nameEn}" experiences frequent interruptions (${pauseHeavy[1].pauses} pauses).`,
        ),
      )
      advice.push(
        text(
          language,
          `جرّب تشغيل مؤقت «${task.name}» في بيئة خالية من المشتتات لمدة 20 دقيقة متصلة.`,
          `Try running "${task.nameEn}" in a focused 20-minute block without switching tasks.`,
        ),
      )
    }
  }

  const reopened = Object.entries(perTask).sort((a, b) => b[1].reopens - a[1].reopens)[0]
  if (reopened && reopened[1].reopens >= 2) {
    const task = taskById(state, Number(reopened[0]))
    if (task) {
      weaknesses.push(
        text(
          language,
          `«${task.name}» أُعيد فتحها ${reopened[1].reopens} مرات بعد الإغلاق.`,
          `"${task.nameEn}" was reopened ${reopened[1].reopens} times after closing.`,
        ),
      )
    }
  }

  if (totalAttempted > totalDone && totalDone > 0) {
    weaknesses.push(
      text(
        language,
        'عدد المحاولات غير المكتملة يتجاوز المهام المنجزة، مما يؤثر على نسبة النجاح النهائية.',
        'Incomplete attempts exceed finished tasks, pulling down the overall completion rate.',
      ),
    )
  }

  // Headline determination
  const need = neededForTarget(today.done, today.total, state.settings.dailyTarget)
  const headline = !today.record
    ? text(language, 'لم تبدأ يومك بعد. ابدأ اليوم لتحقيق هدف الإنجاز.', 'You have not started your day yet. Start now to meet your daily target.')
    : today.pass
      ? text(
          language,
          `إنجاز اليوم ${today.percent.toFixed(0)}% — وصلت للهدف بنجاح وتجاوزت عتبة ${state.settings.dailyTarget}%.`,
          `Today's completion is ${today.percent.toFixed(0)}% — target reached successfully.`,
        )
      : text(
          language,
          `تحتاج إلى ${need} مهام إضافية اليوم للوصول إلى هدف ${state.settings.dailyTarget}%.`,
          `You need ${need} more tasks today to achieve the ${state.settings.dailyTarget}% target.`,
        )

  if (!today.pass && streak > 0) {
    advice.push(
      text(
        language,
        `سلسلتك الحالية (${streak} أيام) في انتظارك؛ إنجاز ${need} مهام يحافظ عليها اليوم.`,
        `Your streak (${streak} days) is active; finishing ${need} tasks secures it today.`,
      ),
    )
  }
  if (totalPauses > totalDone * 2 && totalDone > 0) {
    advice.push(
      text(
        language,
        'جرّب تقنية العمل المركّز: اختر مهمة واحدة ولا توقف المؤقت حتى تكمل مرحلتها الأولى.',
        'Try focused single-tasking: run one task without pausing until its initial phase is complete.',
      ),
    )
  }
  if (!advice.length) {
    advice.push(
      text(
        language,
        'استمر على نفس النمط والوتيرة؛ مؤشراتك الحالية متزنة ومنتظمة.',
        'Maintain your current rhythm; your performance indicators are steady and balanced.',
      ),
    )
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

