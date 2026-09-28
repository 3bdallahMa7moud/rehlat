"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ListTodo } from "lucide-react";
import { ProgressBar, StatusBadge } from "@/components/ui";
import { TaskGlyph } from "@/components/features/TaskCard";
import type { Task } from "@/types/models";
import styles from "./AdminParticipantTasks.module.css";

export function AdminParticipantTasks({ tasks, participantName }: { tasks: Task[]; participantName: string }) {
  const [showAll, setShowAll] = useState(false);
  const completed = tasks.filter((task) => task.status === "completed").length;
  const visibleTasks = showAll ? tasks : tasks.slice(0, 4);

  return <section className={styles.panel} aria-label={`مهام ${participantName} اليوم`}>
    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}>متابعة المشارك</span>
        <h2>مهام اليوم</h2>
        <p>تُعرض حالة {participantName} هنا للمتابعة. يبدأ مهامه ويسجّل تقدمه من حسابه.</p>
      </div>
      <Link href="/admin/tasks" className={styles.manageLink}>إدارة المهام <ArrowLeft size={16} aria-hidden="true" /></Link>
    </header>
    <div className={styles.summary} aria-label="ملخص مهام اليوم">
      <span><strong>{tasks.length}</strong> مهمة اليوم</span>
      <span><strong>{completed}</strong> مكتملة</span>
      <span><strong>{tasks.length - completed}</strong> غير مكتملة</span>
    </div>
    {tasks.length ? <ul className={styles.list}>
      {visibleTasks.map((task) => {
        const progress = task.target > 0 ? task.current / task.target * 100 : 0;
        return <li className={styles.task} key={task.id}>
          <span className={styles.icon} aria-hidden="true"><TaskGlyph task={task} size={20} /></span>
          <div className={styles.taskContent}>
            <div className={styles.taskHeading}><h3>{task.title}</h3><StatusBadge status={task.status} /></div>
            <div className={styles.taskProgress}><ProgressBar value={progress} tone={task.status === "completed" ? "success" : "teal"} /><span>{task.current} من {task.target} {task.unit}</span></div>
          </div>
        </li>;
      })}
    </ul> : <div className={styles.empty}><ListTodo size={24} aria-hidden="true" /><strong>لا توجد مهام لهذا اليوم</strong><p>راجع جدول المهام وإسنادها للمشارك من إدارة المهام.</p></div>}
    {tasks.length > 4 && <button type="button" className={styles.showMore} onClick={() => setShowAll((value) => !value)} aria-expanded={showAll}>{showAll ? "عرض مهام أقل" : `عرض جميع المهام (${tasks.length})`}</button>}
  </section>;
}
