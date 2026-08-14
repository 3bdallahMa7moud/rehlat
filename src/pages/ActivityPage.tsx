import { useMemo, useState } from 'react'
import { Activity, Filter } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Badge, Button, EmptyState, PageHeader, SelectField } from '../components/ui'
import type { EventType } from '../types'
import { formatClock, formatDay, monthKeyOf } from '../utils/date'
import { eventLabel, eventTypeOptions } from '../utils/events'
import { taskById } from '../utils/stats'
import { text } from '../utils/text'

function eventTone(type: EventType) {
  if (type.includes('completed')) return 'good'
  if (type.includes('attempted')) return 'warn'
  return 'neutral'
}

export function ActivityPage() {
  const { state, currentParticipant } = useApp()
  const [participantFilter, setParticipantFilter] = useState('all')
  const [eventFilter, setEventFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const language = state.language
  const canSeeAll = currentParticipant?.role === 'admin'
  const visibleEvents = canSeeAll ? state.events : state.events.filter((event) => event.pid === (currentParticipant?.id ?? -1))
  const months = useMemo(() => Array.from(new Set(visibleEvents.map((event) => monthKeyOf(event.day)))).sort().reverse(), [visibleEvents])
  const filtered = visibleEvents
    .filter((event) => participantFilter === 'all' || event.pid === Number(participantFilter))
    .filter((event) => eventFilter === 'all' || event.type === eventFilter)
    .filter((event) => monthFilter === 'all' || monthKeyOf(event.day) === monthFilter)
    .slice()
    .sort((a, b) => b.at - a.at)
    .slice(0, 240)

  if (!currentParticipant) return null

  return (
    <>
      <PageHeader
        eyebrow={text(language, 'سجل كامل قابل للتصفية', 'Full filterable history')}
        title={text(language, 'سجل الأحداث', 'Activity log')}
        description={text(language, 'هذا ليس بديلاً عن النشاط المباشر؛ هنا التاريخ الكامل بتفاصيل التاريخ والوقت والمشارك والمهمة.', 'This is not just live activity; this is the full history with date, time, participant, and task detail.')}
      />

      <section className="panel mb-5 p-5">
        <div className="section-title">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-bold">{text(language, 'الفلاتر', 'Filters')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{filtered.length}</Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setParticipantFilter('all')
                setEventFilter('all')
                setMonthFilter('all')
              }}
            >
              {text(language, 'مسح', 'Clear')}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {canSeeAll ? (
            <SelectField label={text(language, 'المشارك', 'Participant')} value={participantFilter} onChange={setParticipantFilter}>
              <option value="all">{text(language, 'كل المشاركين', 'All participants')}</option>
              {state.participants.map((participant) => <option key={participant.id} value={participant.id}>{language === 'ar' ? participant.name : participant.nameEn}</option>)}
            </SelectField>
          ) : (
            <div className="panel-soft p-3 text-xs font-semibold text-[var(--ink-2)]">
              {text(language, 'يظهر سجلك الشخصي فقط.', 'Only your personal history is shown.')}
            </div>
          )}
          <SelectField label={text(language, 'نوع الحدث', 'Event type')} value={eventFilter} onChange={setEventFilter}>
            <option value="all">{text(language, 'كل الأحداث', 'All events')}</option>
            {eventTypeOptions(language).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectField>
          <SelectField label={text(language, 'الشهر', 'Month')} value={monthFilter} onChange={setMonthFilter}>
            <option value="all">{text(language, 'كل الأشهر', 'All months')}</option>
            {months.map((month) => <option key={month} value={month}>{month}</option>)}
          </SelectField>
        </div>
      </section>

      <section className="panel p-5">
        <div className="section-title">
          <h2 className="text-lg font-bold">{text(language, 'الأحداث', 'Events')}</h2>
          <Badge tone="gold">{canSeeAll ? text(language, 'عرض إداري', 'Admin view') : text(language, 'عرض شخصي', 'Personal view')}</Badge>
        </div>
        {filtered.length ? (
          <>
          <div className="table-shell desktop-only max-h-[76vh] overflow-y-auto">
            <table className="data-table responsive-table">
              <thead>
                <tr>
                  <th>{text(language, 'التاريخ', 'Date')}</th>
                  <th>{text(language, 'الوقت', 'Time')}</th>
                  {canSeeAll ? <th>{text(language, 'المشارك', 'Participant')}</th> : null}
                  <th>{text(language, 'الحدث', 'Event')}</th>
                  <th>{text(language, 'المهمة', 'Task')}</th>
                  <th>{text(language, 'تفاصيل', 'Details')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => {
                  const participant = state.participants.find((item) => item.id === event.pid)
                  const task = event.taskId ? taskById(state, event.taskId) : null
                  return (
                    <tr key={event.id}>
                      <td data-label={text(language, 'التاريخ', 'Date')} className="num text-xs">{formatDay(event.day, language)}</td>
                      <td data-label={text(language, 'الوقت', 'Time')} className="num text-xs">{formatClock(event.at, language)}</td>
                      {canSeeAll ? <td data-label={text(language, 'المشارك', 'Participant')} className="font-bold text-sm">{participant ? (language === 'ar' ? participant.name : participant.nameEn) : '—'}</td> : null}
                      <td data-label={text(language, 'الحدث', 'Event')}><Badge tone={eventTone(event.type as EventType)}>{eventLabel(event.type as EventType, language)}</Badge></td>
                      <td data-label={text(language, 'المهمة', 'Task')} className="max-w-sm text-xs text-[var(--ink-2)]">{task ? (language === 'ar' ? task.name : task.nameEn) : '—'}</td>
                      <td data-label={text(language, 'تفاصيل', 'Details')} className="text-xs text-[var(--ink-3)]">{event.detail ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mobile-only">
            <div className="list-panel">
              {filtered.map((event) => {
                const participant = state.participants.find((item) => item.id === event.pid)
                const task = event.taskId ? taskById(state, event.taskId) : null
                return (
                  <div key={event.id} className="list-row">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm">{canSeeAll && participant ? (language === 'ar' ? participant.name : participant.nameEn) : eventLabel(event.type as EventType, language)}</div>
                        {canSeeAll ? <div className="mt-1"><Badge tone={eventTone(event.type as EventType)}>{eventLabel(event.type as EventType, language)}</Badge></div> : null}
                      </div>
                      <div className="num shrink-0 text-xs font-semibold text-[var(--ink-3)]">{formatClock(event.at, language)}</div>
                    </div>
                    <div className="text-xs text-[var(--ink-2)]">
                      <span className="num">{formatDay(event.day, language)}</span>
                      {task ? <span> · {language === 'ar' ? task.name : task.nameEn}</span> : null}
                    </div>
                    {event.detail ? <div className="mt-1 text-xs text-[var(--ink-3)]">{event.detail}</div> : null}
                  </div>
                )
              })}
            </div>
          </div>
          </>
        ) : (
          <EmptyState
            icon={<Activity size={32} />}
            title={text(language, 'لا توجد أحداث مطابقة', 'No matching events')}
            body={text(language, 'غيّر الفلاتر أو سجّل نشاطاً جديداً حتى يظهر هنا.', 'Change the filters or record new activity to populate this log.')}
          />
        )}
      </section>
    </>
  )
}

