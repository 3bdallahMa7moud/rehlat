import { useMemo, useState } from 'react'
import { Activity, Filter } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Badge, EmptyState, PageHeader, SelectField } from '../components/ui'
import type { EventType } from '../types'
import { formatClock, formatDay, monthKeyOf } from '../utils/date'
import { eventLabel, eventTypeOptions } from '../utils/events'
import { taskById } from '../utils/stats'
import { text } from '../utils/text'

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
            <Filter size={20} className="text-[var(--accent)]" />
            <h2 className="text-xl font-black">{text(language, 'الفلاتر', 'Filters')}</h2>
          </div>
          <Badge>{filtered.length}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {canSeeAll ? (
            <SelectField label={text(language, 'المشارك', 'Participant')} value={participantFilter} onChange={setParticipantFilter}>
              <option value="all">{text(language, 'كل المشاركين', 'All participants')}</option>
              {state.participants.map((participant) => <option key={participant.id} value={participant.id}>{language === 'ar' ? participant.name : participant.nameEn}</option>)}
            </SelectField>
          ) : (
            <div className="panel-soft p-3 text-sm font-bold text-[var(--ink-2)]">
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
          <h2 className="text-xl font-black">{text(language, 'الأحداث', 'Events')}</h2>
          <Badge tone="gold">{canSeeAll ? text(language, 'عرض إداري', 'Admin view') : text(language, 'عرض شخصي', 'Personal view')}</Badge>
        </div>
        {filtered.length ? (
          <div className="table-shell max-h-[76vh] overflow-y-auto">
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
                      <td data-label={text(language, 'التاريخ', 'Date')} className="num">{formatDay(event.day, language)}</td>
                      <td data-label={text(language, 'الوقت', 'Time')} className="num">{formatClock(event.at, language)}</td>
                      {canSeeAll ? <td data-label={text(language, 'المشارك', 'Participant')} className="font-black">{participant ? (language === 'ar' ? participant.name : participant.nameEn) : '—'}</td> : null}
                      <td data-label={text(language, 'الحدث', 'Event')}><Badge tone={event.type.includes('completed') ? 'good' : event.type.includes('attempted') ? 'warn' : 'neutral'}>{eventLabel(event.type as EventType, language)}</Badge></td>
                      <td data-label={text(language, 'المهمة', 'Task')} className="max-w-sm text-[var(--ink-2)]">{task ? (language === 'ar' ? task.name : task.nameEn) : '—'}</td>
                      <td data-label={text(language, 'تفاصيل', 'Details')} className="text-[var(--ink-3)]">{event.detail ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
