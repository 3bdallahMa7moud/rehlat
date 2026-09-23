"use client";

import { CircleCheck, CircleDashed, CircleMinus, CircleX, Clock3, Play, Sparkles, Timer } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActivityIcon } from "@/design/activity-visuals";
import { Badge, Button, Card, Dialog, IconButton, ProgressBar, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMinutes } from "@/lib/format";
import { PARTIAL_COMPLETION_WEIGHT } from "@/lib/progress";
import { getTaskPrimaryAction, taskCategoryNames, taskCategoryTones } from "@/domain/tasks/task-presentation";
import { useDemo } from "@/state/DemoContext";
import type { Task, TaskStatus } from "@/types/models";

export function TaskGlyph({ task, size = 22 }: { task: Task; size?: number }) {
  return <ActivityIcon type={task.type} size={size} />;
}

function StatusGlyph({ status }: { status: TaskStatus }) {
  if (status === "completed") return <CircleCheck size={18} />;
  if (status === "partial") return <CircleDashed size={18} />;
  if (status === "not_completed") return <CircleMinus size={18} />;
  if (status === "closed") return <CircleX size={18} />;
  return null;
}

type CompletionOutcome = "completed" | "partial" | "not_completed" | "closed";

export function TaskCard({ task, compact = false, openOnClick = false }: { task: Task; compact?: boolean; openOnClick?: boolean }) {
  const { setTaskStatus, completeTask } = useDemo();
  const router = useRouter();
  const [completionOpen, setCompletionOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<CompletionOutcome | null>(null);
  const progress = task.target ? Math.round((task.current / task.target) * 100) : 0;
  const closeCompletion = () => {
    setCompletionOpen(false);
    setSelectedOutcome(null);
  };
  const finish = (outcome: CompletionOutcome) => {
    completeTask(task.id, outcome);
    setCompletionOpen(false);
    setSelectedOutcome(null);
  };
  const openTask = (status?: TaskStatus) => {
    if (status) setTaskStatus(task.id, status);
    router.push(`/tasks/${task.id}`);
  };
  const statusAction = () => {
    const variant = task.status === "partial" ? "secondary" : task.status === "running" || task.status === "not_completed" || task.status === "completed" || task.status === "closed" ? "outline" : "primary";
    const nextStatus = ["not_started", "paused", "partial", "not_completed"].includes(task.status) ? "running" : undefined;
    return <Button size="sm" variant={variant} onClick={(event) => { event.stopPropagation(); openTask(nextStatus); }}><Play size={16} />{getTaskPrimaryAction(task.status)}</Button>;
  };
  const canFinish = ["running", "paused", "not_started", "partial"].includes(task.status);
  const isPrayerAggregate = task.type === "prayer" && Boolean(task.detailItems?.length);
  const tone = taskCategoryTones[task.category];

  return <>
    <Card padding={compact ? "sm" : "md"} className={cn("task-card", compact && "task-card-compact", openOnClick && "task-card-openable", `task-${task.category}`, task.status === "running" && "task-running", task.status === "completed" && "task-completed")} role={openOnClick ? "link" : undefined} tabIndex={openOnClick ? 0 : undefined} onClick={openOnClick ? (event) => { if ((event.target as HTMLElement).closest("button, a")) return; openTask(); } : undefined} onKeyDown={openOnClick ? (event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openTask(); } } : undefined}>
      <div className="task-card-top">
        <span className={cn("task-glyph", `task-glyph-${tone}`)}><TaskGlyph task={task} /></span>
        <div className="task-card-title">
          <div><h3>{openOnClick ? task.title : <Link href={`/tasks/${task.id}`} className="task-title-link">{task.title}</Link>}</h3><p>{task.supportingText ?? task.goalLabel}</p></div>
          <div className="task-badges"><Badge tone={tone}>{taskCategoryNames[task.category]}</Badge><StatusBadge status={task.status} /></div>
        </div>
      </div>
      {task.group === "morning" && <div className="morning-group"><Sparkles size={14} /><span>ضمن مجموعة الصباح: مهام روتينك قبل انشغال اليوم.</span></div>}
      <div className="task-goal-row"><span>{task.goalLabel}</span><strong>{task.current} / {task.target} {task.unit}</strong></div>
      <ProgressBar value={progress} tone={tone === "warning" ? "warning" : tone === "success" ? "success" : tone === "teal" ? "teal" : "primary"} />
      {!compact && <div className="task-meta"><span><Timer size={15} />الوقت الفعلي: {formatMinutes(task.actualMinutes)}</span>{task.durationMinutes && <span><Clock3 size={15} />الهدف الزمني: {formatMinutes(task.durationMinutes)}</span>}</div>}
      <div className="task-card-footer">
        {isPrayerAggregate ? <span className="task-finished-copy">تُحدّث من الصلوات المسجّل وقتها.</span> : <>
          {statusAction()}
          {canFinish && <IconButton label="فتح خيارات إنهاء المهمة" onClick={(event) => { event.stopPropagation(); setSelectedOutcome(null); setCompletionOpen(true); }} className="task-finish-button"><CircleCheck size={20} /></IconButton>}
          {["completed", "partial", "not_completed", "closed"].includes(task.status) && <span className="task-finished-copy"><StatusGlyph status={task.status} />{task.status === "completed" ? "سُجلت في رحلة اليوم" : "حالة المهمة محفوظة"}</span>}
        </>}
      </div>
    </Card>
    <Dialog
      open={completionOpen}
      onClose={closeCompletion}
      title="كيف كانت المهمة؟"
      description={"اختر نتيجة «" + task.title + "» ثم احفظها. لن يتم تسجيل شيء قبل التأكيد."}
      footer={<>
        <Button variant="outline" onClick={closeCompletion}>إلغاء</Button>
        <Button disabled={!selectedOutcome} onClick={() => { if (selectedOutcome) finish(selectedOutcome); }}>
          <CircleCheck size={17} />حفظ النتيجة
        </Button>
      </>}
    >
      <div className="completion-options" role="radiogroup" aria-label="نتيجة المهمة">
        <button type="button" role="radio" aria-checked={selectedOutcome === "completed"} className={cn(selectedOutcome === "completed" && "completion-option-selected")} onClick={() => setSelectedOutcome("completed")}>
          <CircleCheck size={23} /><span><strong>إنجاز كامل</strong><small>وصلت إلى الهدف المحدد بالكامل.</small></span>
        </button>
        <button type="button" role="radio" aria-checked={selectedOutcome === "partial"} className={cn(selectedOutcome === "partial" && "completion-option-selected")} onClick={() => setSelectedOutcome("partial")}>
          <CircleDashed size={23} /><span><strong>إنجاز جزئي</strong><small>يُحتسب {PARTIAL_COMPLETION_WEIGHT * 100}% في تقدم اليوم، مع حفظ الوقت.</small></span>
        </button>
        <button type="button" role="radio" aria-checked={selectedOutcome === "not_completed"} className={cn(selectedOutcome === "not_completed" && "completion-option-selected")} onClick={() => setSelectedOutcome("not_completed")}>
          <CircleMinus size={23} /><span><strong>لم أُنجز المهمة</strong><small>0% في تقدم اليوم، والوقت الفعلي محفوظ.</small></span>
        </button>
        <button type="button" role="radio" aria-checked={selectedOutcome === "closed"} className={cn("completion-option-skip", selectedOutcome === "closed" && "completion-option-selected")} onClick={() => setSelectedOutcome("closed")}>
          <CircleX size={23} /><span><strong>إغلاق بدون تسجيل إنجاز</strong><small>سيُحفظ الوقت والسجل، لكن لن تُحتسب المهمة كإنجاز.</small></span>
        </button>
      </div>
      <p className="completion-selection-hint" aria-live="polite">
        {selectedOutcome ? "تم اختيار النتيجة. اضغط «حفظ النتيجة» للتأكيد." : "اختر نتيجة واحدة للمتابعة."}
      </p>
    </Dialog>
  </>;
}
