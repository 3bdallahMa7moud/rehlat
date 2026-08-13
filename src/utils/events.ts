import type { EventType, Language } from '../types'
import { text } from './text'

export function eventLabel(type: EventType, language: Language) {
  const labels: Record<EventType, [string, string]> = {
    day_started: ['بدأ يومه', 'started the day'],
    day_ended: ['أنهى يومه', 'ended the day'],
    task_started: ['بدأ مهمة', 'started a task'],
    task_paused: ['أوقف مهمة', 'paused a task'],
    task_resumed: ['استأنف مهمة', 'resumed a task'],
    task_completed: ['أنجز مهمة', 'completed a task'],
    task_attempted: ['أنهى دون إنجاز', 'finished without completion'],
    task_reopened: ['أعاد فتح مهمة', 'reopened a task'],
    pin_set: ['ضبط الرمز', 'set PIN'],
    pin_reset: ['تصفير رمز', 'reset PIN'],
    participant_added: ['إضافة مشارك', 'added participant'],
    participant_removed: ['إيقاف مشارك', 'deactivated participant'],
    participant_restored: ['استعادة مشارك', 'restored participant'],
    participant_renamed: ['تعديل اسم', 'renamed participant'],
    participant_role_changed: ['تغيير دور', 'changed role'],
    task_added: ['إضافة مهمة', 'added task'],
    task_renamed: ['تعديل مهمة', 'renamed task'],
    task_count_toggled: ['تغيير الاحتساب', 'changed counting'],
    task_archived: ['أرشفة مهمة', 'archived task'],
    task_restored: ['استعادة مهمة', 'restored task'],
    data_reset: ['إعادة ضبط البيانات', 'reset data'],
  }
  const [ar, en] = labels[type]
  return text(language, ar, en)
}

export function eventTypeOptions(language: Language) {
  const values: EventType[] = [
    'day_started',
    'day_ended',
    'task_started',
    'task_paused',
    'task_resumed',
    'task_completed',
    'task_attempted',
    'task_reopened',
    'participant_added',
    'pin_reset',
    'task_added',
  ]
  return values.map((value) => ({ value, label: eventLabel(value, language) }))
}
