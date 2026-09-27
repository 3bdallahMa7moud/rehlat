"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { ArrowLeft, BarChart3, CalendarDays, CircleCheck, Clock3, Flame, Lightbulb, ListTodo, Target } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getProjectDateKey } from "@/lib/date-time";
import { formatMinutes } from "@/lib/format";
import { useDemo } from "@/state/DemoContext";

type AnalyticsHistoryDay = {
  date: string;
  label: string;
  progress: number;
  minutes: number;
  status: string;
  streak: number;
};

function AnalyticsTrendChart({ days }: { days: readonly AnalyticsHistoryDay[] }) {
  const chronologicalDays = [...days].reverse();
  const labelStep = Math.max(1, Math.ceil(chronologicalDays.length / 7));
  const shortDate = (date: string) => {
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime())
      ? date
      : new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(parsed);
  };

  return <figure className="analytics-trend-figure">
    <div className="analytics-chart-scale" aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div>
    <div
      className={cn("analytics-chart-bars", chronologicalDays.length === 1 && "analytics-chart-bars-single")}
      style={{ "--analytics-point-count": chronologicalDays.length } as CSSProperties}
      role="img"
      aria-label={`اتجاه التقدم عبر ${chronologicalDays.length} ${chronologicalDays.length === 1 ? "يوم" : "أيام"}`}
    >
      {chronologicalDays.map((day, index) => {
        const showLabel = chronologicalDays.length <= 7 || index % labelStep === 0 || index === chronologicalDays.length - 1;
        return <div className="analytics-chart-column" key={day.date} data-analytics-point aria-label={`${day.label}: تقدم ${day.progress}%، ووقت ${formatMinutes(day.minutes)}`}>
          <span className={cn("analytics-chart-value", !showLabel && "analytics-chart-label-hidden")}>{day.progress}%</span>
          <span className="analytics-chart-track" aria-hidden="true"><i style={{ height: `${Math.max(3, day.progress)}%` }} /></span>
          <time className={cn(!showLabel && "analytics-chart-label-hidden")} dateTime={day.date}>{shortDate(day.date)}</time>
        </div>;
      })}
    </div>
  </figure>;
}

