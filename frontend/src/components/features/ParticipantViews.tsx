"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Activity, ArrowLeft, Award, BarChart3, BookOpen, CalendarDays, ChevronLeft, CircleCheck, Clock3, Droplets, Dumbbell, FileSpreadsheet, FileText, Flame, Focus, Medal, MessageCircle, Moon, Play, Sparkles, Target, Timer, TriangleAlert, Trophy, Users } from "lucide-react";
import { AIAssistantHero } from "@/components/features/AIAssistant";
import { TaskCard } from "@/components/features/TaskCard";
import { AppIcon } from "@/components/ui/AppIcon";
import { Badge, Button, Card, Dialog, EmptyState, IconButton, PageHeader, ProgressBar, SectionHeader, StatusBadge, Tabs, UserAvatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate, formatMinutes, formatPercentage } from "@/lib/format";
import { useDemo } from "@/state/DemoContext";
import type { Report, TaskType } from "@/types/models";

const activityMeta: Record<TaskType, { title: string; description: string; icon: "quran" | "mosque" | "adhkar" | "reading" | "sport" | "water" | "sleep" | "general"; detail: string }> = {
  quran: { title: "القرآن", description: "وردك اليومي، هدف واضح وخطوة قابلة للقياس.", icon: "quran", detail: "مقروء اليوم" },
  prayer: { title: "الصلاة", description: "متابعة هادئة للصلوات في سياق يومك، بلا تشتيت.", icon: "mosque", detail: "الصلوات المكتملة" },
  adhkar: { title: "الأذكار", description: "روتين قصير يثبت بداية اليوم ونهايته.", icon: "adhkar", detail: "جلسات الذكر" },
  reading: { title: "القراءة", description: "تابع الكتاب والصفحات والوقت الفعلي في مكان واحد.", icon: "reading", detail: "الصفحات المنجزة" },
  sport: { title: "الرياضة", description: "اختر الحركة المناسبة وسجّل مدتها بوضوح.", icon: "sport", detail: "دقائق الحركة" },
  water: { title: "الماء", description: "متابعة بسيطة ومتوازنة لأكواب الماء اليومية.", icon: "water", detail: "الأكواب المسجلة" },
  sleep: { title: "النوم", description: "نهاية اليوم الهادئة جزء من استمراريتك.", icon: "sleep", detail: "ساعات الهدف" },
  general: { title: "مهمة عامة", description: "مساحة مرنة لأي عادة أو هدف شخصي يحتاج متابعة.", icon: "general", detail: "التقدم اليومي" },
};

const historyDays = [
  { date: "الخميس 18 سبتمبر", status: "مكتمل", progress: 100, time: 96, streak: 12 },
  { date: "الأربعاء 17 سبتمبر", status: "شبه مكتمل", progress: 82, time: 81, streak: 11 },
  { date: "الثلاثاء 16 سبتمبر", status: "مكتمل", progress: 91, time: 88, streak: 10 },
  { date: "الاثنين 15 سبتمبر", status: "إنجاز جزئي", progress: 62, time: 64, streak: 9 },
  { date: "الأحد 14 سبتمبر", status: "مكتمل", progress: 95, time: 101, streak: 8 },
];

function CircleProgress({ value, label }: { value: number; label: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return <div className="circle-progress"><svg viewBox="0 0 100 100" aria-label={label}><circle className="circle-track" cx="50" cy="50" r={radius} /><circle className="circle-value" cx="50" cy="50" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference} /></svg><strong>{formatPercentage(value)}</strong><span>{label}</span></div>;
}

function ActivityRows({ limit }: { limit?: number }) {
  const { activity } = useDemo();
  return <div className="activity-list">{activity.slice(0, limit).map((event) => <article className="activity-row" key={event.id}><UserAvatar initials={event.initials} color={event.avatarColor} size="sm" /><div><p><strong>{event.participantName}</strong> {event.action} {event.task && <span>{event.task}</span>}</p><small>{event.time}</small></div><span className={cn("activity-state", `activity-${event.kind}`)} /></article>)}</div>;
}

function OnlineRows() {
  const { participants } = useDemo();
  const online = participants.filter((participant) => participant.role === "participant" && participant.presence !== "offline");
  if (!online.length) return <EmptyState title="لا يوجد مشاركون متصلون حاليًا." />;
  return <div className="online-list">{online.map((participant) => <article className="online-row" key={participant.id}><UserAvatar initials={participant.initials} color={participant.avatarColor} size="sm" online={participant.presence === "active"} /><div><strong>{participant.name}</strong><p>{participant.currentTask ?? participant.currentStatus}</p></div><span className={cn("online-status", `online-${participant.presence}`)} /></article>)}</div>;
}

