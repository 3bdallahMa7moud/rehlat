"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { flushSync } from "react-dom";
import { Archive, ArrowRight, BookOpen, CalendarDays, Check, Copy, Droplets, Eye, Moon, Pencil, Plus, Search, Sparkles, Target, Undo2, Users } from "lucide-react";
import { Badge, Button, Card, Dropdown, EmptyState, Input } from "@/components/ui";
import { quranSurahNames } from "@/components/features/QuranBatchReader";
import { quranReciters } from "@/lib/quran-recitation";
import { defaultTaskConfig, prayerNames, taskConfigFor } from "@/lib/task-config";
import { getProjectDateKey } from "@/lib/date-time";
import { useDemo, type TaskDefinitionInput } from "@/state/DemoContext";
import type { Task, TaskCategory, TaskConfig, TaskSchedule, TaskType } from "@/types/models";
import styles from "./AdminTaskStudio.module.css";

const taskTypes: Array<{ value: TaskType; label: string; hint: string }> = [
  { value: "general", label: "مهمة عامة", hint: "عدّاد أو وقت وخطوات" },
  { value: "reading", label: "قراءة", hint: "كتاب وصفحات" },
  { value: "quran", label: "قرآن", hint: "سورة وورد وقارئ" },
  { value: "prayer", label: "صلاة", hint: "صلوات وسنن" },
  { value: "adhkar", label: "أذكار", hint: "صباح أو مساء" },
  { value: "sport", label: "رياضة", hint: "نشاط ومؤقت" },
  { value: "water", label: "ماء", hint: "هدف وكميات سريعة" },
  { value: "sleep", label: "نوم", hint: "ساعات وروتين" },
];
const categories: Array<{ value: TaskCategory; label: string }> = [
  { value: "faith", label: "الإيمان" }, { value: "culture", label: "الثقافة" }, { value: "sport", label: "الرياضة" },
  { value: "growth", label: "التطوير" }, { value: "skill", label: "المهارة" }, { value: "life", label: "الحياة" },
  { value: "family", label: "الأسرة" }, { value: "health", label: "الصحة" }, { value: "character", label: "السلوك" },
];
const weekdays = [
  { value: 6, label: "السبت" }, { value: 0, label: "الأحد" }, { value: 1, label: "الاثنين" },
  { value: 2, label: "الثلاثاء" }, { value: 3, label: "الأربعاء" }, { value: 4, label: "الخميس" }, { value: 5, label: "الجمعة" },
];

function unitFor(type: TaskType, config: TaskConfig) {
  if (type === "quran" && config.type === "quran") return config.readingMode === "pages" ? "صفحة" : "آية";
  if (type === "general" && config.type === "general") return config.tracking === "minutes" ? "دقيقة" : config.steps.some((step) => step.trim()) ? "خطوة" : "مرة";
  return { prayer: "صلاة", adhkar: "جلسة", reading: "صفحة", sport: "دقيقة", water: "كوب", sleep: "ساعة", general: "مرة", quran: "آية" }[type];
}

function scheduleLabel(schedule: TaskSchedule | undefined) {
  if (!schedule || schedule.mode === "daily") return "يوميًا";
  if (schedule.mode === "once") return `مرة واحدة · ${schedule.date}`;
  return `${schedule.weekdays.length} أيام في الأسبوع`;
}

function taskTypeLabel(type: TaskType) { return taskTypes.find((item) => item.value === type)?.label ?? type; }

