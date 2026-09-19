"use client";

import { BookOpen, CircleCheck, CircleDashed, CircleMinus, CircleX, Clock3, Droplets, Dumbbell, Moon, Pause, Play, Sparkles, Timer, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { Badge, Button, Card, Dialog, IconButton, ProgressBar, StatusBadge } from "@/components/ui";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/cn";
import { formatMinutes } from "@/lib/format";
import { useDemo } from "@/state/DemoContext";
import type { Task, TaskCategory, TaskStatus } from "@/types/models";

const categoryNames: Record<TaskCategory, string> = {
  faith: "دين",
  culture: "ثقافة",
  sport: "رياضة",
  growth: "تطوير الذات",
  skill: "مهارة",
  life: "حياة",
  family: "أهل وبيت",
  health: "صحة",
  character: "أخلاق",
};

const categoryTone: Record<TaskCategory, "primary" | "teal" | "warning" | "success"> = {
  faith: "primary",
  culture: "teal",
  sport: "warning",
  growth: "success",
  skill: "primary",
  life: "teal",
  family: "warning",
  health: "success",
  character: "primary",
};

const typeIcons: Record<Task["type"], LucideIcon | "mosque" | "quran"> = {
  prayer: "mosque",
  quran: "quran",
  adhkar: Sparkles,
  reading: BookOpen,
  sport: Dumbbell,
  water: Droplets,
  sleep: Moon,
  general: CircleDashed,
};

export function TaskGlyph({ task, size = 22 }: { task: Task; size?: number }) {
  const Icon = typeIcons[task.type];
  if (Icon === "mosque" || Icon === "quran") return <AppIcon name={Icon} size={size} />;
  return <Icon size={size} />;
}

function StatusGlyph({ status }: { status: TaskStatus }) {
  if (status === "completed") return <CircleCheck size={18} />;
  if (status === "partial") return <CircleDashed size={18} />;
  if (status === "not_completed") return <CircleMinus size={18} />;
  if (status === "closed") return <CircleX size={18} />;
  return null;
}

export function TaskCard({ task, compact = false }: { task: Task; compact?: boolean }) {
  const { setTaskStatus, completeTask } = useDemo();
  const [completionOpen, setCompletionOpen] = useState(false);
  const progress = task.target ? Math.round((task.current / task.target) * 100) : 0;
  const finish = (outcome: "completed" | "partial" | "not_completed" | "closed") => {
    completeTask(task.id, outcome);
    setCompletionOpen(false);
    if (outcome === "completed") void celebrate("task");
  };
  const statusAction = () => {
    if (task.status === "not_started") return <Button size="sm" onClick={() => setTaskStatus(task.id, "running")}><Play size={16} />ابدأ</Button>;
    if (task.status === "running") return <Button size="sm" variant="outline" onClick={() => setTaskStatus(task.id, "paused")}><Pause size={16} />إيقاف مؤقت</Button>;
    if (task.status === "paused") return <Button size="sm" onClick={() => setTaskStatus(task.id, "running")}><Play size={16} />استئناف</Button>;
    if (task.status === "partial") return <Button size="sm" variant="secondary" onClick={() => setTaskStatus(task.id, "running")}><Play size={16} />أكمل</Button>;
    if (task.status === "not_completed") return <Button size="sm" variant="outline" onClick={() => setTaskStatus(task.id, "running")}><Play size={16} />إعادة المحاولة</Button>;
    return null;
  };
  const canFinish = ["running", "paused", "not_started", "partial"].includes(task.status);
  const tone = categoryTone[task.category];

  return <>
    <Card padding={compact ? "sm" : "md"} className={cn("task-card", compact && "task-card-compact", `task-${task.category}`, task.status === "running" && "task-running", task.status === "completed" && "task-completed")}>
      <div className="task-card-top">
        <span className={cn("task-glyph", `task-glyph-${tone}`)}><TaskGlyph task={task} /></span>
        <div className="task-card-title">
          <div><h3>{task.title}</h3><p>{task.supportingText ?? task.goalLabel}</p></div>
          <div className="task-badges"><Badge tone={tone}>{categoryNames[task.category]}</Badge><StatusBadge status={task.status} /></div>
        </div>
      </div>
      {task.group === "morning" && <div className="morning-group"><Sparkles size={14} /><span>ضمن مجموعة الصباح: مهام روتينك قبل انشغال اليوم.</span></div>}
      <div className="task-goal-row"><span>{task.goalLabel}</span><strong>{task.current} / {task.target} {task.unit}</strong></div>
      <ProgressBar value={progress} tone={tone === "warning" ? "warning" : tone === "success" ? "success" : tone === "teal" ? "teal" : "primary"} />
      {!compact && <div className="task-meta"><span><Clock3 size={15} />{task.scheduledTime ?? "مرن خلال اليوم"}</span>{task.durationMinutes && <span><Timer size={15} />{formatMinutes(task.actualMinutes)} من {formatMinutes(task.durationMinutes)}</span>}</div>}
      <div className="task-card-footer">
        {statusAction()}
        {canFinish && <IconButton label="إنهاء المهمة" onClick={() => setCompletionOpen(true)} className="task-finish-button"><CircleCheck size={20} /></IconButton>}
        {["completed", "partial", "not_completed", "closed"].includes(task.status) && <span className="task-finished-copy"><StatusGlyph status={task.status} />{task.status === "completed" ? "سُجلت في رحلة اليوم" : "حالة المهمة محفوظة"}</span>}
      </div>
    </Card>
    <Dialog open={completionOpen} onClose={() => setCompletionOpen(false)} title="كيف كانت المهمة؟" description={`سجّل نتيجة «${task.title}» بالطريقة التي تعبّر عن يومك.`} footer={<><Button variant="outline" onClick={() => setCompletionOpen(false)}>إلغاء</Button><Button variant="destructive" onClick={() => finish("closed")}>إغلاق المهمة</Button></>}>
      <div className="completion-options">
        <button type="button" onClick={() => finish("completed")}><CircleCheck size={23} /><span><strong>إنجاز كامل</strong><small>تم الوصول للهدف المحدد.</small></span></button>
        <button type="button" onClick={() => finish("partial")}><CircleDashed size={23} /><span><strong>إنجاز جزئي</strong><small>فيه تقدم يُحسب اليوم.</small></span></button>
        <button type="button" onClick={() => finish("not_completed")}><CircleMinus size={23} /><span><strong>عدم إنجاز</strong><small>سجل الحالة بصدق وامضِ.</small></span></button>
      </div>
    </Dialog>
  </>;
}
