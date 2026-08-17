import { Area, AreaChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarCheck, CheckCircle2, Clock3, Minus, ShieldAlert, Sparkles } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Badge, CustomChartTooltip, EmptyState, KpiBand, PageHeader, ProgressBar } from '../components/ui'
import { formatCompactDuration, formatDay } from '../utils/date'
import { progressSeries, taskConsistencyBreakdown, weekOverWeekComparison } from '../utils/stats'
import { text, unitLabel } from '../utils/text'

export function ProgressPage() {
  const { state, currentParticipant, now } = useApp()
  if (!currentParticipant) return null
  const language = state.language
  const series = progressSeries(state, currentParticipant.id, now, 14)
  const hasData = series.some((item) => item.total > 0)
  const average = hasData ? series.reduce((sum, item) => sum + item.completion, 0) / series.filter((item) => item.total > 0).length : 0
  const successfulDays = series.filter((item) => item.successful).length
  const totalWorkMs = series.reduce((sum, item) => sum + item.workMinutes * 60000, 0)
  const bestCompletion = Math.max(0, ...series.map((item) => item.completion))
  const chartData = series.map((item) => ({ ...item, label: formatDay(item.day, language) }))

  const wow = weekOverWeekComparison(state, currentParticipant.id, now)
  const consistency = taskConsistencyBreakdown(state, currentParticipant.id, now)

  return (
    <>
      <PageHeader
        eyebrow={text(language, 'ماذا حدث؟ • آخر 14 يوماً', 'What happened? • Last 14 days')}
        title={text(language, 'التقدم', 'Progress')}
        description={text(
          language,
          'استعراض تاريخي للأداء المنجز، ومقارنة هذا الأسبوع بالأسبوع الماضي، وتفصيل استمرارية المهام.',
          'Historical review of completed performance, week-over-week comparisons, and task consistency.',
        )}
      />

      <div className="grid gap-5">
        {/* Week-over-Week Comparison Hero */}
        <section className="hero-panel p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">{text(language, 'مقارنة الأداء الأسبوعي', 'Week-over-week comparison')}</p>
              <h2 className="mt-1 text-xl font-bold">
                {text(language, 'أداء هذا الأسبوع مقابل الأسبوع السابق', 'This week vs last week')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {wow.delta > 0 ? (
                <div className="flex items-center gap-1 rounded-full bg-[var(--good-bg)] px-3 py-1 text-xs font-bold text-[var(--good)]">
                  <ArrowUpRight size={16} />
                  <span>+{wow.delta}% {text(language, 'مقارنة بالماضي', 'vs last week')}</span>
                </div>
              ) : wow.delta < 0 ? (
                <div className="flex items-center gap-1 rounded-full bg-[var(--bad-bg)] px-3 py-1 text-xs font-bold text-[var(--bad)]">
                  <ArrowDownRight size={16} />
                  <span>{wow.delta}% {text(language, 'مقارنة بالماضي', 'vs last week')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-bold text-[var(--ink-2)]">
                  <Minus size={16} />
                  <span>0% {text(language, 'مستقر', 'steady')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="text-xs font-semibold text-[var(--ink-2)]">{text(language, 'نسبة هذا الأسبوع', 'This week')}</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="num text-2xl font-bold text-[var(--ink)]">{wow.thisWeekRate.toFixed(0)}%</span>
                <span className="text-xs font-medium text-[var(--ink-3)]">({wow.thisWeekDone}/{wow.thisWeekTotal})</span>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="text-xs font-semibold text-[var(--ink-2)]">{text(language, 'نسبة الأسبوع السابق', 'Last week')}</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="num text-2xl font-bold text-[var(--ink-2)]">{wow.lastWeekRate.toFixed(0)}%</span>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="text-xs font-semibold text-[var(--ink-2)]">{text(language, 'الأيام الناجحة هذا الأسبوع', 'Target reached days')}</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="num text-2xl font-bold text-[var(--good)]">{wow.thisWeekSuccessDays}</span>
                <span className="text-xs text-[var(--ink-3)]">{unitLabel(language, wow.thisWeekSuccessDays, 'يوم', 'أيام', 'days')}</span>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
              <span className="text-xs font-semibold text-[var(--ink-2)]">{text(language, 'وقت العمل هذا الأسبوع', 'This week work time')}</span>
              <div className="mt-1 text-2xl font-bold text-[var(--ink)]">
                {formatCompactDuration(wow.thisWeekWorkMs, language)}
              </div>
            </div>
          </div>
        </section>

        {/* Completion Trend Chart */}
        <section className="panel p-5">
          <div className="section-title">
            <div>
              <h2 className="text-lg font-bold">{text(language, 'اتجاه الإنجاز اليومي', 'Daily completion trend')}</h2>
              <p className="text-xs text-[var(--ink-2)]">
                {text(language, `الخط المتقطع يمثل هدف اليوم (${state.settings.dailyTarget}%).`, `Dashed line represents daily target (${state.settings.dailyTarget}%).`)}
              </p>
            </div>
            <Badge tone="gold">{state.settings.dailyTarget}%</Badge>
          </div>
          <KpiBand
            className="mb-5"
            items={[
              { label: text(language, 'متوسط 14 يوماً', '14-day average'), value: <span className="num">{average.toFixed(0)}%</span>, tone: 'gold' },
              { label: text(language, 'أيام محققة للهدف', 'Target reached days'), value: <span className="num">{successfulDays}</span>, unit: unitLabel(language, successfulDays, 'يوم', 'أيام', 'day'), tone: successfulDays >= 3 ? 'good' : 'neutral' },
              { label: text(language, 'أعلى إنجاز يومي', 'Highest day'), value: <span className="num">{bestCompletion}%</span> },
              { label: text(language, 'إجمالي وقت العمل', 'Total work time'), value: <span className="num">{formatCompactDuration(totalWorkMs, language)}</span> },
            ]}
          />
          {hasData ? (
            <div className="chart-box tall">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--ink-3)', fontSize: 10 }} width={28} axisLine={false} tickLine={false} tickCount={5} />
                  <Tooltip content={<CustomChartTooltip valueSuffix="%" />} />
                  <ReferenceLine y={state.settings.dailyTarget} stroke="var(--good)" strokeDasharray="4 5" />
                  <Line type="monotone" dataKey="completion" name={text(language, 'الإنجاز', 'Completion')} stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={<BarChart3 size={30} />}
              title={text(language, 'لا توجد بيانات للرسم', 'No chart data')}
              body={text(language, 'ابدأ عدة أيام حتى يظهر اتجاه الإنجاز هنا.', 'Start a few days to see the completion trend here.')}
            />
          )}
        </section>

        {/* Strongest vs Attention Areas (Consistency Breakdown) */}
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="panel p-5">
            <div className="section-title">
              <div className="flex items-center gap-2">
                <Sparkles className="text-[var(--good)]" size={18} />
                <h2 className="text-base font-bold">{text(language, 'أكثر المهام التزاماً وإنجازاً', 'Most consistent tasks')}</h2>
              </div>
              <Badge tone="good">{consistency.strongest.length}</Badge>
            </div>
            {consistency.strongest.length ? (
              <div className="grid gap-2.5">
                {consistency.strongest.map(({ task, done, seen, rate, ms }) => (
                  <div key={task.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm">{language === 'ar' ? task.name : task.nameEn}</span>
                      <Badge tone="good"><CheckCircle2 size={12} /> {rate.toFixed(0)}%</Badge>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={rate} good label={text(language, 'استمرارية المهمة', 'Task consistency')} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-[var(--ink-3)]">
                      <span>{done} {text(language, 'إكمال من أصل', 'done of')} {seen} {text(language, 'أيام', 'days')}</span>
                      <span>{formatCompactDuration(ms, language)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-3)] py-4 text-center">
                {text(language, 'ستظهر هنا المهام التي تحقق نسبة إنجاز مرتفعة ومستمرة.', 'Tasks with high consistency will appear here.')}
              </p>
            )}
          </div>

          <div className="panel p-5">
            <div className="section-title">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-[var(--warn)]" size={18} />
                <h2 className="text-base font-bold">{text(language, 'مهام تحتاج لمزيد من التركيز', 'Tasks needing focus')}</h2>
              </div>
              <Badge tone="warn">{consistency.needsAttention.length}</Badge>
            </div>
            {consistency.needsAttention.length ? (
              <div className="grid gap-2.5">
                {consistency.needsAttention.map(({ task, done, seen, rate, attempted, pauses }) => (
                  <div key={task.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm">{language === 'ar' ? task.name : task.nameEn}</span>
                      <Badge tone="warn">{rate.toFixed(0)}%</Badge>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={rate} label={text(language, 'نسبة الإنجاز', 'Completion rate')} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-[var(--ink-3)]">
                      <span>{done} / {seen} {text(language, 'منجز', 'done')}</span>
                      {attempted > 0 ? <span className="text-[var(--warn)]">{attempted} {text(language, 'محاولات غير مكتملة', 'attempts')}</span> : null}
                      {pauses > 0 ? <span>{pauses} {text(language, 'توقف مؤقت', 'pauses')}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-3)] py-4 text-center">
                {text(language, 'لا توجد مهام متعثرة حالياً؛ أداؤك متوازن في جميع المهام.', 'No struggling tasks currently; your execution is well-balanced.')}
              </p>
            )}
          </div>
        </section>

        {/* Work Time Area Chart & Daily Breakdown */}
        <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <div className="panel p-5">
            <div className="section-title">
              <h2 className="text-lg font-bold">{text(language, 'اتجاه وقت العمل اليومي', 'Work-time trend')}</h2>
              <Clock3 size={18} className="text-[var(--accent)]" />
            </div>
            {hasData ? (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 10 }} width={30} axisLine={false} tickLine={false} tickCount={4} />
                    <Tooltip content={<CustomChartTooltip valueSuffix={` ${text(language, 'دقيقة', 'min')}`} />} />
                    <Area type="monotone" dataKey="workMinutes" name={text(language, 'دقائق العمل', 'Work minutes')} stroke="var(--accent)" fill="var(--accent-bg)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={<Clock3 size={30} />}
                title={text(language, 'لا يوجد وقت عمل', 'No work time')}
                body={text(language, 'سيظهر اتجاه الوقت بعد تشغيل مؤقتات المهام.', 'Work-time trends appear after task timers run.')}
              />
            )}
          </div>

          <div className="panel p-5">
            <div className="section-title">
              <h2 className="text-lg font-bold">{text(language, 'تفصيل الأيام', 'Daily breakdown')}</h2>
              <CalendarCheck size={18} className="text-[var(--accent)]" />
            </div>
            <div className="list-panel">
              {hasData ? chartData.slice().reverse().map((item) => (
                <div key={item.day} className="list-row">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-bold text-sm">{item.label}</div>
                    <Badge tone={item.successful ? 'good' : item.total ? 'warn' : 'neutral'}>
                      {item.total ? `${item.done} / ${item.total}` : text(language, 'لا نشاط', 'No activity')}
                    </Badge>
                  </div>
                  <ProgressBar value={item.completion} good={item.successful} label={text(language, 'نسبة اليوم', 'Day completion')} />
                  <div className="mt-1.5 text-xs font-medium text-[var(--ink-3)]">{formatCompactDuration(item.workMinutes * 60000, language)}</div>
                </div>
              )) : (
                <EmptyState
                  icon={<CalendarCheck size={28} />}
                  title={text(language, 'لا يوجد تاريخ بعد', 'No history yet')}
                  body={text(language, 'الأيام المسجلة ستظهر هنا بتفصيل مختصر.', 'Recorded days will appear here in a compact breakdown.')}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