export function AnalyticsPageView() {
  const { historyDays } = useDemo();
  const [period, setPeriod] = useState<"7" | "30" | "all">("7");
  const filteredDays = (() => {
    if (period === "all" || historyDays.length === 0) return historyDays;
    const newestDate = historyDays[0]?.date;
    const anchor = new Date(`${newestDate}T12:00:00`);
    if (!newestDate || Number.isNaN(anchor.getTime())) return historyDays.slice(0, Number(period));
    anchor.setDate(anchor.getDate() - Number(period) + 1);
    const cutoff = getProjectDateKey(anchor);
    return historyDays.filter((day) => day.date >= cutoff && day.date <= newestDate);
  })();
  const summary = filteredDays.length === 0 ? null : {
    averageProgress: Math.round(filteredDays.reduce((total, day) => total + day.progress, 0) / filteredDays.length),
    totalMinutes: filteredDays.reduce((total, day) => total + day.minutes, 0),
    activeDays: filteredDays.filter((day) => day.progress > 0 || day.minutes > 0).length,
    bestStreak: filteredDays.reduce((best, day) => Math.max(best, day.streak), 0),
  };
  const statusDistribution = [
    { key: "complete", label: "مكتمل", tone: "success" as const, count: filteredDays.filter((day) => day.progress >= 100).length },
    { key: "near", label: "شبه مكتمل", tone: "warning" as const, count: filteredDays.filter((day) => day.progress >= 70 && day.progress < 100).length },
    { key: "partial", label: "إنجاز جزئي", tone: "teal" as const, count: filteredDays.filter((day) => day.progress > 0 && day.progress < 70).length },
    { key: "empty", label: "لم يبدأ", tone: "neutral" as const, count: filteredDays.filter((day) => day.progress <= 0).length },
  ];
  const chronologicalDays = [...filteredDays].reverse();
  const trendDelta = chronologicalDays.length > 1
    ? chronologicalDays.at(-1)!.progress - chronologicalDays[0].progress
    : null;
  const trendCopy = trendDelta === null
    ? "يوم واحد يمنحك نقطة بداية؛ سيظهر الاتجاه بعد تسجيل أيام إضافية."
    : trendDelta > 5
      ? `ارتفع تقدمك ${trendDelta} نقطة مئوية من أول يوم إلى آخر يوم في الفترة.`
      : trendDelta < -5
        ? `انخفض تقدمك ${Math.abs(trendDelta)} نقطة مئوية من أول يوم إلى آخر يوم؛ خطوة قصيرة اليوم قد تساعدك على استعادة الإيقاع.`
        : "ظل تقدمك قريبًا من نفس المستوى بين أول يوم وآخر يوم في الفترة.";
  const strongestDay = filteredDays.reduce<AnalyticsHistoryDay | null>((best, day) => !best || day.progress > best.progress ? day : best, null);
  const insight = !summary
    ? null
    : filteredDays.length === 1
      ? summary.averageProgress > 0
        ? { tone: "start", title: "هذه نقطة بداية واضحة", copy: `سجلت ${summary.averageProgress}% في يومك المعروض. استمر في التسجيل لتتضح أنماط تقدمك عبر الوقت.` }
        : { tone: "start", title: "ابدأ بإشارة صغيرة اليوم", copy: "لا يوجد تقدم مسجل في يومك المعروض بعد؛ اختر مهمة قصيرة لتبدأ منها." }
      : summary.averageProgress >= 70
        ? { tone: "good", title: "إيقاعك قوي في هذه الفترة", copy: `متوسط تقدمك ${summary.averageProgress}% عبر ${filteredDays.length} أيام؛ حافظ على الخطوات التي يمكنك تكرارها.` }
        : summary.averageProgress > 0
          ? { tone: "watch", title: "مهمة قصيرة قد تعيد الإيقاع", copy: `متوسط تقدمك ${summary.averageProgress}%. ابدأ اليوم بأقصر مهمة متاحة ثم ابنِ عليها.` }
          : { tone: "start", title: "خطوتك الأولى تصنع الاتجاه", copy: "لا يوجد تقدم مسجل في هذه الفترة بعد؛ ابدأ بمهمة قصيرة يمكن إنجازها الآن." };
  const periodLabel = period === "7" ? "آخر 7 أيام" : period === "30" ? "آخر 30 يومًا" : "كل الأيام";

  return <div className="analytics-page">
    <PageHeader
      eyebrow="افهم نمط تقدمك"
      title="التحليلات"
      description="راقب اتجاهك وإيقاع أيامك، ثم اختر خطوة عملية تناسب ما سجّلته فعلًا."
      actions={<Link href="/tasks" className="button button-primary button-md analytics-header-cta"><ListTodo size={17} aria-hidden="true" />العودة لمهام اليوم</Link>}
    />
    <section className="analytics-period-section" aria-labelledby="analytics-period-title">
      <div className="analytics-period-heading">
        <div>
          <span className="eyebrow">الفترة المعروضة</span>
          <h2 id="analytics-period-title">صورة تقدمك</h2>
          <p>{historyDays.length === 0 ? "لا توجد بيانات محفوظة بعد" : `${filteredDays.length} ${filteredDays.length === 1 ? "يوم ضمن التحليل" : "أيام ضمن التحليل"}`}</p>
        </div>
        <div className="analytics-period-filters" role="group" aria-label="تصفية التحليلات حسب الفترة">
          {([{"value":"7","label":"آخر 7 أيام"},{"value":"30","label":"آخر 30 يومًا"},{"value":"all","label":"كل الأيام"}] as const).map((option) => <Button
            key={option.value}
            type="button"
            size="sm"
            variant={period === option.value ? "secondary" : "ghost"}
            className={cn("analytics-period-filter", period === option.value && "analytics-period-filter-active")}
            aria-pressed={period === option.value}
            data-analytics-period={option.value}
            onClick={() => setPeriod(option.value)}
          >{option.label}</Button>)}
        </div>
      </div>
      {historyDays.length === 0 ? <Card className="analytics-empty-card">
        <EmptyState
          title="لا توجد بيانات كافية للتحليل بعد"
          description="ابدأ إحدى مهامك وسجّل تقدمك؛ ستظهر هنا الاتجاهات والمؤشرات المحسوبة من أيامك."
          action={<Link href="/tasks" className="button button-primary button-md"><ListTodo size={17} aria-hidden="true" />ابدأ مهام اليوم</Link>}
        />
      </Card> : summary && <>
        <div className="analytics-kpi-grid" aria-label={`مؤشرات ${periodLabel}`}>
          <Card className="analytics-kpi-card" data-analytics-metric="average"><span className="analytics-kpi-icon analytics-kpi-icon-primary"><Target size={20} aria-hidden="true" /></span><div><span>متوسط التقدم</span><strong>{summary.averageProgress}%</strong><small>متوسط الأيام المعروضة</small></div></Card>
          <Card className="analytics-kpi-card" data-analytics-metric="time"><span className="analytics-kpi-icon analytics-kpi-icon-teal"><Clock3 size={20} aria-hidden="true" /></span><div><span>إجمالي الوقت</span><strong>{formatMinutes(summary.totalMinutes)}</strong><small>وقت مسجل في الفترة</small></div></Card>
          <Card className="analytics-kpi-card" data-analytics-metric="active"><span className="analytics-kpi-icon analytics-kpi-icon-success"><CalendarDays size={20} aria-hidden="true" /></span><div><span>الأيام النشطة</span><strong>{summary.activeDays}</strong><small>من أصل {filteredDays.length}</small></div></Card>
          <Card className="analytics-kpi-card" data-analytics-metric="streak"><span className="analytics-kpi-icon analytics-kpi-icon-warning"><Flame size={20} aria-hidden="true" /></span><div><span>أفضل استمرارية</span><strong>{summary.bestStreak} {summary.bestStreak === 1 ? "يوم" : "أيام"}</strong><small>ضمن الفترة المعروضة</small></div></Card>
        </div>
        {insight && <Card className={cn("analytics-insight", `analytics-insight-${insight.tone}`)}>
          <span className="analytics-insight-icon"><Lightbulb size={22} aria-hidden="true" /></span>
          <div><span className="eyebrow">قراءة مباشرة للبيانات</span><h2>{insight.title}</h2><p>{insight.copy}</p></div>
          <Link href="/tasks" className="analytics-insight-link">اختر خطوتك التالية <ArrowLeft size={16} aria-hidden="true" /></Link>
        </Card>}
        <div className="analytics-visual-grid">
          <Card className="analytics-trend-card">
            <div className="analytics-card-heading">
              <div><span className="eyebrow">التغير عبر الوقت</span><h2>اتجاه التقدم</h2><p>{periodLabel} · كل عمود يمثل يومًا محفوظًا</p></div>
              <span className="analytics-heading-icon"><BarChart3 size={21} aria-hidden="true" /></span>
            </div>
            <AnalyticsTrendChart days={filteredDays} />
            <p className="analytics-trend-caption">{trendCopy}</p>
          </Card>
          <Card className="analytics-status-card">
            <div className="analytics-card-heading">
              <div><span className="eyebrow">إيقاع الأيام</span><h2>توزيع الحالات</h2><p>{filteredDays.length} {filteredDays.length === 1 ? "يوم محفوظ" : "أيام محفوظة"}</p></div>
              <span className="analytics-heading-icon analytics-heading-icon-teal"><CircleCheck size={21} aria-hidden="true" /></span>
            </div>
            <div className="analytics-status-list">
              {statusDistribution.map((status) => <div className="analytics-status-row" key={status.key}>
                <div><Badge tone={status.tone}>{status.label}</Badge><strong>{status.count}</strong></div>
                <ProgressBar value={filteredDays.length ? Math.round(status.count / filteredDays.length * 100) : 0} tone={status.tone === "neutral" ? "teal" : status.tone} />
              </div>)}
            </div>
            {strongestDay && <div className="analytics-best-day"><span>أعلى تقدم في الفترة</span><strong>{strongestDay.progress}%</strong><small>{strongestDay.label}</small></div>}
          </Card>
        </div>
      </>}
    </section>
  </div>;
}
