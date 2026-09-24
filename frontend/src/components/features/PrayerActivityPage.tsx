"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  Circle,
  CircleCheck,
  Clock3,
  CloudSun,
  Flame,
  Landmark,
  Leaf,
  Minus,
  MoonStar,
  Mosque,
  Plus,
  Quote,
  RotateCcw,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Target,
} from "lucide-react";
import { Button, Card, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useDemo } from "@/state/DemoContext";
import type { Task } from "@/types/models";

type Details = NonNullable<Task["details"]>;
type PrayerIcon = ComponentType<{ size?: number; className?: string }>;

const prayers: Array<{ name: string; time: string; minutes: number; icon: PrayerIcon; tone: string }> = [
  { name: "الفجر", time: "04:20 ص", minutes: 4 * 60 + 20, icon: Sunrise, tone: "fajr" },
  { name: "الظهر", time: "12:01 م", minutes: 12 * 60 + 1, icon: Sun, tone: "dhuhr" },
  { name: "العصر", time: "03:15 م", minutes: 15 * 60 + 15, icon: CloudSun, tone: "asr" },
  { name: "المغرب", time: "06:24 م", minutes: 18 * 60 + 24, icon: Sunset, tone: "maghrib" },
  { name: "العشاء", time: "07:42 م", minutes: 19 * 60 + 42, icon: MoonStar, tone: "isha" },
];

const prayerTimeZone = "Asia/Riyadh";

const getSaudiClockParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: prayerTimeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  return { hours: value("hour"), minutes: value("minute"), seconds: value("second") };
};

const getNextPrayer = (currentSeconds: number) => {
  const prayer = prayers.find((item) => item.minutes * 60 > currentSeconds);
  if (prayer) return { prayer, secondsUntil: prayer.minutes * 60 - currentSeconds };
  const firstPrayer = prayers[0];
  return { prayer: firstPrayer, secondsUntil: 24 * 60 * 60 - currentSeconds + firstPrayer.minutes * 60 };
};

const formatCountdown = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};
const sunnah = [
  { name: "سنة الفجر", detail: "ركعتان قبل الفجر" },
  { name: "سنة الظهر القبلية", detail: "أربع ركعات قبل الظهر" },
  { name: "سنة الظهر البعدية", detail: "ركعتان بعد الظهر" },
  { name: "سنة المغرب", detail: "ركعتان بعد المغرب" },
  { name: "سنة العشاء", detail: "ركعتان بعد العشاء" },
];

const tasbeeh = [
  { key: "tasbeehSubhanAllah", label: "سبحان الله" },
  { key: "tasbeehAlhamdulillah", label: "الحمد لله" },
  { key: "tasbeehLaIlahaIllaAllah", label: "لا إله إلا الله" },
  { key: "tasbeehAllahuAkbar", label: "الله أكبر" },
] as const;

const readList = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
function getCompletedPrayers(task: Task | undefined) {
  const savedValue = task?.details?.completedPrayers;
  const saved = readList(savedValue);
  if (Array.isArray(savedValue)) return saved;
  if (task?.detailItems?.length) return task.detailItems.filter((detail) => detail.status === "completed").map((detail) => detail.title);
  return prayers.slice(0, Math.max(0, Math.min(prayers.length, task?.current ?? 0))).map((prayer) => prayer.name);
}

