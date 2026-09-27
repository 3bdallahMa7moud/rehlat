'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Clock3, FileSpreadsheet, FileText, Flame, ListTodo, Printer, Target, Trophy } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar, SectionHeader, Tabs } from '@/components/ui';
import { formatMinutes } from '@/lib/format';
import { createReportExportModel } from '@/lib/report-export';
import { DEFAULT_SUCCESS_THRESHOLD } from '@/lib/progress';
import { useDemo } from '@/state/DemoContext';
import type { ReportPeriod } from '@/lib/report-query';

const periodLabels: Record<ReportPeriod, string> = {
  daily: 'اليوم',
  weekly: 'آخر 7 أيام',
  monthly: 'الشهر الحالي',
};

const nearCompletionThreshold = 70;

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function reportTone(value: number): 'success' | 'warning' | 'teal' {
  return value >= 100 ? 'success' : value >= nearCompletionThreshold ? 'warning' : 'teal';
}

function statusText(value: number) {
  if (value >= 100) return 'مكتمل';
  if (value >= nearCompletionThreshold) return 'شبه مكتمل';
  return 'إنجاز جزئي';
}

function subscribeToGeneratedAt() {
  return () => undefined;
}

function getGeneratedAt() {
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
}

function getServerGeneratedAt() {
  return '';
}