function MotivationCard() {
  return <Card padding="none" className="motivation-card"><Image src="/images/daily-coffee.png" alt="فنجان قهوة ودفتر في الصباح" width={128} height={128} /><div><Badge tone="teal">لمحة اليوم</Badge><h3>ابدأ بأصغر خطوة</h3><p>ليس المطلوب يومًا مثاليًا؛ المطلوب أن تبقى قريبًا من الطريق.</p></div></Card>;
}

export function DashboardView() {
  const { activeParticipant, dayStatus, endDay, progress, startDay, tasks, rankings, streakData, encouragements } = useDemo();
  const [endOpen, setEndOpen] = useState(false);
  const dayCopy = dayStatus === "not_started" ? "اليوم ينتظر أول خطوة منك." : dayStatus === "complete" ? "أغلقت محطات اليوم بنجاح." : "كل تقدم صغير هنا له أثره.";
  const morningTasks = tasks.filter((task) => task.group === "morning");
  return <><PageHeader eyebrow={formatDate()} title="رحلة اليوم" description={`أهلًا ${activeParticipant.name}، ${dayCopy}`} actions={dayStatus === "not_started" ? <Button size="lg" onClick={startDay}><Play size={18} />ابدأ يومي</Button> : <Button size="md" variant="outline" onClick={() => setEndOpen(true)}>إنهاء اليوم</Button>} /><section className="journey-hero"><div className="journey-copy"><div className="journey-status"><StatusBadge status={dayStatus} /><span>{progress.completed} مهام مكتملة من {progress.total}</span></div><h2>{dayStatus === "not_started" ? "خذ البداية على مهل." : "أنت تمشي في الاتجاه الصحيح."}</h2><p>بقي لك {progress.remaining} مهام، وحققت {progress.partial} تقدمًا جزئيًا. اختر محطة واحدة فقط الآن.</p>{dayStatus === "not_started" && <Button size="lg" onClick={startDay}><Play size={18} />ابدأ يومي</Button>}</div><CircleProgress value={progress.percent} label="تقدم اليوم" /><div className="journey-facts"><div><Timer size={20} /><span>الوقت الفعلي</span><strong>{formatMinutes(progress.actualMinutes)}</strong></div><div><Flame size={20} /><span>السلسلة الحالية</span><strong>{streakData.current} يومًا</strong></div></div></section><div className="dashboard-snapshot"><Card><SectionHeader title="تقدم اليوم" description="نظرة كافية قبل أن تدخل التفاصيل." /><div className="snapshot-progress"><div><strong>{formatPercentage(progress.percent)}</strong><span>معدل الإنجاز</span></div><ProgressBar value={progress.percent} /><div className="snapshot-labels"><span>{progress.completed} مكتملة</span><span>{progress.partial} جزئية</span><span>{progress.remaining} متبقية</span></div></div></Card><Card><SectionHeader title="تنبيه لطيف" /><div className="streak-alert"><TriangleAlert size={22} /><div><strong>السلسلة تحتاج مهمة واحدة</strong><p>أنهِ إحدى المحطات المتبقية لتحافظ على سلسلة {streakData.current} يومًا.</p></div></div></Card></div><section className="dashboard-section"><SectionHeader title="مجموعة الصباح" description="طبقة توقيت تجمع روتين بداية اليوم، ولا تستبدل تصنيفات مهامك." action={<Link href="/tasks" className="section-link">كل المهام <ArrowLeft size={16} /></Link>} /><div className="morning-task-grid">{morningTasks.map((task) => <TaskCard key={task.id} task={task} compact />)}</div></section><div className="dashboard-lower-grid"><div className="dashboard-stack"><Card><SectionHeader title="ما يحدث الآن" description="أحدث النشاطات أولًا." action={<Activity size={18} className="text-[var(--teal-strong)]" />} /><ActivityRows limit={4} /></Card><Card><SectionHeader title="المتصلون الآن" action={<Users size={18} className="text-[var(--primary)]" />} /><OnlineRows /></Card></div><div className="dashboard-stack"><MotivationCard /><Card><SectionHeader title="الترتيب اليوم" action={<Link href="/competition" className="section-link">المزيد <ArrowLeft size={16} /></Link>} /><div className="ranking-mini">{rankings.slice(0, 3).map((entry) => <div key={entry.participantId}><span className={cn("rank-chip", entry.rank < 4 && `rank-${entry.rank}`)}>{entry.rank}</span><UserAvatar initials={entry.initials} color={entry.avatarColor} size="sm" /><strong>{entry.name}</strong><span>{entry.score} نقطة</span></div>)}</div></Card><Card><SectionHeader title="رسائل تشجيع" action={<MessageCircle size={18} className="text-[var(--primary)]" />} /><div className="encouragement-list">{encouragements.map((message) => <article key={message.id}><UserAvatar initials={message.initials} color={message.avatarColor} size="sm" /><div><strong>{message.sender}</strong><p>{message.message}</p><small>{message.time}</small></div></article>)}</div></Card></div></div><Dialog open={endOpen} onClose={() => setEndOpen(false)} title="إنهاء رحلة اليوم؟" description="سيتم إغلاق اليوم في العرض التجريبي، ويمكنك بعدها تجربة بدء يوم جديد." footer={<><Button variant="outline" onClick={() => setEndOpen(false)}>إلغاء</Button><Button onClick={() => { endDay(); setEndOpen(false); }}>إنهاء اليوم</Button></>}><div className="confirm-summary"><CircleCheck size={22} /><p>أنجزت {progress.completed} من {progress.total} مهام، واحتسبت {formatMinutes(progress.actualMinutes)} كوقت فعلي.</p></div></Dialog></>;
}

