"use client";

import { Check, Clock3, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { useDemo } from "@/state/DemoContext";
import type { Task, TaskDetail } from "@/types/models";
import { getTaskDetailElapsedSeconds, getTaskDetailEarnedPoints } from "@/lib/task-details";

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function statusLabel(detail: TaskDetail) {
  if (detail.status === "completed") return "مكتمل";
  if (detail.status === "partial") return "جزئي";
  if (detail.status === "running") return "يعمل الآن";
  if (detail.status === "paused") return "متوقف مؤقتًا";
  if (detail.status === "not_completed") return "لم يُنجز";
  return "لم يبدأ";
}

export function TaskDetailTimer({ task }: { task: Task }) {
  const { startTaskDetail, pauseTaskDetail, completeTaskDetail } = useDemo();
  const [, setTick] = useState(0);
  const details = useMemo(() => task.detailItems ?? [], [task.detailItems]);

  useEffect(() => {
    if (!details.some((detail) => detail.status === "running")) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [details]);

  if (!details.length) return null;
  const totalSeconds = details.reduce((sum, detail) => sum + getTaskDetailElapsedSeconds(detail), 0);
  const completed = details.filter((detail) => detail.status === "completed").length;

  return <Card className="task-detail-timer-card">
    <SectionHeader title="وقت المهمة" description={details.length ? "الوقت الحالي للتفاصيل والوقت التراكمي محفوظان من التوقيت الحالي." : "هذا هو الوقت الإجمالي المحفوظ للمهمة."} />
    <div className="task-detail-timer-summary"><strong dir="ltr">{formatDuration(totalSeconds)}</strong><span>{details.length ? `${completed} من ${details.length} تفاصيل مكتملة` : "الوقت الإجمالي المحفوظ"}</span></div>
    <div className="task-detail-timer-list">
      {details.map((detail) => {
        const elapsed = getTaskDetailElapsedSeconds(detail);
        const earned = getTaskDetailEarnedPoints(detail);
        const finished = ["completed", "not_completed"].includes(detail.status);
        const requiresRecordedTime = task.type === "prayer" && elapsed < 1;
        return <article className="task-detail-timer-row" key={detail.id}>
          <div className="task-detail-timer-copy"><strong>{detail.title}</strong><span>{detail.current} / {detail.target} {detail.unit} · {earned} / {detail.fullPoints} نقطة</span></div>
          <div className="task-detail-timer-time"><Clock3 size={15} /><strong>{formatDuration(elapsed)}</strong><Badge tone={detail.status === "completed" ? "success" : detail.status === "running" ? "primary" : detail.status === "partial" ? "warning" : "neutral"}>{statusLabel(detail)}</Badge></div>
          <div className="task-detail-timer-actions">
            {!finished && (detail.status === "running" ? <Button size="sm" variant="outline" onClick={() => pauseTaskDetail(task.id, detail.id)}><Pause size={14} />إيقاف</Button> : <Button size="sm" variant="secondary" onClick={() => startTaskDetail(task.id, detail.id)}><Play size={14} />{detail.status === "paused" ? "استئناف" : "ابدأ"}</Button>)}
            {!finished && <><Button size="sm" disabled={requiresRecordedTime} onClick={() => completeTaskDetail(task.id, detail.id, "completed")}><Check size={14} />إكمال</Button><Button size="sm" variant="ghost" disabled={requiresRecordedTime} onClick={() => completeTaskDetail(task.id, detail.id, "partial")}>جزئي</Button><Button size="sm" variant="ghost" onClick={() => completeTaskDetail(task.id, detail.id, "not_completed")}>لم تُنجز</Button></>}
          </div>
        </article>;
      })}
    </div>
  </Card>;
}
