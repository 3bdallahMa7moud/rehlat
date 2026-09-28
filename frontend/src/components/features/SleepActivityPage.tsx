"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BedDouble,
  BellRing,
  BookHeart,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  Moon,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stars,
  Sunrise,
} from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDashboardDate, getProjectDateKey, PROJECT_TIMEZONE } from "@/lib/date-time";
import { useDemo } from "@/state/DemoContext";

const sleepSessionEvent = "journey-sleep-session-changed";

function subscribeSleepSession(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(sleepSessionEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(sleepSessionEvent, listener);
  };
}

function publishSleepSession() {
  window.dispatchEvent(new Event(sleepSessionEvent));
}

function validSessionTime(value: string | null) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= Date.now() ? value : null;
}

const qualityOptions = [
  { value: 1, emoji: "😫", label: "متعب" },
  { value: 2, emoji: "😕", label: "غير مريح" },
  { value: 3, emoji: "😐", label: "مقبول" },
  { value: 4, emoji: "🙂", label: "جيد" },
  { value: 5, emoji: "😴", label: "ممتاز" },
];

const routineItems: Array<{ id: string; label: string; hint: string; icon: ReactNode }> = [
  { id: "phone", label: "إبعاد الهاتف", hint: "اترك الشاشة قبل النوم بقليل", icon: <Smartphone size={18} /> },
  { id: "alarm", label: "ضبط المنبّه", hint: "ثبّت وقت استيقاظك", icon: <BellRing size={18} /> },
  { id: "tomorrow", label: "تجهيز الغد", hint: "خطوة صغيرة لصباح أهدأ", icon: <ShieldCheck size={18} /> },
];

function getString(details: Record<string, string | number | boolean | string[]> | undefined, key: string, fallback = "") {
  return typeof details?.[key] === "string" ? details[key] as string : fallback;
}

function getNumber(details: Record<string, string | number | boolean | string[]> | undefined, key: string, fallback = 0) {
  return typeof details?.[key] === "number" ? details[key] as number : fallback;
}

function timeValueFromDate(date: Date) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: PROJECT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}

function displayClock(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "—";
  return new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, 0, 1, hour, minute)));
}

function durationFromClock(sleptAt: string, wokeAt: string) {
  const [sleepHour, sleepMinute] = sleptAt.split(":").map(Number);
  const [wakeHour, wakeMinute] = wokeAt.split(":").map(Number);
  if (![sleepHour, sleepMinute, wakeHour, wakeMinute].every(Number.isFinite)) return 0;
  let minutes = wakeHour * 60 + wakeMinute - (sleepHour * 60 + sleepMinute);
  if (minutes === 0) return 0;
  if (minutes < 0) minutes += 24 * 60;
  return minutes;
}

