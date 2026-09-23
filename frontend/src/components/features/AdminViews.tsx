"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Activity, ArrowLeft, BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, Eye, FileSpreadsheet, Filter, Flame, KeyRound, Layers3, Pencil, Plus, Printer, Search, Sparkles as SparklesIcon, Target, Trash2, TriangleAlert, TrendingDown, TrendingUp, Users } from "lucide-react";
import { TaskCard, TaskGlyph } from "@/components/features/TaskCard";
import { Badge, Button, Card, Dialog, Dropdown, EmptyState, IconButton, Input, PageHeader, ProgressBar, SectionHeader, StatusDot, Tabs, UserAvatar } from "@/components/ui";
import { exportReport } from "@/lib/export";
import { formatMinutes } from "@/lib/format";
import { formatRelativeTime } from "@/lib/date-time";
import { useDemo } from "@/state/DemoContext";

import type { Report, TaskCategory, TaskType } from "@/types/models";
const adminTaskCategoryLabels: Record<TaskCategory, string> = { faith: "دين", culture: "ثقافة", sport: "رياضة", growth: "تطوير الذات", skill: "مهارة", life: "حياة", family: "أهل وبيت", health: "صحة", character: "سلوك" };


export function AdminDashboardView() {
  const { activity, participants, rankings, reports } = useDemo();
  const group = participants.filter((participant) => participant.role === "participant");
  const activeCount = group.filter((participant) => participant.presence !== "offline").length;
  const averageProgress = group.length ? Math.round(group.reduce((sum, participant) => sum + participant.progress, 0) / group.length) : 0;
  return <><PageHeader eyebrow="لوحة الإدارة" title="نظرة عامة" description="متابعة المجموعة والإنجازات الحالية من مكان واحد." actions={<Link href="/admin/participants"><Button><Users size={18} />إدارة المشاركين</Button></Link>} /><div className="admin-overview-grid"><Card><Users size={24} /><span>المشاركون</span><strong>{group.length}</strong><p>{activeCount} متصلون الآن</p></Card><Card><ClipboardCheck size={24} /><span>متوسط التقدم</span><strong>{averageProgress}%</strong><ProgressBar value={averageProgress} tone="teal" /></Card><Card><BarChart3 size={24} /><span>وقت المجموعة</span><strong>{formatMinutes(reports.weekly.totalMinutes * group.length)}</strong><p>في الفترة الأسبوعية</p></Card></div><div className="admin-dashboard-grid"><Card><SectionHeader title="إجراءات سريعة" description="الوصول إلى أكثر الأدوات استخدامًا." /><div className="admin-quick-links"><Link href="/admin/tasks">إدارة المهام <ArrowLeft size={16} /></Link><Link href="/admin/reports">تقارير الأداء <ArrowLeft size={16} /></Link><Link href="/admin/activity">سجل النشاط <ArrowLeft size={16} /></Link><Link href="/admin/data">إدارة البيانات <ArrowLeft size={16} /></Link></div></Card><Card><SectionHeader title="آخر النشاط" /><div className="admin-activity-mini">{activity.slice(0, 5).map((event) => <p key={event.id}><strong>{event.participantName}</strong> {event.action} {event.task && <span>{event.task}</span>} <small>{formatRelativeTime(event.createdAt)}</small></p>)}</div>{!activity.length && <EmptyState title="لا يوجد نشاط بعد." />}</Card></div><Card><SectionHeader title="الترتيب الحالي" action={<Link href="/competition" className="section-link">عرض الترتيب <ArrowLeft size={16} /></Link>} /><div className="admin-ranking-summary">{rankings.slice(0, 5).map((entry) => <div key={entry.participantId}><span>{entry.rank}</span><strong>{entry.name}</strong><ProgressBar value={entry.progress} /><small>{entry.score} نقطة</small></div>)}</div></Card></>;
}

