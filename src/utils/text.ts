import type { Language, TaskStatus } from '../types'

export function text(language: Language, ar: string, en: string) {
  return language === 'ar' ? ar : en
}

export function taskStatusLabel(status: TaskStatus, language: Language) {
  const labels: Record<TaskStatus, [string, string]> = {
    idle: ['لم تبدأ', 'Not started'],
    running: ['جارية', 'Running'],
    paused: ['متوقفة', 'Paused'],
    completed: ['منجزة', 'Completed'],
    attempted: ['دون إنجاز', 'Finished without completion'],
  }
  const [ar, en] = labels[status]
  return text(language, ar, en)
}

export function plural(language: Language, count: number, arSingular: string, arPlural: string, enSingular: string) {
  if (language === 'ar') {
    if (count === 1) return `${count} ${arSingular}`
    return `${count} ${arPlural}`
  }
  return `${count} ${count === 1 ? enSingular : `${enSingular}s`}`
}

export function unitLabel(language: Language, count: number, arSingular: string, arPlural: string, enSingular: string) {
  if (language === 'ar') return count === 0 || count === 1 ? arSingular : arPlural
  return count === 1 ? enSingular : `${enSingular}s`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
}
