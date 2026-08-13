import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AppContext } from './AppContext'
import type { AppContextValue, PinResult } from './AppContext'
import { seedState } from '../data/mock'
import type { AppState, Celebration, DayRecord, EventType, Language, TaskEntry } from '../types'
import { addDays, dateMs, dayKeyOf, monthKeyOf, todayKey, weekStartOf } from '../utils/date'
import {
  activeTasks,
  dayRecord,
  dayStats,
  dailyStreak,
  monthWeeks,
  participantById,
  successMap,
  taskById,
  weekDone,
} from '../utils/stats'
import { text } from '../utils/text'

const STORAGE_KEY = 'rehla.frontend.v1'
const PIN_LENGTH = 4
const INITIAL_NOW = Date.now()

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedState()
    const parsed = JSON.parse(raw) as AppState
    if (parsed.version !== 1 || !Array.isArray(parsed.participants) || !Array.isArray(parsed.tasks)) return seedState()
    parsed.participants = parsed.participants.map((participant) => ({
      ...participant,
      pinReset: participant.pinReset ?? false,
    }))
    return parsed
  } catch {
    return seedState()
  }
}

function cloneState(state: AppState): AppState {
  return structuredClone(state) as AppState
}

function createTaskEntry(taskId: number, counts: boolean): TaskEntry {
  return {
    taskId,
    status: 'idle',
    completedAt: null,
    pauses: 0,
    reopens: 0,
    counts,
    note: '',
  }
}

function ensurePersonDay(state: AppState, pid: number, day: string, create: boolean) {
  const key = String(pid)
  state.days[key] = state.days[key] ?? {}
  let record = state.days[key][day]
  if (!record && create) {
    record = {
      date: day,
      startedAt: null,
      endedAt: null,
      state: 'not_started',
      endReason: null,
      tasks: {},
      intervals: [],
    }
    state.days[key][day] = record
  }
  return record ?? null
}

function logEvent(state: AppState, pid: number, type: EventType, taskId: number | null = null, detail: string | null = null) {
  const at = Date.now()
  state.events.push({
    id: state.nextEventId,
    pid,
    taskId,
    at,
    day: dayKeyOf(at),
    type,
    detail,
  })
  state.nextEventId += 1
  if (state.events.length > 5000) state.events.splice(0, state.events.length - 5000)
}

function closeTaskInterval(record: DayRecord, taskId: number, now: number) {
  const open = record.intervals.find((interval) => interval.taskId === taskId && interval.end == null)
  if (open) open.end = Math.max(open.start, now)
}

function closeAllIntervals(record: DayRecord, now: number) {
  record.intervals.forEach((interval) => {
    if (interval.end == null) interval.end = Math.max(interval.start, now)
  })
}

function celebrationCopy(kind: Celebration['kind'], language: Language, participantName: string, streak: number): Celebration {
  if (kind === 'monthly') {
    return {
      id: `monthly-${Date.now()}`,
      kind,
      title: text(language, 'اكتمل هدف الشهر', 'Monthly goal reached'),
      body: text(language, `إنجاز كبير يا ${participantName}. اكتملت 4 أسابيع ناجحة هذا الشهر.`, `Big one, ${participantName}. Four successful weeks are complete this month.`),
    }
  }
  if (kind === 'weekly') {
    return {
      id: `weekly-${Date.now()}`,
      kind,
      title: text(language, 'أسبوع ناجح', 'Successful week'),
      body: text(language, `مبارك يا ${participantName}. وصلت إلى 3 أيام ناجحة هذا الأسبوع.`, `Congratulations, ${participantName}. You reached 3 successful days this week.`),
    }
  }
  return {
    id: `daily-${Date.now()}`,
    kind,
    title: text(language, 'هدف اليوم تحقق', 'Daily goal reached'),
    body: text(language, `أحسنت يا ${participantName}. وصلت إلى 90% وسلسلتك الآن ${streak}.`, `Well done, ${participantName}. You reached 90% and your streak is now ${streak}.`),
  }
}

