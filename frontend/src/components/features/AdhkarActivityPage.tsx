"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, BookOpenText, Check, CheckCircle2, ChevronLeft, ChevronRight, List, Minus, Moon, Plus, Sparkles, Sun, WandSparkles } from "lucide-react";
import { adhkarContent, tasbeehContent, type AdhkarSession, type DhikrItem } from "@/data/adhkar";
import { Button, EmptyState } from "@/components/ui";
import { formatDashboardDate } from "@/lib/date-time";
import { cn } from "@/lib/cn";
import { useDemo } from "@/state/DemoContext";
import type { Task } from "@/types/models";
import styles from "./AdhkarActivityPage.module.css";

function sessionForTask(task: Task): AdhkarSession {
  if (task.config?.type === "adhkar") return task.config.session;
  return task.group === "evening" || task.id === "adhkar-evening" ? "evening" : "morning";
}

function itemCount(task: Task, item: DhikrItem) {
  const saved = task.details?.[`adhkarCount_${item.id}`];
  if (typeof saved === "number" && Number.isFinite(saved)) return Math.max(0, Math.min(item.count, Math.floor(saved)));
  if (Array.isArray(task.details?.completedAdhkar)) return task.details.completedAdhkar.includes(item.id) ? item.count : 0;
  return task.status === "completed" ? item.count : 0;
}

function progressForTask(task: Task | undefined) {
  if (!task) return 0;
  const items = adhkarContent[sessionForTask(task)];
  const target = items.reduce((total, item) => total + item.count, 0);
  return Math.round(items.reduce((total, item) => total + itemCount(task, item), 0) / target * 100);
}

