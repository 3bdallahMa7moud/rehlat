import { Activity, Medal, Users } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Avatar, Badge, EmptyState, KpiBand, PageHeader, ProgressBar } from '../components/ui'
import { formatClock, formatCompactDuration, todayKey } from '../utils/date'
import { eventLabel } from '../utils/events'
import { leaderboard, taskById } from '../utils/stats'
import { text } from '../utils/text'
import { cx } from '../utils/cx'

function statusLabel(row: ReturnType<typeof leaderboard>[number], language: 'ar' | 'en') {
  if (row.pass) return text(language, 'حقق الهدف', 'Reached target')
  if (row.state === 'active') return text(language, 'يعمل الآن', 'Working now')
  if (row.done > 0 || row.ms > 0 || row.attempted > 0) return text(language, 'أنهى دون الهدف', 'Below target')
  return text(language, 'لم يبدأ', 'Not started')
}

function statusTone(row: ReturnType<typeof leaderboard>[number]) {
  if (row.pass) return 'good'
  if (row.state === 'active') return 'gold'
  if (row.done > 0 || row.ms > 0 || row.attempted > 0) return 'warn'
  return 'neutral'
}

export function CommunityPage() {
  const { state, currentParticipant, now } = useApp()
  if (!currentParticipant) return null
  const language = state.language
  const rows = leaderboard(state, todayKey(), now)
  const topThree = rows.filter((row) => row.done > 0 || row.ms > 0).slice(0, 3)
  const done = rows.filter((row) => row.pass).length
  const working = rows.filter((row) => !row.pass && row.state === 'active').length
  const notStarted = rows.filter((row) => row.state === 'not_started').length
  const recentEvents = state.events.filter((event) => ['day_started', 'day_ended', 'task_completed', 'task_attempted', 'task_started', 'task_resumed'].includes(event.type)).slice(-18).reverse()

  return (
    <>
      <PageHeader
        eyebrow={text(language, 'المتابعة الجماعية', 'Group motivation')}
        title={text(language, 'المجموعة', 'Community')}
        description={text(language, 'الترتيب الكامل والنشاط الجماعي في مكان واحد حتى تبقى صفحة اليوم خفيفة.', 'The full leaderboard and group activity live here so Today stays focused.')}
      />

      <div className="grid gap-5">
        <section className="hero-panel p-5 md:p-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">{text(language, 'حالة المجموعة اليوم', 'Today group status')}</p>
              <h2 className="mt-1 text-xl font-bold">{text(language, 'من يعمل؟ ومن وصل؟', 'Who is moving, who has arrived?')}</h2>
            </div>
            <Badge tone="gold">{todayKey()}</Badge>
          </div>
          <KpiBand
            items={[
              { label: text(language, 'بلغوا الهدف', 'Reached target'), value: <span className="num">{done}</span>, tone: 'good' },
              { label: text(language, 'يعملون الآن', 'Working now'), value: <span className="num">{working}</span>, tone: 'gold' },
              { label: text(language, 'لم يبدأوا', 'Not started'), value: <span className="num">{notStarted}</span> },
              { label: text(language, 'مشاركون نشطون', 'Active participants'), value: <span className="num">{rows.length}</span> },
            ]}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="panel p-5">
            <div className="section-title">
              <h2 className="text-lg font-bold">{text(language, 'المتصدرون', 'Top performers')}</h2>
              <Medal className="text-[var(--accent)]" size={20} />
            </div>
            <div className="list-panel">
              {topThree.length ? topThree.map((row, index) => (
                <div key={row.participant.id} className="list-row">
                  <div className="flex items-center gap-3">
                    <Avatar name={row.participant.name} color={row.participant.avatar} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge tone="gold">#{index + 1}</Badge>
                        <h3 className="truncate font-bold text-sm">{language === 'ar' ? row.participant.name : row.participant.nameEn}</h3>
                      </div>
                      <p className="mt-1 text-xs text-[var(--ink-3)]">{statusLabel(row, language)} · {formatCompactDuration(row.ms, language)} · {row.streak} {text(language, 'يوم ستريك', 'day streak')}</p>
                    </div>
                    <div className="num text-xl font-bold">{row.percent.toFixed(0)}%</div>
                  </div>
                  <div className="mt-2.5"><ProgressBar value={row.percent} good={row.pass} /></div>
                </div>
              )) : (
                <EmptyState
                  icon={<Medal size={28} />}
                  title={text(language, 'لا يوجد متصدرون بعد', 'No top performers yet')}
                  body={text(language, 'سيظهر المتصدرون بعد تسجيل إنجازات اليوم.', 'Top performers appear after today’s progress is recorded.')}
                />
              )}
            </div>
          </div>

          <div className="panel p-5">
            <div className="section-title">
              <h2 className="text-lg font-bold">{text(language, 'الترتيب الكامل', 'Full leaderboard')}</h2>
              <Badge>{todayKey()}</Badge>
            </div>
            {rows.length ? (
              <div className="table-shell">
                <table className="data-table responsive-table">
                  <thead>
                    <tr>
                      <th>{text(language, 'الترتيب', 'Rank')}</th>
                      <th>{text(language, 'المشارك', 'Participant')}</th>
                      <th>{text(language, 'الإنجاز', 'Completion')}</th>
                      <th>{text(language, 'وقت العمل', 'Work time')}</th>
                      <th>{text(language, 'الستريك', 'Streak')}</th>
                      <th>{text(language, 'الأسبوع', 'Week')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.participant.id} className={cx(row.participant.id === currentParticipant.id && 'bg-[var(--accent-bg)]')}>
                        <td data-label={text(language, 'الترتيب', 'Rank')} className="num font-bold">{index + 1}</td>
                        <td data-label={text(language, 'المشارك', 'Participant')}>
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={row.participant.name} color={row.participant.avatar} size="sm" />
                            <div className="min-w-0">
                              <div className="truncate font-bold text-sm">{language === 'ar' ? row.participant.name : row.participant.nameEn}</div>
                              {row.participant.id === currentParticipant.id ? <div className="text-xs font-semibold text-[var(--accent)]">{text(language, 'أنت', 'You')}</div> : null}
                              <div className={cx('state-text mt-0.5 text-xs', statusTone(row))}>{statusLabel(row, language)}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label={text(language, 'الإنجاز', 'Completion')}>
                          <div className="min-w-32">
                            <div className="mb-1 flex justify-between gap-2">
                              <span className="num font-bold text-xs">{row.percent.toFixed(0)}%</span>
                              <span className="text-xs font-medium text-[var(--ink-3)]">{row.done} / {row.total}</span>
                            </div>
                            <ProgressBar value={row.percent} good={row.pass} />
                          </div>
                        </td>
                        <td data-label={text(language, 'وقت العمل', 'Work time')} className="num text-xs">{formatCompactDuration(row.ms, language)}</td>
                        <td data-label={text(language, 'الستريك', 'Streak')} className="num text-xs font-semibold">{row.streak}</td>
                        <td data-label={text(language, 'الأسبوع', 'Week')} className="text-xs">{row.week} / {state.settings.weeklyRequiredDays}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<Users size={28} />}
                title={text(language, 'لا يوجد مشاركون نشطون', 'No active participants')}
                body={text(language, 'يمكن للمشرف استعادة أو إضافة مشاركين من الإدارة.', 'An admin can restore or add participants from Admin.')}
              />
            )}
          </div>
        </section>

        <section className="panel p-5">
          <div className="section-title">
            <h2 className="text-lg font-bold">{text(language, 'النشاط الجماعي المباشر', 'Live group activity')}</h2>
            <Activity className="text-[var(--accent)]" size={20} />
          </div>
          {recentEvents.length ? (
            <div className="timeline-list">
              {recentEvents.map((event) => {
                const participant = state.participants.find((item) => item.id === event.pid)
                const task = event.taskId ? taskById(state, event.taskId) : null
                return (
                  <div key={event.id} className="timeline-item text-xs">
                    <span className="timeline-dot text-[var(--good)]" />
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--ink)]">
                        {participant ? (language === 'ar' ? participant.name : participant.nameEn) : '—'} <span className="font-normal text-[var(--ink-2)]">{eventLabel(event.type, language)}</span>
                      </div>
                      {task ? <div className="truncate text-xs text-[var(--ink-3)]">{language === 'ar' ? task.name : task.nameEn}</div> : null}
                    </div>
                    <div className="num text-xs text-[var(--ink-3)]">{formatClock(event.at, language)}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Activity size={28} />}
              title={text(language, 'لا يوجد نشاط جماعي', 'No group activity')}
              body={text(language, 'تظهر أحداث المجموعة عند بدء الأيام أو إنجاز المهام.', 'Group events appear when days start or tasks are completed.')}
            />
          )}
        </section>
      </div>
    </>
  )
}