function durationCopy(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours} س ${String(minutes).padStart(2, "0")} د`;
}

function pastDateKeys(days: number) {
  const today = getProjectDateKey();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(`${today}T12:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - (days - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

function shortWeekday(dateKey: string) {
  return new Intl.DateTimeFormat("ar-EG", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${dateKey}T12:00:00.000Z`))
    .replace("،", "");
}

export function SleepActivityPage({ taskId }: { taskId: string }) {
  const { activeParticipant, dailyTaskRecords, pushToast, tasks, updateTaskDetails, updateTaskProgress } = useDemo();
  const task = tasks.find((item) => item.id === taskId);
  const details = task?.details;
  const sleepConfig = task?.config?.type === "sleep" ? task.config : null;
  const transientKey = `journey-of-change/sleep-session/${activeParticipant.id}`;
  const savedSessionIso = useSyncExternalStore(
    subscribeSleepSession,
    () => window.localStorage.getItem(transientKey),
    () => null,
  );
  const activeSessionIso = validSessionTime(savedSessionIso)
    ?? (details?.sleepState === "sleeping" ? validSessionTime(getString(details, "sleepStartedIso")) : null);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [editorOpen, setEditorOpen] = useState(false);
  const [manualError, setManualError] = useState("");
  const plannedBedtime = getString(details, "sleptAt", sleepConfig?.bedtime ?? "22:30");
  const plannedWakeTime = getString(details, "wokeAt", sleepConfig?.wakeTime ?? "06:30");
  const [draftBedtime, setDraftBedtime] = useState(plannedBedtime);
  const [draftWakeTime, setDraftWakeTime] = useState(plannedWakeTime);
  const recordedHours = getNumber(details, "sleepDurationHours", task?.current ?? 0);
  const sleepQuality = getNumber(details, "sleepQuality");
  const sleepNote = getString(details, "sleepNote");
  const completedRoutine = Array.isArray(details?.sleepRoutine) ? details.sleepRoutine as string[] : [];
  const hasRecordedSleep = Boolean(details?.sleepRecorded) || recordedHours > 0;
  const isSleeping = Boolean(activeSessionIso) && !hasRecordedSleep;
  const targetHours = Math.max(1, task?.target ?? 8);

  useEffect(() => {
    if (!isSleeping) return;
    const timer = window.setInterval(() => setClockTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [isSleeping]);

  const liveMinutes = isSleeping && activeSessionIso
    ? Math.max(0, (clockTick - new Date(activeSessionIso).getTime()) / 60_000)
    : recordedHours * 60;
  const displayHours = isSleeping ? liveMinutes / 60 : recordedHours;
  const progress = Math.min(100, Math.round((displayHours / targetHours) * 100));
  const remainingMinutes = Math.max(0, Math.round((targetHours - displayHours) * 60));
  const statusCopy = isSleeping
    ? "جلسة النوم جارية"
    : hasRecordedSleep
      ? recordedHours >= targetHours
        ? "اكتمل هدف الليلة"
        : `متبقٍ ${durationCopy(remainingMinutes)}`
      : "جاهز لليلة هادئة";

  const weekData = (() => {
    if (!task) return [];
    const today = getProjectDateKey();
    const recordsByDate = new Map(dailyTaskRecords
      .filter((record) => record.userId === activeParticipant.id && record.taskId === task.id)
      .map((record) => [record.localDate, record]));
    return pastDateKeys(7).map((date) => {
      const record = recordsByDate.get(date);
      const storedDuration = getNumber(record?.details, "sleepDurationHours", record?.current ?? 0);
      const hours = date === today && recordedHours > 0 ? recordedHours : storedDuration;
      return { date, label: shortWeekday(date), hours, today: date === today };
    });
  })();

  const nightsWithData = weekData.filter((day) => day.hours > 0);
  const averageHours = nightsWithData.length
    ? nightsWithData.reduce((sum, day) => sum + day.hours, 0) / nightsWithData.length
    : 0;
  const achievedNights = nightsWithData.filter((day) => day.hours >= targetHours).length;
  const bestNight = nightsWithData.reduce((best, day) => Math.max(best, day.hours), 0);

  if (!task) {
    return <EmptyState title="سجل النوم غير موجود" description="ربما حُذفت المهمة أو لم تعد متاحة لهذا المستخدم." action={<Link href="/tasks"><Button variant="outline">العودة إلى المهام</Button></Link>} />;
  }

  const updateDetails = (next: NonNullable<typeof task.details>) => updateTaskDetails(task.id, next);

  const openEditor = () => {
    setDraftBedtime(plannedBedtime);
    setDraftWakeTime(plannedWakeTime);
    setManualError("");
    setEditorOpen(true);
    window.setTimeout(() => document.getElementById("sleep-manual-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }), 20);
  };

  const startSleepNow = () => {
    const now = new Date();
    const iso = now.toISOString();
    const bedtime = timeValueFromDate(now);
    window.localStorage.setItem(transientKey, iso);
    publishSleepSession();
    setClockTick(now.getTime());
    setDraftBedtime(bedtime);
    updateDetails({ sleptAt: bedtime, sleepStartedIso: iso, sleepEndedIso: "", sleepState: "sleeping", sleepRecorded: false });
    pushToast({ tone: "info", title: "ليلة هادئة", body: "سجّلنا وقت نومك. عند الاستيقاظ اضغط «استيقظت الآن»." });
  };

  const finishSleepNow = () => {
    if (!activeSessionIso) return;
    const now = new Date();
    const elapsedMinutes = Math.max(0, (now.getTime() - new Date(activeSessionIso).getTime()) / 60_000);
    if (elapsedMinutes < 5 || elapsedMinutes > 16 * 60) {
      pushToast({ tone: "warning", title: "راجع وقت النوم", body: "المدة تبدو غير معتادة. عدّل وقت النوم والاستيقاظ يدويًا ثم احفظ السجل." });
      openEditor();
      return;
    }
    const hours = Math.round(elapsedMinutes / 6) / 10;
    const wakeTime = timeValueFromDate(now);
    updateTaskProgress(task.id, hours);
    updateDetails({ wokeAt: wakeTime, sleepEndedIso: now.toISOString(), sleepState: "recorded", sleepRecorded: true, sleepDurationHours: hours });
    window.localStorage.removeItem(transientKey);
    publishSleepSession();
    setDraftWakeTime(wakeTime);
    pushToast({ tone: "success", title: "صباح هادئ", body: `تم تسجيل ${durationCopy(elapsedMinutes)} من النوم.` });
  };

  const saveManualRecord = () => {
    const minutes = durationFromClock(draftBedtime, draftWakeTime);
    if (minutes < 5) {
      setManualError("أدخل وقتين مختلفين للنوم والاستيقاظ.");
      return;
    }
    if (minutes > 16 * 60) {
      setManualError("مدة النوم تتجاوز 16 ساعة. راجع الوقتين ثم حاول مرة أخرى.");
      return;
    }
    const hours = Math.round(minutes / 6) / 10;
    updateTaskProgress(task.id, hours);
    updateDetails({ sleptAt: draftBedtime, wokeAt: draftWakeTime, sleepStartedIso: "", sleepEndedIso: "", sleepState: "recorded", sleepRecorded: true, sleepDurationHours: hours });
    window.localStorage.removeItem(transientKey);
    publishSleepSession();
    setManualError("");
    setEditorOpen(false);
    pushToast({ tone: "success", title: "تم حفظ سجل النوم", body: `المدة المسجلة ${durationCopy(minutes)}.` });
  };

  const handleMainAction = () => {
    if (isSleeping) finishSleepNow();
    else if (hasRecordedSleep) openEditor();
    else startSleepNow();
  };

  const toggleRoutine = (id: string) => {
    const next = completedRoutine.includes(id) ? completedRoutine.filter((item) => item !== id) : [...completedRoutine, id];
    updateDetails({ sleepRoutine: next });
  };

  const mainActionCopy = isSleeping ? "استيقظت الآن" : hasRecordedSleep ? "تعديل سجل الليلة" : "سأنام الآن";
  const MainActionIcon = isSleeping ? Sunrise : hasRecordedSleep ? Edit3 : BedDouble;

  return <div className="sleep-page">
    <header className="sleep-page-header">
      <div className="sleep-page-title">
        <span><Moon size={25} /></span>
        <div><p>محطة المساء</p><h1>نوم هادئ</h1><small>جهّز ليلتك وسجّل نومك في ثوانٍ.</small></div>
      </div>
      <div className="sleep-header-actions">
        <span className="sleep-date"><CalendarDays size={16} />{formatDashboardDate()}</span>
        <Link href="/tasks" className="sleep-back-link"><ArrowRight size={17} />كل المهام</Link>
      </div>
    </header>

    <section className={cn("sleep-hero", isSleeping && "sleep-hero-active", hasRecordedSleep && "sleep-hero-recorded")}>
      <span className="sleep-star sleep-star-one" aria-hidden="true">✦</span><span className="sleep-star sleep-star-two" aria-hidden="true">✧</span><span className="sleep-star sleep-star-three" aria-hidden="true">·</span>
      <div className="sleep-hero-copy">
        <Badge className="sleep-status-badge" tone={hasRecordedSleep ? "success" : "teal"}>{isSleeping ? <Stars size={14} /> : hasRecordedSleep ? <CheckCircle2 size={14} /> : <Sparkles size={14} />}{statusCopy}</Badge>
        <h2>{isSleeping ? "نم بهدوء… نحن نحسب المدة" : hasRecordedSleep ? "أحسنت، سُجلت ليلة جديدة" : "ليلة هادئة تبدأ بخطوة"}</h2>
        <p>{isSleeping ? "ارجع إلى هذه الصفحة عند الاستيقاظ واضغط الزر مرة واحدة." : hasRecordedSleep ? "راجع جودة نومك وأكمل ملاحظة الصباح القصيرة." : "هدف الليلة ليس الكمال؛ فقط امنح جسمك وقتًا كافيًا للراحة."}</p>
      </div>

      <div className="sleep-clock-row" aria-label="ملخص وقت النوم">
        <div className="sleep-clock-point"><span className="sleep-clock-icon"><Moon size={19} /></span><small>{hasRecordedSleep || isSleeping ? "نمت" : "موعد النوم"}</small><strong>{displayClock(plannedBedtime)}</strong></div>
        <div className="sleep-clock-connector" aria-hidden="true"><i /><span>✦</span><i /></div>
        <div className="sleep-duration-ring" style={{ "--sleep-progress": `${progress * 3.6}deg` } as CSSProperties}><div><BedDouble size={20} /><strong>{durationCopy(liveMinutes)}</strong><span>من هدف {targetHours} ساعات</span></div></div>
        <div className="sleep-clock-connector" aria-hidden="true"><i /><span>✦</span><i /></div>
        <div className="sleep-clock-point"><span className="sleep-clock-icon sleep-clock-icon-sun"><Sunrise size={19} /></span><small>{hasRecordedSleep ? "استيقظت" : "الاستيقاظ"}</small><strong>{isSleeping ? "—" : displayClock(plannedWakeTime)}</strong></div>
      </div>

      <div className="sleep-goal-progress"><div><span>تقدم هدف الليلة</span><strong>{progress}%</strong></div><ProgressBar value={progress} tone={progress >= 100 ? "success" : "teal"} /></div>
      <div className="sleep-hero-actions">
        <Button size="lg" className="sleep-main-action" onClick={handleMainAction}><MainActionIcon size={19} />{mainActionCopy}</Button>
        {!isSleeping && !hasRecordedSleep && <button type="button" className="sleep-manual-link" onClick={openEditor}><Clock3 size={16} />تسجيل الوقت يدويًا</button>}
      </div>
    </section>

    {editorOpen && <Card id="sleep-manual-editor" className="sleep-editor-card" padding="lg">
      <div className="sleep-section-heading"><div className="sleep-section-icon"><Edit3 size={20} /></div><div><h2>تعديل وقت الليلة</h2><p>يُحسب عبور منتصف الليل تلقائيًا.</p></div><button type="button" onClick={() => setEditorOpen(false)}>إلغاء</button></div>
      <div className="sleep-editor-grid">
        <Input type="time" label="وقت النوم" value={draftBedtime} onChange={(event) => { setDraftBedtime(event.target.value); setManualError(""); }} />
        <span className="sleep-editor-arrow"><ArrowLeft size={20} /></span>
        <Input type="time" label="وقت الاستيقاظ" value={draftWakeTime} onChange={(event) => { setDraftWakeTime(event.target.value); setManualError(""); }} />
        <div className="sleep-editor-total"><Clock3 size={17} /><span>المدة المحسوبة</span><strong>{durationCopy(durationFromClock(draftBedtime, draftWakeTime))}</strong></div>
      </div>
      {manualError && <p className="sleep-editor-error">{manualError}</p>}
      <Button onClick={saveManualRecord}><Check size={18} />حفظ سجل النوم</Button>
    </Card>}

    <div className="sleep-content-grid">
      <main className="sleep-main-column">
        {hasRecordedSleep && <Card className="sleep-quality-card" padding="lg">
          <div className="sleep-section-heading"><div className="sleep-section-icon sleep-section-icon-mint"><Sparkles size={20} /></div><div><h2>كيف كان نومك؟</h2><p>اختر شعورك عند الاستيقاظ، بدون أرقام معقدة.</p></div></div>
          <div className="sleep-quality-options" role="group" aria-label="جودة النوم">
            {qualityOptions.map((option) => <button type="button" key={option.value} className={cn(sleepQuality === option.value && "sleep-quality-active")} aria-pressed={sleepQuality === option.value} onClick={() => updateDetails({ sleepQuality: option.value })}><span>{option.emoji}</span><strong>{option.label}</strong></button>)}
          </div>
          <label className="sleep-note-field"><span>ملاحظة صباحية <small>اختياري</small></span><textarea className="input" rows={3} value={sleepNote} placeholder="مثال: استيقظت مرة واحدة، أو أشعر بنشاط جيد…" onChange={(event) => updateDetails({ sleepNote: event.target.value })} /></label>
        </Card>}

        <Card className="sleep-week-card" padding="lg">
          <div className="sleep-section-heading"><div className="sleep-section-icon"><BarChart3 size={20} /></div><div><h2>إيقاع آخر 7 ليالٍ</h2><p>{nightsWithData.length ? "ساعاتك الفعلية كما سجلتها كل صباح." : "ستظهر لياليك هنا بعد أول تسجيل."}</p></div><Badge tone="teal">هذا الأسبوع</Badge></div>
          <div className="sleep-week-chart" aria-label="ساعات النوم خلال آخر سبعة أيام">
            {weekData.map((day) => {
              const barHeight = day.hours > 0 ? Math.max(12, Math.min(100, (day.hours / Math.max(targetHours, bestNight, 1)) * 100)) : 5;
              return <div className={cn("sleep-week-day", day.today && "sleep-week-today")} key={day.date}><span className="sleep-week-value">{day.hours > 0 ? `${day.hours.toFixed(1)}س` : "—"}</span><div className="sleep-week-track"><i style={{ height: `${barHeight}%` }} /></div><strong>{day.label}</strong></div>;
            })}
          </div>
          <div className="sleep-week-stats"><div><span>متوسط النوم</span><strong>{averageHours ? `${averageHours.toFixed(1)} ساعة` : "—"}</strong></div><div><span>تحقيق الهدف</span><strong>{achievedNights} من {nightsWithData.length || 7} ليالٍ</strong></div><div><span>أفضل ليلة</span><strong>{bestNight ? `${bestNight.toFixed(1)} ساعة` : "—"}</strong></div></div>
          <div className="sleep-insight"><Sparkles size={17} /><p>{averageHours >= targetHours ? "إيقاع جميل هذا الأسبوع. حافظ على وقت استيقاظ ثابت قدر الإمكان." : nightsWithData.length ? `متوسطك أقل من الهدف بـ${durationCopy((targetHours - averageHours) * 60)}. جرّب تقديم موعد النوم تدريجيًا.` : "ابدأ بتسجيل ليلة واحدة؛ الاستمرار أهم من كثرة التفاصيل."}</p></div>
        </Card>
      </main>

      <aside className="sleep-side-column">
        {sleepConfig?.routineEnabled !== false && <Card className="sleep-routine-card" padding="lg">
          <div className="sleep-section-heading"><div className="sleep-section-icon sleep-section-icon-gold"><Moon size={20} /></div><div><h2>روتين ما قبل النوم</h2><p>خطوات اختيارية لصناعة نهاية أهدأ لليوم.</p></div></div>
          <Link href="/tasks/adhkar-evening" className="sleep-adhkar-link"><span><BookHeart size={21} /></span><div><strong>أذكار المساء والنوم</strong><small>ابدأ جلستك الهادئة الآن</small></div><ArrowLeft size={18} /></Link>
          <div className="sleep-routine-list">
            {routineItems.map((item) => {
              const checked = completedRoutine.includes(item.id);
              return <button type="button" key={item.id} className={cn(checked && "sleep-routine-done")} aria-pressed={checked} onClick={() => toggleRoutine(item.id)}><span className="sleep-routine-check">{checked ? <Check size={15} /> : item.icon}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>;
            })}
          </div>
          <div className="sleep-routine-progress"><span>{completedRoutine.length} من {routineItems.length} خطوات</span><ProgressBar value={(completedRoutine.length / routineItems.length) * 100} tone="teal" /></div>
        </Card>}
        <Card className="sleep-tip-card" padding="lg"><span><AlarmClock size={21} /></span><div><strong>موعد ثابت أفضل من ليلة مثالية</strong><p>حاول تثبيت وقت الاستيقاظ، ثم قرّب وقت النوم من هدفك بهدوء.</p></div></Card>
      </aside>
    </div>

    <div className="sleep-mobile-action"><Button size="lg" onClick={handleMainAction}><MainActionIcon size={19} />{mainActionCopy}</Button></div>
  </div>;
}