export function AdminParticipantsView() {
  const { participants, addParticipant, deleteParticipant, editParticipantName, resetParticipantPin } = useDemo();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftPin, setDraftPin] = useState("1234");
  const visible = useMemo(() => participants.filter((participant) => participant.role === "participant" && participant.name.includes(search.trim())), [participants, search]);
  const editingParticipant = participants.find((participant) => participant.id === editing);
  const deletingParticipant = participants.find((participant) => participant.id === deleting);
  return <><PageHeader eyebrow="الإدارة" title="المشاركون" description="متابعة المجموعة وتحرير الحسابات والصلاحيات." actions={<Button onClick={() => { setDraftName(""); setDraftPin("1234"); setEditing("new"); }}><Plus size={18} />مشارك جديد</Button>} /><div className="admin-toolbar"><Input aria-label="البحث عن مشارك" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم" className="admin-search" /><Search size={18} /></div><Card padding="none" className="admin-table-card"><div className="admin-table"><div className="admin-table-head"><span>المشارك</span><span>الحالة</span><span>التقدم</span><span>الإجراءات</span></div>{visible.map((participant) => <article key={participant.id} className="admin-table-row"><div className="admin-person"><UserAvatar initials={participant.initials} color={participant.avatarColor} size="md" /><div><strong>{participant.name}</strong><span>{participant.currentStatus}</span></div></div><div><StatusDot status={participant.presence} label={participant.presence === "active" ? "نشط" : participant.presence === "paused" ? "متوقف" : "هادئ"} /></div><div className="admin-progress"><ProgressBar value={participant.progress} tone="teal" /><span>{participant.progress}%</span></div><div className="admin-actions"><Link href={`/admin/participants/${participant.id}`}><IconButton label={`تفاصيل ${participant.name}`}><Eye size={18} /></IconButton></Link><IconButton label={`تعديل ${participant.name}`} onClick={() => { setEditing(participant.id); setDraftName(participant.name); }}><Pencil size={18} /></IconButton><IconButton label={`إعادة تعيين PIN لـ ${participant.name}`} onClick={() => resetParticipantPin(participant.id)}><KeyRound size={18} /></IconButton><IconButton label={`حذف ${participant.name}`} onClick={() => setDeleting(participant.id)}><Trash2 size={18} /></IconButton></div></article>)}</div>{!visible.length && <EmptyState title="لا يوجد مشارك مطابق." />}</Card><Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === "new" ? "مشارك جديد" : "تعديل المشارك"} description="أدخل اسم المشارك وحدد PIN من أربعة أرقام." footer={<><Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button><Button disabled={!draftName.trim() || (editing === "new" && !/^\d{4}$/.test(draftPin))} onClick={() => { if (editing === "new") addParticipant(draftName, draftPin); else if (editingParticipant) editParticipantName(editingParticipant.id, draftName); setEditing(null); }}>حفظ التغييرات</Button></>}><Input label="الاسم" value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="اسم المشارك" />{editing === "new" && <Input label="PIN" type="password" inputMode="numeric" maxLength={4} value={draftPin} onChange={(event) => setDraftPin(event.target.value.replace(/\D/g, "").slice(0, 4))} />}</Dialog><Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} title="حذف المشارك؟" description={`سيزيل هذا الإجراء ${deletingParticipant?.name ?? "المشارك"} من قائمة الحسابات.`} footer={<><Button variant="outline" onClick={() => setDeleting(null)}>إلغاء</Button><Button variant="destructive" onClick={() => { if (deleting) deleteParticipant(deleting); setDeleting(null); }}>حذف المشارك</Button></>}><div className="danger-dialog-copy"><TriangleAlert size={21} /><p>سيُزال الحساب من قائمة الدخول، بينما تبقى سجلات الأيام السابقة محفوظة.</p></div></Dialog></>;
}

