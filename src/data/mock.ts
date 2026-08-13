import type { ActivityEvent, AppState, DayRecord, Participant, TaskEntry, TaskTemplate, TaskInterval } from '../types'
import { addDays, dateMs, dayKeyOf, monthKeyOf, todayKey } from '../utils/date'

type Profile = 'high' | 'steady' | 'uneven' | 'low'

const participantsSeed: Array<Omit<Participant, 'id' | 'status'> & { profile: Profile }> = [
  { name: 'عبدالله مو', nameEn: 'Abdallah Mo', role: 'participant', active: true, pin: '1234', mustSetPin: false, pinReset: false, avatar: '#8a6114', profile: 'steady' },
  { name: 'مشاري', nameEn: 'Meshari', role: 'participant', active: true, pin: '1234', mustSetPin: false, pinReset: false, avatar: '#1c7a55', profile: 'high' },
  { name: 'سامي', nameEn: 'Sami', role: 'admin', active: true, pin: '1234', mustSetPin: false, pinReset: false, avatar: '#96590f', profile: 'high' },
  { name: 'ادريس', nameEn: 'Idris', role: 'participant', active: true, pin: null, mustSetPin: true, pinReset: false, avatar: '#475a67', profile: 'uneven' },
  { name: 'حمزة', nameEn: 'Hamza', role: 'participant', active: true, pin: '1234', mustSetPin: false, pinReset: false, avatar: '#a33b3b', profile: 'low' },
  { name: 'عبدالإله', nameEn: 'Abdulilah', role: 'participant', active: true, pin: '1234', mustSetPin: false, pinReset: false, avatar: '#6f8492', profile: 'steady' },
  { name: 'عبدالعزيز جمكس', nameEn: 'Abdulaziz Jamx', role: 'participant', active: true, pin: null, mustSetPin: true, pinReset: true, avatar: '#b8821c', profile: 'uneven' },
  { name: 'عبدالعزيز الشراري', nameEn: 'Abdulaziz Alsharari', role: 'participant', active: true, pin: '1234', mustSetPin: false, pinReset: false, avatar: '#1f6f58', profile: 'high' },
  { name: 'احمد تويتش', nameEn: 'Ahmed Twitch', role: 'participant', active: true, pin: '1234', mustSetPin: false, pinReset: false, avatar: '#7b5b2b', profile: 'steady' },
  { name: 'محمد مدتر', nameEn: 'Mohammed Mdtar', role: 'participant', active: true, pin: '1234', mustSetPin: false, pinReset: false, avatar: '#5c6f7a', profile: 'low' },
  { name: 'زياد القصيمي', nameEn: 'Ziyad Alqassimi', role: 'participant', active: true, pin: '1234', mustSetPin: false, pinReset: false, avatar: '#2f7057', profile: 'uneven' },
  { name: 'رازي', nameEn: 'Razi', role: 'participant', active: true, pin: '1234', mustSetPin: false, pinReset: false, avatar: '#875f18', profile: 'steady' },
]

const taskSeed: TaskTemplate[] = [
  { id: 1, name: 'صلاة الفجر في وقتها', nameEn: 'Fajr prayer on time', counts: true, archived: false, pos: 0 },
  { id: 2, name: 'قراءة 20 صفحة', nameEn: 'Read 20 pages', counts: true, archived: false, pos: 1 },
  { id: 3, name: 'رياضة 30 دقيقة', nameEn: '30-minute workout', counts: true, archived: false, pos: 2 },
  { id: 4, name: 'أذكار الصباح', nameEn: 'Morning adhkar', counts: true, archived: false, pos: 3 },
  { id: 5, name: 'مراجعة الدروس', nameEn: 'Study review', counts: true, archived: false, pos: 4 },
  { id: 6, name: 'شرب 2 لتر ماء', nameEn: 'Drink 2 liters of water', counts: true, archived: false, pos: 5 },
  { id: 7, name: 'ترتيب مهام الغد', nameEn: "Plan tomorrow's tasks", counts: false, archived: false, pos: 6 },
  { id: 8, name: 'النوم قبل 12', nameEn: 'Sleep before midnight', counts: true, archived: false, pos: 7 },
]

