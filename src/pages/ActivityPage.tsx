import { useMemo, useState } from 'react'
import { Activity, ArrowLeft, ArrowRight, Filter } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Badge, Button, EmptyState, PageHeader, SelectField } from '../components/ui'
import type { EventType } from '../types'
import { formatClock, formatDay, monthKeyOf } from '../utils/date'
import { eventLabel, eventTypeOptions } from '../utils/events'
import { taskById } from '../utils/stats'
import { text } from '../utils/text'

const PAGE_SIZE = 50

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
  const [page, setPage] = useState(1)
  const language = state.language
  const canSeeAll = currentParticipant?.role === 'admin'
  const visibleEvents = canSeeAll ? state.events : state.events.filter((event) => event.pid === (currentParticipant?.id ?? -1))
  const months = useMemo(() => Array.from(new Set(visibleEvents.map((event) => monthKeyOf(event.day)))).sort().reverse(), [visibleEvents])

  const filtered = useMemo(() => {
    return visibleEvents
      .filter((event) => participantFilter === 'all' || event.pid === Number(participantFilter))
      .filter((event) => eventFilter === 'all' || event.type === eventFilter)
      .filter((event) => monthFilter === 'all' || monthKeyOf(event.day) === monthFilter)
      .slice()
      .sort((a, b) => b.at - a.at)
  }, [visibleEvents, participantFilter, eventFilter, monthFilter])

  const totalResults = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * PAGE_SIZE
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalResults)
  const paginatedEvents = filtered.slice(startIndex, endIndex)

  const handleFilterChange = (setter: (val: string) => void) => (val: string) => {
    setter(val)
    setPage(1)
  }

  const prevIcon = language === 'ar' ? <ArrowRight size={15} /> : <ArrowLeft size={15} />
  const nextIcon = language === 'ar' ? <ArrowLeft size={15} /> : <ArrowRight size={15} />

  if (!currentParticipant) return null

  return (
    <>
      <PageHeader
        eyebrow={text(language, 'سجل كامل قابل للتصفية', 'Full filterable history')}
        title={text(language, 'سجل الأحداث', 'Activity log')}
        description={text(
          language,
          'التاريخ الكامل للأحداث بتفاصيل التاريخ والوقت والمشارك والمهمة مع التصفح والفرز.',
          'Complete activity audit log with timestamp, participant, and task details.',
        )}
      />

      <section className="panel mb-5 p-5">
        <div className="section-title">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-bold">{text(language, 'الفلاتر', 'Filters')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{totalResults} {text(language, 'حدث', 'events')}</Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setParticipantFilter('all')
                setEventFilter('all')
                setMonthFilter('all')
                setPage(1)
              }}
            >
              {text(language, 'مسح الفلاتر', 'Clear')}
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {canSeeAll ? (
            <SelectField label={text(language, 'المشارك', 'Participant')} value={participantFilter} onChange={handleFilterChange(setParticipantFilter)}>
              <option value="all">{text(language, 'كل المشاركين', 'All participants')}</option>
              {state.participants.map((participant) => <option key={participant.id} value={participant.id}>{language === 'ar' ? participant.name : participant.nameEn}</option>)}
            </SelectField>
          ) : (
            <div className="panel-soft p-3 text-xs font-semibold text-[var(--ink-2)]">
              {text(language, 'يظهر سجلك الشخصي فقط.', 'Only your personal history is shown.')}
            </div>
          )}
          <SelectField label={text(language, 'نوع الحدث', 'Event type')} value={eventFilter} onChange={handleFilterChange(setEventFilter)}>
            <option value="all">{text(language, 'كل الأحداث', 'All events')}</option>
            {eventTypeOptions(language).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectField>
          <SelectField label={text(language, 'الشهر', 'Month')} value={monthFilter} onChange={handleFilterChange(setMonthFilter)}>
            <option value="all">{text(language, 'كل الأشهر', 'All months')}</option>
            {months.map((month) => <option key={month} value={month}>{month}</option>)}
          </SelectField>
        </div>
      </section>

      <section className="panel p-5">
        <div className="section-title">
          <div>
            <h2 className="text-lg font-bold">{text(language, 'الأحداث', 'Events')}</h2>
            {totalResults > 0 ? (
              <p className="text-xs text-[var(--ink-2)]">
                {text(
                  language,
                  `عرض ${startIndex + 1}–${endIndex} من أصل ${totalResults} حدثاً`,
                  `Showing ${startIndex + 1}–${endIndex} of ${totalResults} events`,
                )}
              </p>
            ) : null}
          </div>
          <Badge tone="gold">{canSeeAll ? text(language, 'عرض إداري', 'Admin view') : text(language, 'عرض شخصي', 'Personal view')}</Badge>
        </div>

        {paginatedEvents.length ? (
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
                  {paginatedEvents.map((event) => {
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
                {paginatedEvents.map((event) => {
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

            {/* Pagination Controls */}
            {totalPages > 1 ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                <div className="text-xs font-medium text-[var(--ink-2)]">
                  {text(language, `الصفحة ${safePage} من ${totalPages}`, `Page ${safePage} of ${totalPages}`)}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {prevIcon}
                    {text(language, 'السابق', 'Previous')}
                  </Button>
                  <span className="num px-2 text-xs font-bold text-[var(--ink)]">
                    {safePage} / {totalPages}
                  </span>
                  <Button
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {text(language, 'التالي', 'Next')}
                    {nextIcon}
                  </Button>
                </div>
              </div>
            ) : null}
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