export function AdminParticipantDetailsView({ participantId }: { participantId: string }) {
  const { participants, getParticipantTasks, resetParticipantPin, setParticipantRole, activity, pushToast, sendEncouragement } = useDemo();
  const participant = participants.find((item) => item.id === participantId);
  const [draftMessage, setDraftMessage] = useState("كفو عليك، خطوة واحدة اليوم تصنع فرقًا كبيرًا.");
  const [permissions, setPermissions] = useState({ editTasks: true, ranking: true, admin: participant?.role === "admin" });
  if (!participant) return <EmptyState title="المشارك غير موجود" description="ربما تم حذف الحساب أو لم يعد متاحًا." action={<Link href="/admin/participants"><Button>عودة للمشاركين</Button></Link>} />;
  const recentActivity = activity.filter((event) => event.participantId === participant.id).slice(0, 3);
  const participantTasks = getParticipantTasks(participant.id);
  return <><PageHeader eyebrow="تفاصيل مشارك" title={participant.name} description="صورة موحدة للمعلومات والتقدم والنشاط والتشجيع." actions={<Link href="/admin/participants"><Button variant="outline">كل المشاركين</Button></Link>} /><section className="participant-profile"><Card><div className="participant-profile-top"><UserAvatar initials={participant.initials} color={participant.avatarColor} size="xl" online={participant.presence === "active"} /><div><Badge tone="primary">{participant.role === "admin" ? "مشرف" : "مشارك"}</Badge><h2>{participant.name}</h2><StatusDot status={participant.presence} label={participant.currentStatus} /></div></div><div className="participant-profile-metrics"><div><span>تقدم اليوم</span><strong>{participant.progress}%</strong></div><div><span>السلسلة</span><strong>{participant.streak} يومًا</strong></div><div><span>النقاط</span><strong>{participant.score}</strong></div></div><Button variant="outline" onClick={() => resetParticipantPin(participant.id)}><KeyRound size={17} />إعادة تعيين PIN</Button></Card><Card><SectionHeader title="الصلاحيات" description="اضبط ما يظهر للمشارك داخل الواجهة الحالية." /><div className="permission-list"><label><input type="checkbox" checked={permissions.editTasks} onChange={(event) => setPermissions((current) => ({ ...current, editTasks: event.target.checked }))} /> يمكنه تعديل مهام اليوم</label><label><input type="checkbox" checked={permissions.ranking} onChange={(event) => setPermissions((current) => ({ ...current, ranking: event.target.checked }))} /> يظهر في الترتيب</label><label><input type="checkbox" checked={permissions.admin} onChange={(event) => setPermissions((current) => ({ ...current, admin: event.target.checked }))} /> صلاحية مشرف</label></div><Button size="sm" variant="secondary" onClick={() => { setParticipantRole(participant.id, permissions.admin ? "admin" : "participant"); pushToast({ tone: "success", title: "تم حفظ الصلاحيات", body: `حُفظت صلاحيات ${participant.name}.` }); }}>حفظ الصلاحيات</Button></Card></section><section className="admin-detail-grid"><section className="admin-detail-section"><SectionHeader title="مهام اليوم" /><div className="admin-detail-tasks">{participantTasks.slice(0, 3).map((task) => <TaskCard task={task} compact key={task.id} />)}</div></section><Card><SectionHeader title="آخر النشاط" />{recentActivity.length ? <div className="admin-activity-mini">{recentActivity.map((event) => <p key={event.id}><strong>{event.action}</strong> {event.task} <span>{formatRelativeTime(event.createdAt)}</span></p>)}</div> : <EmptyState title="لا يوجد نشاط مسجل لهذا المشارك." />}</Card></section><Card><SectionHeader title="رسالة تشجيع" description="اكتب رسالة قصيرة وعاينها قبل الإرسال." /><div className="admin-encouragement"><Input aria-label="رسالة التشجيع" value={draftMessage} onChange={(event) => setDraftMessage(event.target.value)} placeholder="اكتب رسالة قصيرة ومشجعة..." /><div className="encouragement-preview"><span>معاينة</span><div><UserAvatar initials={participant.initials} color={participant.avatarColor} size="sm" /><p>{draftMessage || "اكتب رسالة لتظهر هنا."}</p></div></div><Button onClick={() => { if (sendEncouragement(participant.id, draftMessage)) { pushToast({ tone: "success", title: "تم إرسال رسالة التشجيع", body: `وصلت الرسالة إلى ${participant.name}.` }); setDraftMessage(""); } else pushToast({ tone: "error", title: "تعذر الإرسال", body: "اكتب رسالة قصيرة وحاول مرة أخرى." }); }}><Activity size={17} />إرسال الرسالة</Button></div></Card></>;
}