const noteSamples = [
  'تمت بهدوء قبل بداية اليوم.',
  'احتجت تذكيراً لكن أنهيتها.',
  'توقفت مرة بسبب مكالمة.',
  'محاولة جيدة ولم تكتمل بالكامل.',
  '',
]

function createEvent(events: ActivityEvent[], pid: number, taskId: number | null, at: number, type: ActivityEvent['type'], detail: string | null = null) {
  events.push({
    id: events.length + 1,
    pid,
    taskId,
    at,
    day: dayKeyOf(at),
    type,
    detail,
  })
}

function shouldRecord(profile: Profile, pid: number, offset: number) {
  const cadence = Math.abs(offset + pid * 3)
  if (profile === 'high') return cadence % 11 !== 0
  if (profile === 'steady') return cadence % 7 !== 0
  if (profile === 'uneven') return cadence % 5 !== 0 && cadence % 13 !== 0
  return cadence % 3 !== 0 && cadence % 8 !== 0
}

function desiredDone(profile: Profile, pid: number, offset: number) {
  const swing = Math.abs(pid * 5 + offset) % 4
  if (profile === 'high') return 7 - (swing === 0 ? 1 : 0)
  if (profile === 'steady') return 5 + (swing >= 2 ? 1 : 0)
  if (profile === 'uneven') return 3 + swing
  return 2 + (swing > 2 ? 2 : swing)
}

function buildIntervals(day: string, taskId: number, startIndex: number, durationMinutes: number, running: boolean): TaskInterval[] {
  const start = dateMs(day, 5 + startIndex, (taskId * 7) % 50)
  const first = Math.round(durationMinutes * 0.62) * 60000
  const second = Math.max(0, durationMinutes * 60000 - first)
  if (running) return [{ taskId, start, end: null }]
  if (second < 8 * 60000) return [{ taskId, start, end: start + durationMinutes * 60000 }]
  return [
    { taskId, start, end: start + first },
    { taskId, start: start + first + 11 * 60000, end: start + first + 11 * 60000 + second },
  ]
}

function makeTaskEntry(task: TaskTemplate, status: TaskEntry['status'], completedAt: number | null, pid: number, offset: number): TaskEntry {
  const noteIndex = Math.abs(pid + offset + task.id) % noteSamples.length
  return {
    taskId: task.id,
    status,
    completedAt,
    pauses: status === 'paused' || (status !== 'idle' && (pid + task.id + offset) % 6 === 0) ? 1 + Math.abs(pid + offset) % 2 : 0,
    reopens: status === 'completed' && (pid + task.id + offset) % 17 === 0 ? 1 : 0,
    counts: task.counts,
    note: status === 'idle' ? '' : noteSamples[noteIndex],
  }
}

function makeDay(pid: number, profile: Profile, day: string, offset: number, events: ActivityEvent[]): DayRecord {
  const today = todayKey()
  const isToday = day === today
  const startedAt = dateMs(day, 5 + (pid % 3), (pid * 9) % 40)
  const entries: Record<string, TaskEntry> = {}
  const intervals: TaskInterval[] = []
  const targetDone = desiredDone(profile, pid, offset)
  let completedCount = 0
  let endedAt: number | null = null
  let hasRunning = false

  createEvent(events, pid, null, startedAt, 'day_started')

  for (const task of taskSeed) {
    let status: TaskEntry['status'] = 'idle'
    if (isToday && pid === 1) {
      if (task.id === 1 || task.id === 4) status = 'completed'
      else if (task.id === 2) status = 'running'
      else if (task.id === 3) status = 'paused'
      else if (task.id === 5) status = 'attempted'
    } else if (isToday && pid % 4 === 0) {
      if (task.id <= 2) status = 'completed'
      else if (task.id === 3) status = 'running'
    } else if (task.counts && completedCount < targetDone) {
      status = 'completed'
      completedCount += 1
    } else if (task.counts && (pid + task.id + offset) % 9 === 0) {
      status = 'attempted'
    } else if (!task.counts && (pid + offset) % 2 === 0) {
      status = 'completed'
    }

    const duration = 12 + ((pid * 13 + task.id * 8 + Math.abs(offset)) % 48)
    const running = status === 'running'
    const taskIntervals = status === 'idle' ? [] : buildIntervals(day, task.id, task.id, duration, running)
    const completedAt = status === 'completed' ? taskIntervals.at(-1)?.end ?? null : null
    entries[String(task.id)] = makeTaskEntry(task, status, completedAt, pid, offset)
    intervals.push(...taskIntervals)
    if (running) hasRunning = true

    if (status === 'running') createEvent(events, pid, task.id, taskIntervals[0].start, 'task_started')
    if (status === 'paused') createEvent(events, pid, task.id, taskIntervals.at(-1)?.end ?? startedAt, 'task_paused')
    if (status === 'completed') createEvent(events, pid, task.id, completedAt ?? startedAt, 'task_completed')
    if (status === 'attempted') createEvent(events, pid, task.id, taskIntervals.at(-1)?.end ?? startedAt, 'task_attempted')
  }

  if (!hasRunning) {
    const intervalEnds = intervals.map((interval) => interval.end ?? interval.start)
    endedAt = Math.max(startedAt + 60 * 60000, ...intervalEnds) + 8 * 60000
    createEvent(events, pid, null, endedAt, 'day_ended', targetDone >= 7 ? 'auto_all_complete' : 'manual')
  }

  return {
    date: day,
    startedAt,
    endedAt,
    state: hasRunning ? 'active' : 'ended',
    endReason: hasRunning ? null : targetDone >= 7 ? 'auto_all_complete' : 'manual',
    tasks: entries,
    intervals,
  }
}

