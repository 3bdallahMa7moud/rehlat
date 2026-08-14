import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, CheckCircle2, Circle, MinusCircle, Trophy, XCircle } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Badge, EmptyState, KpiBand, PageHeader, ProgressBar } from '../components/ui'
import { addDays, formatDay, todayKey, weekDaysOf, weekRange } from '../utils/date'
import { dayStats, dailyStreak, leaderboard, monthWeeks, successMap, weekDone } from '../utils/stats'
import { text } from '../utils/text'
import { cx } from '../utils/cx'

export function StreaksPage() {
  const { state, currentParticipant, now } = useApp()
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
    return {
      day,
      label: formatDay(day, language),
      success: stats.pass ? 1 : 0,
      completion: stats.percent,
    }
  })
  const hasHistory = history.some((item) => item.completion > 0)

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
                <div className="mt-3 flex items-end gap-3">
                  <span className="num text-6xl font-black leading-none text-[var(--accent)]">{currentDaily}</span>
                  <span className="pb-2 text-lg font-black text-[var(--ink-2)]">{text(language, 'أيام', 'days')}</span>
                </div>
                <p className="mt-3 text-sm font-bold text-[var(--ink-3)]">{text(language, 'أطول معنى هنا هو الاستمرارية الهادئة، وليس المؤثرات.', 'The focus here is steady continuity, not effects.')}</p>
              </div>
              <KpiBand
                items={[
                  { label: text(language, 'هذا الأسبوع', 'This week'), value: <span className="num">{currentWeek} / {state.settings.weeklyRequiredDays}</span>, tone: currentWeek >= state.settings.weeklyRequiredDays ? 'good' : 'gold' },
                  { label: text(language, 'هذا الشهر', 'This month'), value: <span className="num">{currentMonth} / {state.settings.monthlyRequiredWeeks}</span>, tone: currentMonth >= state.settings.monthlyRequiredWeeks ? 'good' : 'neutral' },
                ]}
              />
            </div>
          </section>

          <section className="panel p-5">
            <div className="section-title">
              <div>
                <h2 className="text-xl font-black">{text(language, 'أيام هذا الأسبوع', 'Current week')}</h2>
                <p className="text-sm text-[var(--ink-2)]">{weekRange(weekDays[0], language)}</p>
              </div>
              <Badge tone={currentWeek >= state.settings.weeklyRequiredDays ? 'good' : 'gold'}>{currentWeek} / {state.settings.weeklyRequiredDays}</Badge>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const stats = dayStats(state, currentParticipant.id, day, now)
                const future = day > today
                const isToday = day === today
                const noActivity = !stats.record && !future
                const icon = future ? <Circle size={15} /> : stats.pass ? <CheckCircle2 size={15} /> : stats.record ? <XCircle size={15} /> : <MinusCircle size={15} />
                return (
                  <div
                    key={day}
                    className={cx(
                      'grid min-h-24 content-between rounded-lg border p-2 text-center',
                      stats.pass && 'border-[color-mix(in_srgb,var(--good)_25%,transparent)] bg-[var(--good-bg)] text-[var(--good)]',
                      !stats.pass && stats.record && 'border-[color-mix(in_srgb,var(--bad)_25%,transparent)] bg-[var(--bad-bg)] text-[var(--bad)]',
                      future && 'border-[var(--line)] bg-[var(--surface-2)] opacity-55',
                      noActivity && 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-3)]',
                      isToday && 'ring-2 ring-[var(--accent)]',
                    )}
                  >
                    <div className="text-xs font-black">{formatDay(day, language).split(' ')[0]}</div>
                    <div className="mx-auto">{icon}</div>
                    <div className="num text-base font-black">{future ? '—' : `${stats.percent.toFixed(0)}%`}</div>
                    <div className="text-[0.68rem] font-bold">
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
              <h2 className="text-xl font-black">{text(language, 'تاريخ الستريك', 'Streak history')}</h2>
              <Badge>{text(language, 'آخر 28 يوم', 'Last 28 days')}</Badge>
            </div>
            {hasHistory ? (
              <div className="chart-box compact">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis hide domain={[0, 1]} />
                    <Tooltip
                      cursor={{ fill: 'var(--surface-2)' }}
                      contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)' }}
                    />
                    <ReferenceLine y={1} stroke="var(--good)" strokeDasharray="3 5" />
                    <Bar dataKey="success" fill="var(--accent)" radius={[3, 3, 0, 0]} name={text(language, 'يوم ناجح', 'Successful day')} />
                  </BarChart>
                </ResponsiveContainer>
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
              <h2 className="text-lg font-black">{text(language, 'ترتيب الستريك', 'Streak ranking')}</h2>
              <Trophy size={20} className="text-[var(--accent)]" />
            </div>
            <div className="grid gap-3">
              {rows.length ? rows.map((row, index) => (
                <div key={row.participant.id} className={cx('list-row rounded-none', row.participant.id === currentParticipant.id && 'bg-[var(--accent-bg)]')}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-black">
                        <span className={cx('num inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line)] text-[var(--ink-3)]', index < 3 && 'border-[var(--accent)] text-[var(--accent)]')}>{index + 1}</span>
                        <span className="truncate">{language === 'ar' ? row.participant.name : row.participant.nameEn}</span>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ink-3)]">{row.week} / {state.settings.weeklyRequiredDays} {text(language, 'هذا الأسبوع', 'this week')}</div>
                    </div>
                    <div className="text-end">
                      <div className="num text-xl font-black">{row.streak}</div>
                      <div className="text-xs text-[var(--ink-3)]">{text(language, 'يوم', 'days')}</div>
                    </div>
                  </div>
                  <div className="mt-3">
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
