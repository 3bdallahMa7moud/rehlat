"use client";

import { useState } from "react";
import { Activity, ArrowDown, ArrowUp, BarChart3, CalendarDays, CheckCircle2, Clock3, FileSpreadsheet, FileText, Lightbulb, Target, Trophy, Users } from "lucide-react";
import { Button, Card, EmptyState, PageHeader, ProgressBar, SectionHeader, Tabs, UserAvatar } from "@/components/ui";
import { createReportExportModel } from "@/lib/report-export";
import { ReportPrintSheet } from "@/components/features/ReportPrintSheet";
import { formatMinutes, formatPercentage } from "@/lib/format";
import { getDailyReflection } from "@/lib/daily-reflection";
import { getProjectDateKey } from "@/lib/date-time";
import { useDemo } from "@/state/DemoContext";
import type { TaskCategory } from "@/types/models";
import { DEFAULT_SUCCESS_THRESHOLD } from "@/lib/progress";
import type { ReportPeriod } from "@/lib/report-query";

const categoryLabels: Record<TaskCategory, string> = { faith: "دين", culture: "ثقافة", sport: "رياضة", growth: "تطوير الذات", skill: "مهارة", life: "حياة", family: "أهل وبيت", health: "صحة", character: "سلوك" };
const categoryColors = ["#253f79", "#2fafa3", "#e9a93b", "#367c92", "#ef8e4b", "#4fa5bc", "#4f8c76", "#8eb9ec", "#6eaeb3"];
const periodLabels: Record<ReportPeriod, string> = { daily: "يومي", weekly: "أسبوعي", monthly: "شهري" };
function safePercent(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }

function LineChart({ points }: { points: Array<{ label: string; progress: number; minutes: number; hasData?: boolean }> }) {
  const usable = points.filter((point) => point.hasData !== false);
  if (!usable.length) return <EmptyState title="لا توجد بيانات زمنية مسجلة بعد" description="ستظهر الاتجاهات هنا عند تسجيل إنجازات المشاركين." />;
  const width = 760; const height = 220; const padX = 26; const padY = 22;
  const x = (index: number) => padX + (index / Math.max(1, points.length - 1)) * (width - padX * 2);
  const y = (value: number) => height - padY - (safePercent(value) / 100) * (height - padY * 2);
  const maxMinutes = Math.max(1, ...usable.map((point) => point.minutes));
  const minutesY = (minutes: number) => height - padY - (minutes / maxMinutes) * (height - padY * 2);
  const pathFor = (valueY: (point: typeof points[number]) => number) => points.reduce((path, point, index) => point.hasData === false ? path : `${path} ${index > 0 && points[index - 1].hasData !== false ? "L" : "M"}${x(index).toFixed(1)} ${valueY(point).toFixed(1)}`, "");
  const progressPath = pathFor((point) => y(point.progress));
  const minutesPath = pathFor((point) => minutesY(point.minutes));
  return <div className="report-line-chart" role="img" aria-label="منحنى الإنجاز والوقت الفعلي مع فجوات للأيام غير المسجلة"><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">{[0, 25, 50, 75, 100].map((tick) => <g key={tick}><line x1={padX} x2={width - padX} y1={y(tick)} y2={y(tick)} className="report-grid-line" /><text x="0" y={y(tick) + 4} className="report-axis-label">{tick}%</text></g>)}<path d={progressPath} className="report-line report-line-progress" /><path d={minutesPath} className="report-line report-line-minutes" />{points.map((point, index) => <g key={`${point.label}-${index}`}>{point.hasData !== false && <><circle cx={x(index)} cy={y(point.progress)} r="4" className="report-point report-point-progress" /><circle cx={x(index)} cy={minutesY(point.minutes)} r="3" className="report-point report-point-minutes" /></>}<text x={x(index)} y={height - 3} textAnchor="middle" className="report-x-label">{point.label}</text></g>)}</svg><div className="report-chart-legend"><span><i className="legend-progress" />الإنجاز اليومي</span><span><i className="legend-minutes" />الوقت الفعلي</span></div></div>;
}

