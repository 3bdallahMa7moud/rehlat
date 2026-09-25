"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowDownUp, ArrowLeft, Award, BarChart3, BedDouble, BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft, CircleCheck, ClipboardList, Clock3, Droplets, Dumbbell, FileSpreadsheet, FileText, Flame, Info, Layers3, Mosque, Lightbulb, ListTodo, Medal, MessageCircle, Moon, MoreHorizontal, Pause, Play, Search, SlidersHorizontal, Sparkles, Target, Timer, Trophy, Users, X } from "lucide-react";
import { AIAssistantHero } from "@/components/features/AIAssistant";
import { TaskCard, TaskGlyph } from "@/components/features/TaskCard";
import { filterTasks, getTaskGuideCopy, isActiveTask, taskCategories, taskCategoryNames } from "@/domain/tasks/task-presentation";
import { TaskDetailTimer } from "@/components/features/TaskDetailTimer";
import { AdhkarReader } from "@/components/features/ReligiousReaders";
import { QuranBatchReader } from "@/components/features/QuranBatchReader";
import { QuranReadingPage } from "@/components/features/QuranReadingPage";
import { PrayerActivityPage } from "@/components/features/PrayerActivityPage";
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
import { getEarnedTitleCards, getHonorHighlights, getPersonalHonorSummary } from "@/lib/honors";
import { useDemo } from "@/state/DemoContext";
import { getDayCompletionPresentation, getStreakDayLabel, getTaskStreakPresentation, getTaskStreakStatusLabel, getTaskStreakTodayLabel, matchesTaskStreakFilter, type TaskStreakFilter } from "@/lib/streak-presentation";
import type { Report, TaskCategory, TaskStatus, TaskType } from "@/types/models";
import focusStyles from "./FocusView.module.css";

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
  const dayCompletion = getDayCompletionPresentation(dayStatus, progress.percent);

  const dayCopy =
    dayStatus === "not_started"
      ? "اليوم ينتظر أول خطوة منك."
      : dayCompletion.kind === "full"
        ? "أغلقت محطات اليوم بنجاح."
        : dayCompletion.kind === "terminal-incomplete"
          ? "تم حفظ رحلة اليوم ونتائجها."
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
    dayCompletion.kind === "full"
      ? {
          tone: "success",
          title: "يومك محفوظ بالكامل",
          body: "راجع ملخص اليوم وخذ لحظة للاحتفال بما أنجزته.",
        }
      : dayCompletion.kind === "terminal-incomplete"
        ? { tone: "primary", title: "\u062a\u0645 \u062d\u0641\u0638 \u0631\u062d\u0644\u0629 \u0627\u0644\u064a\u0648\u0645", body: "\u062a\u0645 \u0625\u063a\u0644\u0627\u0642 \u0645\u0647\u0627\u0645 \u0627\u0644\u064a\u0648\u0645 \u0648\u062d\u0641\u0638 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0648\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0645\u0633\u062c\u0644." }
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
            : dayCompletion.kind === "full"
              ? "أحسنت، أغلقت رحلة اليوم."
              : dayCompletion.kind === "terminal-incomplete"
                ? "تم حفظ رحلة اليوم."
              : "أنت تمشي في الاتجاه الصحيح."}
        </h2>
        <p>
          {dayCompletion.kind === "full"
            ? "تم حفظ إنجازاتك ووقتك الفعلي. عُد غدًا بخطوة صغيرة جديدة."
            : dayCompletion.kind === "terminal-incomplete"
              ? "تم حفظ ما أنجزته والوقت المسجل لهذا اليوم."
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

    {dayCompletion.kind !== "active" ? <section className={cn("day-complete-panel", dayCompletion.kind === "terminal-incomplete" && "day-terminal-incomplete")}>
      <span className="day-complete-icon">{dayCompletion.kind === "full" ? <Award size={30} /> : <CircleCheck size={30} />}</span>
      <div><p className="eyebrow">{dayCompletion.kind === "full" ? "اكتملت رحلة اليوم" : "تم حفظ رحلة اليوم"}</p><h2>{dayCompletion.kind === "full" ? "خطواتك محفوظة، والرحلة مستمرة." : "حُفظ ما أنجزته والوقت المسجل."}</h2><p>{dayCompletion.kind === "full" ? <>أنجزت {progress.completed} من {progress.total} مهام خلال {formatMinutes(progress.actualMinutes)} وحافظت على سلسلة {streakData.current} يومًا.</> : <>أُغلقت مهام اليوم مع حفظ النتائج والوقت المسجل خلال {formatMinutes(progress.actualMinutes)}.</>}</p></div>
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
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeTasks = tasks.filter(isActiveTask);
  const morningTasks = tasks.filter((task) => task.group === "morning");
  const morningComplete = morningTasks.length > 0 && morningTasks.every((task) => task.status === "completed");
  const nextTasks = tasks.filter((task) => task.group !== "morning" && task.status !== "completed").slice(0, 3);
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const pendingCount = tasks.length - completedCount;
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const primaryTask = [...tasks]
    .filter((task) => !["completed", "closed"].includes(task.status))
    .sort((left, right) => (dashboardTaskPriority[left.status] ?? 99) - (dashboardTaskPriority[right.status] ?? 99))[0];
  const primaryTaskProgress = primaryTask?.target ? Math.min(100, Math.round((primaryTask.current / primaryTask.target) * 100)) : 0;
  const appliedFilterCount = Number(Boolean(search.trim())) + Number(filter !== "all") + Number(category !== "all") + Number(statusFilter !== "all");
  const statusOptions: Array<{ value: TaskStatus | "all"; label: string }> = [
    { value: "all", label: "الكل" },
    { value: "completed", label: "مكتملة" },
    { value: "partial", label: "جزئية" },
    { value: "running", label: "جارية" },
    { value: "not_started", label: "لم تبدأ" },
  ];
  const shownTasks = filterTasks(tasks, filter, category).filter((task) => {
    const query = search.trim().toLocaleLowerCase("ar");
    const matchesSearch = !query || `${task.title} ${task.goalLabel} ${task.supportingText ?? ""}`.toLocaleLowerCase("ar").includes(query);
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const resetFilters = () => { setFilter("all"); setCategory("all"); setStatusFilter("all"); setSearch(""); setFiltersOpen(false); };

  return <div className="tasks-page">
    <PageHeader
      title="مهامي"
      description="تابع مهامك اليومية وابدأ تنفيذ ما عليك اليوم."

    />

    <section className="tasks-summary-grid" aria-label="ملخص مهام اليوم">
      <article className="tasks-summary-card tasks-summary-card-primary"><span className="tasks-summary-icon"><ClipboardList size={22} /></span><div><strong>{tasks.length}</strong><span>مهام اليوم</span><small>إجمالي المحطات</small></div></article>
      <article className="tasks-summary-card tasks-summary-card-success"><span className="tasks-summary-icon"><CircleCheck size={22} /></span><div><strong>{completedCount}</strong><span>مكتملة</span><small>تم حفظها اليوم</small></div></article>
      <article className="tasks-summary-card tasks-summary-card-warning"><span className="tasks-summary-icon"><Target size={22} /></span><div><strong>{pendingCount}</strong><span>متبقية</span><small>خطوات يمكنك البدء بها</small></div></article>
    </section>

    {primaryTask && <section className="tasks-mobile-focus" aria-labelledby="tasks-mobile-focus-title">
      <div className="tasks-mobile-focus-kicker"><span><Sparkles size={15} />خطوتك التالية</span><strong>{completionRate}% من اليوم</strong></div>
      <div className="tasks-mobile-focus-heading">
        <span className="tasks-mobile-focus-icon"><TaskGlyph task={primaryTask} size={24} /></span>
        <div><Badge tone="teal">{taskCategoryNames[primaryTask.category]}</Badge><h2 id="tasks-mobile-focus-title">{primaryTask.title}</h2><p>{primaryTask.supportingText ?? primaryTask.goalLabel}</p></div>
      </div>
      <div className="tasks-mobile-focus-progress"><span>{primaryTask.goalLabel}</span><strong>{primaryTask.current} / {primaryTask.target} {primaryTask.unit}</strong></div>
      <ProgressBar value={primaryTaskProgress} tone="teal" />
      <div className="tasks-mobile-focus-footer"><Link href={`/tasks/${primaryTask.id}`} className="tasks-mobile-focus-action button button-primary"><Play size={17} />{nextActionCopy[primaryTask.status] ?? "عرض المهمة"}</Link><span>{pendingCount} مهام متبقية</span></div>
    </section>}

    {activeTasks.length > 0 && <section className="tasks-board tasks-active-board" aria-labelledby="active-tasks-title">
      <div className="tasks-section-heading"><div><span className="tasks-section-icon tasks-section-icon-primary"><Play size={18} /></span><div><h2 id="active-tasks-title">قيد التنفيذ</h2><p>المهام التي تعمل عليها حالياً</p></div></div><Badge tone="primary">{activeTasks.length} مهام</Badge></div>
      <div className="task-grid tasks-featured-grid">{activeTasks.map((task) => <TaskCard task={task} compact openOnClick key={task.id} />)}</div>
    </section>}

    <section className="tasks-board tasks-morning-board" aria-labelledby={morningComplete ? "next-tasks-title" : "morning-tasks-title"}>
      <div className="tasks-section-heading"><div><span className={cn("tasks-section-icon", morningComplete ? "tasks-section-icon-primary" : "tasks-section-icon-warning")}>{morningComplete ? <Play size={18} /> : <Sparkles size={18} />}</span><div><h2 id={morningComplete ? "next-tasks-title" : "morning-tasks-title"}>{morningComplete ? "الخطوة التالية" : "مهام الصباح"}</h2><p>{morningComplete ? "أحسنت، انتقل تلقائيًا إلى باقي مهام يومك." : "ابدأ يومك بالمهام الأساسية"}</p></div></div><span className="tasks-section-note">{morningComplete ? "مهام مقترحة" : "روتين البداية"}</span></div>
      {morningComplete ? nextTasks.length ? <div className="task-grid tasks-morning-grid">{nextTasks.map((task) => <TaskCard task={task} compact openOnClick key={task.id} />)}</div> : <div className="tasks-morning-complete"><CircleCheck size={18} /><div><strong>اكتملت مهام اليوم</strong><span>تم حفظ كل إنجازاتك، ولا توجد مهام أخرى متبقية.</span></div></div> : <div className="task-grid tasks-morning-grid">{morningTasks.map((task) => <TaskCard task={task} compact openOnClick key={task.id} />)}</div>}
    </section>
    <section className="tasks-filter-panel" aria-label="تصفية المهام">
      <div className="tasks-filter-head">
        <label className="tasks-search-field"><Search size={18} aria-hidden="true" /><span className="sr-only">البحث عن مهمة</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن مهمة..." /></label>
        <button type="button" className="tasks-mobile-filter-toggle" aria-expanded={filtersOpen} aria-controls="tasks-filter-options" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={17} /><span>الفلاتر</span>{appliedFilterCount > 0 && <strong>{appliedFilterCount}</strong>}<ChevronDown size={16} /></button>
      </div>
      <div id="tasks-filter-options" className={cn("tasks-filter-options", filtersOpen && "tasks-filter-options-open")}>
        <div className="tasks-filter-group"><span className="tasks-filter-label">العرض:</span><div className="tasks-filter-chips">{([{ value: "all", label: "الكل" }, { value: "morning", label: "الصباحية" }, { value: "active", label: "قيد التنفيذ" }] as const).map((item) => <button type="button" key={item.value} className={cn("tasks-filter-chip", filter === item.value && "tasks-filter-chip-active")} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div></div>
        <div className="tasks-filter-group"><span className="tasks-filter-label">الحالة:</span><div className="tasks-filter-chips">{statusOptions.map((item) => <button type="button" key={item.value} className={cn("tasks-filter-chip", statusFilter === item.value && "tasks-filter-chip-active")} aria-pressed={statusFilter === item.value} onClick={() => setStatusFilter(item.value)}>{item.label}</button>)}</div></div>
        <div className="tasks-filter-divider" />
        <div className="tasks-filter-group"><span className="tasks-filter-label">الفئة:</span><div className="tasks-filter-chips">{(["all", ...taskCategories] as Array<TaskCategory | "all">).map((item) => <button type="button" key={item} className={cn("tasks-filter-chip", category === item && "tasks-filter-chip-active")} aria-pressed={category === item} onClick={() => setCategory(item)}>{item === "all" ? "الكل" : taskCategoryNames[item]}</button>)}</div></div>
      <button type="button" className="tasks-reset-button" onClick={resetFilters}>إعادة ضبط الفلاتر</button>
      </div>
    </section>

    <section className="tasks-board tasks-all-board" aria-labelledby="all-tasks-title">
      <div className="tasks-section-heading"><div><span className="tasks-section-icon tasks-section-icon-teal"><ListTodo size={18} /></span><div><h2 id="all-tasks-title">كل المهام</h2><p>جميع مهامك اليومية والأسبوعية</p></div></div><span className="tasks-section-count">{shownTasks.length} من {tasks.length}</span></div>
      {shownTasks.length ? <div className="task-grid tasks-all-grid">{shownTasks.map((task) => <TaskCard task={task} compact openOnClick key={task.id} />)}</div> : <EmptyState title="لا توجد مهام ضمن هذا الاختيار." description="جرّب تغيير الحالة أو الفئة لرؤية مهام أخرى." action={<Button variant="outline" onClick={resetFilters}>إظهار كل المهام</Button>} />}
    </section>
  </div>;
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
  if (selectedTask.type === "quran") return <QuranReadingPage taskId={selectedTask.id} />;
  if (selectedTask.type === "prayer") return <PrayerActivityPage taskId={selectedTask.id} />;
  const detailProgress = Math.round((selectedTask.current / selectedTask.target) * 100);
  const guide = getTaskGuideCopy(selectedTask.status);
  return <><PageHeader eyebrow="محطة يومية" title={registryEntry?.title ?? config.title} description={registryEntry?.description ?? config.description} actions={<Link href="/tasks"><Button variant="outline">كل المهام</Button></Link>} /><section className="activity-hero"><div className="activity-hero-icon"><ActivityIcon type={selectedTask.type} size={32} /></div><div><Badge tone="teal">هدف اليوم</Badge><h2>{selectedTask.title}</h2><p>{selectedTask.supportingText ?? selectedTask.goalLabel}</p></div><div className="activity-metric"><span>{config.detail}</span><strong>{selectedTask.current} <small>/ {selectedTask.target} {selectedTask.unit}</small></strong></div></section><section className="activity-start-guide" aria-labelledby="start-guide-title"><div><Badge tone={selectedTask.status === "completed" ? "success" : selectedTask.status === "partial" ? "teal" : "primary"}>{guide.eyebrow}</Badge><h3 id="start-guide-title">{guide.title}</h3><p>{selectedTask.status === "running" ? "المهمة تعمل الآن؛ انتقل إلى مساحة التسجيل لتكمل من حيث توقفت." : selectedTask.status === "paused" ? "تم حفظ الوقت والحالة. استأنف المهمة ثم تابع تسجيل تقدمك." : selectedTask.type === "reading" ? `الكتاب المحدد: ${selectedTask.supportingText ?? "حدّد كتابك"}. ابدأ من آخر صفحة ثم سجّل صفحة التوقف.` : "ستجد أدوات البدء والتسجيل الخاصة بهذه المهمة أسفل هذه الخطوة."}</p></div><Button variant={selectedTask.status === "running" || selectedTask.status === "completed" || selectedTask.status === "closed" ? "outline" : "primary"} onClick={() => { if (["not_started", "paused", "partial", "not_completed"].includes(selectedTask.status)) setTaskStatus(selectedTask.id, "running"); document.getElementById("task-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><Play size={17} />{guide.action}</Button></section><div className="activity-layout"><div><TaskCard task={selectedTask} /><TaskDetailTimer task={selectedTask} /><div id="task-workspace" className="task-workspace"><SpecializedTaskFields task={selectedTask} onProgress={(value) => updateTaskProgress(selectedTask.id, value)} onDetails={(details) => updateTaskDetails(selectedTask.id, details)} /></div></div><Card><SectionHeader title="تقدم المحطة" description="احسب النسبة من القيمة الحالية والهدف نفسه." /><div className="quick-progress"><div><strong>{detailProgress}%</strong><span>من هدفك المحدد</span></div><ProgressBar value={detailProgress} tone="teal" />{type === "prayer" ? <p>يُحدَّث هذا التقدم تلقائيًا عند تسجيل وقت كل صلاة وإكمالها.</p> : <div className="quick-progress-actions"><Button variant="outline" onClick={() => updateTaskProgress(selectedTask.id, selectedTask.current - 1)}>- خطوة</Button><Button variant="secondary" onClick={() => updateTaskProgress(selectedTask.id, selectedTask.current + 1)}>+ خطوة</Button></div>}</div></Card></div><section className="activity-support-grid"><Card><h3>بياناتك محفوظة</h3><p>تفاصيل هذه المحطة مرتبطة بالمهمة والمستخدم وتاريخ اليوم، وتتزامن تلقائيًا بين تبويبات المتصفح.</p></Card><Card><h3>الوقت الفعلي</h3><strong className="large-inline-metric"><Clock3 size={20} />{formatMinutes(selectedTask.actualMinutes)}</strong><p>الوقت السابق محفوظ حتى لو أغلقت المهمة أو أوقفتها مؤقتًا.</p></Card></section></>;
}

export function FocusView() {
  const { cancelFocus, chooseFocusDuration, finishFocus, focus, pauseFocus, resumeFocus, startFocus, tasks } = useDemo();
  const selectedTask = tasks.find((task) => task.type === "reading") ?? tasks[0];
  const displayedSeconds = focus.isUntimed ? focus.elapsedSeconds : focus.secondsLeft;
  const remainingMinutes = Math.floor(displayedSeconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (displayedSeconds % 60).toString().padStart(2, "0");
  const isPaused = focus.status === "paused";
  const isFinished = focus.status === "completed" || focus.status === "cancelled";
  const taskLocked = focus.status === "running" || focus.status === "paused";
  const totalSeconds = Math.max(1, focus.duration * 60);
  const ringProgress = focus.isUntimed
    ? Math.min(1, focus.elapsedSeconds / (25 * 60))
    : focus.status === "idle"
      ? 0.24
      : Math.min(1, focus.elapsedSeconds / totalSeconds);
  const ringRadius = 90;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const statusLabel = focus.status === "running"
    ? "جلسة التركيز جارية"
    : focus.status === "paused"
      ? "متوقف مؤقتًا"
      : focus.status === "completed"
        ? "اكتملت الجلسة"
        : focus.status === "cancelled"
          ? "تم إلغاء الجلسة"
          : focus.isUntimed
            ? "جاهز للعد التصاعدي"
            : "جاهز للتركيز";
  const formatTotalTime = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (!hours) return `${minutes} د`;
    return rest ? `${hours} س ${rest} د` : `${hours} س`;
  };

  return <div className={focusStyles.page}>
    <header className={focusStyles.header}>
      <span>منطقة هادئة</span>
      <h1>التركيز</h1>
      <p>ابدأ جلسة هادئة للعمل على أهدافك</p>
    </header>

    <section className={focusStyles.timerCard} aria-label="جلسة التركيز">
      <div className={focusStyles.durationBlock}>
        <h2>مدة الجلسة</h2>
        <div className={focusStyles.durationSelector} aria-label="اختيار مدة الجلسة">
          {[25, 45, 60, 0].map((duration) => <button type="button" key={duration} className={cn(focusStyles.durationButton, focus.duration === duration && focusStyles.durationActive)} aria-pressed={focus.duration === duration} onClick={() => chooseFocusDuration(duration)} disabled={taskLocked}>{duration === 0 ? "بدون مدة" : `${duration} دقيقة`}</button>)}
        </div>
      </div>

      <div className={focusStyles.clock} aria-label={focus.isUntimed ? `الوقت المسجل ${remainingMinutes}:${remainingSeconds}` : `الوقت المتبقي ${remainingMinutes}:${remainingSeconds}`}>
        <svg viewBox="0 0 210 210" aria-hidden="true">
          <circle className={focusStyles.clockTrack} cx="105" cy="105" r={ringRadius} />
          <circle className={focusStyles.clockValue} cx="105" cy="105" r={ringRadius} strokeDasharray={ringCircumference} strokeDashoffset={ringCircumference * (1 - ringProgress)} />
        </svg>
        <div><strong dir="ltr">{remainingMinutes}:{remainingSeconds}</strong><span>{statusLabel}</span></div>
      </div>

      <div className={focusStyles.actions}>
        <button type="button" className={focusStyles.primaryAction} onClick={focus.isRunning ? pauseFocus : isPaused ? resumeFocus : () => startFocus(selectedTask?.id)} disabled={!selectedTask}>
          {focus.isRunning ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}
          {focus.isRunning ? "إيقاف مؤقت" : isPaused ? "استئناف التركيز" : isFinished ? "ابدأ جلسة جديدة" : "ابدأ التركيز"}
        </button>
        {(focus.status === "running" || focus.status === "paused") && <div className={focusStyles.secondaryActions}>
          <button type="button" onClick={() => finishFocus(selectedTask?.id)}><Check size={16} />إنهاء وحفظ</button>
          <button type="button" onClick={cancelFocus}><X size={16} />إلغاء</button>
        </div>}
      </div>

      <p className={focusStyles.note}><Info size={17} />سيتم تسجيل الوقت الفعلي على {selectedTask?.title ?? "مهمة القراءة"}.</p>
    </section>

    <section className={focusStyles.stats} aria-label="إحصائيات التركيز اليوم">
      <article><span className={focusStyles.statIcon}><BarChart3 size={25} /></span><div><small>أطول جلسة</small><strong>{formatTotalTime(focus.longestSessionSeconds)}</strong></div></article>
      <article><span className={cn(focusStyles.statIcon, focusStyles.layersIcon)}><Layers3 size={25} /></span><div><small>عدد الجلسات</small><strong>{focus.todaySessions} جلسات</strong></div></article>
      <article><span className={focusStyles.statIcon}><Timer size={25} /></span><div><small>إجمالي التركيز اليوم</small><strong>{formatTotalTime(focus.todayTotalSeconds)}</strong></div></article>
    </section>
  </div>;
}

export function StreaksView() {
  const { streakData, generalStreakTitle, taskStreaks, tasks } = useDemo();
  const [taskFilter, setTaskFilter] = useState<TaskStreakFilter>("all");
  const [sortDescending, setSortDescending] = useState(true);
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const nextGoal = generalStreakTitle.nextMilestone ?? Math.max(streakData.current + 1, 1);
  const todayKey = getProjectDateKey();
  const [currentYear, currentMonth, currentDay] = todayKey.split("-").map(Number);
  const daysInCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
  const currentMonthDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 12));
  const currentMonthName = new Intl.DateTimeFormat("ar-EG", { timeZone: "Asia/Riyadh", month: "long" }).format(currentMonthDate);
  const weekdayFormatter = new Intl.DateTimeFormat("ar-EG", { timeZone: "Asia/Riyadh", weekday: "long" });
  const calendarHistory = streakData.history;
  const historyByDate = new Map(calendarHistory.map((day) => [day.date, day]));
  const calendarDays = Array.from({ length: daysInCurrentMonth }, (_, index) => {
    const dayNumber = index + 1;
    const date = new Date(Date.UTC(currentYear, currentMonth - 1, dayNumber, 12));
    const dateKey = getProjectDateKey(date);
    const historicalDay = historyByDate.get(dateKey);
    return {
      date: dateKey,
      day: dayNumber,
      status: dayNumber === currentDay
        ? "today" as const
        : dayNumber > currentDay
          ? "future" as const
          : historicalDay?.status ?? "unsuccessful" as const,
    };
  });
  const weekLabels = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(`${todayKey}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    return offset === 0 ? "اليوم" : weekdayFormatter.format(date);
  });
  const iconForTask = (type: TaskType) => {
    if (type === "prayer") return <Mosque size={22} />;
    if (type === "quran" || type === "reading") return <BookOpen size={22} />;
    if (type === "sport") return <Dumbbell size={22} />;
    if (type === "water") return <Droplets size={22} />;
    if (type === "sleep") return <BedDouble size={22} />;
    return <Target size={22} />;
  };
  const filteredTaskStreaks = taskStreaks.filter((entry) => {
    const task = taskById.get(entry.taskId);
    if (!task) return false;
    return matchesTaskStreakFilter(taskFilter, task.status, entry);
  });

  const visibleTaskStreaks = [...filteredTaskStreaks].sort((left, right) => sortDescending ? right.current - left.current : left.current - right.current);
  return <>
    <PageHeader eyebrow="متابعة العادات اليومية" title="الاستريك" description="تابع استمراريتك اليومية واستمرارية كل مهمة، وحافظ على الإيقاع الذي يناسب رحلتك." />
    <section className="streak-overview-card" aria-labelledby="streak-overview-title">
      <div className="streak-overview-main"><span className="streak-overview-icon"><Flame size={34} /></span><div><p className="streak-overview-eyebrow">استمراريتك الحالية</p><h2 id="streak-overview-title">{streakData.current} يومًا متتاليًا</h2><p>أحسنت، واصل على هذا الإيقاع الرائع!</p></div></div>
      <div className="streak-overview-stat"><span><BarChart3 size={19} /> أطول استمرارية</span><strong>{streakData.best} يومًا</strong></div>
      <div className="streak-overview-stat"><span><span className="streak-status-dot streak-status-success" /> حالة اليوم</span><strong className="streak-status-text">{streakData.current > 0 ? "مستمر" : "قيد المتابعة"}</strong></div>
      <div className="streak-overview-stat"><span><Target size={19} /> الهدف التالي</span><strong>{nextGoal} يومًا</strong></div>
      <div className="streak-overview-progress"><div><span>تبقى {Math.max(0, nextGoal - streakData.current)} يومًا للوصول إلى {nextGoal} يومًا</span><strong>{streakData.current} / {nextGoal}</strong></div><ProgressBar value={generalStreakTitle.progress} tone="teal" /></div>
    </section>

    <Card className="streak-calendar-card"><SectionHeader title={`شهر ${currentMonthName} ${currentYear}`} description="أيام الشهر مرتبة بالتاريخ، واليوم ظاهر في مكانه الطبيعي." /><div className="streak-calendar-legend"><span><i className="streak-legend-dot streak-legend-success" />مستمر</span><span><i className="streak-legend-dot streak-legend-pending" />لم يُنجز</span><span><i className="streak-legend-dot streak-legend-today" />اليوم</span><span><i className="streak-legend-dot streak-legend-future" />قادم</span></div><div className="streak-calendar-scroll"><div className="streak-calendar-list" style={{ gridTemplateColumns: `repeat(${calendarDays.length}, minmax(33px, 1fr))` }}>{calendarDays.map((day) => <div key={day.date} className={cn("streak-calendar-day", day.status === "today" && "streak-calendar-day-today")} title={getStreakDayLabel(day.date, day.status)} aria-current={day.status === "today" ? "date" : undefined}><strong>{day.day}</strong><i className={cn(`streak-calendar-dot-${day.status}`)} /></div>)}</div></div></Card>

    <Card className="streak-tasks-card">
      <div className="streak-tasks-heading"><div><h2>استمرارية المهام</h2><p>استمرارية كل مهمة تساعدك على بناء عادات أفضل وتحقيق أهدافك.</p></div><Badge tone="teal">{filteredTaskStreaks.length} مهام</Badge></div>
      <div className="streak-task-toolbar">
        <div className="streak-task-filter-tabs" role="tablist" aria-label="تصفية المهام">
          {([ ["all", "الكل"], ["active", "مستمرة"], ["broken", "انقطعت"], ["today", "لم تبدأ اليوم"] ] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={taskFilter === value} className={cn(taskFilter === value && "streak-task-filter-active")} onClick={() => setTaskFilter(value)}>{label}</button>)}
        </div>
        <button type="button" className="streak-sort-button" onClick={() => setSortDescending((value) => !value)}><ArrowDownUp size={16} /> {sortDescending ? "أعلى استمرارية" : "الأقل استمرارية"} <ChevronDown size={16} /></button>
      </div>
      <div className="streak-task-grid-new">
        {visibleTaskStreaks.map((entry) => {
          const task = taskById.get(entry.taskId);
          if (!task) return null;
          const presentation = getTaskStreakPresentation(entry);
          const statusLabel = getTaskStreakStatusLabel(task.status, entry);
          const todayLabel = getTaskStreakTodayLabel(task.status);
          const recentHistory = Array.from({ length: 7 }, (_, index) => entry.history.slice(-7)[index] ?? { date: `day-${index}`, status: "unsuccessful" as const });
          return <article className="streak-task-card-new" key={entry.taskId}>
            <div className={cn("streak-task-icon", `streak-task-icon-${task.type}`)}>{iconForTask(task.type)}</div>
            <div className="streak-task-card-title"><h3>{task.type === "prayer" ? "الصلاة" : task.type === "quran" ? "القرآن" : task.type === "sport" ? "الرياضة" : task.type === "reading" ? "القراءة" : task.type === "water" ? "شرب الماء" : task.type === "sleep" ? "النوم" : task.title}</h3><span>{task.title}</span></div>
            <Badge tone={presentation.tone}>{statusLabel}</Badge>
            <div className="streak-task-metrics-new"><div><span>الاستمرارية الحالية</span><strong>{entry.current} يومًا</strong></div><div><span>الأطول</span><strong>{entry.best} يومًا</strong></div><div><span>اليوم</span><strong className={cn(task.status === "completed" ? "streak-metric-good" : "streak-metric-muted")}>{todayLabel}</strong></div></div>
            <div className="streak-task-week"><span>آخر 7 أيام</span><div>{recentHistory.map((day, index) => <span key={`${entry.taskId}-${day.date}-${index}`}><small>{weekLabels[index]}</small><i className={cn("streak-week-dot", `streak-week-dot-${day.status}`)}>{day.status === "successful" ? <Check size={12} /> : day.status === "unsuccessful" ? <X size={11} /> : ""}</i></span>)}</div></div>
          </article>;
        })}
      </div>
      {filteredTaskStreaks.length === 0 && <EmptyState title="لا توجد مهام ضمن هذا الفلتر" description="جرّب اختيار فلتر آخر لرؤية استمراريات مختلفة." />}
    </Card>
  </>;
}
export function CompetitionView() {
  const { rankings, activeParticipant } = useDemo();
  return <><PageHeader eyebrow="المجموعة" title="الترتيب" description="مقارنة مشجعة تركّز على التقدم والاستمرارية." /><section className="ranking-podium">{rankings.slice(0, 3).map((entry) => <Card key={entry.participantId} className={cn("podium-card", `podium-${entry.rank}`)}><span className="podium-rank">{entry.rank}</span><UserAvatar initials={entry.initials} color={entry.avatarColor} size="lg" /><strong>{entry.name}</strong><span>{entry.score} نقطة</span><Badge tone={entry.rank === 1 ? "warning" : "teal"}><Flame size={13} />{entry.streak} أيام</Badge></Card>)}</section><Card><SectionHeader title="كل المشاركين" description="يُحدّث الترتيب تلقائيًا من تقدم المجموعة المحفوظ." /><div className="ranking-list">{rankings.map((entry) => <article key={entry.participantId} className={cn(entry.participantId === activeParticipant.id && "ranking-current-user")}><span className={cn("rank-chip", `rank-${entry.rank}`)} aria-label={`المركز ${entry.rank}`}>{entry.rank}</span><UserAvatar initials={entry.initials} color={entry.avatarColor} size="md" /><strong>{entry.name}{entry.participantId === activeParticipant.id && <small className="ranking-current-label"> (أنت)</small>}</strong><div><ProgressBar value={entry.progress} tone="teal" /><span>{entry.progress}% من رحلة اليوم</span></div><span className="ranking-score">{entry.score}</span><span className="ranking-streak"><Flame size={14} aria-hidden="true" />{entry.streak} أيام</span></article>)}</div></Card></>;
}

export function HonorsView() {
  const { activeParticipant, rankings, streakData, generalStreakTitle, taskStreaks, historyDays, tasks } = useDemo();
  const quranTask = tasks.find((task) => task.type === "quran");
  const personal = getPersonalHonorSummary({ generalStreakTitle, successfulDays: streakData.successfulDays, historyDays });
  const titleCards = getEarnedTitleCards({ generalStreak: streakData.current, taskStreaks, quranTaskId: quranTask?.id });
  const highlights = getHonorHighlights(rankings);
  return <div className="honors-page">
    <div className="honors-heading-row"><PageHeader eyebrow="تميّز المجموعة" title="لوحة الشرف" description="احتفاء هادئ بالاستمرارية والإنجازات المسجلة فعليًا." /></div>
    <section className="honors-hero"><div><span className="honors-symbol"><Flame size={26} aria-hidden="true" /></span><span className="eyebrow">لقبك الحالي</span><h2>{personal.title.label}</h2><p>{personal.title.days} يومًا متتالية · أفضل سلسلة {streakData.best} يومًا</p></div>{personal.title.nextMilestone ? <div className="honors-next-milestone"><strong>المحطة التالية: {personal.title.nextMilestone} يومًا</strong><span>{personal.title.days} / {personal.title.nextMilestone} يومًا</span><ProgressBar value={personal.title.progress} tone="teal" /></div> : <p>وصلت إلى أعلى محطة استمرارية معروفة حاليًا.</p>}</section>
    <section className="titles-section"><SectionHeader title="ألقابك" description="ألقاب تعكس استمراريتك وتقدمك الحقيقي." /><div className="achievement-grid">{titleCards.map((title) => <Card key={title.id} className="achievement-card"><span className={cn("achievement-symbol", `achievement-${title.tone}`)}>{title.id === "quran" ? <Medal size={21} aria-hidden="true" /> : title.id === "continuity" ? <Flame size={21} aria-hidden="true" /> : <Award size={21} aria-hidden="true" />}</span><div><h3>{title.name}</h3><p>{title.description}</p><small>{title.requirement}</small></div><Badge tone={title.earned ? "success" : "neutral"}>{title.earned ? "مكتسب" : "قيد التقدم"}</Badge><div className="honors-card-progress"><strong>{title.currentValue} / {title.threshold} أيام</strong><ProgressBar value={Math.min(100, Math.round(title.currentValue / title.threshold * 100))} tone={title.earned ? "success" : "teal"} /></div></Card>)}</div></section>
    {personal.hasCompletedDayAchievement && <Card className="honors-real-achievement"><span className="achievement-symbol achievement-emerald"><CircleCheck size={21} aria-hidden="true" /></span><div><h3>يوم مكتمل</h3><p>أكملت رحلة يوم كامل بنسبة 100٪.</p></div><Badge tone="success">مكتسب</Badge></Card>}
    <section className="honors-podium" aria-label="تكريمات المجموعة الحالية">{highlights.map((highlight, index) => <article key={highlight.id} className={cn("honor-place", `honor-place-${index + 1}`)}><div className="honor-avatar-wrap">{highlight.leaders.map((leader) => <UserAvatar key={leader.participantId} initials={leader.initials} color={leader.avatarColor} size="xl" />)}<span className="honor-rank-badge">{index + 1}</span></div><div className="honor-person"><strong>{highlight.leaders.map((leader) => leader.name).join(" و")}</strong></div><p>{highlight.label}</p><div className="honor-metrics"><span><b>{highlight.value.toLocaleString("ar-EG")}</b> {highlight.id === "score" ? "نقطة" : highlight.id === "streak" ? "يومًا" : "٪"}</span></div></article>)}</section>
    <Card className="honors-ranking-card"><div className="honors-table-title"><div><span className="honors-title-icon"><Medal size={20} /></span><div><h2>الترتيب العام</h2><p>ترتيب المجموعة حسب النقاط والتقدم الحالي.</p></div></div><Link href="/competition" className="section-link">عرض الترتيب الكامل <ArrowLeft size={16} /></Link></div><div className="honors-table-head" aria-hidden="true"><span>المركز</span><span>المشارك</span><span>معدل الإنجاز</span><span>النقاط</span><span>السلسلة</span><span /></div><div className="honors-ranking-list">{rankings.map((entry) => { const isCurrent = entry.participantId === activeParticipant.id; return <article key={entry.participantId} className={cn(isCurrent && "honors-current-user")}><strong className={cn("honors-rank-number", entry.rank <= 3 && `honors-rank-${entry.rank}`)}>{entry.rank}</strong><div className="honors-member"><UserAvatar initials={entry.initials} color={entry.avatarColor} size="md" /><span><strong>{isCurrent ? `${entry.name} (أنت)` : entry.name}</strong><small>{isCurrent ? "حسابك الحالي" : "عضو في رحلة التغيير"}</small></span></div><div className="honors-progress"><span><b>{entry.progress}%</b><small>إنجاز</small></span><ProgressBar value={entry.progress} tone={entry.rank === 1 ? "warning" : "teal"} /></div><strong className="honors-score">{entry.score.toLocaleString("ar-EG")}</strong><span className="honors-streak"><Flame size={15} />{entry.streak} أيام</span><span /></article>; })}</div></Card>
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
