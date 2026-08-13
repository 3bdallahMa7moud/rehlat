export type Language = 'ar' | 'en'

export type Theme = 'light' | 'dark'

export type ParticipantRole = 'admin' | 'participant'

export type DayState = 'not_started' | 'active' | 'ended'

export type TaskStatus = 'idle' | 'running' | 'paused' | 'completed' | 'attempted'

export type EventType =
  | 'day_started'
  | 'day_ended'
  | 'task_started'
  | 'task_paused'
  | 'task_resumed'
  | 'task_completed'
  | 'task_attempted'
  | 'task_reopened'
  | 'pin_set'
  | 'pin_reset'
  | 'participant_added'
  | 'participant_removed'
  | 'participant_restored'
  | 'participant_renamed'
  | 'participant_role_changed'
  | 'task_added'
  | 'task_renamed'
  | 'task_count_toggled'
  | 'task_archived'
  | 'task_restored'
  | 'data_reset'

export type Participant = {
  id: number
  name: string
  nameEn: string
  role: ParticipantRole
  active: boolean
  pin: string | null
  mustSetPin: boolean
  pinReset: boolean
  avatar: string
  status: 'working' | 'done' | 'not_started' | 'inactive'
}

export type TaskTemplate = {
  id: number
  name: string
  nameEn: string
  counts: boolean
  archived: boolean
  pos: number
}

export type TaskEntry = {
  taskId: number
  status: TaskStatus
  completedAt: number | null
  pauses: number
  reopens: number
  counts: boolean
  note: string
}

export type TaskInterval = {
  taskId: number
  start: number
  end: number | null
}

export type DayRecord = {
  date: string
  startedAt: number | null
  endedAt: number | null
  state: DayState
  endReason: 'manual' | 'auto_all_complete' | null
  tasks: Record<string, TaskEntry>
  intervals: TaskInterval[]
}

export type ActivityEvent = {
  id: number
  pid: number
  taskId: number | null
  at: number
  day: string
  type: EventType
  detail: string | null
}

export type Settings = {
  dailyTarget: number
  weeklyRequiredDays: number
  monthlyRequiredWeeks: number
}

export type CelebrationSeen = {
  daily?: string
  weekly?: string
  monthly?: string
}

export type Celebration = {
  id: string
  kind: 'daily' | 'weekly' | 'monthly'
  title: string
  body: string
}

export type AppState = {
  version: number
  participants: Participant[]
  tasks: TaskTemplate[]
  days: Record<string, Record<string, DayRecord>>
  events: ActivityEvent[]
  settings: Settings
  sessionId: number | null
  language: Language
  theme: Theme
  reportMonth: string
  celebrationSeen: Record<string, CelebrationSeen>
  celebrationQueue: Celebration[]
  nextParticipantId: number
  nextTaskId: number
  nextEventId: number
}

export type DayStats = {
  record: DayRecord | null
  done: number
  total: number
  attempted: number
  ms: number
  pass: boolean
  percent: number
}

export type LeaderboardRow = {
  participant: Participant
  done: number
  total: number
  attempted: number
  ms: number
  percent: number
  pass: boolean
  state: DayState
  streak: number
  week: number
  month: number
}

export type MonthWeekStat = {
  week: string
  successfulDays: number
  ok: boolean
}

export type MonthStats = {
  weeks: MonthWeekStat[]
  goodWeeks: number
  successDays: number
  activeDays: number
  ms: number
  done: number
  total: number
  attempted: number
  pauses: number
  reopens: number
  rate: number
}

export type InsightSummary = {
  headline: string
  strengths: string[]
  weaknesses: string[]
  advice: string[]
}