export function RealAdminReportsView() {
  const { getReport, participants, tasks, pushToast } = useDemo();
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const report = getReport({ period, participantId: "all", taskId: "all" });
  const reflection = getDailyReflection(getProjectDateKey());
  const participantRows = report.participantRows.map((row) => ({ ...row, participant: participants.find((participant) => participant.id === row.participantId)! })).sort((a, b) => b.completionRate - a.completionRate || b.successfulDays - a.successfulDays || b.actualMinutes - a.actualMinutes || a.participantId.localeCompare(b.participantId));
  const categoryRows = new Map<TaskCategory, { category: TaskCategory; minutes: number; tasks: number; completion: number }>();
  report.taskRows.forEach((taskRow) => { const task = tasks.find((item) => item.id === taskRow.taskId); if (!task) return; const current = categoryRows.get(task.category) ?? { category: task.category, minutes: 0, tasks: 0, completion: 0 }; current.minutes += taskRow.actualMinutes; current.tasks += 1; current.completion += taskRow.completionRate; categoryRows.set(task.category, current); });
  const taskRows = [...categoryRows.values()].sort((a, b) => b.minutes - a.minutes);
  const kpiCompletion = report.completionRate;
  const totalMinutes = report.totalMinutes;
  const successfulDays = report.successfulDays;
  const recordedPoints = report.points.filter((point) => point.hasData !== false);
  const bestDays = recordedPoints.slice().sort((a, b) => b.progress - a.progress).slice(0, 5);
  const lowestDays = recordedPoints.slice().sort((a, b) => a.progress - b.progress).slice(0, 5);
  const bestDay = bestDays[0];
  const categoryTotal = taskRows.reduce((sum, row) => sum + row.minutes, 0);
  const reportModel = createReportExportModel(report);
  const exportExcel = async () => { if (!report.hasData) return; const { exportXlsxReport } = await import("@/lib/xlsx-export"); await exportXlsxReport(reportModel, `journey-report-${period}`); pushToast({ tone: "success", title: "تم تصدير Excel", body: "يحتوي الملف على الملخص والأيام والمهام والمشاركين للفترة المختارة." }); };
  const exportPdf = () => { if (!report.hasData) return; window.print(); pushToast({ tone: "info", title: "حفظ PDF", body: "اختر «حفظ كملف PDF» من نافذة الطباعة." }); };
  return <div dir="rtl" className="admin-report-page report-dashboard">
    <PageHeader eyebrow="لوحة المشرف" title="التقارير والتحليلات" description="متابعة الأداء والتقدم اليومي والأسبوعي والشهري." actions={<div className="admin-report-actions"><Button size="sm" variant="outline" disabled={!report.hasData} onClick={exportPdf}><FileText size={16} />حفظ PDF</Button><Button size="sm" disabled={!report.hasData} onClick={exportExcel}><FileSpreadsheet size={16} />تصدير Excel</Button></div>} />
    <section className="report-kpi-grid" aria-label="مؤشرات الأداء الرئيسية"><Card className="report-kpi-card"><span className="report-kpi-icon report-kpi-blue"><Target size={20} /></span><div><small>نسبة الإنجاز في الفترة</small><strong>{report.hasData ? formatPercentage(kpiCompletion) : "—"}</strong><p>متوسط الحالات المسجلة في الفترة</p></div></Card><Card className="report-kpi-card"><span className="report-kpi-icon report-kpi-teal"><Clock3 size={20} /></span><div><small>إجمالي الوقت الفعلي</small><strong>{report.hasData ? formatMinutes(totalMinutes) : "—"}</strong><p>خلال {periodLabels[period]}</p></div></Card><Card className="report-kpi-card"><span className="report-kpi-icon report-kpi-green"><CheckCircle2 size={20} /></span><div><small>حالات يوم ناجح</small><strong>{report.hasData ? successfulDays : "—"}</strong><p>حد النجاح {DEFAULT_SUCCESS_THRESHOLD}%</p></div></Card><Card className="report-kpi-card"><span className="report-kpi-icon report-kpi-amber"><CalendarDays size={20} /></span><div><small>حالات يوم مسجلة</small><strong>{report.hasData ? report.recordedDays : "—"}</strong><p>عبر المشاركين في الفترة</p></div></Card><Card className="report-kpi-card report-kpi-wide"><span className="report-kpi-icon report-kpi-teal"><BarChart3 size={20} /></span><div><small>أعلى إنجاز في الفترة</small><strong>{report.topParticipant ?? "—"}</strong><p>حسب إنجاز الأيام، ثم النجاح والوقت</p></div></Card></section>
    <div className="report-toolbar"><Tabs value={period} onValueChange={setPeriod} tabs={[{ value: "daily", label: "يومي" }, { value: "weekly", label: "أسبوعي" }, { value: "monthly", label: "شهري" }]} /><span><CalendarDays size={15} />{report.dateRange.start} — {report.dateRange.end}</span></div>
    <section className="report-main-grid"><Card className="report-chart-card"><SectionHeader title="اتجاه الأداء" description="الإنجاز اليومي والوقت الفعلي خلال الفترة المحددة." /><LineChart points={report.points} /></Card><Card className="report-donut-card"><SectionHeader title="توزيع الوقت حسب المجالات" description="من سجلات الوقت الفعلي." />{categoryTotal ? <div className="report-donut-wrap"><div className="report-donut" style={{ background: `conic-gradient(${taskRows.map((row, index) => `${categoryColors[index % categoryColors.length]} ${taskRows.slice(0, index).reduce((sum, item) => sum + item.minutes, 0) / categoryTotal * 360}deg ${(taskRows.slice(0, index + 1).reduce((sum, item) => sum + item.minutes, 0) / categoryTotal) * 360}deg`).join(", ")})` }}><div><strong>{formatMinutes(categoryTotal)}</strong><span>إجمالي الوقت</span></div></div><div className="report-legend">{taskRows.slice(0, 6).map((row, index) => <span key={row.category}><i style={{ background: categoryColors[index % categoryColors.length] }} />{categoryLabels[row.category]} <b>{Math.round(row.minutes / categoryTotal * 100)}%</b></span>)}</div></div> : <EmptyState title="لا يوجد توزيع زمني بعد" description="ابدأ بتسجيل وقت المهام ليظهر التوزيع هنا." />}</Card></section>
    <section className="report-insight-grid"><Card><SectionHeader title={period === "monthly" ? "أفضل الأسابيع" : "أفضل الأيام"} action={<Trophy size={20} className="report-section-icon report-positive" />} />{bestDays.length ? <div className="report-day-list">{bestDays.map((day) => <div key={day.label}><span>{day.label}</span><ProgressBar value={day.progress} tone="success" /><strong>{day.progress}%</strong></div>)}</div> : <EmptyState title="لا توجد فترات مسجلة" />}</Card><Card><SectionHeader title={period === "monthly" ? "أقل الأسابيع" : "أقل الأيام"} action={<ArrowDown size={20} className="report-section-icon report-negative" />} />{lowestDays.length ? <div className="report-day-list">{lowestDays.map((day) => <div key={day.label}><span>{day.label}</span><ProgressBar value={day.progress} tone="warning" /><strong>{day.progress}%</strong></div>)}</div> : <EmptyState title="لا توجد فترات مسجلة" />}</Card><Card className="report-ranking-card"><SectionHeader title="أعلى إنجاز في الفترة" action={<Users size={20} className="report-section-icon" />} />{participantRows.length ? <div className="report-ranking-list">{participantRows.slice(0, 5).map((row, index) => <article key={row.participantId}><span className={`report-rank report-rank-${index + 1}`}>{index + 1}</span><UserAvatar initials={row.participant.initials} color={row.participant.avatarColor} size="sm" /><div><strong>{row.name}</strong><small>{row.successfulDays} حالات يوم ناجح · {formatMinutes(row.actualMinutes)}</small></div><b>{row.completionRate}%</b></article>)}</div> : <EmptyState title="لا توجد بيانات مشاركين في الفترة" />}</Card></section>
    <section className="report-lower-grid"><Card><SectionHeader title="ملخص التقرير وأبرز النتائج" action={<Lightbulb size={20} className="report-section-icon report-positive" />} /><div className="report-insights">{report.hasData ? <><p><ArrowUp size={16} />متوسط إنجاز المجموعة في الفترة هو {kpiCompletion}% عبر {report.recordedDays} حالات يوم مسجلة.</p>{bestDay && <p><Activity size={16} />أفضل أداء مسجل كان في {bestDay.label} بنسبة {bestDay.progress}%.</p>}<p><Clock3 size={16} />تم توثيق {formatMinutes(totalMinutes)} من الوقت الفعلي خلال الفترة.</p></> : <EmptyState title="لا توجد بيانات مسجلة لهذه الفترة" description="ستظهر النتائج عند تسجيل نشاط فعلي." />}</div></Card><Card><SectionHeader title="أداء المجالات" /><div className="report-domain-list">{taskRows.slice(0, 5).map((row) => <div key={row.category}><span>{categoryLabels[row.category]}</span><ProgressBar value={row.tasks ? row.completion / row.tasks : 0} tone="teal" /><b>{row.tasks ? Math.round(row.completion / row.tasks) : 0}%</b></div>)}{!taskRows.length && <EmptyState title="لا توجد مهام مسجلة في الفترة" />}</div></Card></section>
    <section className="report-history-grid"><Card padding="none" className="report-history-card"><div className="report-card-heading"><div><h2>التقارير السابقة</h2><p>التقارير المحفوظة والجاهزة للرجوع إليها.</p></div><FileText size={21} /></div><EmptyState title="لا توجد تقارير محفوظة بعد" description="سيظهر هنا سجل التقارير عند توفر تاريخ محفوظ." /></Card><Card className="report-motivation-card"><span className="report-motivation-icon"><Lightbulb size={22} /></span><div><small>تذكير اليوم</small><h3>{reflection.title}</h3><p>{reflection.body}</p></div></Card></section>
    <ReportPrintSheet model={reportModel} />
  </div>;
}

