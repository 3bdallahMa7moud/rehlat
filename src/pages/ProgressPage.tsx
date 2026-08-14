import { Area, AreaChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, CalendarCheck, Clock3 } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Badge, EmptyState, KpiBand, PageHeader, ProgressBar } from '../components/ui'
import { formatCompactDuration, formatDay } from '../utils/date'
import { progressSeries } from '../utils/stats'
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

  return (
    <>
      <PageHeader
        eyebrow={text(language, 'آخر 14 يوماً', 'Last 14 days')}
        title={text(language, 'التقدم', 'Progress')}
        description={text(language, 'متابعة تاريخية مختصرة للنسبة ووقت العمل بدون تحويل الصفحة إلى قائمة طويلة.', 'A concise historical view of completion and work time without turning the page into a long list.')}
      />

      <div className="grid gap-5">
        <section className="panel p-5">
          <div className="section-title">
            <div>
              <h2 className="text-xl font-black">{text(language, 'اتجاه الإنجاز', 'Completion trend')}</h2>
              <p className="text-sm text-[var(--ink-2)]">{text(language, 'الخط المتقطع يوضح هدف 90%.', 'The dashed line marks the 90% target.')}</p>
            </div>
            <Badge tone="gold">{state.settings.dailyTarget}%</Badge>
          </div>
          <KpiBand
            className="mb-5"
            items={[
              { label: text(language, 'متوسط الإنجاز', 'Average completion'), value: <span className="num">{average.toFixed(0)}%</span>, tone: 'gold' },
              { label: text(language, 'أيام ناجحة', 'Successful days'), value: <span className="num">{successfulDays}</span>, unit: unitLabel(language, successfulDays, 'يوم', 'أيام', 'day'), tone: successfulDays >= 3 ? 'good' : 'neutral' },
              { label: text(language, 'أفضل يوم', 'Best day'), value: <span className="num">{bestCompletion}%</span> },
              { label: text(language, 'إجمالي العمل', 'Total work'), value: <span className="num">{formatCompactDuration(totalWorkMs, language)}</span> },
            ]}
          />
          {hasData ? (
            <div className="chart-box tall">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--ink-3)', fontSize: 10 }} width={28} axisLine={false} tickLine={false} tickCount={5} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)' }} />
                  <ReferenceLine y={state.settings.dailyTarget} stroke="var(--good)" strokeDasharray="4 5" />
                  <Line type="monotone" dataKey="completion" name={text(language, 'الإنجاز', 'Completion')} stroke="var(--accent)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
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

        <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <div className="panel p-5">
            <div className="section-title">
              <h2 className="text-xl font-black">{text(language, 'اتجاه وقت العمل', 'Work-time trend')}</h2>
              <Clock3 size={20} className="text-[var(--accent)]" />
            </div>
            {hasData ? (
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 10 }} width={30} axisLine={false} tickLine={false} tickCount={4} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)' }} />
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
              <h2 className="text-xl font-black">{text(language, 'تفصيل الأيام', 'Daily breakdown')}</h2>
              <CalendarCheck size={20} className="text-[var(--accent)]" />
            </div>
            <div className="list-panel">
              {hasData ? chartData.slice().reverse().map((item) => (
                <div key={item.day} className="list-row">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-black">{item.label}</div>
                    <Badge tone={item.successful ? 'good' : item.total ? 'warn' : 'neutral'}>{item.total ? `${item.done} / ${item.total}` : text(language, 'لا نشاط', 'No activity')}</Badge>
                  </div>
                  <ProgressBar value={item.completion} good={item.successful} label={text(language, 'نسبة اليوم', 'Day completion')} />
                  <div className="mt-2 text-xs font-bold text-[var(--ink-3)]">{formatCompactDuration(item.workMinutes * 60000, language)}</div>
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