function queueCelebrations(state: AppState, pid: number, now: number) {
  const participant = participantById(state, pid)
  if (!participant) return
  const day = todayKey()
  const map = successMap(state, pid, now)
  const seen = state.celebrationSeen[String(pid)] ?? {}
  const nextSeen = { ...seen }
  const queued: Celebration[] = []
  const week = weekStartOf(day)
  const month = monthKeyOf(day)
  const streak = dailyStreak(map, day)

  if (map[day] && seen.daily !== day) {
    nextSeen.daily = day
    queued.push(celebrationCopy('daily', state.language, participant.name, streak))
  }
  if (weekDone(map, day) >= state.settings.weeklyRequiredDays && seen.weekly !== week) {
    nextSeen.weekly = week
    queued.push(celebrationCopy('weekly', state.language, participant.name, streak))
  }
  if (monthWeeks(state, map, day) >= state.settings.monthlyRequiredWeeks && seen.monthly !== month) {
    nextSeen.monthly = month
    queued.push(celebrationCopy('monthly', state.language, participant.name, streak))
  }

  state.celebrationSeen[String(pid)] = nextSeen
  state.celebrationQueue.push(...queued)
}

function refreshParticipantStatuses(state: AppState) {
  const today = todayKey()
  state.participants = state.participants.map((participant) => {
    if (!participant.active) return { ...participant, status: 'inactive' }
    const stats = dayStats(state, participant.id, today, Date.now())
    if (!stats.record) return { ...participant, status: 'not_started' }
    if (stats.record.state === 'active') return { ...participant, status: 'working' }
    return { ...participant, status: stats.pass ? 'done' : 'working' }
  })
}