function seedDays(participants: Participant[], events: ActivityEvent[]) {
  const days: AppState['days'] = {}
  const today = todayKey()

  participants.forEach((participant, index) => {
    const profile = participantsSeed[index].profile
    const pid = participant.id
    days[String(pid)] = {}
    for (let offset = -72; offset <= 0; offset += 1) {
      if (!shouldRecord(profile, pid, offset)) continue
      const day = addDays(today, offset)
      days[String(pid)][day] = makeDay(pid, profile, day, offset, events)
    }
  })

  return days
}

function statusFromToday(days: AppState['days'], participant: Participant): Participant['status'] {
  const today = todayKey()
  const record = days[String(participant.id)]?.[today]
  if (!participant.active) return 'inactive'
  if (!record) return 'not_started'
  if (record.state === 'active') return 'working'
  const counting = Object.values(record.tasks).filter((task) => task.counts)
  const completed = counting.filter((task) => task.status === 'completed').length
  return completed * 100 >= counting.length * 90 ? 'done' : 'working'
}

export function seedState(language: AppState['language'] = 'ar', theme: AppState['theme'] = 'light'): AppState {
  const events: ActivityEvent[] = []
  const participants: Participant[] = participantsSeed.map((participant, index) => ({
    id: index + 1,
    name: participant.name,
    nameEn: participant.nameEn,
    role: participant.role,
    active: participant.active,
    pin: participant.pin,
    mustSetPin: participant.mustSetPin,
    pinReset: participant.pinReset,
    avatar: participant.avatar,
    status: 'not_started',
  }))
  const days = seedDays(participants, events)
  const withStatuses = participants.map((participant) => ({ ...participant, status: statusFromToday(days, participant) }))

  createEvent(events, 3, null, dateMs(addDays(todayKey(), -12), 11, 20), 'participant_added', 'ضيف تجريبي جديد')
  createEvent(events, 3, 7, dateMs(addDays(todayKey(), -9), 12, 5), 'task_count_toggled', 'خارج النسبة')
  createEvent(events, 3, null, dateMs(addDays(todayKey(), -4), 15, 10), 'pin_reset', 'عبدالعزيز جمكس')

  return {
    version: 1,
    participants: withStatuses,
    tasks: taskSeed,
    days,
    events: events.sort((a, b) => a.at - b.at).map((event, index) => ({ ...event, id: index + 1 })),
    settings: {
      dailyTarget: 90,
      weeklyRequiredDays: 3,
      monthlyRequiredWeeks: 4,
    },
    sessionId: null,
    language,
    theme,
    reportMonth: monthKeyOf(todayKey()),
    celebrationSeen: {},
    celebrationQueue: [],
    nextParticipantId: withStatuses.length + 1,
    nextTaskId: taskSeed.length + 1,
    nextEventId: events.length + 1,
  }
}
