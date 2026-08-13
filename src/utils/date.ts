import type { Language } from '../types'

const APP_TZ = 'UTC'

export function dayKeyOf(ms: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

export function todayKey() {
  return dayKeyOf(Date.now())
}

export function dateMs(day: string, hour = 12, minute = 0) {
  return Date.parse(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`)
}

export function addDays(day: string, count: number) {
  const d = new Date(`${day}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + count)
  return d.toISOString().slice(0, 10)
}

export function weekdayOf(day: string) {
  return new Date(`${day}T12:00:00.000Z`).getUTCDay()
}

export function weekStartOf(day: string) {
  return addDays(day, -weekdayOf(day))
}

export function weekDaysOf(day: string) {
  const start = weekStartOf(day)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function monthKeyOf(day: string) {
  return day.slice(0, 7)
}

export function monthWeekList(month: string) {
  let current = weekStartOf(`${month}-01`)
  if (monthKeyOf(current) !== month) current = addDays(current, 7)
  const weeks: string[] = []
  while (monthKeyOf(current) === month) {
    weeks.push(current)
    current = addDays(current, 7)
  }
  return weeks
}

export function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((value) => String(value).padStart(2, '0')).join(':')
}

export function formatCompactDuration(ms: number, language: Language) {
  const minutes = Math.max(0, Math.round(ms / 60000))
  if (minutes < 60) return language === 'ar' ? `${minutes} د` : `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return language === 'ar' ? `${h} س ${m} د` : `${h}h ${m}m`
}

export function formatClock(ms: number, language: Language) {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    timeZone: APP_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms))
}

export function formatDay(day: string, language: Language, long = false) {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    timeZone: APP_TZ,
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
    year: long ? 'numeric' : undefined,
  }).format(new Date(`${day}T12:00:00.000Z`))
}

export function formatMonth(month: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    timeZone: APP_TZ,
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${month}-01T12:00:00.000Z`))
}

export function weekRange(week: string, language: Language) {
  const end = addDays(week, 6)
  const format = (day: string) =>
    new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
      timeZone: APP_TZ,
      day: 'numeric',
      month: 'short',
    }).format(new Date(`${day}T12:00:00.000Z`))
  return `${format(week)} - ${format(end)}`
}

export function monthShift(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00.000Z`)
  date.setUTCMonth(date.getUTCMonth() + offset)
  return date.toISOString().slice(0, 7)
}