export function AdhkarActivityPage({ taskId }: { taskId: string }) {
  const { tasks, updateTaskDetails, updateTaskProgress } = useDemo();
  const task = tasks.find((candidate) => candidate.id === taskId);
  const [viewMode, setViewMode] = useState<"focus" | "list">("focus");
  const [focusIndex, setFocusIndex] = useState(0);
  const [textSize, setTextSize] = useState(0);

  if (!task) {
    return <EmptyState title="مهمة الأذكار غير موجودة" description="ربما حُذفت المهمة أو لم تعد متاحة." action={<Link href="/tasks"><Button variant="outline">العودة إلى المهام</Button></Link>} />;
  }

  const session = sessionForTask(task);
  const isEvening = session === "evening";
  const items = adhkarContent[session];
  const counts = items.map((item) => itemCount(task, item));
  const totalRead = counts.reduce((total, count) => total + count, 0);
  const totalTarget = items.reduce((total, item) => total + item.count, 0);
  const completedItems = counts.filter((count, index) => count === items[index].count).length;
  const percentage = Math.round(totalRead / totalTarget * 100);
  const isComplete = completedItems === items.length;
  const resumeIndex = counts.findIndex((count, index) => count < items[index].count);
  const currentIndex = Math.min(focusIndex, items.length - 1);
  const morningTask = tasks.find((candidate) => candidate.type === "adhkar" && sessionForTask(candidate) === "morning");
  const eveningTask = tasks.find((candidate) => candidate.type === "adhkar" && sessionForTask(candidate) === "evening");
  const tasbeehCounts = tasbeehContent.map((item) => {
    const saved = task.details?.[`tasbeeh_${item.id}`];
    return typeof saved === "number" ? Math.max(0, Math.min(item.target, Math.floor(saved))) : 0;
  });

  const jumpToReader = (index = resumeIndex < 0 ? 0 : resumeIndex) => {
    setViewMode("focus");
    setFocusIndex(index);
    document.getElementById("adhkar-reading-space")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateReadCount = (index: number, change: number) => {
    const item = items[index];
    const nextCount = Math.max(0, Math.min(item.count, counts[index] + change));
    if (nextCount === counts[index]) return;
    const nextCounts = counts.map((count, itemIndex) => itemIndex === index ? nextCount : count);
    const completedAdhkar = items.filter((candidate, itemIndex) => nextCounts[itemIndex] === candidate.count).map((candidate) => candidate.id);
    updateTaskProgress(task.id, task.target * nextCounts.reduce((total, count) => total + count, 0) / totalTarget);
    updateTaskDetails(task.id, { [`adhkarCount_${item.id}`]: nextCount, completedAdhkar });
  };

  const updateTasbeeh = (index: number, change: number) => {
    const item = tasbeehContent[index];
    const nextCount = Math.max(0, Math.min(item.target, tasbeehCounts[index] + change));
    if (nextCount !== tasbeehCounts[index]) updateTaskDetails(task.id, { [`tasbeeh_${item.id}`]: nextCount });
  };

  const renderDhikr = (item: DhikrItem, index: number) => {
    const count = counts[index];
    const done = count === item.count;
    return <article className={cn(styles.dhikrCard, done && styles.dhikrDone)} key={item.id}>
      <div className={styles.dhikrTop}>
        <span className={styles.dhikrNumber}>{String(index + 1).padStart(2, "0")}</span>
        <div className={styles.dhikrHeading}><h3>{item.title}</h3><span>{item.count === 1 ? "مرة واحدة" : `${item.count} مرات`}</span></div>
        {done && <span className={styles.doneMark} aria-label="اكتمل"><Check size={18} /></span>}
      </div>
      <p className={styles.dhikrText}>{item.text}</p>
      {item.note && <p className={styles.dhikrNote}><Sparkles size={16} />{item.note}</p>}
      <div className={styles.dhikrBottom}>
        <span className={styles.readCount} aria-live="polite">{done ? "اكتمل الذكر" : `${count} من ${item.count} ${item.count === 1 ? "مرة" : "مرات"}`}</span>
        <div className={styles.countActions}>
          <button type="button" className={styles.undoButton} onClick={() => updateReadCount(index, -1)} disabled={count === 0} aria-label={`التراجع عن قراءة ${item.title}`}><Minus size={17} /><span>تراجع</span></button>
          <button type="button" className={styles.readButton} onClick={() => updateReadCount(index, 1)} disabled={done}><Check size={18} />{done ? "تمت القراءة" : item.count === 1 ? "قرأت الذكر" : "قرأت مرة"}</button>
        </div>
      </div>
    </article>;
  };

  return <div className={cn(styles.page, isEvening && styles.evening)} style={{ "--adhkar-text-size": `${25 + textSize * 2}px` } as CSSProperties}>
    <header className={styles.pageHeader}>
      <div className={styles.breadcrumb}><Link href="/tasks"><ArrowRight size={16} />كل المهام</Link><span aria-hidden="true">/</span><span>{isEvening ? "أذكار المساء" : "أذكار الصباح"}</span></div>
      <span className={styles.date}>{formatDashboardDate()}</span>
    </header>

    <section className={styles.hero} aria-labelledby="adhkar-title">
      <span className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <span className={styles.heroEyebrow}>{isEvening ? <Moon size={16} /> : <Sun size={16} />}{isEvening ? "محطة المساء" : "بداية اليوم"}</span>
        <h1 id="adhkar-title">{isEvening ? "أذكار المساء" : "أذكار الصباح"}</h1>
        <p>{isEvening ? "اختم يومك على مهل. اقرأ ذكرًا بعد ذكر، وتابع ما أنجزته دون استعجال." : "ابدأ صباحك بسكينة. اقرأ ذكرًا بعد ذكر، وتابع ما أنجزته دون استعجال."}</p>
        <div className={styles.heroActions}><button type="button" className={styles.heroPrimary} onClick={() => jumpToReader()}><BookOpenText size={19} />{isComplete ? "مراجعة الأذكار" : totalRead > 0 ? "أكمل من حيث توقفت" : "ابدأ القراءة"}<ArrowLeft size={17} /></button><span>يحفظ تقدمك تلقائيًا</span></div>
      </div>
      <div className={styles.heroProgress} aria-label={`أنجزت ${percentage} بالمئة من أذكار ${isEvening ? "المساء" : "الصباح"}`}>
        <div className={styles.heroRing} style={{ "--ring-fill": `${percentage}%` } as CSSProperties}><div><strong>{percentage}%</strong><span>من الورد</span></div></div>
        <p>{isComplete ? "أتممت وردك اليوم" : `${completedItems} من ${items.length} أذكار مكتملة`}</p>
      </div>
    </section>

    <nav className={styles.sessionSwitch} aria-label="جلسات الأذكار">
      {(["morning", "evening"] as const).map((value) => {
        const linkedTask = value === "morning" ? morningTask : eveningTask;
        const Icon = value === "morning" ? Sun : Moon;
        return linkedTask ? <Link key={value} href={`/tasks/${linkedTask.id}`} className={cn(styles.sessionTab, session === value && styles.sessionTabActive)} aria-current={session === value ? "page" : undefined}>
          <span className={styles.sessionIcon}><Icon size={20} /></span><span><strong>أذكار {value === "morning" ? "الصباح" : "المساء"}</strong><small>{progressForTask(linkedTask)}% مكتمل</small></span>{session === value ? <CheckCircle2 size={18} /> : <ChevronLeft size={18} />}
        </Link> : null;
      })}
    </nav>

    <div className={styles.contentLayout}>
      <main id="adhkar-reading-space" className={styles.mainColumn}>
        <div className={styles.sectionTop}>
          <div><span className={styles.sectionKicker}>ورد {isEvening ? "المساء" : "الصباح"}</span><h2>اقرأ على راحتك</h2><p>اضغط بعد كل قراءة لتسجيل التكرار المطلوب.</p></div>
          <div className={styles.readerTools}>
            <div className={styles.sizeControl} aria-label="حجم النص"><button type="button" onClick={() => setTextSize((size) => Math.max(-2, size - 1))} disabled={textSize === -2} aria-label="تصغير الخط">−</button><span>حجم الخط</span><button type="button" onClick={() => setTextSize((size) => Math.min(3, size + 1))} disabled={textSize === 3} aria-label="تكبير الخط">+</button></div>
            <div className={styles.viewControl} aria-label="طريقة العرض"><button type="button" className={cn(viewMode === "focus" && styles.viewActive)} aria-pressed={viewMode === "focus"} onClick={() => setViewMode("focus")}><BookOpenText size={16} />ذكر واحد</button><button type="button" className={cn(viewMode === "list" && styles.viewActive)} aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")}><List size={16} />كل الأذكار</button></div>
          </div>
        </div>

        {viewMode === "focus" ? <div className={styles.focusStack}>
          <div className={styles.focusMeta}><span>الذكر {currentIndex + 1} من {items.length}</span><div className={styles.focusDots}>{items.map((item, index) => <button type="button" key={item.id} className={cn(styles.focusDot, index === currentIndex && styles.focusDotCurrent, counts[index] === item.count && styles.focusDotDone)} onClick={() => setFocusIndex(index)} aria-label={`انتقل إلى الذكر ${index + 1}: ${item.title}`} aria-current={index === currentIndex ? "step" : undefined} />)}</div></div>
          {renderDhikr(items[currentIndex], currentIndex)}
          <div className={styles.focusNavigation}><button type="button" onClick={() => setFocusIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0}><ChevronRight size={19} />السابق</button><span>{currentIndex + 1} / {items.length}</span><button type="button" onClick={() => setFocusIndex((index) => Math.min(items.length - 1, index + 1))} disabled={currentIndex === items.length - 1}>التالي<ChevronLeft size={19} /></button></div>
        </div> : <div className={styles.fullList}>{items.map(renderDhikr)}</div>}

        {isComplete && <div className={styles.completeMessage} role="status"><span><WandSparkles size={22} /></span><div><strong>أتممت أذكار {isEvening ? "المساء" : "الصباح"}</strong><p>تقبل الله منك. يمكنك مراجعة الأذكار أو متابعة التسبيح أدناه.</p></div></div>}

        {task.config?.type !== "adhkar" || task.config.showTasbeeh ? <section className={styles.tasbeehSection} aria-labelledby="tasbeeh-title">
          <div className={styles.tasbeehHeading}><div><span className={styles.sectionKicker}>إضافة اختيارية</span><h2 id="tasbeeh-title">تسبيح بهدوء</h2><p>عداد مستقل يمكنك استخدامه بعد الورد.</p></div><Sparkles size={25} /></div>
          <div className={styles.tasbeehGrid}>{tasbeehContent.map((item, index) => <div className={styles.tasbeehCard} key={item.id}><span>{item.label}</span><strong>{tasbeehCounts[index]} <small>/ {item.target}</small></strong><div className={styles.tasbeehActions}><button type="button" onClick={() => updateTasbeeh(index, -1)} disabled={tasbeehCounts[index] === 0} aria-label={`التراجع عن ${item.label}`}><Minus size={18} /></button><button type="button" onClick={() => updateTasbeeh(index, 1)} disabled={tasbeehCounts[index] === item.target} aria-label={`زيادة ${item.label}`}><Plus size={21} />تسبيحة</button></div></div>)}</div>
        </section> : null}
      </main>

      <aside className={styles.sideColumn} aria-label="تقدم الجلسة">
        <div className={styles.overviewCard}><div className={styles.overviewTitle}><span><Sparkles size={19} /></span><div><strong>تقدم الجلسة</strong><small>خطوة بخطوة، على راحتك</small></div></div><div className={styles.overviewNumbers}><strong dir="ltr">{completedItems}<small> / {items.length}</small></strong><span>أذكار مكتملة</span></div><div className={styles.progressTrack}><span style={{ width: `${percentage}%` }} /></div><p>{totalRead} من {totalTarget} قراءة</p></div>
        <div className={styles.contentsCard}><h2>محتويات الورد</h2><div>{items.map((item, index) => <button type="button" key={item.id} onClick={() => jumpToReader(index)} className={cn(index === currentIndex && viewMode === "focus" && styles.contentCurrent)}><span className={cn(styles.contentNumber, counts[index] === item.count && styles.contentDone)}>{counts[index] === item.count ? <Check size={14} /> : index + 1}</span><span>{item.title}</span><ChevronLeft size={15} /></button>)}</div></div>
        <div className={styles.sideNote}><Sun size={17} /><p>لا تحتاج لإنهاء الورد دفعة واحدة. ستجد ما أنجزته هنا عند عودتك.</p></div>
      </aside>
    </div>
  </div>;
}