export function PrayerActivityPage({ taskId }: { taskId: string }) {
  const { activeParticipant, tasks, updateTaskDetails, updateTaskProgress } = useDemo();
  const task = tasks.find((item) => item.id === taskId && item.type === "prayer");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const completedPrayers = getCompletedPrayers(task);
  const completedSunnah = readList(task?.details?.completedSunnah);
  const prayerProgress = Math.round((completedPrayers.length / prayers.length) * 100);
  const sunnahProgress = Math.round((completedSunnah.length / sunnah.length) * 100);
  const tasbeehCounts = tasbeeh.map((item) => typeof task?.details?.[item.key] === "number" ? task.details[item.key] as number : 0);
  const tasbeehTotal = tasbeehCounts.reduce((sum, value) => sum + value, 0);
  const tasbeehProgress = Math.min(100, Math.round((tasbeehTotal / 400) * 100));
  const saudiNow = getSaudiClockParts(now);
  const nowSeconds = saudiNow.hours * 3600 + saudiNow.minutes * 60 + saudiNow.seconds;
  const { prayer: nextPrayer, secondsUntil: secondsUntilNext } = getNextPrayer(nowSeconds);
  const countdown = formatCountdown(secondsUntilNext);
  const todayLabel = new Intl.DateTimeFormat("ar-SA", { timeZone: prayerTimeZone, weekday: "long", day: "numeric", month: "long" }).format(now);

  if (!task) return <Card className="prayer-empty"><Landmark size={30} /><h2>مهمة الصلاة غير موجودة</h2><p>ارجع إلى المهام واختر مهمة الصلاة.</p><Link href="/tasks"><Button variant="outline">العودة إلى المهام</Button></Link></Card>;

  const updateDetails = (details: Details) => updateTaskDetails(task.id, details);
  const togglePrayer = (name: string) => {
    const next = completedPrayers.includes(name) ? completedPrayers.filter((item) => item !== name) : [...completedPrayers, name];
    updateDetails({ completedPrayers: next });
    updateTaskProgress(task.id, Math.min(task.target, next.length));
  };
  const toggleSunnah = (name: string) => {
    const next = completedSunnah.includes(name) ? completedSunnah.filter((item) => item !== name) : [...completedSunnah, name];
    updateDetails({ completedSunnah: next });
  };
  const adjustTasbeeh = (key: typeof tasbeeh[number]["key"], delta: number) => {
    const current = typeof task.details?.[key] === "number" ? task.details[key] as number : 0;
    updateDetails({ [key]: Math.max(0, Math.min(100, current + delta)) });
  };

  return <div className="prayer-page">
    <header className="prayer-page-header">
      <div className="prayer-page-title"><span><Mosque size={29} /></span><div><p>محطة الإيمان اليومية</p><h1>الصلاة والسنن والتسبيح</h1><small>تابع صلواتك، وحافظ على سننك وأذكارك بهدوء</small></div></div>
      <div className="prayer-page-date"><CalendarDays size={18} /><div><strong>{todayLabel}</strong><span>الرياض, السعودية · مواقيت اليوم</span></div></div>
    </header>

    <section className="prayer-verse-banner" aria-label="تذكير اليوم">
      <span className="prayer-verse-leaf"><Leaf size={27} /></span>
      <div><Quote size={19} /><p>﴿ وَأَقِمِ الصَّلَاةَ لِذِكْرِي ﴾</p><span>طه · ١٤</span></div>
      <Link href="/tasks" className="prayer-back-link">كل المهام</Link>
    </section>

    <section className="prayer-summary-grid" aria-label="ملخص الصلاة اليوم">
      <Card className="prayer-summary-card" padding="sm"><span className="prayer-summary-icon prayer-summary-icon-main"><Landmark size={22} /></span><div><small>الصلوات اليوم</small><strong>{completedPrayers.length} <em>/ 5</em></strong><p>تمت الصلاة</p></div><div className="prayer-summary-progress"><b>{prayerProgress}%</b><ProgressBar value={prayerProgress} tone="teal" /></div></Card>
      <Card className="prayer-summary-card" padding="sm"><span className="prayer-summary-icon prayer-summary-icon-leaf"><Leaf size={22} /></span><div><small>السنن الرواتب</small><strong>{completedSunnah.length} <em>/ 5</em></strong><p>تم إكمالها اليوم</p></div><div className="prayer-summary-progress"><b>{sunnahProgress}%</b><ProgressBar value={sunnahProgress} tone="teal" /></div></Card>
      <Card className="prayer-summary-card" padding="sm"><span className="prayer-summary-icon prayer-summary-icon-tasbeeh"><Sparkles size={22} /></span><div><small>هدف التسبيح</small><strong>{tasbeehTotal} <em>/ 400</em></strong><p>مرة اليوم</p></div><div className="prayer-summary-progress"><b>{tasbeehProgress}%</b><ProgressBar value={tasbeehProgress} tone="teal" /></div></Card>
      <Card className="prayer-summary-card" padding="sm"><span className="prayer-summary-icon prayer-summary-icon-streak"><Flame size={22} /></span><div><small>سلسلة الأيام</small><strong>{activeParticipant.streak}</strong><p>يومًا متتاليًا</p></div><div className="prayer-summary-message"><BarChart3 size={14} /> استمر على هذا النجاح</div></Card>
    </section>

    <div className="prayer-workspace-grid">
      <aside className="prayer-side-column" aria-label="ملخص الصلاة القادمة">
        <Card className="prayer-next-card" padding="sm">
          <div className="prayer-side-heading"><span><Clock3 size={18} /> متبقٍ على صلاة {nextPrayer.name}</span><Mosque size={22} /></div>
          <div className={cn("prayer-next-icon", `prayer-tone-${nextPrayer.tone}`)}><Mosque size={39} /></div>
          <span className="prayer-next-name">{nextPrayer.name}</span>
          <strong className="prayer-countdown" dir="ltr">{countdown}</strong>
          <p>﴿ وَأَقِمِ الصَّلَاةَ لِذِكْرِي ﴾</p>
          <button type="button" onClick={() => document.getElementById("daily-prayers")?.scrollIntoView({ behavior: "smooth", block: "start" })}><CalendarDays size={16} />عرض مواقيت الصلاة</button>
        </Card>

        <Card className="prayer-reflection-card" padding="sm"><div><Sparkles size={19} /><strong>تأمل اليوم</strong></div><p>الصلاة ليست واجبًا تؤديه فقط، بل هي راحة لقلبك وسكينة لحياتك.</p><Leaf size={22} /></Card>

        <Card className="prayer-goal-card" padding="sm">
          <div className="prayer-side-heading"><span><Target size={18} />هدفك اليوم</span></div>
          <p>أكمل صلواتك في وقتها وحافظ على وردك من السنن والذكر.</p>
          <div><span>{prayerProgress}%</span><ProgressBar value={prayerProgress} tone="teal" /></div>
        </Card>
      </aside>

      <main className="prayer-main-column">
        <Card id="daily-prayers" className="prayer-section-card prayer-times-section" padding="sm">
          <div className="prayer-section-heading"><div><span className="prayer-section-icon"><CalendarDays size={21} /></span><div><h2>الصلوات اليومية</h2><p>مواقيت اليوم وحالة الصلوات</p></div></div><strong>{completedPrayers.length} من 5 مكتملة</strong></div>
          <div className="prayer-times-grid">
            {prayers.map((prayer) => {
              const PrayerIcon = prayer.icon;
              const completed = completedPrayers.includes(prayer.name);
              const upcoming = prayer.name === nextPrayer.name && !completed;
              return <button type="button" key={prayer.name} aria-pressed={completed} className={cn("prayer-time-card", `prayer-tone-${prayer.tone}`, completed && "is-complete", upcoming && "is-upcoming")} onClick={() => togglePrayer(prayer.name)}>
                <span className="prayer-time-icon"><PrayerIcon size={26} /></span>
                <strong>{prayer.name}</strong>
                <time>{prayer.time}</time>
                <span className="prayer-time-status">{completed ? <><CircleCheck size={17} />تمت الصلاة</> : upcoming ? <><Clock3 size={17} />بعد {countdown}</> : <><Circle size={17} />لم تُصلَّ بعد</>}</span>
              </button>;
            })}
          </div>
        </Card>

        <Card className="prayer-section-card prayer-sunnah-section" padding="sm">
          <div className="prayer-section-heading"><div><span className="prayer-section-icon prayer-section-icon-leaf"><Leaf size={21} /></span><div><h2>السنن الرواتب</h2><p>أكمل السنن الرواتب واحصل على أجرها المضاعف</p></div></div><strong>{completedSunnah.length} من {sunnah.length} مكتملة</strong></div>
          <div className="prayer-sunnah-grid">
            {sunnah.map((item) => {
              const completed = completedSunnah.includes(item.name);
              return <button type="button" key={item.name} aria-pressed={completed} className={cn("prayer-sunnah-card", completed && "is-complete")} onClick={() => toggleSunnah(item.name)}>
                <span className="prayer-sunnah-toggle"><i />{completed ? "تمت اليوم" : "لم تُؤدَّ بعد"}</span>
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
                <span className="prayer-sunnah-result">{completed ? <><Check size={15} />مكتملة</> : "اضغط للتسجيل"}</span>
              </button>;
            })}
          </div>
        </Card>

        <Card className="prayer-section-card prayer-tasbeeh-section" padding="sm">
          <div className="prayer-section-heading"><div><span className="prayer-section-icon prayer-section-icon-tasbeeh"><Sparkles size={21} /></span><div><h2>التسبيح</h2><p>اذكر الله في كل وقت وحقق هدفك اليومي</p></div></div><div className="prayer-tasbeeh-goal"><span>هدف اليوم</span><strong>{tasbeehTotal} / 400</strong></div></div>
          <div className="prayer-tasbeeh-grid">
            {tasbeeh.map((item, index) => {
              const count = tasbeehCounts[index];
              return <article className="prayer-tasbeeh-card" key={item.key}>
                <span className="prayer-tasbeeh-ornament" aria-hidden="true">۞</span>
                <strong>{item.label}</strong>
                <b>{count}</b>
                <div>
                  <button type="button" aria-label={`إنقاص ${item.label}`} onClick={() => adjustTasbeeh(item.key, -1)} disabled={count === 0}><Minus size={16} /></button>
                  <button type="button" className="prayer-tasbeeh-add" aria-label={`زيادة ${item.label}`} onClick={() => adjustTasbeeh(item.key, 1)} disabled={count >= 100}><Plus size={18} /></button>
                </div>
                <small>الهدف: 100</small>
              </article>;
            })}
          </div>
          <div className="prayer-tasbeeh-footer"><div><span>{tasbeehProgress}%</span><ProgressBar value={tasbeehProgress} tone="teal" /></div><button type="button" onClick={() => updateDetails({ tasbeehSubhanAllah: 0, tasbeehAlhamdulillah: 0, tasbeehLaIlahaIllaAllah: 0, tasbeehAllahuAkbar: 0 })}><RotateCcw size={15} />تصفير العدادات</button></div>
        </Card>
      </main>
    </div>
  </div>;
}
