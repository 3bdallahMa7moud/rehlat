"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, Award, BarChart3, CalendarDays, ChevronLeft, CircleCheck, Clock3, Crown, FileSpreadsheet, FileText, Flame, Focus, Lightbulb, Medal, MessageCircle, Minus, Moon, MoreHorizontal, Play, Sparkles, Target, Timer, TrendingDown, TrendingUp, TriangleAlert, Trophy, Users } from "lucide-react";
import { AIAssistantHero } from "@/components/features/AIAssistant";
import { TaskCard, TaskGlyph } from "@/components/features/TaskCard";
import { filterTasks, getTaskGuideCopy, isActiveTask, taskCategories, taskCategoryNames } from "@/domain/tasks/task-presentation";
import { TaskDetailTimer } from "@/components/features/TaskDetailTimer";
import { AdhkarReader } from "@/components/features/ReligiousReaders";
import { QuranBatchReader } from "@/components/features/QuranBatchReader";
import { PrayerTracker, ReadingTracker, ReviewTracker, SportTracker, WaterTracker } from "@/components/features/TaskTrackers";
import { getTaskRegistryEntry } from "@/components/tasks/TaskRegistry";
import { ActivityIcon } from "@/design/activity-visuals";
import { formatDashboardDate, formatRelativeTime, getProjectDateKey } from "@/lib/date-time";
import { getDailyReflection } from "@/lib/daily-reflection";
import { Badge, Button, Card, Dialog, EmptyState, IconButton, Input, PageHeader, ProgressBar, SectionHeader, StatusBadge, Tabs, UserAvatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMinutes, formatPercentage } from "@/lib/format";
import { exportReport } from "@/lib/export";
import { PARTIAL_COMPLETION_WEIGHT } from "@/lib/progress";
import { useDemo } from "@/state/DemoContext";
import type { Report, TaskCategory, TaskStatus, TaskType } from "@/types/models";

const LEVEL_NAMES = ["ناشئ", "صاعد", "بارع", "ماهر", "محترف", "متفوّق", "نخبة", "قائد", "بطل", "أسطوري", "ملحمي", "القمة"] as const;

const activityMeta: Record<TaskType, { title: string; description: string; detail: string }> = {
  quran: { title: "القرآن", description: "وردك اليومي، هدف واضح وخطوة قابلة للقياس.", detail: "مقروء اليوم" },
  prayer: { title: "الصلاة", description: "متابعة هادئة للصلوات في سياق يومك، بلا تشتيت.", detail: "الصلوات المكتملة" },
  adhkar: { title: "الأذكار", description: "روتين قصير يثبت بداية اليوم ونهايته.", detail: "جلسات الذكر" },
  reading: { title: "القراءة", description: "تابع الكتاب والصفحات والوقت الفعلي في مكان واحد.", detail: "الصفحات المنجزة" },
  sport: { title: "الرياضة", description: "اختر الحركة المناسبة وسجّل مدتها بوضوح.", detail: "دقائق الحركة" },
  water: { title: "الماء", description: "متابعة بسيطة ومتوازنة لأكواب الماء اليومية.", detail: "الأكواب المسجلة" },
  sleep: { title: "النوم", description: "نهاية اليوم الهادئة جزء من استمراريتك.", detail: "ساعات الهدف" },
  general: { title: "مهمة عامة", description: "مساحة مرنة لأي عادة أو هدف شخصي يحتاج متابعة.", detail: "التقدم اليومي" },
};

const dashboardTaskPriority: Partial<Record<TaskStatus, number>> = {
  running: 0,
  paused: 1,
  partial: 2,
  not_started: 3,
  not_completed: 4,
};

const nextActionCopy: Partial<Record<TaskStatus, string>> = {
  running: "متابعة المهمة",
  paused: "استئناف المهمة",
  partial: "أكمل المهمة",
  not_completed: "إعادة المحاولة",
  not_started: "ابدأ المهمة",
};

function CircleProgress({ value, label }: { value: number; label: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return <div className="circle-progress"><svg viewBox="0 0 100 100" aria-label={label}><circle className="circle-track" cx="50" cy="50" r={radius} /><circle className="circle-value" cx="50" cy="50" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference} /></svg><strong>{formatPercentage(value)}</strong><span>{label}</span></div>;
}

function ActivityRows({ limit }: { limit?: number }) {
  const { activity } = useDemo();
  return <div className="activity-list">{activity.slice(0, limit).map((event) => <article className="activity-row" key={event.id}><UserAvatar initials={event.initials} color={event.avatarColor} size="sm" /><div><p><strong>{event.participantName}</strong> {event.action} {event.task && <span>{event.task}</span>}</p><small>{formatRelativeTime(event.createdAt)}</small></div><span className={cn("activity-state", `activity-${event.kind}`)} /></article>)}</div>;
}

function OnlineRows() {
  const { participants, presence } = useDemo();
  const liveById = new Map(presence.map((record) => [record.userId, record]));
  const online = participants.filter((participant) => participant.role === "participant" && (liveById.get(participant.id)?.status ?? participant.presence) !== "offline");
  if (!online.length) return <EmptyState title="لا يوجد مشاركون متصلون حاليًا." />;
  return <div className="online-list">{online.map((participant) => { const live = liveById.get(participant.id); const status = live?.status ?? participant.presence; return <article className="online-row" key={participant.id}><UserAvatar initials={participant.initials} color={participant.avatarColor} size="sm" online={status === "active"} /><div><strong>{participant.name}</strong><p>{live?.currentTaskTitle ?? participant.currentTask ?? participant.currentStatus}</p></div><span className={cn("online-status", `online-${status}`)} /></article>; })}</div>;
}