function transitionTaskList(update: () => void) {
  if (typeof document === "undefined" || !document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}

const editorSections = [
  { id: "task-type", label: "النوع" },
  { id: "task-basics", label: "البيانات" },
  { id: "task-settings", label: "الإعدادات" },
  { id: "task-schedule", label: "الجدول" },
  { id: "task-points", label: "النقاط" },
] as const;

type Draft = {
  title: string; supportingText: string; category: TaskCategory; type: TaskType; target: string; unit: string;
  fullPoints: string; partialPoints: string; scheduledTime: string; durationMinutes: string;
  config: TaskConfig; scheduleMode: TaskSchedule["mode"]; selectedWeekdays: number[]; onceDate: string;
  assignment: "all" | "selected"; assigneeIds: string[]; applyToday: boolean;
};

function draftFor(task?: Task): Draft {
  const type = task?.type ?? "general";
  const config = task ? taskConfigFor(task) : defaultTaskConfig(type);
  const schedule = task?.schedule;
  return {
    title: task?.title ?? "", supportingText: task?.supportingText ?? "", category: task?.category ?? "growth", type,
    target: String(task?.target ?? 1), unit: task?.unit ?? unitFor(type, config),
    fullPoints: String(task?.fullPoints ?? 10), partialPoints: task?.partialPoints === undefined ? "" : String(task.partialPoints),
    scheduledTime: task?.scheduledTime ?? "", durationMinutes: task?.durationMinutes === undefined ? "" : String(task.durationMinutes),
    config, scheduleMode: schedule?.mode ?? "daily", selectedWeekdays: schedule?.mode === "weekdays" ? schedule.weekdays : [0, 1, 2, 3, 4, 5, 6],
    onceDate: schedule?.mode === "once" ? schedule.date : getProjectDateKey(), assignment: task?.assigneeIds?.length ? "selected" : "all",
    assigneeIds: task?.assigneeIds ?? [], applyToday: false,
  };
}

function targetFor(draft: Draft) {
  if (draft.config.type === "prayer") return draft.config.prayers.length;
  if (draft.config.type === "adhkar") return 1;
  if (draft.config.type === "water") return Math.ceil(draft.config.targetMl / 250);
  if (draft.config.type === "general" && draft.config.tracking === "count" && draft.config.steps.some((step) => step.trim())) return draft.config.steps.filter((step) => step.trim()).length;
  return Number(draft.target);
}

function validateDraft(draft: Draft) {
  const target = targetFor(draft);
  const full = Number(draft.fullPoints);
  const partial = draft.partialPoints === "" ? undefined : Number(draft.partialPoints);
  const duration = draft.durationMinutes === "" ? undefined : Number(draft.durationMinutes);
  if (!draft.title.trim()) return "اكتب اسم المهمة.";
  if (!Number.isFinite(target) || target <= 0 || (draft.type !== "sleep" && !Number.isInteger(target))) return "أدخل هدفًا صحيحًا أكبر من صفر.";
  if (draft.fullPoints.trim() === "" || !Number.isFinite(full) || full < 0 || (partial !== undefined && (!Number.isFinite(partial) || partial < 0 || partial > full))) return "راجع نقاط الإكمال والإنجاز الجزئي.";
  if (duration !== undefined && (!Number.isFinite(duration) || duration < 0)) return "أدخل مدة متوقعة صحيحة.";
  if (draft.scheduleMode === "weekdays" && !draft.selectedWeekdays.length) return "اختر يومًا واحدًا على الأقل.";
  if (draft.scheduleMode === "once" && !/^\d{4}-\d{2}-\d{2}$/.test(draft.onceDate)) return "حدد تاريخ المهمة.";
  if (draft.assignment === "selected" && !draft.assigneeIds.length) return "اختر مشاركًا واحدًا على الأقل.";
  const config = draft.config;
  if (config.type === "quran" && (!Number.isInteger(config.surah) || config.surah < 1 || config.surah > 114 || !Number.isInteger(config.batchSize) || config.batchSize < 1 || config.batchSize > 20)) return "راجع السورة وحجم دفعة الآيات.";
  if (config.type === "prayer" && !config.prayers.length) return "اختر صلاة واحدة على الأقل.";
  if (config.type === "reading" && (!config.bookName.trim() || !Number.isInteger(config.totalPages) || config.totalPages < 0 || !Number.isInteger(config.startPage) || config.startPage < 1 || (config.totalPages > 0 && config.startPage > config.totalPages))) return "أدخل بيانات كتاب وصفحة بداية صحيحة.";
  if (config.type === "water" && (config.targetMl < 250 || config.targetMl > 10000 || config.quickAmounts.some((value) => !Number.isFinite(value) || value < 50 || value > 1500))) return "راجع هدف الماء والكميات السريعة.";
  if (config.type === "sleep" && (!/^\d{2}:\d{2}$/.test(config.bedtime) || !/^\d{2}:\d{2}$/.test(config.wakeTime) || target > 16)) return "راجع ساعات النوم وموعديه.";
  return "";
}

export function AdminTaskManager() {
  const { taskDefinitions, tasks, archiveTask, duplicateTask, participants } = useDemo();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");
  const filtered = taskDefinitions.filter((task) => {
    if (filter === "active" && task.archived) return false;
    if (filter === "archived" && !task.archived) return false;
    const text = `${task.title} ${task.supportingText ?? ""} ${taskTypeLabel(task.type)}`.toLocaleLowerCase();
    return text.includes(query.trim().toLocaleLowerCase());
  });
  const activeCount = taskDefinitions.filter((task) => !task.archived).length;
  return <div className={styles.page} data-task-manager>
    <header className={styles.managerHeader}><div><span className={styles.eyebrow}>مساحة المشرف</span><h1>إدارة المهام</h1><p>اضبط تفاصيل كل مهمة، ومن يراها، وكيف تظهر في صفحة المشارك.</p></div><Link href="/admin/tasks/new" className={styles.primaryLink}><Plus size={19} />إضافة مهمة تفصيلية</Link></header>
    <section className={styles.stats}><div><span><Target size={19} /></span><strong>{taskDefinitions.length}</strong><small>إجمالي المهام</small></div><div><span><Check size={19} /></span><strong>{activeCount}</strong><small>مهمة نشطة</small></div><div><span><Archive size={19} /></span><strong>{taskDefinitions.length - activeCount}</strong><small>مهمة مؤرشفة</small></div><div><span><Users size={19} /></span><strong>{participants.length}</strong><small>حساب متاح للإسناد</small></div></section>
    <div className={styles.managerToolbar}><label className={styles.search}><Search size={18} /><input defaultValue="" onChange={(event) => { const value = event.currentTarget.value; transitionTaskList(() => setQuery(value)); }} placeholder="ابحث عن مهمة أو نوع…" aria-label="البحث في المهام" /></label><div className={styles.filters}>{(["all", "active", "archived"] as const).map((value) => <button type="button" key={value} className={filter === value ? styles.filterActive : undefined} aria-pressed={filter === value} onClick={() => transitionTaskList(() => setFilter(value))}>{value === "all" ? "الكل" : value === "active" ? "النشطة" : "المؤرشفة"}</button>)}</div></div>
    {filtered.length ? <div className={styles.taskGrid}>{filtered.map((task) => {
      const current = tasks.find((candidate) => candidate.id === task.id);
      return <article className={styles.managerCard} key={task.id} style={{ viewTransitionName: `studio-${task.id.replace(/[^a-zA-Z0-9_-]/g, "-")}` }}><div className={styles.cardTop}><span className={styles.cardIcon}>{task.type === "water" ? <Droplets size={21} /> : task.type === "sleep" ? <Moon size={21} /> : <BookOpen size={21} />}</span><Badge tone={task.archived ? "neutral" : "teal"}>{task.archived ? "مؤرشفة" : "نشطة"}</Badge></div><div><span className={styles.cardType}>{taskTypeLabel(task.type)} · {categories.find((category) => category.value === task.category)?.label}</span><h2>{task.title}</h2><p>{task.supportingText || "دون وصف إضافي"}</p></div><div className={styles.cardFacts}><span><Target size={15} />{task.target} {task.unit}</span><span><CalendarDays size={15} />{scheduleLabel(task.schedule)}</span><span><Users size={15} />{task.assigneeIds?.length ? `${task.assigneeIds.length} محددون` : "كل المشاركين"}</span></div><div className={styles.cardFooter}><span>{task.fullPoints ?? 0} نقطة{current ? ` · تقدم حسابك اليوم ${Math.round(current.current / Math.max(1, current.target) * 100)}%` : ""}</span><div><Link href={`/admin/tasks/${task.id}/edit`} aria-label={`تعديل ${task.title}`}><Pencil size={16} /><span>تعديل</span></Link><button type="button" onClick={() => transitionTaskList(() => duplicateTask(task.id))} aria-label={`نسخ ${task.title}`}><Copy size={16} /><span>نسخ</span></button><button type="button" onClick={() => transitionTaskList(() => archiveTask(task.id, !task.archived))} aria-label={`${task.archived ? "استعادة" : "أرشفة"} ${task.title}`}>{task.archived ? <Undo2 size={16} /> : <Archive size={16} />}<span>{task.archived ? "استعادة" : "أرشفة"}</span></button></div></div></article>;
    })}</div> : <EmptyState title="لا توجد مهام مطابقة" description="غيّر البحث أو الفلتر، أو أضف مهمة جديدة." action={<Link href="/admin/tasks/new"><Button><Plus size={17} />مهمة جديدة</Button></Link>} />}
  </div>;
}

export function AdminTaskEditor({ taskId }: { taskId?: string }) {
  const { taskDefinitions } = useDemo();
  const task = taskId ? taskDefinitions.find((candidate) => candidate.id === taskId) : undefined;
  if (taskId && !task) return <EmptyState title="المهمة غير موجودة" description="ارجع إلى قائمة المهام واختر مهمة أخرى." action={<Link href="/admin/tasks"><Button>إدارة المهام</Button></Link>} />;
  return <TaskEditorForm key={task?.id ?? "new"} task={task} />;
}

function TaskEditorForm({ task }: { task?: Task }) {
  const router = useRouter();
  const { participants, saveTaskDefinition } = useDemo();
  const [draft, setDraft] = useState<Draft>(() => draftFor(task));
  const [attempted, setAttempted] = useState(false);
  const config = draft.config;
  const validation = validateDraft(draft);
  const target = targetFor(draft);
  const selectedPeople = participants.filter((person) => draft.assigneeIds.includes(person.id));
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const updateConfig = (patch: Partial<TaskConfig>) => setDraft((current) => ({ ...current, config: { ...current.config, ...patch } as TaskConfig }));
  const changeType = (type: TaskType) => {
    if (type === draft.type) return;
    const nextConfig = defaultTaskConfig(type);
    update({ type, config: nextConfig, target: type === "prayer" ? "5" : type === "water" ? "8" : type === "sleep" ? "8" : "1", unit: unitFor(type, nextConfig), category: ["quran", "prayer", "adhkar"].includes(type) ? "faith" : ["water", "sleep"].includes(type) ? "health" : type === "sport" ? "sport" : type === "reading" ? "culture" : "growth" });
  };
  const save = () => {
    setAttempted(true);
    if (validation) {
      window.setTimeout(() => document.getElementById("task-editor-error")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      return;
    }
    const schedule: TaskSchedule = draft.scheduleMode === "weekdays" ? { mode: "weekdays", weekdays: draft.selectedWeekdays } : draft.scheduleMode === "once" ? { mode: "once", date: draft.onceDate } : { mode: "daily" };
    const input: TaskDefinitionInput = {
      title: draft.title.trim(), supportingText: draft.supportingText.trim(), category: draft.category, type: draft.type,
      target, unit: draft.type === "general" && config.type === "general" && config.tracking === "count" && !config.steps.some((step) => step.trim()) ? draft.unit.trim() || "مرة" : unitFor(draft.type, config),
      fullPoints: Number(draft.fullPoints), partialPoints: draft.partialPoints === "" ? undefined : Number(draft.partialPoints),
      durationMinutes: draft.durationMinutes === "" ? undefined : Number(draft.durationMinutes), scheduledTime: draft.scheduledTime.trim(),
      config: config.type === "general" ? { ...config, steps: config.steps.map((step) => step.trim()).filter(Boolean) } : config, group: config.type === "adhkar" ? config.session : undefined,
      schedule, assigneeIds: draft.assignment === "all" ? undefined : draft.assigneeIds, applyToday: draft.applyToday,
    };
    saveTaskDefinition(task?.id ?? null, input);
    router.push("/admin/tasks");
  };
  const toggleDay = (day: number) => update({ selectedWeekdays: draft.selectedWeekdays.includes(day) ? draft.selectedWeekdays.filter((value) => value !== day) : [...draft.selectedWeekdays, day] });
  const togglePerson = (id: string) => update({ assigneeIds: draft.assigneeIds.includes(id) ? draft.assigneeIds.filter((value) => value !== id) : [...draft.assigneeIds, id] });

  return <div className={styles.page}>
    <header className={styles.editorHeader}><div><Link href="/admin/tasks" className={styles.back}><ArrowRight size={17} />إدارة المهام</Link><span className={styles.eyebrow}>{task ? "تحرير المهمة" : "مهمة جديدة"}</span><h1>{task ? `تعديل ${task.title}` : "إضافة مهمة تفصيلية"}</h1><p>اختر النوع ثم اضبط كل ما يحتاجه المشارك داخل صفحته.</p></div><div className={styles.headerActions}><Link href="/admin/tasks" className={styles.cancelLink}>إلغاء</Link><Button onClick={save}><Check size={18} />{task ? "حفظ التعديلات" : "إنشاء المهمة"}</Button></div></header>
    <nav className={styles.sectionNav} aria-label="أقسام إعداد المهمة">{editorSections.map((section, index) => <a href={`#${section.id}`} key={section.id}><span>{String(index + 1).padStart(2, "0")}</span>{section.label}</a>)}</nav>
    <div className={styles.editorLayout}><main className={styles.formColumn}>
      <Card id="task-type" className={styles.formSection} padding="lg"><div className={styles.sectionHeading}><span>01</span><div><h2>نوع المهمة</h2><p>الحقول التالية تتغير حسب النوع المختار.</p></div></div><div className={styles.typeGrid}>{taskTypes.map((item) => <button type="button" key={item.value} className={draft.type === item.value ? styles.typeSelected : undefined} onClick={() => changeType(item.value)}><strong>{item.label}</strong><small>{item.hint}</small></button>)}</div></Card>
      <Card id="task-basics" className={styles.formSection} padding="lg"><div className={styles.sectionHeading}><span>02</span><div><h2>البيانات الأساسية</h2><p>عنوان واضح ووصف قصير يظهران للمشارك.</p></div></div><div className={styles.fieldGrid}><Input label="اسم المهمة *" value={draft.title} onChange={(event) => update({ title: event.target.value })} placeholder="مثال: قراءة 10 صفحات" /><Dropdown label="التصنيف" value={draft.category} onChange={(value) => update({ category: value as TaskCategory })} options={categories} /><Input label="وصف المهمة" value={draft.supportingText} onChange={(event) => update({ supportingText: event.target.value })} placeholder="ما الذي سيفعله المشارك؟" /><Input label="الوقت المقترح" value={draft.scheduledTime} onChange={(event) => update({ scheduledTime: event.target.value })} placeholder="مثال: بعد الفجر" /><Input label={`هدف المهمة (${draft.type === "general" && config.type === "general" && config.tracking === "count" && !config.steps.some((step) => step.trim()) ? draft.unit : unitFor(draft.type, config)}) *`} type="number" min="1" value={["prayer", "adhkar", "water"].includes(draft.type) || (config.type === "general" && config.tracking === "count" && config.steps.some((step) => step.trim())) ? target : draft.target} disabled={["prayer", "adhkar", "water"].includes(draft.type) || (config.type === "general" && config.tracking === "count" && config.steps.some((step) => step.trim()))} onChange={(event) => update({ target: event.target.value })} />{draft.type === "general" && config.type === "general" && config.tracking === "count" && !config.steps.some((step) => step.trim()) && <Input label="وحدة القياس" value={draft.unit} onChange={(event) => update({ unit: event.target.value })} placeholder="مرة" />}</div></Card>
      <Card id="task-settings" className={styles.formSection} padding="lg"><div className={styles.sectionHeading}><span>03</span><div><h2>إعدادات {taskTypeLabel(draft.type)}</h2><p>ستستخدمها صفحة المهمة الخاصة بالمشارك.</p></div></div><div className={`${styles.fieldGrid} ${styles.settingsFields}`} key={draft.type}>
        {config.type === "quran" && <><Dropdown label="السورة الافتراضية" value={String(config.surah)} onChange={(value) => updateConfig({ surah: Number(value) })} options={quranSurahNames.map((name, index) => ({ value: String(index + 1), label: `${index + 1} · ${name}` }))} /><Dropdown label="طريقة القراءة" value={config.readingMode} onChange={(value) => updateConfig({ readingMode: value as "ayahs" | "pages" })} options={[{ value: "ayahs", label: "بالآيات" }, { value: "pages", label: "بالصفحات" }]} /><Input label="عدد الآيات في الدفعة" type="number" min="1" max="20" value={config.batchSize} disabled={config.readingMode === "pages"} onChange={(event) => updateConfig({ batchSize: Number(event.target.value) })} /><Dropdown label="القارئ" value={config.reciter} onChange={(value) => updateConfig({ reciter: value })} options={quranReciters.map((reciter) => ({ value: reciter.id, label: reciter.label }))} /></>}
        {config.type === "prayer" && <div className={styles.fullField}><strong className={styles.fieldTitle}>الصلوات المطلوبة</strong><div className={styles.checkGrid}>{prayerNames.map((name) => <label key={name}><input type="checkbox" checked={config.prayers.includes(name)} onChange={() => updateConfig({ prayers: config.prayers.includes(name) ? config.prayers.filter((prayer) => prayer !== name) : [...config.prayers, name] })} />{name}</label>)}</div><label className={styles.checkboxLine}><input type="checkbox" checked={config.includeSunnah} onChange={(event) => updateConfig({ includeSunnah: event.target.checked })} />إظهار السنن الرواتب</label><label className={styles.checkboxLine}><input type="checkbox" checked={config.includeTasbeeh} onChange={(event) => updateConfig({ includeTasbeeh: event.target.checked })} />إظهار عداد التسبيح</label></div>}
        {config.type === "adhkar" && <><Dropdown label="وقت الأذكار" value={config.session} onChange={(value) => updateConfig({ session: value as "morning" | "evening" })} options={[{ value: "morning", label: "الصباح" }, { value: "evening", label: "المساء" }]} /><label className={styles.checkboxLine}><input type="checkbox" checked={config.showTasbeeh} onChange={(event) => updateConfig({ showTasbeeh: event.target.checked })} />إظهار التسبيح الاختياري</label></>}
        {config.type === "reading" && <><Input label="اسم الكتاب *" value={config.bookName} onChange={(event) => updateConfig({ bookName: event.target.value })} /><Input label="اسم المؤلف" value={config.author} onChange={(event) => updateConfig({ author: event.target.value })} /><Input label="عدد صفحات الكتاب" type="number" min="0" value={config.totalPages} onChange={(event) => updateConfig({ totalPages: Number(event.target.value) })} /><Input label="صفحة البداية" type="number" min="1" value={config.startPage} onChange={(event) => updateConfig({ startPage: Number(event.target.value) })} /></>}
        {config.type === "sport" && <><Input label="اسم النشاط" value={config.activity} onChange={(event) => updateConfig({ activity: event.target.value })} placeholder="مشي سريع، تمارين…" /><label className={styles.checkboxLine}><input type="checkbox" checked={config.timerEnabled} onChange={(event) => updateConfig({ timerEnabled: event.target.checked })} />إظهار مؤقت التمرين</label></>}
        {config.type === "water" && <><Input label="هدف الماء اليومي (مل)" type="number" min="250" max="10000" step="50" value={config.targetMl} onChange={(event) => updateConfig({ targetMl: Number(event.target.value) })} />{config.quickAmounts.map((amount, index) => <Input key={index} label={`زر إضافة سريع ${index + 1} (مل)`} type="number" min="50" max="1500" value={amount} onChange={(event) => updateConfig({ quickAmounts: config.quickAmounts.map((value, amountIndex) => amountIndex === index ? Number(event.target.value) : value) })} />)}<label className={styles.checkboxLine}><input type="checkbox" checked={config.calculatorEnabled} onChange={(event) => updateConfig({ calculatorEnabled: event.target.checked })} />السماح للمشارك بحساب هدفه من الوزن والنشاط</label></>}
        {config.type === "sleep" && <><Input label="وقت النوم المقترح" type="time" value={config.bedtime} onChange={(event) => updateConfig({ bedtime: event.target.value })} /><Input label="وقت الاستيقاظ المقترح" type="time" value={config.wakeTime} onChange={(event) => updateConfig({ wakeTime: event.target.value })} /><label className={styles.checkboxLine}><input type="checkbox" checked={config.routineEnabled} onChange={(event) => updateConfig({ routineEnabled: event.target.checked })} />إظهار روتين ما قبل النوم</label></>}
        {config.type === "general" && <><Dropdown label="طريقة القياس" value={config.tracking} onChange={(value) => updateConfig({ tracking: value as "count" | "minutes" })} options={[{ value: "count", label: "عدد مرات" }, { value: "minutes", label: "دقائق" }]} /><label className={styles.textareaField}>خطوات المهمة <small>كل خطوة في سطر</small><textarea className="input" rows={4} value={config.steps.join("\n")} onChange={(event) => updateConfig({ steps: event.target.value.split("\n") })} placeholder="الخطوة الأولى&#10;الخطوة الثانية" /></label></>}
      </div></Card>
      <Card id="task-schedule" className={styles.formSection} padding="lg"><div className={styles.sectionHeading}><span>04</span><div><h2>الجدول والمشاركون</h2><p>حدد متى تظهر المهمة ومن يستطيع تنفيذها.</p></div></div><div className={styles.fieldGrid}><Dropdown label="تكرار المهمة" value={draft.scheduleMode} onChange={(value) => update({ scheduleMode: value as TaskSchedule["mode"] })} options={[{ value: "daily", label: "يوميًا" }, { value: "weekdays", label: "أيام محددة" }, { value: "once", label: "مرة واحدة" }]} />{draft.scheduleMode === "once" && <Input label="تاريخ المهمة" type="date" value={draft.onceDate} onChange={(event) => update({ onceDate: event.target.value })} />}{draft.scheduleMode === "weekdays" && <div className={styles.fullField}><strong className={styles.fieldTitle}>أيام الظهور</strong><div className={styles.checkGrid}>{weekdays.map((day) => <label key={day.value}><input type="checkbox" checked={draft.selectedWeekdays.includes(day.value)} onChange={() => toggleDay(day.value)} />{day.label}</label>)}</div></div>}<Dropdown label="إسناد المهمة" value={draft.assignment} onChange={(value) => update({ assignment: value as Draft["assignment"] })} options={[{ value: "all", label: "كل المشاركين" }, { value: "selected", label: "مشاركون محددون" }]} />{draft.assignment === "selected" && <div className={styles.fullField}><strong className={styles.fieldTitle}>اختر المشاركين</strong><div className={styles.checkGrid}>{participants.map((person) => <label key={person.id}><input type="checkbox" checked={draft.assigneeIds.includes(person.id)} onChange={() => togglePerson(person.id)} />{person.name}</label>)}</div></div>}</div></Card>
      <Card id="task-points" className={styles.formSection} padding="lg"><div className={styles.sectionHeading}><span>05</span><div><h2>النقاط والحفظ</h2><p>اضبط المكافأة وقرار تطبيق التعديل.</p></div></div><div className={styles.fieldGrid}><Input label="نقاط الإكمال *" type="number" min="0" value={draft.fullPoints} onChange={(event) => update({ fullPoints: event.target.value })} /><Input label="نقاط الإنجاز الجزئي" type="number" min="0" value={draft.partialPoints} onChange={(event) => update({ partialPoints: event.target.value })} placeholder="اختياري" /><Input label="المدة المتوقعة بالدقائق" type="number" min="0" value={draft.durationMinutes} onChange={(event) => update({ durationMinutes: event.target.value })} placeholder="اختياري" />{task && <label className={styles.checkboxLine}><input type="checkbox" checked={draft.applyToday} onChange={(event) => update({ applyToday: event.target.checked })} />تطبيق التعديل على مهمة اليوم أيضًا</label>}</div>{task && <p className={styles.formHint}>بدون تحديد الخيار، تُحفظ الإعدادات الجديدة للأيام القادمة ويبقى تقدم اليوم كما هو.</p>}</Card>
      <section className={styles.reviewCard} aria-label="ملخص المهمة قبل الحفظ"><div><span className={styles.eyebrow}>مراجعة قبل الحفظ</span><h2>{draft.title.trim() || "اسم المهمة لم يُكتب بعد"}</h2></div><dl><div><dt>النوع والهدف</dt><dd>{taskTypeLabel(draft.type)} · {Number.isFinite(target) ? target : "—"} {draft.type === "general" && config.type === "general" && config.tracking === "count" && !config.steps.some((step) => step.trim()) ? draft.unit : unitFor(draft.type, config)}</dd></div><div><dt>الظهور</dt><dd>{draft.scheduleMode === "daily" ? "يوميًا" : draft.scheduleMode === "once" ? draft.onceDate : weekdays.filter((day) => draft.selectedWeekdays.includes(day.value)).map((day) => day.label).join("، ") || "لم تحدد أيام"}</dd></div><div><dt>المشاركون</dt><dd>{draft.assignment === "all" ? "كل المشاركين" : selectedPeople.map((person) => person.name).join("، ") || "لم تحدد مشاركين"}</dd></div><div><dt>عند الحفظ</dt><dd>{task ? draft.applyToday ? "تطبيق التعديل على اليوم والأيام القادمة" : "تطبيق التعديل من الأيام القادمة" : "إنشاء مهمة جديدة"}</dd></div></dl></section>
      {attempted && validation && <p id="task-editor-error" className={styles.error} role="alert" key={validation}>{validation}</p>}
      <div className={styles.mobileSave}><Button onClick={save}><Check size={18} />{task ? "حفظ التعديلات" : "إنشاء المهمة"}</Button></div>
    </main><aside className={styles.previewColumn}><div className={styles.previewCard}><span className={styles.eyebrow}><Eye size={15} />معاينة بطاقة المشارك</span><div className={styles.previewIcon}>{draft.type === "water" ? <Droplets size={28} /> : draft.type === "sleep" ? <Moon size={28} /> : <BookOpen size={28} />}</div><Badge tone="teal">{taskTypeLabel(draft.type)}</Badge><h2>{draft.title.trim() || "اسم المهمة سيظهر هنا"}</h2><p>{draft.supportingText.trim() || "وصف قصير يوضح للمشارك ما المطلوب منه."}</p><div className={styles.previewGoal}><span>الهدف</span><strong>{Number.isFinite(target) ? target : "—"} {draft.type === "general" && config.type === "general" && config.tracking === "count" && !config.steps.some((step) => step.trim()) ? draft.unit : unitFor(draft.type, config)}</strong></div><div className={styles.previewMeta}><span><CalendarDays size={15} />{draft.scheduleMode === "daily" ? "كل يوم" : draft.scheduleMode === "once" ? draft.onceDate || "تاريخ محدد" : `${draft.selectedWeekdays.length} أيام أسبوعيًا`}</span><span><Users size={15} />{draft.assignment === "all" ? "كل المشاركين" : selectedPeople.map((person) => person.name).join("، ") || "لم تحدد مشاركين"}</span><span><Sparkles size={15} />{draft.fullPoints || 0} نقطة</span></div></div><div className={styles.previewNote}>المعاينة تعرض بطاقة المهمة. إعدادات النوع تُستخدم داخل صفحة التنفيذ نفسها بعد الحفظ.</div></aside></div>
  </div>;
}