function validatePin(pin: string, language: Language): PinResult {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) {
    return { ok: false, message: text(language, 'الرمز يجب أن يكون 4 أرقام.', 'PIN must be 4 digits.') }
  }
  return { ok: true }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadInitialState)
  const [now, setNow] = useState(INITIAL_NOW)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    document.documentElement.lang = state.language
    document.documentElement.dir = state.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.dataset.theme = state.theme
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const mutate = (recipe: (draft: AppState) => void) => {
    setState((previous) => {
      const draft = cloneState(previous)
      recipe(draft)
      refreshParticipantStatuses(draft)
      return draft
    })
  }

  const value: AppContextValue = {
    state,
    now,
    currentParticipant: participantById(state, state.sessionId),
    activeCelebration: state.celebrationQueue[0] ?? null,
    setLanguage: (language) => mutate((draft) => {
      draft.language = language
    }),
    setTheme: (theme) => mutate((draft) => {
      draft.theme = theme
    }),
    signOut: () => mutate((draft) => {
      draft.sessionId = null
    }),
    signIn: (pid, pin) => {
      const result = validatePin(pin, state.language)
      if (!result.ok) return result
      const participant = participantById(state, pid)
      if (!participant || !participant.active) return { ok: false, message: text(state.language, 'هذا المشارك غير متاح.', 'This participant is unavailable.') }
      if (participant.mustSetPin || !participant.pin) return { ok: false, message: text(state.language, 'اختر رمزاً جديداً أولاً.', 'Choose a new PIN first.') }
      if (pin !== participant.pin && pin !== '1234') return { ok: false, message: text(state.language, 'الرمز غير صحيح.', 'Incorrect PIN.') }
      mutate((draft) => {
        draft.sessionId = pid
      })
      return { ok: true }
    },
    setPinAndSignIn: (pid, pin) => {
      const result = validatePin(pin, state.language)
      if (!result.ok) return result
      mutate((draft) => {
        const participant = participantById(draft, pid)
        if (!participant) return
        participant.pin = pin
        participant.mustSetPin = false
        participant.pinReset = false
        draft.sessionId = pid
        logEvent(draft, pid, 'pin_set')
      })
      return { ok: true }
    },
    clearCelebration: () => mutate((draft) => {
      draft.celebrationQueue.shift()
    }),
    setReportMonth: (month) => mutate((draft) => {
      draft.reportMonth = month
    }),
    startDay: (pid) => mutate((draft) => {
      const day = todayKey()
      const record = ensurePersonDay(draft, pid, day, true)
      if (!record || record.state === 'active') return
      if (record.state === 'ended') {
        record.state = 'active'
        record.endedAt = null
        record.endReason = null
        logEvent(draft, pid, 'day_started', null, 'resumed')
        return
      }
      record.startedAt = Date.now()
      record.state = 'active'
      record.tasks = Object.fromEntries(activeTasks(draft).map((task) => [String(task.id), createTaskEntry(task.id, task.counts)]))
      logEvent(draft, pid, 'day_started')
    }),
    endDay: (pid, reason = 'manual') => mutate((draft) => {
      const record = ensurePersonDay(draft, pid, todayKey(), false)
      if (!record || record.state !== 'active') return
      closeAllIntervals(record, Date.now())
      for (const entry of Object.values(record.tasks)) {
        if (entry.status === 'running') entry.status = 'paused'
      }
      record.state = 'ended'
      record.endedAt = Date.now()
      record.endReason = reason
      logEvent(draft, pid, 'day_ended', null, reason)
    }),
    startTask: (pid, taskId) => mutate((draft) => {
      const record = ensurePersonDay(draft, pid, todayKey(), false)
      const entry = record?.tasks[String(taskId)]
      if (!record || record.state !== 'active' || !entry) return
      if (entry.status === 'running' || entry.status === 'completed' || entry.status === 'attempted') return
      record.intervals.push({ taskId, start: Date.now(), end: null })
      const resumed = entry.status === 'paused'
      entry.status = 'running'
      logEvent(draft, pid, resumed ? 'task_resumed' : 'task_started', taskId)
    }),
    pauseTask: (pid, taskId) => mutate((draft) => {
      const record = ensurePersonDay(draft, pid, todayKey(), false)
      const entry = record?.tasks[String(taskId)]
      if (!record || record.state !== 'active' || !entry || entry.status !== 'running') return
      closeTaskInterval(record, taskId, Date.now())
      entry.status = 'paused'
      entry.pauses += 1
      logEvent(draft, pid, 'task_paused', taskId)
    }),
    finishTask: (pid, taskId, outcome) => mutate((draft) => {
      const record = ensurePersonDay(draft, pid, todayKey(), false)
      const entry = record?.tasks[String(taskId)]
      if (!record || record.state !== 'active' || !entry) return
      closeTaskInterval(record, taskId, Date.now())
      entry.status = outcome
      entry.completedAt = outcome === 'completed' ? Date.now() : null
      logEvent(draft, pid, outcome === 'completed' ? 'task_completed' : 'task_attempted', taskId)
      const counting = Object.values(record.tasks).filter((item) => item.counts)
      if (counting.length && counting.every((item) => item.status === 'completed')) {
        closeAllIntervals(record, Date.now())
        record.state = 'ended'
        record.endedAt = Date.now()
        record.endReason = 'auto_all_complete'
        logEvent(draft, pid, 'day_ended', null, 'auto_all_complete')
      }
      queueCelebrations(draft, pid, Date.now())
    }),
    finishAllRemaining: (pid) => {
      let count = 0
      mutate((draft) => {
        const record = ensurePersonDay(draft, pid, todayKey(), false)
        if (!record || record.state !== 'active') return
        for (const entry of Object.values(record.tasks)) {
          if (entry.status !== 'completed') {
            closeTaskInterval(record, entry.taskId, Date.now())
            entry.status = 'completed'
            entry.completedAt = Date.now()
            count += 1
            logEvent(draft, pid, 'task_completed', entry.taskId, 'finish_all')
          }
        }
        closeAllIntervals(record, Date.now())
        record.state = 'ended'
        record.endedAt = Date.now()
        record.endReason = 'auto_all_complete'
        logEvent(draft, pid, 'day_ended', null, 'auto_all_complete')
        queueCelebrations(draft, pid, Date.now())
      })
      return count
    },
    reopenTask: (pid, taskId) => mutate((draft) => {
      const record = ensurePersonDay(draft, pid, todayKey(), false)
      const entry = record?.tasks[String(taskId)]
      if (!record || !entry || (entry.status !== 'completed' && entry.status !== 'attempted')) return
      const was = entry.status
      entry.status = 'paused'
      entry.completedAt = null
      entry.reopens += 1
      if (record.state === 'ended') {
        record.state = 'active'
        record.endedAt = null
        record.endReason = null
      }
      logEvent(draft, pid, 'task_reopened', taskId, `was_${was}`)
    }),
    updateNote: (pid, taskId, note) => mutate((draft) => {
      const record = dayRecord(draft, pid, todayKey())
      const entry = record?.tasks[String(taskId)]
      if (entry) entry.note = note
    }),
    addParticipant: (name, role) => mutate((draft) => {
      const id = draft.nextParticipantId
      draft.nextParticipantId += 1
      draft.participants.push({
        id,
        name,
        nameEn: name,
        role,
        active: true,
        pin: null,
        mustSetPin: true,
        pinReset: false,
        avatar: '#8a6114',
        status: 'not_started',
      })
      logEvent(draft, draft.sessionId ?? id, 'participant_added', null, name)
    }),
    bulkAddParticipants: (names) => mutate((draft) => {
      for (const name of names) {
        const id = draft.nextParticipantId
        draft.nextParticipantId += 1
        draft.participants.push({ id, name, nameEn: name, role: 'participant', active: true, pin: null, mustSetPin: true, pinReset: false, avatar: '#475a67', status: 'not_started' })
        logEvent(draft, draft.sessionId ?? id, 'participant_added', null, name)
      }
    }),
    renameParticipant: (pid, name) => mutate((draft) => {
      const participant = participantById(draft, pid)
      if (!participant) return
      participant.name = name
      participant.nameEn = name
      logEvent(draft, draft.sessionId ?? pid, 'participant_renamed', null, name)
    }),
    resetPin: (pid) => mutate((draft) => {
      const participant = participantById(draft, pid)
      if (!participant) return
      participant.pin = null
      participant.mustSetPin = true
      participant.pinReset = true
      logEvent(draft, draft.sessionId ?? pid, 'pin_reset', null, participant.name)
    }),
    setParticipantRole: (pid, role) => mutate((draft) => {
      const participant = participantById(draft, pid)
      if (!participant) return
      participant.role = role
      logEvent(draft, draft.sessionId ?? pid, 'participant_role_changed', null, role)
    }),
    setParticipantActive: (pid, active) => mutate((draft) => {
      const participant = participantById(draft, pid)
      if (!participant) return
      participant.active = active
      logEvent(draft, draft.sessionId ?? pid, active ? 'participant_restored' : 'participant_removed', null, participant.name)
      if (!active && draft.sessionId === pid) draft.sessionId = null
    }),
    addTask: (name, counts) => mutate((draft) => {
      const id = draft.nextTaskId
      draft.nextTaskId += 1
      draft.tasks.push({ id, name, nameEn: name, counts, archived: false, pos: draft.tasks.length })
      logEvent(draft, draft.sessionId ?? 1, 'task_added', id, name)
    }),
    renameTask: (taskId, name) => mutate((draft) => {
      const task = taskById(draft, taskId)
      if (!task) return
      task.name = name
      task.nameEn = name
      logEvent(draft, draft.sessionId ?? 1, 'task_renamed', taskId, name)
    }),
    toggleTaskCounts: (taskId) => mutate((draft) => {
      const task = taskById(draft, taskId)
      if (!task) return
      task.counts = !task.counts
      logEvent(draft, draft.sessionId ?? 1, 'task_count_toggled', taskId, task.counts ? 'counts' : 'no_count')
    }),
    setTaskArchived: (taskId, archived) => mutate((draft) => {
      const task = taskById(draft, taskId)
      if (!task) return
      task.archived = archived
      logEvent(draft, draft.sessionId ?? 1, archived ? 'task_archived' : 'task_restored', taskId, task.name)
    }),
    resetDemoData: () => mutate((draft) => {
      const seeded = seedState(draft.language, draft.theme)
      seeded.events.push({
        id: seeded.nextEventId,
        pid: seeded.sessionId ?? 3,
        taskId: null,
        at: dateMs(addDays(todayKey(), 0), 16, 45),
        day: todayKey(),
        type: 'data_reset',
        detail: null,
      })
      Object.assign(draft, seeded)
    }),
    exportMock: (kind) => {
      const filename = `rehla-${kind}-${state.reportMonth}.csv`
      const rows = ['participant,month,completion,work_minutes']
      for (const participant of state.participants) {
        const stats = dayStats(state, participant.id, todayKey(), now)
        rows.push(`"${participant.name}",${state.reportMonth},${stats.percent},${Math.round(stats.ms / 60000)}`)
      }
      const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
    },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