export function TasksView() {
  const { tasks } = useDemo();
  const [filter, setFilter] = useState<"all" | "morning" | "active">("all");
  const shownTasks = filter === "all" ? tasks : filter === "morning" ? tasks.filter((task) => task.group === "morning") : tasks.filter((task) => ["running", "paused", "partial"].includes(task.status));
  return <><PageHeader eyebrow="مساحة العمل" title="مهام اليوم" description="كل مهمة تعرض هدفها وحالتها وإجراءها الحالي فقط." actions={<Link href="/focus"><Button variant="secondary"><Focus size={18} />جلسة تركيز</Button></Link>} /><div className="tasks-toolbar"><Tabs value={filter} onValueChange={setFilter} tabs={[{ value: "all", label: "كل المهام" }, { value: "morning", label: "مجموعة الصباح" }, { value: "active", label: "قيد التقدم" }]} /><div className="task-shortcuts">{[{ href: "/tasks/quran", label: "القرآن" }, { href: "/tasks/prayer", label: "الصلاة" }, { href: "/tasks/reading", label: "القراءة" }].map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</div></div>{shownTasks.length ? <div className="task-grid">{shownTasks.map((task) => <TaskCard task={task} key={task.id} />)}</div> : <EmptyState title="لا توجد مهام ضمن هذا العرض." description="جرّب تغيير الفلتر أو ابدأ رحلة اليوم." />}</>;
}

export function TaskActivityView({ type }: { type: TaskType }) {
  const { tasks, updateTaskProgress } = useDemo();
  const config = activityMeta[type];
  const selectedTask = tasks.find((task) => task.type === type);
  const Icon = config.icon === "adhkar" ? Sparkles : config.icon === "reading" ? BookOpen : config.icon === "sport" ? Dumbbell : config.icon === "water" ? Droplets : config.icon === "sleep" ? Moon : Target;
  if (!selectedTask) return <EmptyState title="لا توجد مهمة مطابقة لهذا النشاط." description="هذه شاشة مرنة جاهزة لبياناتك الفعلية لاحقًا." />;
  const detailProgress = Math.round((selectedTask.current / selectedTask.target) * 100);
  return <><PageHeader eyebrow="محطة يومية" title={config.title} description={config.description} actions={<Link href="/tasks"><Button variant="outline">كل المهام</Button></Link>} /><section className="activity-hero"><div className="activity-hero-icon">{config.icon === "quran" || config.icon === "mosque" ? <AppIcon name={config.icon} size={32} /> : <Icon size={30} />}</div><div><Badge tone="teal">هدف اليوم</Badge><h2>{selectedTask.title}</h2><p>{selectedTask.supportingText ?? selectedTask.goalLabel}</p></div><div className="activity-metric"><span>{config.detail}</span><strong>{selectedTask.current} <small>/ {selectedTask.target} {selectedTask.unit}</small></strong></div></section><div className="activity-layout"><TaskCard task={selectedTask} /><Card><SectionHeader title="تحديث سريع" description="بيانات تجريبية تتغير داخل الواجهة." /><div className="quick-progress"><div><strong>{detailProgress}%</strong><span>من هدفك المحدد</span></div><ProgressBar value={detailProgress} tone="teal" /><div className="quick-progress-actions"><Button variant="outline" onClick={() => updateTaskProgress(selectedTask.id, Math.max(0, selectedTask.current - 1))}>- خطوة</Button><Button variant="secondary" onClick={() => updateTaskProgress(selectedTask.id, selectedTask.current + 1)}>+ خطوة</Button></div></div></Card></div><section className="activity-support-grid"><Card><h3>لماذا هنا؟</h3><p>هذا النشاط يحتفظ بهويته الخاصة، لكن يبقى جزءًا طبيعيًا من نفس رحلة اليوم، بنفس الأزرار والحالات والتدرج البصري.</p></Card><Card><h3>الوقت الفعلي</h3><strong className="large-inline-metric"><Clock3 size={20} />{formatMinutes(selectedTask.actualMinutes)}</strong><p>يُستخدم لاحقًا في التقارير والتحليلات بعد الربط بالخدمات.</p></Card></section></>;
}

export function FocusView() {
  const { chooseFocusDuration, finishFocus, focus, pauseFocus, startFocus } = useDemo();
  const remainingMinutes = Math.floor(focus.secondsLeft / 60).toString().padStart(2, "0");
  const remainingSeconds = (focus.secondsLeft % 60).toString().padStart(2, "0");
  return <div className="focus-page"><PageHeader eyebrow="مساحة هادئة" title="التركيز" description="اختر المدة أولًا، ثم ابدأ عندما تكون جاهزًا." /><section className="focus-room"><div className="focus-task-label"><Focus size={19} />جلسة تركيز شخصية</div><div className="focus-clock" aria-label={`الوقت المتبقي ${remainingMinutes}:${remainingSeconds}`}><strong dir="ltr">{remainingMinutes}:{remainingSeconds}</strong><span>متبقي من {focus.duration} دقيقة</span></div><div className="duration-selector" aria-label="اختيار مدة الجلسة">{[15, 25, 45, 60].map((duration) => <button type="button" key={duration} className={cn(focus.duration === duration && "duration-active")} onClick={() => chooseFocusDuration(duration)} disabled={focus.isRunning}>{duration} د</button>)}</div><div className="focus-actions">{focus.isRunning ? <Button size="lg" variant="outline" onClick={pauseFocus}>إيقاف مؤقت</Button> : <Button size="lg" onClick={startFocus}><Play size={19} />{focus.secondsLeft === 0 ? "ابدأ جلسة جديدة" : "ابدأ"}</Button>}<Button size="lg" variant="ghost" onClick={finishFocus}>إنهاء الجلسة</Button></div><p className="focus-note"><Timer size={16} />لا تبدأ المدة تلقائيًا عند اختيارها.</p></section></div>;
}

export function StreaksView() {
  const { streakData } = useDemo();
  return <><PageHeader eyebrow="استمراريتك" title="سلسلة الإنجاز" description="تاريخ مبسط يساعدك ترى الإيقاع، لا يحوّل يومك إلى أرقام." /><div className="streak-stats"><Card><Flame size={24} /><span>السلسلة الحالية</span><strong>{streakData.current} يومًا</strong></Card><Card><Award size={24} /><span>أفضل سلسلة</span><strong>{streakData.best} يومًا</strong></Card><Card><CircleCheck size={24} /><span>أيام ناجحة</span><strong>{streakData.successfulDays}</strong></Card></div><Card className="streak-map-card"><SectionHeader title="خريطة الاستمرارية" description="كل مربع يمثل يومًا واحدًا." /><div className="streak-map">{streakData.history.map((day) => <span key={day.date} title={`${day.date}: ${day.status}`} aria-label={`${day.date}: ${day.status}`} className={cn("streak-day", `streak-${day.status}`)} />)}</div><div className="streak-legend"><span><i className="streak-successful" />ناجح</span><span><i className="streak-unsuccessful" />لم يكتمل</span><span><i className="streak-today" />اليوم</span><span><i className="streak-future" />قادِم</span></div></Card><section className="streak-tips"><TriangleAlert size={22} /><div><strong>مؤشر مهم، لا حكم عليك</strong><p>الغاية من السلسلة أن تعيدك إلى مسارك، لا أن تجعل يومًا غير مكتمل يمحو تقدّمك.</p></div></section></>;
}

export function CompetitionView() {
  const { rankings } = useDemo();
  return <><PageHeader eyebrow="المجموعة" title="الترتيب" description="مقارنة مشجعة تركّز على التقدم والاستمرارية." /><section className="ranking-podium">{rankings.slice(0, 3).map((entry) => <Card key={entry.participantId} className={cn("podium-card", `podium-${entry.rank}`)}><span className="podium-rank">{entry.rank}</span><UserAvatar initials={entry.initials} color={entry.avatarColor} size="lg" /><strong>{entry.name}</strong><span>{entry.score} نقطة</span><Badge tone={entry.rank === 1 ? "warning" : "teal"}><Flame size={13} />{entry.streak} أيام</Badge></Card>)}</section><Card><SectionHeader title="كل المشاركين" description="الترتيب يتحدث عند اكتمال بياناته الحقيقية لاحقًا." /><div className="ranking-list">{rankings.map((entry) => <article key={entry.participantId}><span className={cn("rank-chip", `rank-${entry.rank}`)}>{entry.rank}</span><UserAvatar initials={entry.initials} color={entry.avatarColor} size="md" /><strong>{entry.name}</strong><div><ProgressBar value={entry.progress} tone="teal" /><span>{entry.progress}% من رحلة اليوم</span></div><span className="ranking-score">{entry.score}</span></article>)}</div></Card></>;
}

export function HonorsView() {
  const { achievements, titles } = useDemo();
  return <><PageHeader eyebrow="أثر جميل" title="لوحة الشرف" description="ألقاب وإنجازات تعطي الجهد المستمر مكانه، من دون مبالغة." /><section className="honors-hero"><div><span className="honors-symbol"><Medal size={34} /></span><h2>للمحطات التي تستحق أن تُذكر</h2><p>لوحة مستقلة بصريًا، لكنها ما زالت من نفس لغة رحلة التغيير.</p></div><Trophy size={82} /></section><section className="achievement-grid">{achievements.map((achievement) => <Card key={achievement.id} className="achievement-card"><span className={cn("achievement-symbol", `achievement-${achievement.symbol}`)}>{achievement.symbol === "quran" ? <AppIcon name="quran" size={26} /> : achievement.symbol === "focus" ? <Focus size={25} /> : achievement.symbol === "continuity" ? <Flame size={25} /> : <Award size={25} />}</span><div><Badge tone="teal">{achievement.participantName}</Badge><h3>{achievement.label}</h3><p>{achievement.description}</p></div><UserAvatar initials={achievement.initials} color={achievement.avatarColor} size="sm" /></Card>)}</section><section className="titles-section"><SectionHeader title="الألقاب" description="رموز صغيرة وهوية هادئة لكل لقب." /><div className="title-grid">{titles.map((title) => <Card key={title.id}><span className="title-icon">{title.symbol === "quran" ? <AppIcon name="quran" size={24} /> : title.symbol === "continuity" ? <Flame size={23} /> : <Award size={23} />}</span><h3>{title.name}</h3><p>{title.description}</p></Card>)}</div></section></>;
}

function ReportChart({ report }: { report: Report }) { const max = Math.max(...report.points.map((point) => point.progress)); return <div className="report-chart" aria-label="رسم تقدم الفترة">{report.points.map((point) => <div className="chart-column" key={point.label}><span className="chart-value">{point.progress}%</span><i style={{ height: `${Math.max(12, (point.progress / max) * 100)}%` }} /><small>{point.label}</small></div>)}</div>; }

export function AnalyticsView() {
  const { reports } = useDemo();
  const report = reports.weekly;
  return <><PageHeader eyebrow="فهم أدائك" title="تحليلي" description="مؤشرات شخصية مفيدة، لا لوحة BI مزدحمة." /><div className="analytics-grid"><Card className="analytics-main"><SectionHeader title="اتجاه التقدم" description="الأسبوع الحالي" action={<BarChart3 size={20} className="text-[var(--primary)]" />} /><ReportChart report={report} /></Card><Card><SectionHeader title="الاستمرارية" /><div className="consistency-score"><CircleProgress value={report.averageProgress} label="متوسط التقدم" /><p>خمسة أيام ناجحة هذا الأسبوع مع قابلية حقيقية لرفع الإيقاع.</p></div></Card></div><section className="insight-grid"><Card><span className="insight-icon insight-good"><Target size={22} /></span><h3>أقوى تصنيف</h3><strong>الدين</strong><p>الورد والأذكار أكثر المحطات ثباتًا في بياناتك التجريبية.</p></Card><Card><span className="insight-icon insight-watch"><TriangleAlert size={22} /></span><h3>تصنيف يحتاج انتباهًا</h3><strong>الرياضة</strong><p>ابدأ بمدة أقصر لتجعل البداية أسهل من التأجيل.</p></Card><Card><span className="insight-icon insight-teal"><Clock3 size={22} /></span><h3>أطول مهمة</h3><strong>{report.mostTimeConsumingTask}</strong><p>هذا طبيعي ما دامت تضيف لك قيمة واضحة.</p></Card></section></>;
}

export function HistoryView() {
  return <><PageHeader eyebrow="الأيام السابقة" title="السجل" description="عودة منظمة للأيام الماضية، مع ما يهمك فقط." /><Card><div className="history-list">{historyDays.map((day) => <article key={day.date}><span className="history-marker"><CalendarDays size={17} /></span><div className="history-date"><strong>{day.date}</strong><span>{day.status}</span></div><div className="history-progress"><ProgressBar value={day.progress} tone={day.progress > 85 ? "success" : "teal"} /><span>{day.progress}% تقدم</span></div><span className="history-time"><Clock3 size={16} />{formatMinutes(day.time)}</span><span className="history-streak"><Flame size={16} />{day.streak}</span><IconButton label={`عرض تفاصيل ${day.date}`}><ChevronLeft size={18} /></IconButton></article>)}</div></Card></>;
}

export function ReportsView() {
  const [period, setPeriod] = useState<Report["period"]>("weekly");
  const { pushToast, reports } = useDemo();
  const report = reports[period];
  return <><PageHeader eyebrow="تقاريرك" title="التقارير" description="ملخص يومي وأسبوعي وشهري جاهز للربط لاحقًا." actions={<div className="export-actions"><Button size="sm" variant="outline" onClick={() => pushToast({ tone: "info", title: "تصدير PDF", body: "سيصبح التصدير متاحًا بعد ربط خدمة التقارير." })}><FileText size={16} />PDF</Button><Button size="sm" variant="outline" onClick={() => pushToast({ tone: "info", title: "تصدير Excel", body: "سيصبح التصدير متاحًا بعد ربط خدمة التقارير." })}><FileSpreadsheet size={16} />Excel</Button></div>} /><Tabs value={period} onValueChange={setPeriod} tabs={[{ value: "daily", label: "يومي" }, { value: "weekly", label: "أسبوعي" }, { value: "monthly", label: "شهري" }]} /><div className="report-stat-grid"><Card><span>نسبة الإنجاز</span><strong>{report.completionRate}%</strong><ProgressBar value={report.completionRate} /></Card><Card><span>الوقت الفعلي</span><strong>{formatMinutes(report.totalMinutes)}</strong><Timer size={20} /></Card><Card><span>أيام ناجحة</span><strong>{report.successfulDays}</strong><CircleCheck size={20} /></Card><Card><span>ملخص الترتيب</span><strong className="report-copy">{report.rankingSummary}</strong><Trophy size={20} /></Card></div><Card className="report-chart-card"><SectionHeader title="مسار التقدم" description="رسم واضح لملاحظة الاتجاه فقط." /><ReportChart report={report} /></Card><div className="report-detail-grid"><Card><h3>أكثر مهمة استهلكت وقتًا</h3><strong>{report.mostTimeConsumingTask}</strong><p>استخدم هذه الإشارة لتوازن وقتك، لا لتقلل من أثرها.</p></Card><Card><h3>متوسط التقدم</h3><strong>{report.averageProgress}%</strong><p>هذه الأرقام التجريبية ستأتي من بياناتك الفعلية لاحقًا.</p></Card></div></>;
}

export function AiView() { return <><PageHeader eyebrow="مساعدك" title="مساعد رحلة التغيير" description="مساحة محادثة متكاملة، تعمل محليًا الآن وجاهزة لربط AI لاحقًا." /><AIAssistantHero /></>; }