export function AdminTasksView() {
  const { tasks, saveTaskDefinition, deleteTask, quranAyahsPerPage, setQuranAyahsPerPage } = useDemo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [taskName, setTaskName] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | TaskCategory>("all");
  const [category, setCategory] = useState<TaskCategory>("faith");
  const [type, setType] = useState<TaskType>("general");
  const [target, setTarget] = useState("1");
  const [fullPoints, setFullPoints] = useState("10");

  const units: Record<TaskType, string> = { quran: "صفحة", prayer: "صلاة", adhkar: "جلسة", reading: "صفحة", sport: "دقيقة", water: "كوب", sleep: "ساعة", general: "مرة" };
  const categoryLabels = adminTaskCategoryLabels;
  const categoryTones: Record<TaskCategory, "primary" | "teal" | "warning" | "success"> = { faith: "primary", culture: "teal", sport: "warning", growth: "success", skill: "primary", life: "teal", family: "warning", health: "success", character: "primary" };
  const statusLabels = { completed: "مكتملة", running: "قيد التنفيذ", paused: "متوقفة مؤقتًا", not_started: "جاهزة للبدء", partial: "إنجاز جزئي", not_completed: "لم تُنجز", closed: "مغلقة" };

  const resetForm = () => { setEditingTaskId(null); setTaskName(""); setCategory("faith"); setType("general"); setTarget("1"); setFullPoints("10"); };
  const openNewTask = () => { resetForm(); setDialogOpen(true); };
  const openEditTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    setEditingTaskId(task.id); setTaskName(task.title); setCategory(task.category); setType(task.type); setTarget(String(task.target)); setFullPoints(String(task.fullPoints ?? 10)); setDialogOpen(true);
  };
  const saveTask = () => {
    const numericTarget = Number(target);
    const numericPoints = Number(fullPoints);
    if (!taskName.trim() || !Number.isFinite(numericTarget) || numericTarget <= 0 || !Number.isFinite(numericPoints) || numericPoints < 0) return;
    saveTaskDefinition(editingTaskId, { title: taskName.trim(), category, type, target: numericTarget, fullPoints: numericPoints, unit: units[type] });
    setDialogOpen(false); resetForm();
  };
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const activeCount = Math.max(0, tasks.length - completedCount);
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const visibleTasks = useMemo(() => {
    const query = taskSearch.trim().toLocaleLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !query || task.title.toLocaleLowerCase().includes(query) || categoryLabels[task.category].includes(query);
      const matchesStatus = statusFilter === "all" || (statusFilter === "completed" ? task.status === "completed" : task.status !== "completed");
      const matchesCategory = categoryFilter === "all" || task.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [tasks, taskSearch, statusFilter, categoryFilter, categoryLabels]);
  const deletingTask = tasks.find((task) => task.id === deletingTaskId);
  const numericTarget = Number(target);
  const numericPoints = Number(fullPoints);
  const canSave = Boolean(taskName.trim()) && Number.isFinite(numericTarget) && numericTarget > 0 && Number.isFinite(numericPoints) && numericPoints >= 0;

  return <>
    <PageHeader
      eyebrow="مساحة المشرف"
      title="إدارة المهام"
      description="نظّم المهام اليومية، راقب التقدم، وحافظ على وضوح الخطوة التالية لكل مشارك."
      actions={<Button size="lg" onClick={openNewTask}><Plus size={19} />مهمة جديدة</Button>}
    />
    <section className="admin-tasks-page">
      <Card className="admin-task-hero" padding="lg">
        <div className="admin-task-hero-copy">
          <Badge tone="teal"><SparklesIcon size={13} /> مساحة العمل اليومية</Badge>
          <h2>كل إنجاز كبير يبدأ بمهمة واضحة.</h2>
          <p>راجع قائمة اليوم في لمحة، وعدّل الأهداف بسرعة، وخلي فريقك عارف دائمًا إيه الخطوة الجاية.</p>
          <div className="admin-task-hero-meta"><span><CheckCircle2 size={16} /> {completedCount} مهام مكتملة اليوم</span><span><Clock3 size={16} /> آخر تحديث منذ دقائق</span></div>
        </div>
        <div className="admin-task-ring" style={{ background: `conic-gradient(var(--teal) ${completionRate}%, var(--line) 0)` }} aria-label={`${completionRate}% من المهام مكتملة`}><div><strong>{completionRate}%</strong><span>نسبة الإنجاز</span></div></div>
      </Card>

      <Card className="admin-quran-display-settings">
        <SectionHeader title="إعداد قارئ القرآن" description="يظل القرآن كاملًا ومتاحًا للاختيار، وهذا الإعداد يحدد فقط عدد الآيات الظاهرة في كل دفعة." />
        <div><Input label="عدد الآيات في الدفعة" type="number" min="1" max="20" value={quranAyahsPerPage} onChange={(event) => setQuranAyahsPerPage(Number(event.target.value))} /><p>سيظهر للمستخدم زر للانتقال إلى الدفعة السابقة أو التالية، مع تفسير وصوت لكل آية.</p></div>
      </Card>

      <div className="admin-task-summary admin-task-summary-new">
        <Card className="admin-task-stat admin-task-stat-total"><span className="admin-task-stat-icon"><Layers3 size={18} /></span><div><small>إجمالي المهام</small><strong>{tasks.length}</strong><span>متاحة للمجموعة</span></div></Card>
        <Card className="admin-task-stat admin-task-stat-active"><span className="admin-task-stat-icon"><Target size={18} /></span><div><small>قيد المتابعة</small><strong>{activeCount}</strong><span>تحتاج تركيزًا اليوم</span></div></Card>
        <Card className="admin-task-stat admin-task-stat-done"><span className="admin-task-stat-icon"><CheckCircle2 size={18} /></span><div><small>مكتملة</small><strong>{completedCount}</strong><span>إنجازات مسجلة</span></div></Card>
      </div>

      <Card className="admin-task-controls-card" padding="sm">
        <div className="admin-task-controls-top"><div className="admin-task-search"><Search size={17} /><Input aria-label="البحث في المهام" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="ابحث باسم المهمة أو التصنيف" /></div><span className="admin-task-count"><strong>{visibleTasks.length}</strong> من {tasks.length} مهمة</span></div>
        <div className="admin-task-filter-row">
          <div className="admin-task-tabs" role="tablist" aria-label="تصفية حالة المهام">
            {[{ value: "all", label: "كل المهام" }, { value: "active", label: "قيد المتابعة" }, { value: "completed", label: "مكتملة" }].map((item) => <button type="button" role="tab" aria-selected={statusFilter === item.value} className={statusFilter === item.value ? "admin-task-filter-active" : ""} key={item.value} onClick={() => setStatusFilter(item.value as typeof statusFilter)}>{item.label}</button>)}
          </div>
          <div className="admin-task-category-filter"><Filter size={15} /><Dropdown label="التصنيف" value={categoryFilter} onChange={(value) => setCategoryFilter(value as typeof categoryFilter)} options={[{ value: "all", label: "كل التصنيفات" }, ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))]} /></div>
        </div>
      </Card>

      <div className="admin-task-list-heading"><div><h2>قائمة المهام</h2><p>اضغط على أي إجراء لتحديث المهمة فورًا.</p></div><Badge tone="neutral">{visibleTasks.length} نتائج</Badge></div>
      <div className="admin-task-catalog">
        {visibleTasks.map((task) => {
          const progress = task.target ? Math.min(100, Math.round((task.current / task.target) * 100)) : 0;
          const tone = categoryTones[task.category];
          return <article key={task.id} className={`admin-task-card admin-task-card-${tone}`}>
            <div className="admin-task-card-head"><span className="admin-task-icon"><TaskGlyph task={task} size={22} /></span><div className="admin-task-card-title"><div><Badge tone={tone}>{categoryLabels[task.category]}</Badge><span className="admin-task-status-dot" data-complete={task.status === "completed"} /></div><h3>{task.title}</h3><p>{task.supportingText ?? task.goalLabel}</p></div><div className="admin-task-card-actions"><IconButton label={`تعديل ${task.title}`} onClick={() => openEditTask(task.id)}><Pencil size={17} /></IconButton><IconButton label={task.id === "skill" ? "حذف المهارة" : `حذف ${task.title}`} onClick={() => setDeletingTaskId(task.id)} className="admin-task-delete"><Trash2 size={17} /></IconButton></div></div>
            <div className="admin-task-card-target"><span>النقاط</span><strong>{task.fullPoints ?? 0} نقطة</strong></div><div className="admin-task-card-target"><span>الهدف اليومي</span><strong>{task.current} <em>/ {task.target} {task.unit}</em></strong></div>
            <ProgressBar value={progress} tone={tone === "warning" ? "warning" : tone === "success" ? "success" : tone === "teal" ? "teal" : "primary"} />
            <div className="admin-task-card-footer"><Badge tone={task.status === "completed" ? "success" : task.status === "running" ? "primary" : "neutral"}>{statusLabels[task.status]}</Badge><span>{task.scheduledTime ?? "مرن خلال اليوم"}</span></div>
          </article>;
        })}
      </div>
      {!visibleTasks.length && <Card padding="lg"><EmptyState title={tasks.length ? "لا توجد نتائج مطابقة" : "ابدأ بإضافة أول مهمة"} description={tasks.length ? "جرّب تغيير كلمة البحث أو الفلاتر." : "أضف مهمة جديدة لتظهر هنا وفي لوحة المشاركين."} action={!tasks.length ? <Button onClick={openNewTask}><Plus size={17} />إضافة مهمة</Button> : undefined} /></Card>}
    </section>
    <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); resetForm(); }} title={editingTaskId ? "تعديل المهمة" : "إنشاء مهمة جديدة"} description="حدّد اسم المهمة وتصنيفها وهدفها، وستظهر النتيجة مباشرة في القائمة." footer={<><Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>إلغاء</Button><Button disabled={!canSave} onClick={saveTask}>{editingTaskId ? "حفظ التعديلات" : "حفظ المهمة"}</Button></>}>
      <div className="admin-form-grid"><Input label="اسم المهمة" value={taskName} onChange={(event) => setTaskName(event.target.value)} placeholder="مثال: مراجعة الدرس" /><Dropdown label="التصنيف" value={category} onChange={(value) => setCategory(value as TaskCategory)} options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))} /><Input label={`الهدف (${units[type]})`} type="number" min="1" value={target} onChange={(event) => setTarget(event.target.value)} /><Input label="نقاط الإكمال" type="number" min="0" value={fullPoints} onChange={(event) => setFullPoints(event.target.value)} /><Dropdown label="نوع المهمة" value={type} onChange={(value) => setType(value as TaskType)} options={[{ value: "general", label: "مهمة عامة" }, { value: "reading", label: "قراءة" }, { value: "sport", label: "رياضة" }, { value: "quran", label: "قرآن" }, { value: "prayer", label: "صلاة" }, { value: "adhkar", label: "أذكار" }, { value: "water", label: "ماء" }, { value: "sleep", label: "نوم" }]} /></div>
    </Dialog>
    <Dialog open={Boolean(deletingTaskId)} onClose={() => setDeletingTaskId(null)} title="حذف المهمة؟" description={deletingTask ? `سيتم حذف ${deletingTask.title} من قائمة المهام الحالية.` : "سيتم حذف المهمة من القائمة."} footer={<><Button variant="outline" onClick={() => setDeletingTaskId(null)}>إلغاء</Button><Button variant="destructive" onClick={() => { if (deletingTaskId) deleteTask(deletingTaskId); setDeletingTaskId(null); }}>حذف المهمة</Button></>}><div className="danger-dialog-copy"><TriangleAlert size={21} /><p>ستُحذف المهمة من القوائم الحالية، بينما تبقى سجلات الأيام السابقة محفوظة.</p></div></Dialog>
  </>;
}

