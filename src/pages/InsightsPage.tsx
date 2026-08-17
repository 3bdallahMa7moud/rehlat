import { AlertTriangle, CheckCircle2, Compass, Lightbulb, SearchCheck, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useApp } from '../app/useApp'
import { Badge, EmptyState, PageHeader } from '../components/ui'
import { analyseParticipant, monthStats } from '../utils/stats'
import { formatCompactDuration, todayKey } from '../utils/date'
import { text } from '../utils/text'

function InsightList({
  title,
  icon,
  items,
  empty,
  tone = 'neutral',
}: {
  title: string
  icon: ReactNode
  items: string[]
  empty: string
  tone?: 'good' | 'warn' | 'neutral'
}) {
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={tone === 'good' ? 'text-[var(--good)]' : tone === 'warn' ? 'text-[var(--warn)]' : 'text-[var(--accent)]'}>
            {icon}
          </span>
          <h3 className="font-bold text-base">{title}</h3>
        </div>
        <Badge tone={tone}>{items.length}</Badge>
      </div>
      {items.length ? (
        <ul className="list-panel text-sm text-[var(--ink-2)]">
          {items.map((item) => (
            <li key={item} className="list-row flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ink-3)]" />
              <span className="min-w-0 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md bg-[var(--surface-2)] p-3 text-xs text-[var(--ink-3)]">{empty}</p>
      )}
    </div>
  )
}

export function InsightsPage() {
  const { state, currentParticipant, now } = useApp()
  if (!currentParticipant) return null
  const language = state.language
  const insight = analyseParticipant(state, currentParticipant.id, now, language)
  const mainAdvice = insight?.advice[0] ?? null
  const allAdvice = insight?.advice ?? []
  const groupRows = state.participants
    .filter((participant) => participant.active)
    .map((participant) => ({
      participant,
      insight: analyseParticipant(state, participant.id, now, language),
      stats: monthStats(state, participant.id, state.reportMonth, now),
    }))

  return (
    <>
      <PageHeader
        eyebrow={text(language, 'لماذا حدث؟ وما الخطوة التالية؟', 'Why did it happen? What should you do?')}
        title={text(language, 'التحليل والتوصيات', 'Insights & Actions')}
        description={text(
          language,
          'تشخيص عملي لأسباب الأداء وتقديم توصيات ملموسة مبنية على سجل المهام والتوقفات.',
          'Practical diagnosis of performance drivers and actionable recommendations based on recorded task behavior.',
        )}
      />

      {!insight ? (
        <EmptyState
          icon={<SearchCheck size={32} />}
          title={text(language, 'لا توجد بيانات كافية للتحليل', 'Not enough data for insights')}
          body={text(language, 'ابدأ يومك وسجّل بعض المهام والمحاولات حتى يظهر تحليل مفيد.', 'Start your day and record tasks or attempts to unlock meaningful analysis.')}
        />
      ) : (
        <div className="grid gap-5">
          {/* Main Headline & Hero Action */}
          <section className="hero-panel p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.5fr)] lg:items-stretch">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="text-[var(--accent)]" size={16} />
                  <Badge tone="gold">{text(language, 'التشخيص الرئيسي', 'Core diagnosis')}</Badge>
                </div>
                <h2 className="mt-3 max-w-3xl text-xl font-bold leading-snug md:text-2xl">{insight.headline}</h2>
              </div>
              <div className="panel-soft flex flex-col justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-bg)]/25 p-4">
                <div className="mb-2 flex items-center gap-2 text-[var(--accent)]">
                  <Lightbulb size={18} />
                  <h3 className="font-bold text-sm">{text(language, 'أهم خطوة مقترحة', 'Primary recommendation')}</h3>
                </div>
                <p className="text-xs font-semibold leading-relaxed text-[var(--ink)]">{mainAdvice}</p>
              </div>
            </div>
          </section>

          {/* Strengths and Weaknesses */}
          <section className="grid gap-5 lg:grid-cols-2">
            <InsightList
              title={text(language, 'نقاط القوة وعوامل النجاح', 'Strengths & Success Factors')}
              icon={<CheckCircle2 size={18} />}
              items={insight.strengths}
              empty={text(language, 'لم تظهر نقاط قوة كافية بعد.', 'No clear strengths yet.')}
              tone="good"
            />
            <InsightList
              title={text(language, 'عقبات تحتاج معالجة', 'Bottlenecks & Frictions')}
              icon={<AlertTriangle size={18} />}
              items={insight.weaknesses}
              empty={text(language, 'لا توجد عقبات أو مشاكل واضحة في البيانات الحالية.', 'No clear bottlenecks in the current data.')}
              tone="warn"
            />
          </section>

          {/* Actionable Recommendations Checklist */}
          {allAdvice.length ? (
            <section className="panel p-5">
              <div className="section-title">
                <div className="flex items-center gap-2">
                  <Compass className="text-[var(--accent)]" size={20} />
                  <h2 className="text-base font-bold">{text(language, 'خطة العمل والتوصيات التطبيقية', 'Actionable Recommendations')}</h2>
                </div>
                <Badge tone="gold">{allAdvice.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allAdvice.map((rec, index) => (
                  <div key={rec} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/40 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-bold text-xs text-[var(--accent)]">#{index + 1}</span>
                      <Lightbulb size={14} className="text-[var(--accent)]" />
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-[var(--ink)]">{rec}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Admin Group Analysis Table */}
          {currentParticipant.role === 'admin' ? (
            <section className="panel p-5">
              <div className="section-title">
                <div>
                  <h2 className="text-lg font-bold">{text(language, 'تحليل مؤشرات المجموعة', 'Group diagnostic indicators')}</h2>
                  <p className="text-xs text-[var(--ink-2)]">{text(language, 'نظرة إشرافية سريعة على نقاط قوة وتعثر جميع المشاركين النشطين.', 'An admin overview of strengths and frictions across all active participants.')}</p>
                </div>
                <Badge tone="gold">{text(language, 'مشرف', 'Admin')}</Badge>
              </div>
              <div className="table-shell">
                <table className="data-table responsive-table">
                  <thead>
                    <tr>
                      <th>{text(language, 'المشارك', 'Participant')}</th>
                      <th>{text(language, 'أيام ناجحة', 'Success days')}</th>
                      <th>{text(language, 'نسبة الشهر', 'Month rate')}</th>
                      <th>{text(language, 'وقت العمل', 'Work time')}</th>
                      <th>{text(language, 'أهم ملاحظة تشخيصية', 'Key observation')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((row) => (
                      <tr key={row.participant.id}>
                        <td data-label={text(language, 'المشارك', 'Participant')} className="font-bold">{language === 'ar' ? row.participant.name : row.participant.nameEn}</td>
                        <td data-label={text(language, 'أيام ناجحة', 'Success days')} className="num">{row.stats.successDays}</td>
                        <td data-label={text(language, 'نسبة الشهر', 'Month rate')} className="num">{row.stats.rate.toFixed(0)}%</td>
                        <td data-label={text(language, 'وقت العمل', 'Work time')} className="num">{formatCompactDuration(row.stats.ms, language)}</td>
                        <td data-label={text(language, 'أهم ملاحظة تشخيصية', 'Key observation')} className="max-w-md text-xs text-[var(--ink-2)]">{row.insight?.weaknesses[0] ?? row.insight?.strengths[0] ?? text(language, 'لا توجد بيانات', 'No data')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <p className="text-xs font-medium text-[var(--ink-3)]">
            {text(language, `تم الحساب من بيانات مسجلة حتى ${todayKey()}.`, `Computed from recorded data through ${todayKey()}.`)}
          </p>
        </div>
      )}
    </>
  )
}