function MotivationCard() {
  const [dateKey, setDateKey] = useState(() => getProjectDateKey());
  useEffect(() => {
    const timer = window.setInterval(() => setDateKey((current) => {
      const next = getProjectDateKey();
      return current === next ? current : next;
    }), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const reflection = getDailyReflection(dateKey);
  return <Card padding="none" className="motivation-card"><Image src="/images/daily-coffee.png" alt="فنجان قهوة ودفتر في الصباح" width={128} height={128} sizes="112px" priority={false} /><div><Badge tone="teal">لمحة اليوم</Badge><h3>{reflection.title}</h3><p>{reflection.body}</p></div></Card>;
}

export function DashboardView() {
  const {
    activeParticipant,
    dayStatus,
    endDay,
    finishAllTasks,
    progress,
    setTaskStatus,
    startDay,
    tasks,
    rankings,
    streakData,
    encouragements,
  } = useDemo();
  const [endOpen, setEndOpen] = useState(false);
  const [finishAllOpen, setFinishAllOpen] = useState(false);
  const [showAllMorning, setShowAllMorning] = useState(false);
  const [progressExplanationOpen, setProgressExplanationOpen] = useState(false);

  const dayCopy =
    dayStatus === "not_started"
      ? "اليوم ينتظر أول خطوة منك."
      : dayStatus === "complete"
        ? "أغلقت محطات اليوم بنجاح."
        : "كل تقدم صغير هنا له أثره.";
  const morningTasks = tasks.filter((task) => task.group === "morning");
  const actionableTasks = [...tasks]
    .filter((task) => task.status in dashboardTaskPriority)
    .sort((first, second) => (dashboardTaskPriority[first.status] ?? Number.MAX_SAFE_INTEGER) - (dashboardTaskPriority[second.status] ?? Number.MAX_SAFE_INTEGER));
  const nextTask = actionableTasks[0];
  const todayTaskPreview = actionableTasks.filter((task) => task.group !== "morning").slice(0, 4);
  const nextTaskProgress = nextTask?.target
    ? Math.min(100, Math.round((nextTask.current / nextTask.target) * 100))
    : 0;
  const alertCopy =
    dayStatus === "complete"
      ? {
          tone: "success",
          title: "يومك محفوظ بالكامل",
          body: "راجع ملخص اليوم وخذ لحظة للاحتفال بما أنجزته.",
        }
      : dayStatus === "not_started"
        ? {
            tone: "primary",
            title: "ابدأ بأخف خطوة",
            body: nextTask ? "مهمة «" + nextTask.title + "» هي أفضل نقطة بداية الآن." : "ابدأ يومك وحدد أول محطة.",
          }
        : {
            tone: "primary",
            title: "واصل بخطوة واحدة",
            body: "كل محطة تنجزها تقرّبك من إكمال رحلة اليوم.",
          };

  const startNextTask = () => {
    if (!nextTask) return;
    if (dayStatus === "not_started") startDay();
    setTaskStatus(nextTask.id, "running");
  };

  return <div className={cn("dashboard-page", "dashboard-" + dayStatus)}>
    <PageHeader
      eyebrow={formatDashboardDate()}
      title="رحلة اليوم"
      description={"أهلًا " + activeParticipant.name + "، " + dayCopy}
      actions={<div className="dashboard-header-actions">
        {dayStatus === "not_started" && <Button size="lg" onClick={startDay}><Play size={18} />ابدأ يومي</Button>}
        {dayStatus === "in_progress" && <Button size="sm" variant="outline" onClick={() => setEndOpen(true)}>إنهاء اليوم</Button>}
        {dayStatus === "complete" && <Link href="/history"><Button size="sm" variant="secondary">عرض ملخص اليوم</Button></Link>}
        {progress.remaining > 0 && dayStatus !== "complete" && <details className="dashboard-more-actions">
          <summary aria-label="خيارات اليوم"><MoreHorizontal size={19} /><span>خيارات اليوم</span></summary>
          <div><button type="button" onClick={() => setFinishAllOpen(true)}>إنهاء كل المهام</button></div>
        </details>}
      </div>}
    />

    <section className="journey-hero">
      <div className="journey-copy">
        <div className="journey-status">
          <StatusBadge status={dayStatus} />
          <span>{progress.completed} مهام مكتملة من {progress.total}</span>
        </div>
        <h2>
          {dayStatus === "not_started"
            ? "خذ البداية على مهل."
            : dayStatus === "complete"
              ? "أحسنت، أغلقت رحلة اليوم."
              : "أنت تمشي في الاتجاه الصحيح."}
        </h2>
        <p>
          {dayStatus === "complete"
            ? "تم حفظ إنجازاتك ووقتك الفعلي. عُد غدًا بخطوة صغيرة جديدة."
            : "بقي لك " + progress.remaining + " مهام، وحققت " + progress.partial + " تقدمًا جزئيًا. اختر محطة واحدة فقط الآن."}
        </p>
      </div>
      <div className="journey-progress">
        <CircleProgress value={progress.percent} label="تقدم اليوم" />
        <button type="button" className="progress-explainer" onClick={() => setProgressExplanationOpen(true)}>كيف تُحسب النسبة؟</button>
      </div>
      <div className="journey-facts">
        <div><Timer size={20} /><span>الوقت الفعلي</span><strong>{formatMinutes(progress.actualMinutes)}</strong></div>
        <div><Flame size={20} /><span>السلسلة الحالية</span><strong>{streakData.current} يومًا</strong></div>
      </div>
    </section>

    <div className={cn("dashboard-priority-grid", !nextTask && "dashboard-priority-single")}>
      {nextTask && dayStatus !== "complete" && <Card className="next-action-card">
        <div className="next-action-heading">
          <span className="next-action-glyph"><TaskGlyph task={nextTask} size={24} /></span>
          <div>
            <Badge tone="teal">الخطوة التالية</Badge>
            <h3>{nextTask.title}</h3>
            <p>{nextTask.supportingText ?? nextTask.goalLabel}</p>
          </div>
        </div>
        <div className="next-action-progress">
          <span>{nextTask.current} من {nextTask.target} {nextTask.unit}</span>
          <strong>{formatPercentage(nextTaskProgress)}</strong>
        </div>
        <ProgressBar value={nextTaskProgress} tone="teal" />
        <div className="next-action-footer">
          <Link href={"/tasks/" + nextTask.id} className="section-link">عرض التفاصيل <ArrowLeft size={16} /></Link>
          <Button size="sm" onClick={startNextTask}><Play size={16} />{nextActionCopy[nextTask.status] ?? "ابدأ المهمة"}</Button>
        </div>
      </Card>}

      <Card className={cn("dynamic-alert-card", "dynamic-alert-" + alertCopy.tone)}>
        <span className="dynamic-alert-icon">
          {alertCopy.tone === "success" ? <CircleCheck size={23} /> : <Sparkles size={23} />}
        </span>
        <div><Badge tone={alertCopy.tone === "success" ? "success" : "primary"}>توجيه اليوم</Badge><h3>{alertCopy.title}</h3><p>{alertCopy.body}</p></div>
      </Card>
    </div>

    {dayStatus === "complete" ? <section className="day-complete-panel">
      <span className="day-complete-icon"><Award size={30} /></span>
      <div><p className="eyebrow">اكتمل اليوم</p><h2>خطواتك محفوظة، والرحلة مستمرة.</h2><p>أنجزت {progress.completed} من {progress.total} مهام خلال {formatMinutes(progress.actualMinutes)} وحافظت على سلسلة {streakData.current} يومًا.</p></div>
      <Link href="/history"><Button variant="outline">فتح سجل اليوم <ArrowLeft size={17} /></Button></Link>
    </section> : <>
      <section className="dashboard-section dashboard-tasks-preview">
        <SectionHeader
          title="مهام اليوم"
          description="اختر محطتك التالية من أبرز المهام المتبقية."
          action={<Link href="/tasks" className="section-link">عرض كل المهام <ArrowLeft size={16} /></Link>}
        />
        {todayTaskPreview.length ? <div className="dashboard-task-preview-grid">{todayTaskPreview.map((task) => <TaskCard task={task} compact key={task.id} />)}</div> : <EmptyState title="لا توجد مهام إضافية لليوم." description="تظهر مهام مجموعة الصباح بشكل مستقل أدناه." />}
      </section>

      <section className="dashboard-section">
      <SectionHeader
        title="مجموعة الصباح"
        description="روتين بداية اليوم مرتب في محطات قصيرة وواضحة."
        action={<Link href="/tasks" className="section-link">كل المهام <ArrowLeft size={16} /></Link>}
      />
      <div className="morning-task-grid">
        {morningTasks.map((task, index) => <div key={task.id} className={cn("morning-task-slot", index >= 2 && !showAllMorning && "morning-task-mobile-hidden")}><TaskCard task={task} compact /></div>)}
      </div>
      {morningTasks.length > 2 && <button type="button" className="morning-more-toggle" onClick={() => setShowAllMorning((current) => !current)}>
        {showAllMorning ? "عرض أقل" : "عرض " + (morningTasks.length - 2) + " مهام أخرى"}
        <ChevronLeft size={16} className={cn(showAllMorning && "morning-more-open")} />
      </button>}
      </section>
    </>}

    <section className="routine-shortcuts"><Link href="/tasks/adhkar" className="routine-shortcut routine-wake"><Sparkles size={20} /><span><strong>زر الاستيقاظ</strong><small>ابدأ أذكار الصباح والاستيقاظ</small></span><ArrowLeft size={17} /></Link><Link href="/tasks/adhkar-evening" className="routine-shortcut routine-sleep"><Moon size={20} /><span><strong>زر النوم</strong><small>افتح أذكار المساء وما قبل النوم</small></span><ArrowLeft size={17} /></Link></section>

    <div className="dashboard-lower-grid">
      <div className="dashboard-stack">
        <Card><SectionHeader title="ما يحدث الآن" description="أحدث النشاطات أولًا." action={<Activity size={18} className="text-[var(--teal-strong)]" />} /><ActivityRows limit={4} /></Card>
        <Card><SectionHeader title="المتصلون الآن" action={<Users size={18} className="text-[var(--primary)]" />} /><OnlineRows /></Card>
      </div>
      <div className="dashboard-stack">
        <MotivationCard />
        <Card><SectionHeader title="الترتيب اليوم" action={<Link href="/competition" className="section-link">المزيد <ArrowLeft size={16} /></Link>} /><div className="ranking-mini">{rankings.slice(0, 3).map((entry) => <div key={entry.participantId}><span className={cn("rank-chip", entry.rank < 4 && "rank-" + entry.rank)}>{entry.rank}</span><UserAvatar initials={entry.initials} color={entry.avatarColor} size="sm" /><strong>{entry.name}</strong><span>{entry.score} نقطة</span></div>)}</div></Card>
        <Card><SectionHeader title="رسائل تشجيع" action={<MessageCircle size={18} className="text-[var(--primary)]" />} /><div className="encouragement-list">{encouragements.map((message) => <article key={message.id}><UserAvatar initials={message.initials} color={message.avatarColor} size="sm" /><div><strong>{message.sender}</strong><p>{message.message}</p><small>{formatRelativeTime(message.createdAt)}</small></div></article>)}</div></Card>
      </div>
    </div>

    <Dialog open={endOpen} onClose={() => setEndOpen(false)} title="إنهاء رحلة اليوم؟" description="سيُحفظ تقدمك الحالي وتُغلق متابعة اليوم." footer={<><Button variant="outline" onClick={() => setEndOpen(false)}>إلغاء</Button><Button onClick={() => { endDay(); setEndOpen(false); }}>إنهاء اليوم</Button></>}>
      <div className="confirm-summary"><CircleCheck size={22} /><p>أنجزت {progress.completed} من {progress.total} مهام، واحتسبت {formatMinutes(progress.actualMinutes)} كوقت فعلي.</p></div>
    </Dialog>
    <Dialog open={finishAllOpen} onClose={() => setFinishAllOpen(false)} title="إنهاء كل المهام؟" description="سيتم تسجيل كل المهام المتبقية كإنجاز كامل وحفظها في سجل اليوم." footer={<><Button variant="outline" onClick={() => setFinishAllOpen(false)}>إلغاء</Button><Button onClick={() => { finishAllTasks(); setFinishAllOpen(false); }}>تأكيد الإنهاء</Button></>}>
      <div className="confirm-summary"><CircleCheck size={22} /><p>هذا الإجراء يحدّث {progress.remaining} مهام دفعة واحدة، ويمكنك مراجعة النتائج من صفحة المهام.</p></div>
    </Dialog>
    <Dialog open={progressExplanationOpen} onClose={() => setProgressExplanationOpen(false)} title="كيف تُحسب النسبة؟" description="يعتمد تقدم رحلة اليوم على نتيجة كل مهمة مسجلة.">
      <ul className="progress-explanation-list">
        <li><strong>إنجاز كامل</strong><span>100%</span></li>
        <li><strong>إنجاز جزئي</strong><span>{formatPercentage(PARTIAL_COMPLETION_WEIGHT * 100)}</span></li>
        <li><strong>غير منجز</strong><span>0%</span></li>
      </ul>
    </Dialog>
  </div>;
}

export function TasksView() {
  const { tasks } = useDemo();
  const [filter, setFilter] = useState<"all" | "morning" | "active">("all");
  const [category, setCategory] = useState<TaskCategory | "all">("all");
  const shownTasks = filterTasks(tasks, filter, category);
  const activeTasks = tasks.filter(isActiveTask);
  const resetFilters = () => { setFilter("all"); setCategory("all"); };

  return <>
    <PageHeader eyebrow="مساحة العمل" title="مهام اليوم" description="اختر المهمة، ابدأها بوضوح، ثم احفظ نتيجتها من مكان واحد." actions={<Link href="/focus"><Button variant="secondary"><Focus size={18} />جلسة تركيز</Button></Link>} />
    {activeTasks.length > 0 && <section className="active-tasks-section" aria-labelledby="active-tasks-title"><SectionHeader title="المهام النشطة" description="قيد التنفيذ أو متوقفة مؤقتًا أو محفوظة كإنجاز جزئي." action={<Badge tone="primary">{activeTasks.length} مهام</Badge>} /><div id="active-tasks-title" className="task-grid active-tasks-grid">{activeTasks.map((task) => <TaskCard task={task} compact openOnClick key={task.id} />)}</div></section>}
    <section className="tasks-filter-section" aria-label="تصفية المهام">
      <div className="tasks-toolbar"><Tabs value={filter} onValueChange={setFilter} tabs={[{ value: "all", label: "كل المهام" }, { value: "morning", label: "مجموعة الصباح" }, { value: "active", label: "قيد التقدم" }]} /></div>
      <div className="task-category-filters" role="group" aria-label="التصنيف"><button type="button" className={cn("task-category-chip", category === "all" && "task-category-chip-active")} aria-pressed={category === "all"} onClick={() => setCategory("all")}>الكل</button>{taskCategories.map((item) => <button type="button" key={item} className={cn("task-category-chip", category === item && "task-category-chip-active")} aria-pressed={category === item} onClick={() => setCategory(item)}>{taskCategoryNames[item]}</button>)}</div>
    </section>
    <SectionHeader title="كل المهام" description={category === "all" ? "القائمة الكاملة لمهام اليوم." : `المهام ضمن تصنيف ${taskCategoryNames[category]}.`} />
    {shownTasks.length ? <div className="task-grid">{shownTasks.map((task) => <TaskCard task={task} openOnClick key={task.id} />)}</div> : <EmptyState title="لا توجد مهام ضمن هذا الاختيار." description="جرّب تغيير الحالة أو التصنيف لرؤية مهام أخرى." action={<Button variant="outline" onClick={resetFilters}>إظهار كل المهام</Button>} />}
  </>;
}

function SpecializedTaskFields({ task, onProgress, onDetails }: { task: NonNullable<ReturnType<typeof useDemo>["tasks"]>[number]; onProgress: (value: number) => void; onDetails: (details: NonNullable<typeof task.details>) => void }) {
  const entry = getTaskRegistryEntry(task);
  const details = task.details ?? {};
  const stringDetail = (key: string, fallback = "") => typeof details[key] === "string" ? details[key] as string : fallback;
  if (task.type === "quran") return <QuranBatchReader task={task} onProgress={onProgress} onDetails={onDetails} />;
  if (task.type === "water") return <WaterTracker task={task} onProgress={onProgress} onDetails={onDetails} />;
  if (task.type === "prayer") return <PrayerTracker task={task} onProgress={onProgress} onDetails={onDetails} />;
  if (task.type === "adhkar") return <AdhkarReader task={task} onProgress={onProgress} onDetails={onDetails} />;
  if (task.type === "reading") return <ReadingTracker task={task} onProgress={onProgress} onDetails={onDetails} />;
  if (task.type === "general" && task.id === "lesson-review") return <ReviewTracker task={task} onProgress={onProgress} onDetails={onDetails} />;
  if (task.type === "general" && task.id === "skill") return <ReviewTracker task={task} onProgress={onProgress} onDetails={onDetails} title="تطبيق المهارة" description="سجّل دقائق التدريب اليومية، ويمكنك إنهاء المهمة بعد حفظ الوقت." />;
  if (task.type === "sleep") {
    const sleptAt = stringDetail("sleptAt", "22:30"); const wokeAt = stringDetail("wokeAt", "06:30");
    const updateSleep = (key: "sleptAt" | "wokeAt", value: string) => { const nextSleep = key === "sleptAt" ? value : sleptAt; const nextWake = key === "wokeAt" ? value : wokeAt; onDetails({ [key]: value }); if (!nextSleep || !nextWake) return; const [sleepHour, sleepMinute] = nextSleep.split(":").map(Number); const [wakeHour, wakeMinute] = nextWake.split(":").map(Number); let minutes = wakeHour * 60 + wakeMinute - (sleepHour * 60 + sleepMinute); if (minutes <= 0) minutes += 24 * 60; onProgress(Math.round(minutes / 6) / 10); };
    return <Card className="task-specialized-fields"><SectionHeader title="سجل النوم" description="يُحسب العبور من منتصف الليل بصورة صحيحة." /><div className="sleep-time-grid"><Input type="time" label="وقت النوم" value={sleptAt} onChange={(event) => updateSleep("sleptAt", event.target.value)} /><Input type="time" label="وقت الاستيقاظ" value={wokeAt} onChange={(event) => updateSleep("wokeAt", event.target.value)} /></div><p className="field-hint">المدة المسجلة: {task.current} ساعة من هدف {task.target} ساعات.</p></Card>;
  }
  if (task.type === "sport") return <SportTracker task={task} onProgress={onProgress} onDetails={onDetails} />;
  return <Card className="task-specialized-fields"><SectionHeader title={entry.title} description={entry.description} /><label className="field"><span className="field-label">ملاحظات اليوم</span><textarea className="input" rows={4} value={stringDetail("notes")} placeholder="اكتب ما يساعدك على تذكّر تقدمك…" onChange={(event) => onDetails({ notes: event.target.value })} /></label></Card>;
}


export function TaskActivityView({ taskId }: { taskId: string }) {
  const { tasks, setTaskStatus, updateTaskDetails, updateTaskProgress } = useDemo();
  const selectedTask = tasks.find((task) => task.id === taskId);
  const type = selectedTask?.type ?? "general";
  const config = activityMeta[type];
  const registryEntry = selectedTask ? getTaskRegistryEntry(selectedTask) : null;
  if (!selectedTask) return <EmptyState title="المهمة غير موجودة" description="ربما حُذفت المهمة أو لم تعد متاحة لهذا المستخدم." action={<Link href="/tasks"><Button variant="outline">العودة إلى المهام</Button></Link>} />;
  const detailProgress = Math.round((selectedTask.current / selectedTask.target) * 100);
  const guide = getTaskGuideCopy(selectedTask.status);
  return <><PageHeader eyebrow="محطة يومية" title={registryEntry?.title ?? config.title} description={registryEntry?.description ?? config.description} actions={<Link href="/tasks"><Button variant="outline">كل المهام</Button></Link>} /><section className="activity-hero"><div className="activity-hero-icon"><ActivityIcon type={selectedTask.type} size={32} /></div><div><Badge tone="teal">هدف اليوم</Badge><h2>{selectedTask.title}</h2><p>{selectedTask.supportingText ?? selectedTask.goalLabel}</p></div><div className="activity-metric"><span>{config.detail}</span><strong>{selectedTask.current} <small>/ {selectedTask.target} {selectedTask.unit}</small></strong></div></section><section className="activity-start-guide" aria-labelledby="start-guide-title"><div><Badge tone={selectedTask.status === "completed" ? "success" : selectedTask.status === "partial" ? "teal" : "primary"}>{guide.eyebrow}</Badge><h3 id="start-guide-title">{guide.title}</h3><p>{selectedTask.status === "running" ? "المهمة تعمل الآن؛ انتقل إلى مساحة التسجيل لتكمل من حيث توقفت." : selectedTask.status === "paused" ? "تم حفظ الوقت والحالة. استأنف المهمة ثم تابع تسجيل تقدمك." : selectedTask.type === "quran" ? `ابدأ وردك المحدد: ${selectedTask.supportingText ?? "اختر السورة"}. اختر السورة أدناه ثم علّم الآيات التي قرأتها.` : selectedTask.type === "reading" ? `الكتاب المحدد: ${selectedTask.supportingText ?? "حدّد كتابك"}. ابدأ من آخر صفحة ثم سجّل صفحة التوقف.` : "ستجد أدوات البدء والتسجيل الخاصة بهذه المهمة أسفل هذه الخطوة."}</p></div><Button variant={selectedTask.status === "running" || selectedTask.status === "completed" || selectedTask.status === "closed" ? "outline" : "primary"} onClick={() => { if (["not_started", "paused", "partial", "not_completed"].includes(selectedTask.status)) setTaskStatus(selectedTask.id, "running"); document.getElementById("task-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><Play size={17} />{guide.action}</Button></section><div className="activity-layout"><div><TaskCard task={selectedTask} /><TaskDetailTimer task={selectedTask} /><div id="task-workspace" className="task-workspace"><SpecializedTaskFields task={selectedTask} onProgress={(value) => updateTaskProgress(selectedTask.id, value)} onDetails={(details) => updateTaskDetails(selectedTask.id, details)} /></div></div><Card><SectionHeader title="تقدم المحطة" description="احسب النسبة من القيمة الحالية والهدف نفسه." /><div className="quick-progress"><div><strong>{detailProgress}%</strong><span>من هدفك المحدد</span></div><ProgressBar value={detailProgress} tone="teal" />{selectedTask.type === "prayer" ? <p>يُحدَّث هذا التقدم تلقائيًا عند تسجيل وقت كل صلاة وإكمالها.</p> : <div className="quick-progress-actions"><Button variant="outline" onClick={() => updateTaskProgress(selectedTask.id, selectedTask.current - 1)}>- خطوة</Button><Button variant="secondary" onClick={() => updateTaskProgress(selectedTask.id, selectedTask.current + 1)}>+ خطوة</Button></div>}</div></Card></div><section className="activity-support-grid"><Card><h3>بياناتك محفوظة</h3><p>تفاصيل هذه المحطة مرتبطة بالمهمة والمستخدم وتاريخ اليوم، وتتزامن تلقائيًا بين تبويبات المتصفح.</p></Card><Card><h3>الوقت الفعلي</h3><strong className="large-inline-metric"><Clock3 size={20} />{formatMinutes(selectedTask.actualMinutes)}</strong><p>الوقت السابق محفوظ حتى لو أغلقت المهمة أو أوقفتها مؤقتًا.</p></Card></section></>;
}

export function FocusView() {
  const { cancelFocus, chooseFocusDuration, finishFocus, focus, pauseFocus, resumeFocus, startFocus } = useDemo();
  const remainingMinutes = Math.floor(focus.secondsLeft / 60).toString().padStart(2, "0");
  const remainingSeconds = (focus.secondsLeft % 60).toString().padStart(2, "0");
  const isPaused = focus.status === "paused";
  const isFinished = focus.status === "completed" || focus.status === "cancelled";
  return <div className="focus-page"><PageHeader eyebrow="مساحة هادئة" title="التركيز" description="اختر المدة أولًا، ثم ابدأ عندما تكون جاهزًا." /><section className="focus-room"><div className="focus-task-label"><Focus size={19} />جلسة تركيز شخصية</div><div className="focus-clock" aria-label={`الوقت المتبقي ${remainingMinutes}:${remainingSeconds}`}><strong dir="ltr">{remainingMinutes}:{remainingSeconds}</strong><span>متبقي من {focus.duration} دقيقة</span></div><div className="duration-selector" aria-label="اختيار مدة الجلسة">{[15, 25, 45, 60].map((duration) => <button type="button" key={duration} className={cn(focus.duration === duration && "duration-active")} onClick={() => chooseFocusDuration(duration)} disabled={focus.isRunning}>{duration} د</button>)}</div><div className="focus-actions">{focus.isRunning ? <Button size="lg" variant="outline" onClick={pauseFocus}>إيقاف مؤقت</Button> : <Button size="lg" onClick={isPaused ? resumeFocus : startFocus}><Play size={19} />{isPaused ? "استئناف" : isFinished ? "ابدأ جلسة جديدة" : "ابدأ"}</Button>}{focus.status !== "idle" && <Button size="lg" variant="ghost" onClick={finishFocus}>إنهاء الجلسة</Button>}{focus.status !== "idle" && <Button size="lg" variant="ghost" onClick={cancelFocus}>إلغاء الجلسة</Button>}</div><p className="focus-note"><Timer size={16} />لا تبدأ المدة تلقائيًا عند اختيارها، ويُحفظ الوقت عند الإيقاف المؤقت.</p></section></div>;
}

export function StreaksView() {
  const { streakData, generalStreakTitle, taskStreaks } = useDemo();
  return <>
    <PageHeader eyebrow="استمراريتك" title="الاستريك العام والتفصيلي" description="تابع استمراريتك العامة، ثم اعرف أي مهمة تحافظ عليها يومًا بعد يوم." />
    <section className="streak-celebration"><span><Flame size={28} /></span><div><strong>{generalStreakTitle.label}</strong><p>{generalStreakTitle.nextMilestone ? `تبقى ${generalStreakTitle.nextMilestone - generalStreakTitle.days} يومًا للوصول إلى المرحلة التالية.` : "وصلت إلى أعلى مرحلة مسجلة حتى الآن."}</p></div><b><Flame size={16} aria-hidden="true" />{streakData.current} يوم</b></section>
    <div className="streak-stats"><Card><Flame size={24} /><span>الاستريك العام الحالي</span><strong>{streakData.current} يومًا</strong><small>{generalStreakTitle.label}</small></Card><Card><Award size={24} /><span>أفضل استريك عام</span><strong>{streakData.best} يومًا</strong></Card><Card><CircleCheck size={24} /><span>أيام ناجحة</span><strong>{streakData.successfulDays}</strong></Card></div>
    <Card className="streak-rules-card"><SectionHeader title="الاستريكات التفصيلية" description="كل مهمة لها عداد مستقل ولقب خاص بها." /><div className="task-streak-grid">{taskStreaks.map((entry) => <article className="task-streak-card" key={entry.taskId}><div className="task-streak-card-head"><div><strong>{entry.taskTitle}</strong><span>{entry.title}</span></div><Badge tone={entry.isTodaySuccessful ? "success" : entry.current > 0 ? "warning" : "neutral"}>{entry.current} يوم</Badge></div><div className="task-streak-metrics"><span>أفضل: <strong>{entry.best}</strong></span><span>أيام ناجحة: <strong>{entry.successfulDays}</strong></span>{entry.nextMilestone && <span>المرحلة القادمة: <strong>{entry.nextMilestone}</strong></span>}</div><ProgressBar value={entry.milestoneProgress} tone={entry.isTodaySuccessful ? "success" : "teal"} /><div className="task-streak-history">{entry.history.slice(-14).map((day) => <i key={`${entry.taskId}-${day.date}`} className={`streak-day streak-${day.status}`} title={`${day.date}: ${day.status}`} />)}</div></article>)}</div></Card>
    <Card className="streak-map-card"><SectionHeader title="خريطة الاستريك العام" description="كل مربع يمثل يومًا واحدًا من سجل الاستمرارية." /><div className="streak-map">{streakData.history.map((day) => <span key={day.date} title={`${day.date}: ${day.status}`} aria-label={`${day.date}: ${day.status}`} className={cn("streak-day", `streak-${day.status}`)} />)}</div><div className="streak-legend"><span><i className="streak-successful" />ناجح</span><span><i className="streak-unsuccessful" />لم يكتمل</span><span><i className="streak-today" />اليوم</span><span><i className="streak-future" />قادِم</span></div></Card>
    <section className="streak-tips"><TriangleAlert size={22} /><div><strong>كيف ينكسر الاستريك؟</strong><p>استريك المهمة ينكسر إذا لم تُنجز المهمة في يومها. أما الاستريك العام فيعتمد على نجاح اليوم ككل.</p></div></section>
  </>;
}
export function CompetitionView() {
  const { rankings } = useDemo();
  return <><PageHeader eyebrow="المجموعة" title="الترتيب" description="مقارنة مشجعة تركّز على التقدم والاستمرارية." /><section className="ranking-podium">{rankings.slice(0, 3).map((entry) => <Card key={entry.participantId} className={cn("podium-card", `podium-${entry.rank}`)}><span className="podium-rank">{entry.rank}</span><UserAvatar initials={entry.initials} color={entry.avatarColor} size="lg" /><strong>{entry.name}</strong><span>{entry.score} نقطة</span><Badge tone={entry.rank === 1 ? "warning" : "teal"}><Flame size={13} />{entry.streak} أيام</Badge></Card>)}</section><Card><SectionHeader title="كل المشاركين" description="يُحدّث الترتيب تلقائيًا من تقدم المجموعة المحفوظ." /><div className="ranking-list">{rankings.map((entry) => <article key={entry.participantId}><span className={cn("rank-chip", `rank-${entry.rank}`)}>{entry.rank}</span><UserAvatar initials={entry.initials} color={entry.avatarColor} size="md" /><strong>{entry.name}</strong><div><ProgressBar value={entry.progress} tone="teal" /><span>{entry.progress}% من رحلة اليوم</span></div><span className="ranking-score">{entry.score}</span></article>)}</div></Card></>;
}

export function HonorsView() {
  const { activeParticipant, rankings } = useDemo();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const periodFactor = period === "daily" ? .86 : period === "monthly" ? 1.12 : 1;
  const ranked = rankings.map((entry) => ({
    ...entry,
    score: Math.round(entry.score * periodFactor),
    progress: Math.min(100, Math.round(entry.progress * (period === "daily" ? .94 : period === "monthly" ? 1.08 : 1))),
  }));
  const leaders = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
  const levelIndex = Math.min(LEVEL_NAMES.length - 1, Math.floor(activeParticipant.progress / 100 * LEVEL_NAMES.length));
  const nextLevel = LEVEL_NAMES[Math.min(LEVEL_NAMES.length - 1, levelIndex + 1)];

  return <div className="honors-page">
    <section className="levels-hero"><div className="levels-badge"><Trophy size={24} /></div><div><span className="eyebrow">مستواك الحالي</span><h2>{LEVEL_NAMES[levelIndex]}</h2><p>{nextLevel === LEVEL_NAMES[levelIndex] ? "وصلت إلى أعلى مستوى حاليًا." : `تبقى ${Math.max(0, Math.round(((levelIndex + 1) / LEVEL_NAMES.length) * 100) - activeParticipant.progress)}% للوصول إلى ${nextLevel}`}</p></div><div className="levels-track"><ProgressBar value={activeParticipant.progress} tone="teal" /><small>{activeParticipant.progress}% من معادلة المستوى</small></div></section>
    <div className="levels-ladder" aria-label="سلم المستويات">{LEVEL_NAMES.map((name, index) => <span className={cn(index === levelIndex && "levels-ladder-active")} key={name}>{name}</span>)}</div>
    <div className="honors-heading-row">
      <PageHeader eyebrow="تميّز المجموعة" title="لوحة الشرف" description="احتفاء بالاجتهاد والاستمرارية؛ تابع أصحاب الأثر الجميل واستلهم من تقدّمهم." />
      <Tabs value={period} onValueChange={setPeriod} tabs={[{ value: "daily", label: "اليوم" }, { value: "weekly", label: "هذا الأسبوع" }, { value: "monthly", label: "هذا الشهر" }]} />
    </div>

    <section className="honors-podium" aria-label="أصحاب المراكز الثلاثة الأولى">
      {leaders.map((entry) => {
        const sparkPoints = entry.rank === 1 ? "0,38 32,31 64,34 96,16 128,23 160,4" : entry.rank === 2 ? "0,36 32,31 64,42 96,23 128,33 160,16" : "0,27 32,37 64,23 96,31 128,16 160,30";
        return <article key={entry.participantId} className={cn("honor-place", `honor-place-${entry.rank}`)}>
          <div className="honor-avatar-wrap">
            <UserAvatar initials={entry.initials} color={entry.avatarColor} size="xl" />
            <span className="honor-rank-badge">{entry.rank === 1 ? <Trophy size={17} /> : entry.rank}</span>
          </div>
          <div className="honor-person"><strong>{entry.name}</strong>{entry.rank === 1 && <Crown size={17} aria-label="متصدر لوحة الشرف" />}</div>
          <p>{entry.rank === 1 ? "صاحب الأثر الأبرز هذا الأسبوع" : entry.rank === 2 ? "يتقدّم بثبات نحو الصدارة" : "حضور مميز واستمرارية رائعة"}</p>
          <div className="honor-metrics"><span><b>{entry.progress}%</b> إنجاز</span><span><Flame size={13} /><b>{entry.streak}</b> يومًا</span></div>
          <svg className="honor-spark" viewBox="0 0 160 48" preserveAspectRatio="none" aria-hidden="true"><polyline points={sparkPoints} /></svg>
        </article>;
      })}
    </section>

    <Card className="honors-ranking-card">
      <div className="honors-table-title"><div><span className="honors-title-icon"><Medal size={20} /></span><div><h2>الترتيب العام</h2><p>يُحدّث تلقائيًا حسب إنجازات الفترة المختارة.</p></div></div><span>{ranked.length} مشاركين</span></div>
      <div className="honors-table-head" aria-hidden="true"><span>المركز</span><span>المشارك</span><span>معدل الإنجاز</span><span>النقاط</span><span>السلسلة</span><span>الاتجاه</span></div>
      <div className="honors-ranking-list">
        {ranked.map((entry, index) => {
          const isCurrent = entry.participantId === activeParticipant.id;
          const trend = index % 3;
          return <article key={entry.participantId} className={cn(isCurrent && "honors-current-user")}>
            <strong className={cn("honors-rank-number", entry.rank <= 3 && `honors-rank-${entry.rank}`)}>{entry.rank}</strong>
            <div className="honors-member"><UserAvatar initials={entry.initials} color={entry.avatarColor} size="md" /><span><strong>{isCurrent ? `${entry.name} (أنت)` : entry.name}</strong><small>{isCurrent ? "حسابك الحالي" : "عضو في رحلة التغيير"}</small></span></div>
            <div className="honors-progress"><span><b>{entry.progress}%</b><small>إنجاز</small></span><ProgressBar value={entry.progress} tone={entry.rank === 1 ? "warning" : "teal"} /></div>
            <strong className="honors-score">{entry.score.toLocaleString("ar-EG")}</strong>
            <span className="honors-streak"><Flame size={15} />{entry.streak} أيام</span>
            <span className={cn("honors-trend", trend === 0 ? "trend-up" : trend === 2 ? "trend-down" : "trend-steady")}>{trend === 0 ? <TrendingUp size={18} /> : trend === 2 ? <TrendingDown size={18} /> : <Minus size={18} />}</span>
          </article>;
        })}
      </div>
    </Card>
  </div>;
}

function ReportChart({ report }: { report: Report }) { const max = Math.max(...report.points.map((point) => point.progress)); return <div className="report-chart" aria-label="رسم تقدم الفترة">{report.points.map((point) => <div className="chart-column" key={point.label}><span className="chart-value">{point.progress}%</span><i style={{ height: `${Math.max(12, (point.progress / max) * 100)}%` }} /><small>{point.label}</small></div>)}</div>; }

export function AnalyticsView() {
  const { reports } = useDemo();
  const report = reports.weekly;
  return <><PageHeader eyebrow="فهم أدائك" title="تحليلي" description="مؤشرات شخصية مفيدة، لا لوحة BI مزدحمة." /><div className="analytics-grid"><Card className="analytics-main"><SectionHeader title="اتجاه التقدم" description="الأسبوع الحالي" action={<BarChart3 size={20} className="text-[var(--primary)]" />} /><ReportChart report={report} /></Card><Card><SectionHeader title="الاستمرارية" /><div className="consistency-score"><CircleProgress value={report.averageProgress} label="متوسط التقدم" /><p>{report.successfulDays} أيام ناجحة في الفترة الحالية؛ حافظ على خطوة يومية قابلة للتكرار.</p></div></Card></div><section className="insight-grid"><Card><span className="insight-icon insight-good"><Target size={22} /></span><h3>متوسط الإنجاز</h3><strong>{report.averageProgress}%</strong><p>محسوب من سجل تقدمك الفعلي خلال الفترة المحددة.</p></Card><Card><span className="insight-icon insight-watch"><Lightbulb size={22} /></span><h3>الخطوة التالية</h3><strong>{report.completionRate < 70 ? "مهمة قصيرة" : "حافظ على الإيقاع"}</strong><p>{report.completionRate < 70 ? "ابدأ بالمهمة الأقصر لتقليل مقاومة البداية." : "استمر على نفس الوتيرة مع فواصل راحة مناسبة."}</p></Card><Card><span className="insight-icon insight-teal"><Clock3 size={22} /></span><h3>أطول مهمة</h3><strong>{report.mostTimeConsumingTask}</strong><p>هذا طبيعي ما دامت تضيف لك قيمة واضحة.</p></Card></section></>;
}

export function HistoryView() {
  const { historyDays } = useDemo();
  const [selectedDay, setSelectedDay] = useState<typeof historyDays[number] | null>(null);
  return <>
    <PageHeader eyebrow="الأيام السابقة" title="السجل" description="عودة منظمة للأيام الماضية، مع ما يهمك فقط." />
    <Card>
      <div className="history-list">{historyDays.map((day) => <article key={day.date}>
        <span className="history-marker"><CalendarDays size={17} /></span>
        <div className="history-date"><strong>{day.label}</strong><span>{day.status}</span></div>
        <div className="history-progress"><ProgressBar value={day.progress} tone={day.progress > 85 ? "success" : "teal"} /><span>{day.progress}% تقدم</span></div>
        <span className="history-time"><Clock3 size={16} />{formatMinutes(day.minutes)}</span>
        <span className="history-streak"><Flame size={16} />{day.streak}</span>
        <IconButton label={`عرض تفاصيل ${day.date}`} onClick={() => setSelectedDay(day)}><ChevronLeft size={18} /></IconButton>
      </article>)}</div>
    </Card>
    <Dialog
      open={Boolean(selectedDay)}
      onClose={() => setSelectedDay(null)}
      title={selectedDay?.label ?? "تفاصيل اليوم"}
      description="ملخص الإنجاز والوقت والاستمرارية المسجلة في هذا اليوم."
      footer={<Button onClick={() => setSelectedDay(null)}>تم</Button>}
    >
      {selectedDay && <div className="participant-profile-metrics">
        <div><span>الحالة</span><strong>{selectedDay.status}</strong></div>
        <div><span>التقدم</span><strong>{selectedDay.progress}%</strong></div>
        <div><span>الوقت الفعلي</span><strong>{formatMinutes(selectedDay.minutes)}</strong></div>
        <div><span>السلسلة</span><strong>{selectedDay.streak} يومًا</strong></div>
      </div>}
    </Dialog>
  </>;
}
export function ReportsView() {
  const [period, setPeriod] = useState<Report["period"]>("weekly");
  const { pushToast, reports, participants, tasks } = useDemo();
  const [participantFilter, setParticipantFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);
  const report = reports[period]; const exportCurrent = (format: "pdf" | "excel") => { exportReport(report.points, format, { filename: "journey-" + period + "-" + participantFilter + "-" + taskFilter, title: "تقرير " + period, metadata: { completionRate: report.completionRate, totalMinutes: report.totalMinutes } }); pushToast({ tone: "success", title: "تم تنزيل التقرير", body: "تم إنشاء ملف " + format.toUpperCase() + " للفترة المحددة." }); };
  return <><PageHeader eyebrow="تقاريرك" title="التقارير" description="ملخص يومي وأسبوعي وشهري مع تنزيل فوري للفترة المختارة." actions={<div className="export-actions"><Button size="sm" variant="outline" onClick={() => exportCurrent("pdf")}><FileText size={16} />PDF</Button><Button size="sm" variant="outline" onClick={() => exportCurrent("excel")}><FileSpreadsheet size={16} />Excel</Button></div>} /><div className="report-filters"><label className="field"><span className="field-label">المشارك</span><select className="input" value={participantFilter} onChange={(event) => setParticipantFilter(event.target.value)}><option value="all">كل المشاركين</option>{participants.filter((participant) => participant.role === "participant").map((participant) => <option value={participant.id} key={participant.id}>{participant.name}</option>)}</select></label><label className="field"><span className="field-label">المهمة</span><select className="input" value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)}><option value="all">كل المهام</option>{tasks.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label></div><Tabs value={period} onValueChange={setPeriod} tabs={[{ value: "daily", label: "يومي" }, { value: "weekly", label: "أسبوعي" }, { value: "monthly", label: "شهري" }]} /><div className="report-stat-grid"><Card><span>نسبة الإنجاز</span><strong>{report.completionRate}%</strong><ProgressBar value={report.completionRate} /></Card><Card><span>الوقت الفعلي</span><strong>{formatMinutes(report.totalMinutes)}</strong><Timer size={20} /></Card><Card><span>أيام ناجحة</span><strong>{report.successfulDays}</strong><CircleCheck size={20} /></Card><Card><span>ملخص الترتيب</span><strong className="report-copy">{report.rankingSummary}</strong><Trophy size={20} /></Card></div><Card className="ai-report-card"><div><Badge tone="primary"><Sparkles size={14} />تحليل ذكي</Badge><h3>ملخص أدائك للفترة</h3><p>{aiSummaryOpen ? "أداؤك يتحسن عندما تبدأ بالمحطات القصيرة، ووقت الرياضة والقراءة يحتاجان توزيعًا أبكر خلال اليوم." : "اعرض قراءة مختصرة للتقرير بعد اختيار الفلاتر."}</p></div><Button variant="outline" onClick={() => setAiSummaryOpen((value) => !value)}>{aiSummaryOpen ? "إخفاء الملخص" : "توليد الملخص"}</Button></Card>
    <Card className="report-chart-card"><SectionHeader title="مسار التقدم" description="رسم واضح لملاحظة الاتجاه فقط." /><ReportChart report={report} /></Card><div className="report-detail-grid"><Card><h3>أكثر مهمة استهلكت وقتًا</h3><strong>{report.mostTimeConsumingTask}</strong><p>استخدم هذه الإشارة لتوازن وقتك، لا لتقلل من أثرها.</p></Card><Card><h3>متوسط التقدم</h3><strong>{report.averageProgress}%</strong><p>هذه الأرقام محسوبة من السجل المحلي الحالي.</p></Card></div></>;
}

export function AiView() { return <AIAssistantHero />; }