export function AdminAnalyticsView() {
  const { participants, rankings, reports, getParticipantTasks, pushToast } = useDemo();
  const [period, setPeriod] = useState<Report["period"]>("weekly");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const liveReport = reports[period];
  const report = liveReport;
  const group = participants.filter((participant) => participant.role === "participant");
  const periodLabels: Record<Report["period"], string> = { daily: "اليوم", weekly: "هذا الأسبوع", monthly: "هذا الشهر" };

  const rows = group.map((participant) => {
    const tasks = getParticipantTasks(participant.id);
    const completed = tasks.filter((task) => task.status === "completed").length;
    const partial = tasks.filter((task) => ["partial", "running", "paused"].includes(task.status)).length;
    const pending = Math.max(0, tasks.length - completed - partial);
    const minutes = tasks.reduce((sum, task) => sum + task.actualMinutes, 0);
    const ranking = rankings.find((entry) => entry.participantId === participant.id);
    const level = participant.progress >= 75 ? "committed" : participant.progress >= 60 ? "watch" : "attention";
    return { participant, tasks, completed, partial, pending, minutes, rank: ranking?.rank ?? "—", level };
  });

  const activeCount = group.filter((participant) => participant.presence !== "offline").length;
  const successfulCount = group.filter((participant) => participant.progress >= 70).length;
  const averageStreak = group.length ? Math.round(group.reduce((sum, participant) => sum + participant.streak, 0) / group.length) : 0;
  const firstPoint = report.points[0];
  const lastPoint = report.points.at(-1);
  const trendDelta = firstPoint && lastPoint ? Math.round(lastPoint.progress - firstPoint.progress) : 0;
  const attentionRows = rows.filter((row) => row.level !== "committed" || row.participant.presence === "offline").sort((a, b) => a.participant.progress - b.participant.progress);

  const taskPerformance = Array.from(rows.reduce((summary, row) => {
    row.tasks.forEach((task) => {
      const current = summary.get(task.id) ?? { id: task.id, title: task.title, category: task.category, completed: 0, total: 0 };
      current.total += 1;
      if (task.status === "completed") current.completed += 1;
      summary.set(task.id, current);
    });
    return summary;
  }, new Map<string, { id: string; title: string; category: TaskCategory; completed: number; total: number }>()).values()).map((task) => ({
    ...task,
    rate: task.total ? Math.round((task.completed / task.total) * 100) : 0,
  })).sort((a, b) => b.rate - a.rate);

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleRows = rows.filter((row) => {
    const matchesSearch = !normalizedSearch || row.participant.name.toLocaleLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === "all" || row.level === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportCurrent = () => {
    exportReport(visibleRows.map((row) => ({
      participant: row.participant.name,
      progress: `${row.participant.progress}%`,
      completedTasks: row.completed,
      partialTasks: row.partial,
      pendingTasks: row.pending,
      time: formatMinutes(row.minutes),
      streak: row.participant.streak,
      score: row.participant.score,
      rank: row.rank,
    })), "excel", {
      filename: `group-report-${period}`,
      title: `تقرير المجموعة - ${periodLabels[period]}`,
      columns: [
        { key: "participant", header: "المشارك" },
        { key: "progress", header: "الإنجاز" },
        { key: "completedTasks", header: "مهام مكتملة" },
        { key: "partialTasks", header: "إنجاز جزئي" },
        { key: "pendingTasks", header: "متبقية" },
        { key: "time", header: "الوقت" },
        { key: "streak", header: "الاستمرارية" },
        { key: "score", header: "النقاط" },
        { key: "rank", header: "الترتيب" },
      ],
      metadata: { "الفترة": periodLabels[period], "متوسط الإنجاز": `${report.averageProgress}%`, "المشاركون": group.length },
    });
    pushToast({ tone: "success", title: "تم تجهيز التقرير", body: "نُزّلت نسخة Excel ببيانات المشاركين الظاهرة." });
  };

  return <div className="admin-report-page">
    <PageHeader
      eyebrow="متابعة المجموعة"
      title="تقارير الأداء"
      description="ملخص واضح يساعدك على متابعة الالتزام ومعرفة من يحتاج إلى دعم."
      actions={<div className="admin-report-actions"><Button size="sm" variant="outline" onClick={() => window.print()}><Printer size={16} />طباعة</Button><Button size="sm" onClick={exportCurrent}><FileSpreadsheet size={16} />تصدير Excel</Button></div>}
    />

    <div className="admin-report-period-row">
      <Tabs value={period} onValueChange={setPeriod} tabs={[{ value: "daily", label: "يومي" }, { value: "weekly", label: "أسبوعي" }, { value: "monthly", label: "شهري" }]} />
      <span><CalendarDays size={15} />{periodLabels[period]}</span>
    </div>

    <section className="admin-report-kpis">
      <Card className="admin-report-kpi"><span className="admin-report-kpi-icon kpi-primary"><ClipboardCheck size={20} /></span><div><small>متوسط الإنجاز</small><strong>{report.averageProgress}%</strong><p className={trendDelta >= 0 ? "metric-up" : "metric-down"}>{trendDelta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{Math.abs(trendDelta)}% خلال الفترة</p></div></Card>
      <Card className="admin-report-kpi"><span className="admin-report-kpi-icon kpi-teal"><Users size={20} /></span><div><small>النشطون الآن</small><strong>{activeCount}<em> / {group.length}</em></strong><p>{successfulCount} وصلوا إلى 70% أو أكثر</p></div></Card>
      <Card className="admin-report-kpi"><span className="admin-report-kpi-icon kpi-success"><Clock3 size={20} /></span><div><small>وقت المجموعة</small><strong>{formatMinutes(report.totalMinutes * group.length)}</strong><p>إجمالي الوقت المسجل {periodLabels[period]}</p></div></Card>
      <Card className="admin-report-kpi"><span className="admin-report-kpi-icon kpi-warning"><Flame size={20} /></span><div><small>متوسط الاستمرارية</small><strong>{averageStreak} أيام</strong><p>{attentionRows.length} يحتاجون إلى متابعة</p></div></Card>
    </section>

    <section className="admin-report-overview">
      <Card className="admin-report-chart-card">
        <SectionHeader title="اتجاه الإنجاز" description={`تغير مستوى الإنجاز خلال ${periodLabels[period]}.`} />
        <div className="admin-report-chart" aria-label="اتجاه إنجاز المجموعة">
          {report.points.map((point) => <div className="admin-report-chart-column" key={point.label}><span>{point.progress}%</span><div><i style={{ height: `${Math.max(8, point.progress)}%` }} /></div><small>{point.label}</small></div>)}
        </div>
        <div className="admin-report-chart-footer"><span><i className="chart-key-primary" />نسبة الإنجاز</span><strong>{trendDelta >= 0 ? "الاتجاه العام مستقر ويتحسن" : "هناك تراجع يحتاج إلى مراجعة"}</strong></div>
      </Card>

      <Card className="admin-attention-card">
        <SectionHeader title="يحتاجون متابعة" description="الأولوية للأقل تقدمًا أو غير النشطين." action={<Badge tone={attentionRows.length ? "warning" : "success"}>{attentionRows.length}</Badge>} />
        <div className="admin-attention-list">
          {attentionRows.slice(0, 4).map((row) => <article key={row.participant.id}><UserAvatar initials={row.participant.initials} color={row.participant.avatarColor} size="sm" online={row.participant.presence === "active"} /><div><strong>{row.participant.name}</strong><span>{row.participant.presence === "offline" ? "غير نشط حاليًا" : row.participant.progress < 60 ? "الإنجاز أقل من 60%" : "قريب من المستوى المطلوب"}</span></div><strong className="attention-progress">{row.participant.progress}%</strong><Link href={`/admin/participants/${row.participant.id}`} aria-label={`فتح تقرير ${row.participant.name}`}><ArrowLeft size={17} /></Link></article>)}
          {!attentionRows.length && <div className="admin-report-empty"><CheckCircle2 size={24} /><strong>المجموعة تسير بشكل جيد</strong><span>لا توجد حالات تحتاج إلى متابعة الآن.</span></div>}
        </div>
      </Card>
    </section>

    <Card className="admin-task-performance-card">
      <SectionHeader title="أداء المهام" description="نسبة من أكملوا كل مهمة من إجمالي المشاركين." />
      <div className="admin-task-performance-list">
        {taskPerformance.slice(0, 6).map((task) => <article key={task.id}><div><span className="task-performance-icon"><Layers3 size={18} /></span><div><strong>{task.title}</strong><small>{adminTaskCategoryLabels[task.category]}</small></div></div><div className="task-performance-progress"><ProgressBar value={task.rate} tone={task.rate >= 70 ? "success" : task.rate >= 50 ? "teal" : "warning"} /><span>{task.completed} من {task.total}</span></div><strong>{task.rate}%</strong></article>)}
      </div>
    </Card>

    <section className="admin-participant-report-section">
      <div className="admin-participant-report-heading">
        <div><h2>تفاصيل المشاركين</h2><p>آخر حالة مسجلة لكل مشارك داخل المجموعة.</p></div>
        <div className="admin-report-filters"><div className="admin-report-search"><Search size={16} /><Input aria-label="البحث عن مشارك" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم" /></div><Dropdown label="حالة الأداء" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "كل الحالات" }, { value: "committed", label: "ملتزم" }, { value: "watch", label: "يحتاج متابعة" }, { value: "attention", label: "متعثر" }]} /></div>
      </div>
      <Card padding="none" className="admin-report-table-card">
        <div className="admin-report-table">
          <div className="admin-report-table-head"><span>المشارك</span><span>الإنجاز</span><span>حالة المهام</span><span>الوقت</span><span>الاستمرارية</span><span>التقييم</span><span /></div>
          {visibleRows.map((row) => <article className="admin-report-table-row" key={row.participant.id}><div className="admin-person"><UserAvatar initials={row.participant.initials} color={row.participant.avatarColor} size="sm" online={row.participant.presence === "active"} /><div><strong>{row.participant.name}</strong><span>الترتيب {row.rank} · {row.participant.score} نقطة</span></div></div><div className="admin-report-progress"><ProgressBar value={row.participant.progress} tone={row.participant.progress >= 70 ? "success" : row.participant.progress >= 55 ? "teal" : "warning"} /><strong>{row.participant.progress}%</strong></div><div className="admin-report-task-counts"><span className="task-count-done">{row.completed} مكتملة</span><span>{row.partial} جزئية</span><span>{row.pending} متبقية</span></div><span>{row.minutes ? formatMinutes(row.minutes) : "—"}</span><span>{row.participant.streak} أيام</span><Badge tone={row.level === "committed" ? "success" : row.level === "watch" ? "warning" : "danger"}>{row.level === "committed" ? "ملتزم" : row.level === "watch" ? "يحتاج متابعة" : "متعثر"}</Badge><Link href={`/admin/participants/${row.participant.id}`} className="admin-report-row-link" aria-label={`عرض تفاصيل ${row.participant.name}`}><Eye size={17} /></Link></article>)}
        </div>
        {!visibleRows.length && <EmptyState title="لا توجد نتائج مطابقة" description="جرّب تغيير حالة الأداء أو عبارة البحث." />}
      </Card>
    </section>
  </div>;
}

export function AdminActivityView() {
  const { activity } = useDemo();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const query = search.trim();
  const items = activity.filter((event) => {
    const matchesType = filter === "all" || event.kind === filter;
    const matchesSearch = !query || [event.participantName, event.action, event.task].some((value) => value.includes(query));
    return matchesType && matchesSearch;
  });
  return <><PageHeader eyebrow="الإدارة" title="سجل النشاط" description="تصفية وتتبع نشاط المجموعة حسب النوع أو اسم المشارك أو المهمة." /><div className="activity-filters"><Dropdown label="نوع النشاط" value={filter} onChange={setFilter} options={[{ value: "all", label: "كل النشاطات" }, { value: "started", label: "بدأ" }, { value: "completed", label: "مكتمل" }, { value: "paused", label: "متوقف" }, { value: "joined", label: "دخول" }]} /><Input aria-label="البحث في النشاط" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم المشارك أو المهمة" /></div><Card padding="none" className="admin-table-card"><div className="admin-table admin-activity-table"><div className="admin-table-head"><span>المشارك</span><span>الحدث</span><span>المهمة</span><span>الوقت</span></div>{items.map((event) => <article className="admin-table-row" key={event.id}><div className="admin-person"><UserAvatar initials={event.initials} color={event.avatarColor} size="sm" /><strong>{event.participantName}</strong></div><Badge tone={event.kind === "completed" ? "success" : event.kind === "paused" ? "warning" : "primary"}>{event.action}</Badge><span>{event.task || "—"}</span><span>{formatRelativeTime(event.createdAt)}</span></article>)}</div>{!items.length && <EmptyState title="لا يوجد نشاط مطابق." description="غيّر نوع النشاط أو عبارة البحث." />}</Card></>;
}
const dataActions = [
  { id: "day", title: "مسح يوم", body: "سيزيل سجل ومهام يوم واحد فقط." },
  { id: "week", title: "مسح أسبوع", body: "سيزيل بيانات أسبوع محدد من العرض." },
  { id: "month", title: "مسح شهر", body: "سيزيل بيانات شهر محدد من العرض." },
  { id: "history", title: "مسح السجل", body: "سيزيل تاريخ النشاط المحفوظ." },
  { id: "participant", title: "مسح بيانات مشارك", body: "سيزيل بيانات المشارك المحدد فقط." },
] as const;

export function AdminDataView() {
  const { canRestoreClearedData, clearData, restoreClearedData } = useDemo();
  const [target, setTarget] = useState<typeof dataActions[number] | null>(null);
  return <><PageHeader eyebrow="الإدارة" title="إدارة البيانات" description="كل إجراء محدد بنطاقه، مع نسخة احتياطية مؤقتة يمكن استعادتها فورًا." actions={canRestoreClearedData ? <Button variant="outline" onClick={restoreClearedData}>استعادة آخر مسح</Button> : undefined} /><section className="data-action-list">{dataActions.map((action) => <Card key={action.id} className="data-action"><span><TriangleAlert size={22} /></span><div><h3>{action.title}</h3><p>{action.body}</p></div><Button variant="destructive" size="sm" onClick={() => setTarget(action)}>مسح</Button></Card>)}</section><Dialog open={Boolean(target)} onClose={() => setTarget(null)} title={target ? `${target.title}؟` : "تأكيد"} description={target?.body} footer={<><Button variant="outline" onClick={() => setTarget(null)}>إلغاء</Button><Button variant="destructive" onClick={() => { if (target) clearData(target.id); setTarget(null); }}>تأكيد المسح</Button></>}><div className="danger-dialog-copy"><TriangleAlert size={22} /><p>سيُطبّق المسح على النطاق الموضح فقط. يمكنك استعادة آخر نسخة من الزر أعلى الصفحة ما دمت في الجلسة الحالية.</p></div></Dialog></>;
}
