"use client";
import { useState } from "react";
import { CircleCheck, FileSpreadsheet, FileText, Timer } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar, SectionHeader, Tabs } from "@/components/ui";
import { formatMinutes } from "@/lib/format";
import { createReportExportModel } from "@/lib/report-export";
import { useDemo } from "@/state/DemoContext";
import type { ReportPeriod } from "@/lib/report-query";

export function RealReportsView() {
  const { participants, tasks, getReport, pushToast } = useDemo();
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [participantId, setParticipantId] = useState("all");
  const [taskId, setTaskId] = useState("all");
  const people = participants.filter((p) => p.role === "participant");
  const selectedParticipantId = people.some((p) => p.id === participantId) ? participantId : "all";
  const selectedTaskId = tasks.some((t) => t.id === taskId) ? taskId : "all";
  const filters = { period, participantId: selectedParticipantId, taskId: selectedTaskId } as const;
  const report = getReport(filters);
  const exportCurrent = async (format: "pdf" | "excel") => {
    if (!report.hasData) return;
    if (format === "excel") {
      const { exportXlsxReport } = await import("@/lib/xlsx-export");
      await exportXlsxReport(createReportExportModel(report), `journey-${period}-${selectedParticipantId}-${selectedTaskId}`);
      pushToast({ tone: "success", title: "تم تصدير تقرير Excel", body: "يتضمن الملف الملخص والأيام والمهام ضمن النطاق المحدد." });
      return;
    }
    window.print();
    pushToast({ tone: "info", title: "حفظ PDF", body: "اختر «حفظ كملف PDF» من نافذة الطباعة." });
  };
  return <div dir="rtl"><PageHeader eyebrow="تقاريرك" title="التقارير" description="بيانات فعلية من السجلات المحلية، مع فلاتر قابلة لإعادة الحساب." actions={<div className="export-actions"><Button size="sm" variant="outline" disabled={!report.hasData} onClick={() => exportCurrent("pdf")}><FileText size={16} />حفظ PDF</Button><Button size="sm" variant="outline" disabled={!report.hasData} onClick={() => exportCurrent("excel")}><FileSpreadsheet size={16} />تصدير Excel</Button></div>} />
    <div className="report-filters"><label className="field"><span className="field-label">المشارك</span><select className="input" value={participantId} onChange={(e) => setParticipantId(e.target.value)}><option value="all">كل المشاركين</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="field"><span className="field-label">المهمة</span><select className="input" value={taskId} onChange={(e) => setTaskId(e.target.value)}><option value="all">كل المهام</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label></div>
    <Tabs value={period} onValueChange={setPeriod} tabs={[{ value: "daily", label: "يومي" }, { value: "weekly", label: "أسبوعي" }, { value: "monthly", label: "شهري" }]} />
    <Card><SectionHeader title="نطاق التقرير" description={`${report.dateRange.start} — ${report.dateRange.end}`} /><p>{report.hasData ? "البيانات المعروضة مسجلة فعليًا." : "لا توجد بيانات مسجلة لهذه الفترة والفلاتر."}</p></Card>
    <div className="report-stat-grid"><Card><span>نسبة الإنجاز</span><strong>{report.hasData ? `${report.completionRate}%` : "—"}</strong><ProgressBar value={report.completionRate} /></Card><Card><span>الوقت الفعلي</span><strong>{report.hasData ? formatMinutes(report.totalMinutes) : "—"}</strong><Timer size={20} /></Card><Card><span>{period === "monthly" ? "الأسابيع الناجحة" : "أيام النجاح"}</span><strong>{report.hasData ? (period === "monthly" ? report.successfulWeeks : report.successfulDays) : "—"}</strong><CircleCheck size={20} /></Card><Card><span>متوسط اليوم المسجل</span><strong>{report.hasData ? formatMinutes(report.averageDailyMinutes) : "—"}</strong><Badge tone="neutral">{report.recordedDays} {selectedParticipantId === "all" ? "حالات يوم مسجلة" : "يوم مسجل"}</Badge></Card></div>
    <Card><h3>ملخص الفترة</h3><p>{report.hasData ? `سجلت ${report.recordedDays} أيام متابعة، بمتوسط إنجاز ${report.completionRate}% ووقت فعلي ${formatMinutes(report.totalMinutes)}.` : "لا توجد بيانات كافية لإنشاء ملخص لهذه الفترة."}</p>{report.mostTimeConsumingTask && <p>أكثر مهمة استهلاكًا للوقت: <strong>{report.mostTimeConsumingTask}</strong>.</p>}</Card>
    {period !== "daily" && <Card className="report-chart-card"><SectionHeader title="مسار التقدم" description="الأيام أو أسابيع الشهر التي تحتوي على سجلات فعلية." /><div className="report-chart" aria-label="رسم تقدم الفترة">{report.points.map((point) => <div className="chart-column" key={point.label}><span className="chart-value">{point.hasData ? `${point.progress}%` : "—"}</span><i style={{ height: point.hasData ? `${point.progress}%` : "0%" }} /><small>{point.label}</small></div>)}</div></Card>}
    <Card><SectionHeader title="تفصيل المهام" description="الوقت والحالات محسوبة على النطاق المحدد." />{report.taskRows.length ? <div className="report-task-list">{report.taskRows.map((row) => <article key={row.taskId}><div><strong>{row.title}</strong><span>{row.completionRate}% إنجاز · {row.completed} مكتملة · {row.partial} جزئية · {row.notCompleted + row.closed} غير مكتملة/مغلقة</span></div><strong>{formatMinutes(row.actualMinutes)}</strong></article>)}</div> : <EmptyState title="لا توجد سجلات للمهام" description="جرّب تغيير الفترة أو الفلاتر." />}</Card>
  </div>;
}
