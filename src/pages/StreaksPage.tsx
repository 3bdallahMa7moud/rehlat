import { useState } from 'react'
import { CalendarDays, CheckCircle2, Circle, MinusCircle, Trophy, XCircle } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Badge, EmptyState, KpiBand, PageHeader, ProgressBar } from '../components/ui'
import { addDays, formatCompactDuration, formatDay, todayKey, weekDaysOf, weekRange } from '../utils/date'
import { dayStats, dailyStreak, leaderboard, monthWeeks, successMap, weekDone } from '../utils/stats'
import { text, unitLabel } from '../utils/text'
import { cx } from '../utils/cx'

export function StreaksPage() {
  const { state, currentParticipant, now } = useApp()
  const [activeDay, setActiveDay] = useState<string | null>(null)

  if (!currentParticipant) return null
  const language = state.language
  const today = todayKey()
  const map = successMap(state, currentParticipant.id, now)
  const currentDaily = dailyStreak(map, today)
  const currentWeek = weekDone(map, today)
  const currentMonth = monthWeeks(state, map, today)
  const weekDays = weekDaysOf(today)
  const rows = leaderboard(state, today, now).sort((a, b) => b.streak - a.streak || b.week - a.week || b.month - a.month)

  const history = Array.from({ length: 28 }, (_, index) => {
    const day = addDays(today, index - 27)
    const stats = dayStats(state, currentParticipant.id, day, now)
    const percent = stats.percent
    let intensity = 'empty'
    if (stats.record) {
      if (percent === 100) intensity = 'full'
      else if (stats.pass) intensity = 'pass'
      else if (percent >= 50) intensity = 'mid'
      else if (percent > 0) intensity = 'low'
    }

    return {
      day,
      label: formatDay(day, language),
      shortLabel: formatDay(day, language).split(' ')[0],
      success: stats.pass,
      completion: percent,
      recorded: !!stats.record,
      intensity,
      ms: stats.ms,
      done: stats.done,
      total: stats.total,
    }
  })
  const hasHistory = history.some((item) => item.completion > 0 || item.recorded)

  return (
    <>
      <PageHeader
        eyebrow={text(language, 'السلاسل والأهداف المتكررة', 'Streaks and recurring goals')}
        title={text(language, 'الستريك', 'Streaks')}
        description={text(language, 'هنا تظهر التجربة الكاملة للستريك اليومي والأسبوعي والشهري، بعيداً عن ازدحام صفحة اليوم.', 'The full daily, weekly, and monthly streak experience lives here, away from the daily execution page.')}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <section className="hero-panel p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
              <div>
                <p className="eyebrow">{text(language, 'سلسلتك الحالية', 'Your current streak')}</p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="num text-5xl font-bold leading-none text-[var(--accent)]">{currentDaily}</span>
                  <span className="text-base font-semibold text-[var(--ink-2)]">{text(language, 'أيام مستمرة', 'consecutive days')}</span>
                </div>
                <p className="mt-2.5 text-xs font-medium text-[var(--ink-3)]">{text(language, 'التركيز هنا هو الاستمرارية الهادئة وبناء العادة.', 'The focus here is steady continuity and habit building.')}</p>
              </div>
              <KpiBand
                items={[
                  { label: text(language, 'هذا الأسبوع', 'This week'), value: <span className="num">{currentWeek} / {state.settings.weeklyRequiredDays}</span>, unit: unitLabel(language, currentWeek, 'يوم', 'أيام', 'day'), tone: currentWeek >= state.settings.weeklyRequiredDays ? 'good' : 'gold' },
                  { label: text(language, 'هذا الشهر', 'This month'), value: <span className="num">{currentMonth} / {state.settings.monthlyRequiredWeeks}</span>, unit: unitLabel(language, currentMonth, 'أسبوع', 'أسابيع', 'week'), tone: currentMonth >= state.settings.monthlyRequiredWeeks ? 'good' : 'neutral' },
                ]}
              />
            </div>
          </section>

          <section className="panel p-5">
            <div className="section-title">
              <div>
                <h2 className="text-lg font-bold">{text(language, 'أيام هذا الأسبوع', 'Current week')}</h2>
                <p className="text-xs font-medium text-[var(--ink-3)]">{weekRange(weekDays[0], language)}</p>
              </div>
              <Badge tone={currentWeek >= state.settings.weeklyRequiredDays ? 'good' : 'gold'}>{currentWeek} / {state.settings.weeklyRequiredDays}</Badge>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const stats = dayStats(state, currentParticipant.id, day, now)
                const future = day > today
                const isToday = day === today
                const noActivity = !stats.record && !future
                const icon = future ? <Circle size={14} /> : stats.pass ? <CheckCircle2 size={14} /> : stats.record ? <XCircle size={14} /> : <MinusCircle size={14} />
                return (
                  <div
                    key={day}
                    className={cx(
                      'grid min-h-22 content-between rounded-lg border p-2 text-center transition-all',
                      stats.pass && 'border-[color-mix(in_srgb,var(--good)_25%,transparent)] bg-[var(--good-bg)] text-[var(--good)]',
                      !stats.pass && stats.record && 'border-[color-mix(in_srgb,var(--bad)_25%,transparent)] bg-[var(--bad-bg)] text-[var(--bad)]',
                      future && 'border-[var(--line)] bg-[var(--surface-2)] opacity-55',
                      noActivity && 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-3)]',
                      isToday && 'ring-2 ring-[var(--accent)] shadow-sm',
                    )}
                  >
                    <div className="text-xs font-semibold">{formatDay(day, language).split(' ')[0]}</div>
                    <div className="mx-auto my-1">{icon}</div>
                    <div className="num text-sm font-bold">{future ? '—' : `${stats.percent.toFixed(0)}%`}</div>
                    <div className="text-[0.66rem] font-medium">
                      {future
                        ? text(language, 'لاحقاً', 'Future')
                        : stats.pass
                          ? text(language, 'ناجح', 'Success')
                          : stats.record
                            ? text(language, 'لم يكتمل', 'Below target')
                            : text(language, 'لا نشاط', 'No activity')}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="panel p-5">
            <div className="section-title">
              <div>
                <h2 className="text-lg font-bold">{text(language, 'خريطة الستريك (28 يوماً)', '28-Day Streak Heatmap')}</h2>
                <p className="text-xs text-[var(--ink-3)]">{text(language, 'درجات الإنجاز من لا نشاط وحتى 100%. مرر أو المس لمعرفة التفاصيل.', 'Progress intensity levels. Hover or tap to view details.')}</p>
              </div>
              <Badge>{text(language, 'آخر 28 يوم', 'Last 28 days')}</Badge>
            </div>
            {hasHistory ? (
              <div className="streak-history-grid" aria-label={text(language, 'تاريخ آخر 28 يوم', 'Last 28 days history')}>
                {history.map((item) => {
                  const isHovered = activeDay === item.day
                  return (
                    <div
                      key={item.day}
                      tabIndex={0}
                      role="button"
                      onMouseEnter={() => setActiveDay(item.day)}
                      onMouseLeave={() => setActiveDay(null)}
                      onFocus={() => setActiveDay(item.day)}
                      onBlur={() => setActiveDay(null)}
                      onClick={() => setActiveDay(activeDay === item.day ? null : item.day)}
                      className={cx('streak-day', item.intensity)}
                      aria-label={`${item.label}: ${item.completion.toFixed(0)}%`}
                    >
                      <span className="streak-day-icon">
                        {item.success ? <CheckCircle2 size={13} /> : item.recorded ? <XCircle size={13} /> : <MinusCircle size={13} />}
                      </span>
                      <span className="num text-xs font-bold">{item.recorded ? `${item.completion.toFixed(0)}%` : '—'}</span>
                      <span className="truncate text-[0.66rem] font-medium text-[var(--ink-3)]">{item.shortLabel}</span>

                      {isHovered ? (
                        <div className="streak-tooltip-popover" role="tooltip">
                          <div className="streak-tooltip-title">{item.label}</div>
                          <div className="streak-tooltip-stat">
                            <span>{text(language, 'نسبة الإنجاز:', 'Completion:')}</span>
                            <strong className="num">{item.completion.toFixed(0)}%</strong>
                          </div>
                          {item.recorded ? (
                            <>
                              <div className="streak-tooltip-stat">
                                <span>{text(language, 'المهام المنجزة:', 'Completed tasks:')}</span>
                                <strong className="num">{item.done} / {item.total}</strong>
                              </div>
                              <div className="streak-tooltip-stat">
                                <span>{text(language, 'وقت العمل:', 'Work time:')}</span>
                                <strong className="num">{formatCompactDuration(item.ms, language)}</strong>
                              </div>
                              <div className="streak-tooltip-stat">
                                <span>{text(language, 'الحالة:', 'Status:')}</span>
                                <strong>{item.success ? text(language, 'ناجح', 'Target reached') : text(language, 'أقل من الهدف', 'Below target')}</strong>
                              </div>
                            </>
                          ) : (
                            <div className="text-[var(--ink-3)] mt-1">{text(language, 'لا يوجد نشاط مسجل', 'No recorded activity')}</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={<CalendarDays size={28} />}
                title={text(language, 'لا يوجد تاريخ للستريك', 'No streak history')}
                body={text(language, 'ابدأ تسجيل الأيام حتى يظهر تاريخ السلسلة هنا.', 'Start recording days to build streak history here.')}
              />
            )}
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <section className="panel p-5">
            <div className="section-title">
              <h2 className="text-base font-bold">{text(language, 'ترتيب الستريك', 'Streak ranking')}</h2>
              <Trophy size={18} className="text-[var(--accent)]" />
            </div>
            <div className="grid gap-2">
              {rows.length ? rows.map((row, index) => (
                <div key={row.participant.id} className={cx('list-row rounded-lg', row.participant.id === currentParticipant.id && 'bg-[var(--accent-bg)]')}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <span className={cx('num inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--line)] text-xs text-[var(--ink-3)]', index < 3 && 'border-[var(--accent)] text-[var(--accent)] font-bold')}>{index + 1}</span>
                        <span className="truncate">{language === 'ar' ? row.participant.name : row.participant.nameEn}</span>
                      </div>
                      <div className="mt-1 text-xs font-normal text-[var(--ink-3)]">{row.week} / {state.settings.weeklyRequiredDays} {text(language, 'هذا الأسبوع', 'this week')}</div>
                    </div>
                    <div className="text-end">
                      <div className="num text-lg font-bold text-[var(--ink)]">{row.streak}</div>
                      <div className="text-xs font-medium text-[var(--ink-3)]">{text(language, 'يوم', 'days')}</div>
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <ProgressBar value={(row.week / state.settings.weeklyRequiredDays) * 100} good={row.week >= state.settings.weeklyRequiredDays} />
                  </div>
                </div>
              )) : (
                <EmptyState
                  icon={<Trophy size={28} />}
                  title={text(language, 'لا يوجد ترتيب', 'No ranking')}
                  body={text(language, 'سيظهر ترتيب الستريك عند وجود مشاركين نشطين.', 'Streak ranking appears when active participants exist.')}
                />
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}

