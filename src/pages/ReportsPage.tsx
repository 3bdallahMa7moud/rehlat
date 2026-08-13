import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, FileText, Printer } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Badge, Button, EmptyState, Metric, PageHeader, ProgressBar, SelectField } from '../components/ui'
import { availableReportMonths, monthStats } from '../utils/stats'
import { formatCompactDuration, formatMonth, weekRange } from '../utils/date'
import { text } from '../utils/text'

export function ReportsPage() {
  const { state, currentParticipant, now, setReportMonth, exportMock } = useApp()
  const [openWritten, setOpenWritten] = useState(false)
  if (!currentParticipant) return null
  const language = state.language
  const months = availableReportMonths(state)
  const month = state.reportMonth
  const people = state.participants.filter((participant) => participant.active)
  const rows = people
    .map((participant) => ({ participant, stats: monthStats(state, participant.id, month, now) }))
    .sort((a, b) => b.stats.goodWeeks - a.stats.goodWeeks || b.stats.successDays - a.stats.successDays || b.stats.rate - a.stats.rate)
  const hasData = rows.some((row) => row.stats.activeDays > 0)
  const totalSuccessDays = rows.reduce((sum, row) => sum + row.stats.successDays, 0)
  const totalWork = rows.reduce((sum, row) => sum + row.stats.ms, 0)
  const achievers = rows.filter((row) => row.stats.goodWeeks >= state.settings.monthlyRequiredWeeks).length
  const average = rows.length ? rows.reduce((sum, row) => sum + row.stats.rate, 0) / rows.length : 0
  const chartData = rows.map((row) => ({
    name: language === 'ar' ? row.participant.name : row.participant.nameEn,
    completion: Math.round(row.stats.rate),
    successDays: row.stats.successDays,
    workHours: Math.round(row.stats.ms / 360000) / 10,
  }))
  const weeks = rows[0]?.stats.weeks ?? []

  const writtenLines = rows.map((row) => {
    if (!row.stats.activeDays) {
      return text(language, `${row.participant.name}: لا توجد أيام مسجلة في هذا الشهر.`, `${row.participant.nameEn}: no recorded days this month.`)
    }
    return text(
      language,
      `${row.participant.name}: ${row.stats.successDays} أيام ناجحة من ${row.stats.activeDays} أيام، بنسبة ${row.stats.rate.toFixed(0)}% ووقت عمل ${formatCompactDuration(row.stats.ms, language)}.`,
      `${row.participant.nameEn}: ${row.stats.successDays} successful days out of ${row.stats.activeDays}, ${row.stats.rate.toFixed(0)}% completion and ${formatCompactDuration(row.stats.ms, language)} work time.`,
    )
  })

  return (
    <>
      <PageHeader
        eyebrow={text(language, 'تقارير شهرية ديناميكية', 'Dynamic monthly reports')}
        title={text(language, `تقرير ${formatMonth(month, language)}`, `${formatMonth(month, language)} Report`)}
        description={text(language, 'اختر شهراً من بيانات العرض لتغيير كل المؤشرات والجداول والرسوم.', 'Choose a mock-data month to update every KPI, table, and chart.')}
        actions={(
          <>
            <SelectField label={text(language, 'الشهر', 'Month')} value={month} onChange={setReportMonth}>
              {months.map((item) => <option key={item} value={item}>{formatMonth(item, language)}</option>)}
            </SelectField>
            <Button size="sm" onClick={() => exportMock('excel')}>
              <Download size={16} />
              {text(language, 'تصدير إكسل', 'Excel export')}
            </Button>
            <Button size="sm" onClick={() => exportMock('pdf')}>
              <Printer size={16} />
              {text(language, 'تصدير PDF', 'PDF export')}
            </Button>
          </>
        )}
      />

      {!hasData ? (
        <EmptyState
          icon={<FileText size={32} />}
          title={text(language, 'لا توجد بيانات لهذا الشهر', 'No data for this month')}
          body={text(language, 'اختر شهراً آخر أو ابدأ تسجيل الأيام حتى يظهر تقرير شهري كامل.', 'Choose another month or start recording days to generate a full monthly report.')}
        />
      ) : (
        <div className="grid gap-5">
          <section className="hero-panel p-5 md:p-6">
            <div className="grid gap-5 md:grid-cols-5">
              <Metric label={text(language, 'المشاركون', 'Participants')} value={<span className="num">{people.length}</span>} />
              <Metric label={text(language, 'أيام ناجحة', 'Successful days')} value={<span className="num">{totalSuccessDays}</span>} tone="good" />
              <Metric label={text(language, 'إجمالي الوقت', 'Total work')} value={<span className="num">{formatCompactDuration(totalWork, language)}</span>} tone="gold" />
              <Metric label={text(language, 'حققوا الشهر', 'Monthly achievers')} value={<span className="num">{achievers}</span>} tone={achievers ? 'good' : 'warn'} />
              <Metric label={text(language, 'متوسط الإنجاز', 'Average completion')} value={<span className="num">{average.toFixed(0)}%</span>} />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="panel p-5">
              <div className="section-title">
                <h2 className="text-xl font-black">{text(language, 'أداء المجموعة', 'Group performance')}</h2>
                <Badge>{formatMonth(month, language)}</Badge>
              </div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} interval="preserveStartEnd" minTickGap={8} />
                    <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 11 }} width={34} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)' }} />
                    <Bar dataKey="completion" name={text(language, 'نسبة الإنجاز', 'Completion')} fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel p-5">
              <div className="section-title">
                <h2 className="text-xl font-black">{text(language, 'مقارنة المشاركين', 'Participant comparison')}</h2>
              </div>
              <div className="grid gap-3">
                {rows.map((row) => (
                  <div key={row.participant.id} className="rounded-lg border border-[var(--line)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="font-black">{language === 'ar' ? row.participant.name : row.participant.nameEn}</div>
                      <Badge tone={row.stats.goodWeeks >= state.settings.monthlyRequiredWeeks ? 'good' : 'neutral'}>{row.stats.goodWeeks} / {state.settings.monthlyRequiredWeeks}</Badge>
                    </div>
                    <ProgressBar value={row.stats.rate} good={row.stats.goodWeeks >= state.settings.monthlyRequiredWeeks} />
                    <div className="mt-2 flex justify-between text-xs font-bold text-[var(--ink-3)]">
                      <span>{row.stats.successDays} {text(language, 'أيام ناجحة', 'success days')}</span>
                      <span>{formatCompactDuration(row.stats.ms, language)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel p-5">
            <div className="section-title">
              <h2 className="text-xl font-black">{text(language, 'جدول الأسابيع', 'Weekly progress')}</h2>
              <Badge>{text(language, 'هدف الأسبوع 3 أيام', 'Weekly target 3 days')}</Badge>
            </div>
            <div className="table-shell">
              <table className="data-table responsive-table">
                <thead>
                  <tr>
                    <th>{text(language, 'المشارك', 'Participant')}</th>
                    {weeks.map((week) => <th key={week.week}>{weekRange(week.week, language)}</th>)}
                    <th>{text(language, 'أيام ناجحة', 'Success days')}</th>
                    <th>{text(language, 'وقت العمل', 'Work time')}</th>
                    <th>{text(language, 'النتيجة', 'Result')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.participant.id}>
                      <td data-label={text(language, 'المشارك', 'Participant')} className="font-black">{language === 'ar' ? row.participant.name : row.participant.nameEn}</td>
                      {row.stats.weeks.map((week) => <td key={week.week} data-label={weekRange(week.week, language)} className="num">{week.successfulDays}</td>)}
                      <td data-label={text(language, 'أيام ناجحة', 'Success days')} className="num">{row.stats.successDays}</td>
                      <td data-label={text(language, 'وقت العمل', 'Work time')} className="num">{formatCompactDuration(row.stats.ms, language)}</td>
                      <td data-label={text(language, 'النتيجة', 'Result')}>
                        <Badge tone={row.stats.goodWeeks >= state.settings.monthlyRequiredWeeks ? 'good' : 'bad'}>
                          {row.stats.goodWeeks >= state.settings.monthlyRequiredWeeks ? text(language, 'حقق الشهر', 'Achieved') : text(language, 'لم يحقق', 'Not achieved')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel p-5">
            <div className="section-title">
              <div>
                <h2 className="text-xl font-black">{text(language, 'التقرير المكتوب', 'Written report')}</h2>
                <p className="text-sm text-[var(--ink-2)]">{text(language, 'ثانوي ومختصر، ويمكن فتحه عند الحاجة.', 'Secondary and compact; expand when needed.')}</p>
              </div>
              <Button size="sm" onClick={() => setOpenWritten((value) => !value)}>
                {openWritten ? text(language, 'إخفاء', 'Collapse') : text(language, 'عرض', 'Expand')}
              </Button>
            </div>
            {openWritten ? (
              <div className="prose max-w-none text-[var(--ink-2)]">
                <p className="mb-3 font-bold text-[var(--ink)]">
                  {text(
                    language,
                    `في ${formatMonth(month, language)} سجّلت المجموعة ${totalSuccessDays} أيام ناجحة بإجمالي ${formatCompactDuration(totalWork, language)} من العمل الفعلي.`,
                    `In ${formatMonth(month, language)}, the group recorded ${totalSuccessDays} successful days and ${formatCompactDuration(totalWork, language)} of actual work.`,
                  )}
                </p>
                <ul className="grid gap-2">
                  {writtenLines.map((line) => <li key={line} className="rounded-lg bg-[var(--surface-2)] p-3">{line}</li>)}
                </ul>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </>
  )
}
