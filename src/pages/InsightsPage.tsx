import { AlertTriangle, CheckCircle2, Lightbulb, SearchCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useApp } from '../app/useApp'
import { Badge, EmptyState, Metric, PageHeader } from '../components/ui'
import { analyseParticipant, monthStats } from '../utils/stats'
import { formatCompactDuration, todayKey } from '../utils/date'
import { text } from '../utils/text'

function InsightList({ title, icon, items, empty }: { title: string; icon: ReactNode; items: string[]; empty: string }) {
  return (
    <div className="panel-soft p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[var(--accent)]">{icon}</span>
        <h3 className="font-black">{title}</h3>
      </div>
      {items.length ? (
        <ul className="grid gap-2 text-sm text-[var(--ink-2)]">
          {items.map((item) => <li key={item} className="rounded-md bg-[var(--surface)] p-3">{item}</li>)}
        </ul>
      ) : (
        <p className="rounded-md bg-[var(--surface)] p-3 text-sm text-[var(--ink-3)]">{empty}</p>
      )}
    </div>
  )
}

export function InsightsPage() {
  const { state, currentParticipant, now } = useApp()
  if (!currentParticipant) return null
  const language = state.language
  const insight = analyseParticipant(state, currentParticipant.id, now, language)
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
        eyebrow={text(language, 'تحليل محسوب من السجل', 'Computed from recorded history')}
        title={text(language, 'التحليل', 'Insights')}
        description={text(language, 'رؤية سريعة لنقاط القوة وما يحتاج انتباهاً، بدون نصوص طويلة أو أرقام مخمّنة.', 'A quick view of strengths and what needs attention, without long text or guessed numbers.')}
      />

      {!insight ? (
        <EmptyState
          icon={<SearchCheck size={32} />}
          title={text(language, 'لا توجد بيانات كافية للتحليل', 'Not enough data for insights')}
          body={text(language, 'ابدأ يومك وسجّل بعض المهام والمحاولات حتى يظهر تحليل مفيد.', 'Start your day and record tasks or attempts to unlock meaningful analysis.')}
        />
      ) : (
        <div className="grid gap-5">
          <section className="hero-panel p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <Badge tone="gold">{text(language, 'الخلاصة الرئيسية', 'Main insight')}</Badge>
                <h2 className="mt-4 max-w-3xl text-2xl font-black leading-snug md:text-3xl">{insight.headline}</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 lg:w-96">
                <Metric label={text(language, 'قوة', 'Strengths')} value={insight.strengths.length} tone="good" />
                <Metric label={text(language, 'تنبيه', 'Needs attention')} value={insight.weaknesses.length} tone="warn" />
                <Metric label={text(language, 'توصية', 'Advice')} value={insight.advice.length} tone="gold" />
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <InsightList
              title={text(language, 'نقاط القوة', 'Strengths')}
              icon={<CheckCircle2 size={20} />}
              items={insight.strengths}
              empty={text(language, 'لم تظهر نقاط قوة واضحة بعد.', 'No clear strengths yet.')}
            />
            <InsightList
              title={text(language, 'ما يحتاج انتباهك', 'Needs attention')}
              icon={<AlertTriangle size={20} />}
              items={insight.weaknesses}
              empty={text(language, 'لا توجد مشكلة واضحة في البيانات الحالية.', 'No clear issue in the current data.')}
            />
            <InsightList
              title={text(language, 'توصيات عملية', 'Recommendations')}
              icon={<Lightbulb size={20} />}
              items={insight.advice}
              empty={text(language, 'استمر على نفس الإيقاع.', 'Keep the same rhythm.')}
            />
          </section>

          {currentParticipant.role === 'admin' ? (
            <section className="panel p-5">
              <div className="section-title">
                <div>
                  <h2 className="text-xl font-black">{text(language, 'تحليل المجموعة', 'Group analysis')}</h2>
                  <p className="text-sm text-[var(--ink-2)]">{text(language, 'ملخص إداري سريع لأبرز مؤشرات المشاركين.', 'A quick admin summary of participant signals.')}</p>
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
                      <th>{text(language, 'أول ملاحظة', 'First observation')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.map((row) => (
                      <tr key={row.participant.id}>
                        <td data-label={text(language, 'المشارك', 'Participant')} className="font-black">{language === 'ar' ? row.participant.name : row.participant.nameEn}</td>
                        <td data-label={text(language, 'أيام ناجحة', 'Success days')} className="num">{row.stats.successDays}</td>
                        <td data-label={text(language, 'نسبة الشهر', 'Month rate')} className="num">{row.stats.rate.toFixed(0)}%</td>
                        <td data-label={text(language, 'وقت العمل', 'Work time')} className="num">{formatCompactDuration(row.stats.ms, language)}</td>
                        <td data-label={text(language, 'أول ملاحظة', 'First observation')} className="max-w-md text-[var(--ink-2)]">{row.insight?.weaknesses[0] ?? row.insight?.strengths[0] ?? text(language, 'لا توجد بيانات', 'No data')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <p className="text-sm font-bold text-[var(--ink-3)]">
            {text(language, `تم الحساب من بيانات مسجلة حتى ${todayKey()}.`, `Computed from recorded data through ${todayKey()}.`)}
          </p>
        </div>
      )}
    </>
  )
}