export function RealReportsView() {
  const { participants, tasks, getReport, pushToast } = useDemo();
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [participantId, setParticipantId] = useState('all');
  const [taskId, setTaskId] = useState('all');
  const generatedAt = useSyncExternalStore(subscribeToGeneratedAt, getGeneratedAt, getServerGeneratedAt);
  const people = participants.filter((participant) => participant.role === 'participant');
  const selectedParticipantId = people.some((participant) => participant.id === participantId) ? participantId : 'all';
  const selectedTaskId = tasks.some((task) => task.id === taskId) ? taskId : 'all';
  const filters = { period, participantId: selectedParticipantId, taskId: selectedTaskId } as const;
  const report = getReport(filters);
  const selectedParticipant = people.find((participant) => participant.id === selectedParticipantId);
  const reportTitle = selectedParticipant ? `تقرير ${selectedParticipant.name}` : 'تقرير رحلة التغيير';
  const recordedPoints = report.points.filter((point) => point.hasData);
  const bestPoint = recordedPoints.reduce<typeof recordedPoints[number] | null>((best, point) => !best || point.progress > best.progress ? point : best, null);
  const attentionPoint = recordedPoints.filter((point) => point.progress < DEFAULT_SUCCESS_THRESHOLD).reduce<typeof recordedPoints[number] | null>((lowest, point) => !lowest || point.progress < lowest.progress ? point : lowest, null);
  const bestStreak = recordedPoints.reduce((state, point) => {
    if (point.progress < DEFAULT_SUCCESS_THRESHOLD) return { current: 0, best: state.best };
    const current = state.current + 1;
    return { current, best: Math.max(state.best, current) };
  }, { current: 0, best: 0 }).best;

  const exportCurrent = async (format: 'pdf' | 'excel') => {
    if (!report.hasData) return;
    if (format === 'excel') {
      const { exportXlsxReport } = await import('@/lib/xlsx-export');
      await exportXlsxReport(createReportExportModel(report), `journey-${period}-${selectedParticipantId}-${selectedTaskId}`);
      pushToast({ tone: 'success', title: 'تم تصدير تقرير Excel', body: 'يتضمن الملف الملخص والأيام والمهام ضمن النطاق المحدد.' });
      return;
    }
    window.print();
    pushToast({ tone: 'info', title: 'حفظ PDF', body: 'اختر «حفظ كملف PDF» من نافذة الطباعة.' });
  };

  return <div dir='rtl' className='reports-page'>
    <PageHeader
      eyebrow='ملخص الفترة'
      title='التقارير'
      description='ملخص منظم للفترة المختارة، مبني على نشاطك المحفوظ وقابل للمراجعة والطباعة.'
      actions={<div className='reports-header-actions'>
        <Link href='/tasks' className='button button-primary button-md'><ListTodo size={17} aria-hidden='true' />مهام اليوم</Link>
        <Button size='sm' variant='outline' disabled={!report.hasData} onClick={() => exportCurrent('pdf')}><Printer size={16} aria-hidden='true' />حفظ PDF</Button>
        <Button size='sm' variant='outline' disabled={!report.hasData} onClick={() => exportCurrent('excel')}><FileSpreadsheet size={16} aria-hidden='true' />تصدير Excel</Button>
      </div>}
    />

    <section className='reports-controls' aria-labelledby='reports-controls-title'>
      <div className='reports-period-heading'>
        <div><span className='eyebrow'>نطاق العرض</span><h2 id='reports-controls-title'>اختيار الفترة والفلاتر</h2><p>يتحدث الملخص وكل الأقسام عند تغيير أي خيار.</p></div>
        <Tabs value={period} onValueChange={setPeriod} tabs={[{ value: 'daily', label: 'اليوم' }, { value: 'weekly', label: 'آخر 7 أيام' }, { value: 'monthly', label: 'الشهر الحالي' }]} />
      </div>
      <div className='reports-filters'>
        <label className='field'><span className='field-label'>المشارك</span><select className='input' value={selectedParticipantId} onChange={(event) => setParticipantId(event.target.value)}><option value='all'>كل المشاركين</option>{people.map((participant) => <option key={participant.id} value={participant.id}>{participant.name}</option>)}</select></label>
        <label className='field'><span className='field-label'>المهمة</span><select className='input' value={selectedTaskId} onChange={(event) => setTaskId(event.target.value)}><option value='all'>كل المهام</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
      </div>
    </section>

    <main className='reports-document' aria-labelledby='reports-document-title'>
      <header className='reports-document-header'>
        <div><Badge tone='primary'><FileText size={14} aria-hidden='true' />تقرير الفترة</Badge><h2 id='reports-document-title'>{reportTitle}</h2><p>{periodLabels[period]} · {report.hasData ? 'بيانات محفوظة فعليًا' : 'بانتظار نشاط محفوظ'}</p></div>
        <dl className='reports-meta'>
          <div><dt><CalendarDays size={15} aria-hidden='true' />الفترة المغطاة</dt><dd><time dateTime={report.dateRange.start}>{formatDate(report.dateRange.start)}</time><span aria-hidden='true'>—</span><time dateTime={report.dateRange.end}>{formatDate(report.dateRange.end)}</time></dd></div>
          <div><dt><Clock3 size={15} aria-hidden='true' />تاريخ إنشاء التقرير</dt><dd>{generatedAt || '—'}</dd></div>
        </dl>
      </header>

      {!report.hasData ? <Card className='reports-empty-card'>
        <EmptyState title='يحتاج هذا التقرير إلى نشاط محفوظ' description='ابدأ مهمة وسجّل تقدمك، ثم عد إلى التقارير لمراجعة الفترة المختارة.' action={<Link href='/tasks' className='button button-primary button-md'><ListTodo size={17} aria-hidden='true' />العودة إلى مهام اليوم</Link>} />
      </Card> : <>
        <section className='reports-section' aria-labelledby='reports-summary-title'>
          <div className='reports-section-heading'><div><span className='eyebrow'>الأرقام الأساسية</span><h2 id='reports-summary-title'>ملخص الأداء</h2></div><span>{report.recordedDays} {report.recordedDays === 1 ? 'يوم نشط' : 'أيام نشطة'}</span></div>
          <div className='reports-summary-grid'>
            <Card className='reports-summary-card'><span className='reports-summary-icon reports-summary-primary'><Target size={19} aria-hidden='true' /></span><div><span>متوسط التقدم</span><strong>{report.completionRate}%</strong><ProgressBar value={report.completionRate} tone={reportTone(report.completionRate)} /></div></Card>
            <Card className='reports-summary-card'><span className='reports-summary-icon reports-summary-teal'><Clock3 size={19} aria-hidden='true' /></span><div><span>إجمالي الوقت</span><strong>{formatMinutes(report.totalMinutes)}</strong><small>وقت فعلي مسجل</small></div></Card>
            <Card className='reports-summary-card'><span className='reports-summary-icon reports-summary-success'><CheckCircle2 size={19} aria-hidden='true' /></span><div><span>الأيام النشطة</span><strong>{report.recordedDays}</strong><small>يوم له نشاط محفوظ</small></div></Card>
            <Card className='reports-summary-card'><span className='reports-summary-icon reports-summary-warning'><Flame size={19} aria-hidden='true' /></span><div><span>الأيام المكتملة</span><strong>{report.successfulDays}</strong><small>بلغت حد الإنجاز</small></div></Card>
            <Card className='reports-summary-card'><span className='reports-summary-icon reports-summary-primary'><Trophy size={19} aria-hidden='true' /></span><div><span>أفضل استمرارية</span><strong>{bestStreak} {bestStreak === 1 ? 'وحدة' : 'وحدات'}</strong><small>متتالية في الفترة</small></div></Card>
          </div>
        </section>

        <div className='reports-content-grid'>
          <Card className='reports-task-card'>
            <SectionHeader title='ملخص المهام والحالات' description='الحالات والوقت محسوبة من السجلات المطابقة للفلاتر.' />
            {report.taskRows.length ? <div className='reports-task-list'>{report.taskRows.map((row) => <article className='reports-task-row' key={row.taskId}>
              <div className='reports-task-title'><strong>{row.title}</strong><span>{statusText(row.completionRate)} · {formatMinutes(row.actualMinutes)}</span></div>
              <div className='reports-task-progress'><div><ProgressBar value={row.completionRate} tone={reportTone(row.completionRate)} /><b>{row.completionRate}%</b></div><dl><div><dt>مكتملة</dt><dd>{row.completed}</dd></div><div><dt>جزئية</dt><dd>{row.partial}</dd></div><div><dt>غير مكتملة</dt><dd>{row.notCompleted + row.closed}</dd></div></dl></div>
              <Badge tone={row.completionRate >= 100 ? 'success' : row.completionRate >= nearCompletionThreshold ? 'warning' : 'neutral'}>{statusText(row.completionRate)}</Badge>
            </article>)}</div> : <EmptyState title='لا توجد سجلات للمهام' description='جرّب تغيير الفترة أو الفلاتر.' />}
          </Card>

          <Card className='reports-highlights-card'>
            <SectionHeader title='أبرز النتائج' description='إشارات قابلة للاحتساب من الفترة الحالية.' />
            <dl className='reports-highlights-list'>
              <div><dt><Trophy size={17} aria-hidden='true' />أفضل نتيجة</dt><dd>{bestPoint ? `${bestPoint.label} · ${bestPoint.progress}%` : 'لا توجد نتيجة مسجلة'}</dd></div>
              <div><dt><AlertTriangle size={17} aria-hidden='true' />نقطة تحتاج إلى انتباه</dt><dd>{attentionPoint ? `${attentionPoint.label} · ${attentionPoint.progress}%` : 'لا توجد نقطة منخفضة مسجلة'}</dd></div>
              <div><dt><Clock3 size={17} aria-hidden='true' />متوسط اليوم المسجل</dt><dd>{formatMinutes(report.averageDailyMinutes)}</dd></div>
              {report.mostTimeConsumingTask && <div><dt><Target size={17} aria-hidden='true' />أكثر مهمة استهلاكًا للوقت</dt><dd>{report.mostTimeConsumingTask}</dd></div>}
            </dl>
          </Card>
        </div>

        <Card className='reports-period-card'>
          <SectionHeader title='النشاط المسجل في الفترة' description={`${recordedPoints.length} ${recordedPoints.length === 1 ? 'وحدة مسجلة' : 'وحدات مسجلة'} من ${periodLabels[period]}.`} />
          <div className='reports-point-list'>{recordedPoints.map((point) => <article className='reports-point-row' key={point.date ?? point.label}>
            <div className='reports-point-label'><strong>{point.label}</strong>{point.date && <time dateTime={point.date}>{formatDate(point.date)}</time>}</div>
            <div className='reports-point-progress'><div><ProgressBar value={point.progress} tone={reportTone(point.progress)} /><b>{point.progress}%</b></div><span>{formatMinutes(point.minutes)}</span></div>
            <Badge tone={point.progress >= 100 ? 'success' : point.progress >= nearCompletionThreshold ? 'warning' : 'neutral'}>{statusText(point.progress)}</Badge>
          </article>)}</div>
        </Card>

        <div className='reports-footer-actions'><Link href='/tasks' className='button button-primary button-md'><ListTodo size={17} aria-hidden='true' />العودة إلى مهام اليوم</Link><span><ArrowLeft size={16} aria-hidden='true' />يمكنك طباعة هذه الصفحة أو تصديرها بعد مراجعة الفترة.</span></div>
      </>}
    </main>
  </div>;
}
