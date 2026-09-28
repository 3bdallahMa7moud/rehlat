"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import {
  ArrowRight, Calculator, Check, CloudSun, Droplets, Dumbbell, GlassWater,
  HeartPulse, Info, RotateCcw, Sparkles, ThermometerSun, Weight,
} from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { useDemo } from "@/state/DemoContext";
import styles from "./WaterActivityPage.module.css";

const CUP_ML = 250;
type WeatherLevel = "بارد" | "معتدل" | "حار" | "شديد الحرارة";
type WaterRecommendation = { baseMl: number; activityMl: number; weatherMl: number; totalMl: number };

function roundToFifty(value: number) { return Math.round(value / 50) * 50; }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

function getWaterRecommendation(weightKg: number, activityMinutes: number, weather: WeatherLevel): WaterRecommendation {
  const safeWeight = clamp(weightKg, 35, 200);
  const safeActivity = clamp(activityMinutes, 0, 240);
  const baseMl = roundToFifty(safeWeight * 30);
  const activityMl = roundToFifty((safeActivity / 30) * 350);
  const weatherMl = weather === "شديد الحرارة" ? 750 : weather === "حار" ? 500 : 0;
  const totalMl = clamp(roundToFifty(baseMl + activityMl + weatherMl), 1500, 5000);
  return { baseMl, activityMl, weatherMl, totalMl };
}

function formatLiters(value: number) {
  return `${(value / 1000).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} لتر`;
}

function formatMl(value: number) {
  return value >= 1000 ? formatLiters(value) : `${value.toLocaleString("ar-EG")} مل`;
}

export function WaterActivityPage({ taskId }: { taskId: string }) {
  const { tasks, updateTaskDetails, updateTaskProgress } = useDemo();
  const task = tasks.find((item) => item.id === taskId);
  const [customAmount, setCustomAmount] = useState(300);

  if (!task) {
    return <EmptyState title="مهمة الماء غير موجودة" description="ارجع إلى قائمة المهام واختر مهمة شرب الماء من جديد." />;
  }

  const details = task.details ?? {};
  const waterConfig = task.config?.type === "water" ? task.config : null;
  const weightKg = typeof details.weightKg === "number" ? details.weightKg : 70;
  const activityMinutes = typeof details.activityMinutes === "number" ? details.activityMinutes : 30;
  const savedWeather = typeof details.weather === "string" ? details.weather : "معتدل";
  const weather: WeatherLevel = ["بارد", "معتدل", "حار", "شديد الحرارة"].includes(savedWeather)
    ? savedWeather as WeatherLevel
    : "معتدل";
  const recommendation = getWaterRecommendation(weightKg, activityMinutes, weather);
  const targetMl = typeof details.waterTargetMl === "number" && details.waterTargetMl > 0 ? details.waterTargetMl : waterConfig?.targetMl ?? recommendation.totalMl;
  const currentMl = Math.max(0, typeof details.waterLoggedMl === "number" ? details.waterLoggedMl : Math.round(task.current * CUP_ML));
  const remainingMl = Math.max(0, targetMl - currentMl);
  const progress = Math.min(100, Math.round((currentMl / targetMl) * 100));
  const targetCups = Math.ceil(targetMl / CUP_ML);
  const remainingCups = Math.ceil(remainingMl / CUP_ML);
  const lastWater = typeof details.lastWater === "number" ? details.lastWater : 0;
  const reachedGoal = remainingMl === 0;

  const syncProgress = (loggedMl: number, nextTargetMl = targetMl) => {
    const measuredProgress = Math.min(task.target, Math.round((loggedMl / nextTargetMl) * task.target * 10) / 10);
    updateTaskProgress(task.id, measuredProgress);
  };

  const saveWater = (nextMl: number, lastAddedMl: number) => {
    const safeMl = Math.max(0, Math.round(nextMl));
    syncProgress(safeMl);
    updateTaskDetails(task.id, {
      waterLoggedMl: safeMl,
      waterTargetMl: targetMl,
      lastWater: lastAddedMl,
      lastWaterAt: new Date().toISOString(),
    });
  };

  const addWater = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    saveWater(currentMl + amount, amount);
  };

  const undoLast = () => {
    if (lastWater <= 0) return;
    saveWater(Math.max(0, currentMl - lastWater), 0);
  };

  const updateProfile = (next: { weightKg?: number; activityMinutes?: number; weather?: WeatherLevel }) => {
    const nextWeight = next.weightKg ?? weightKg;
    const nextActivity = next.activityMinutes ?? activityMinutes;
    const nextWeather = next.weather ?? weather;
    const nextRecommendation = getWaterRecommendation(nextWeight, nextActivity, nextWeather);
    syncProgress(currentMl, nextRecommendation.totalMl);
    updateTaskDetails(task.id, { ...next, waterTargetMl: nextRecommendation.totalMl });
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}><Droplets size={16} />العناية اليومية</span>
          <h1>مياهك اليوم</h1>
          <p>اعرف احتياجك التقريبي، وسجّل كل كوب في ثوانٍ.</p>
        </div>
        <Link href="/tasks" className={styles.backLink}><ArrowRight size={18} />كل المهام</Link>
      </header>

      <div className={styles.dashboardGrid}>
        <section className={styles.progressCard} aria-labelledby="water-progress-title">
          <div className={styles.progressHeading}>
            <div>
              <span className={styles.todayLabel}><Sparkles size={15} />تقدم اليوم</span>
              <h2 id="water-progress-title">{reachedGoal ? "وصلت لهدفك اليوم" : "كل كوب يقرّبك"}</h2>
              <p>{reachedGoal ? "أحسنت. استمع لعطشك واستمر بتوازن." : `باقي ${formatMl(remainingMl)} لتكمل هدفك.`}</p>
            </div>
            <span className={reachedGoal ? styles.goalBadgeDone : styles.goalBadge}>
              {reachedGoal ? <Check size={15} /> : <Droplets size={15} />}
              {reachedGoal ? "مكتمل" : `${progress}%`}
            </span>
          </div>

          <div className={styles.progressBody}>
            <div
              className={styles.progressRing}
              style={{ "--water-progress": `${progress * 3.6}deg` } as CSSProperties}
              role="progressbar"
              aria-label="نسبة شرب الماء اليوم"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className={styles.progressRingInner}>
                <GlassWater aria-hidden="true" size={25} />
                <strong>{progress}%</strong>
                <span>من هدفك</span>
              </div>
            </div>

            <div className={styles.metrics}>
              <article>
                <span>شربت</span>
                <strong>{formatMl(currentMl)}</strong>
                <small>{Math.floor(currentMl / CUP_ML)} كوب تقريبًا</small>
              </article>
              <article className={styles.remainingMetric}>
                <span>ناقصك</span>
                <strong>{reachedGoal ? "ولا شيء" : formatMl(remainingMl)}</strong>
                <small>{reachedGoal ? "الهدف مكتمل" : `${remainingCups} أكواب بحجم 250 مل`}</small>
              </article>
              <article>
                <span>هدفك</span>
                <strong>{formatLiters(targetMl)}</strong>
                <small>{targetCups} أكواب تقريبًا</small>
              </article>
            </div>
          </div>

          <div className={styles.milestones} aria-label="محطات التقدم اليومي">
            {Array.from({ length: 8 }, (_, index) => {
              const completed = currentMl >= ((index + 1) / 8) * targetMl;
              return <span key={index} className={completed ? styles.milestoneDone : undefined}><Droplets size={14} /></span>;
            })}
          </div>
          <p className={styles.milestoneCopy}>
            {reachedGoal ? "تمت كل محطات اليوم" : `وزّع ${remainingCups} ${remainingCups === 1 ? "كوب" : "أكواب"} على بقية يومك بدل شربها دفعة واحدة.`}
          </p>
        </section>

        <section className={styles.logCard} aria-labelledby="quick-log-title">
          <div className={styles.cardHeading}>
            <span className={styles.cardIcon}><GlassWater size={20} /></span>
            <div><h2 id="quick-log-title">سجّل كوبًا</h2><p>اختر الكمية التي شربتها الآن</p></div>
          </div>
          <div className={styles.quickAmounts}>
            {(waterConfig?.quickAmounts ?? [200, 250, 500]).map((amount) => (
              <button type="button" key={amount} onClick={() => addWater(amount)}>
                <span><GlassWater size={amount === 500 ? 23 : 19} /></span>
                <strong>+{amount}</strong>
                <small>مل</small>
              </button>
            ))}
          </div>
          <label className={styles.customAmount}>
            <span>كمية أخرى</span>
            <div>
              <input
                aria-label="كمية الماء بالملليلتر"
                type="number"
                inputMode="numeric"
                min={50}
                max={1500}
                step={50}
                value={customAmount}
                onChange={(event) => setCustomAmount(Number(event.target.value))}
              />
              <span>مل</span>
              <Button size="sm" type="button" onClick={() => addWater(customAmount)}>تسجيل</Button>
            </div>
          </label>
          <div className={styles.logFooter} aria-live="polite">
            <span><Check size={15} />يُحفظ تقدمك تلقائيًا</span>
            {lastWater > 0 && <button type="button" onClick={undoLast}><RotateCcw size={14} />تراجع عن +{lastWater} مل</button>}
          </div>
        </section>
      </div>

      <div className={styles.infoGrid}>
        {waterConfig?.calculatorEnabled !== false && <section className={styles.calculatorCard} aria-labelledby="water-calculator-title">
          <div className={styles.cardHeading}>
            <span className={styles.cardIcon}><Calculator size={20} /></span>
            <div>
              <h2 id="water-calculator-title">احسب احتياج جسمك</h2>
              <p>تقدير مبدئي يتغير مع الوزن والحركة والجو</p>
            </div>
            <span className={styles.autoBadge}>يتحدّث تلقائيًا</span>
          </div>

          <div className={styles.profileFields}>
            <label>
              <span><Weight size={16} />وزنك</span>
              <div className={styles.inputShell}>
                <input type="number" min={35} max={200} value={weightKg} onChange={(event) => updateProfile({ weightKg: Number(event.target.value) })} />
                <small>كجم</small>
              </div>
            </label>
            <label>
              <span><Dumbbell size={16} />نشاطك اليوم</span>
              <div className={styles.inputShell}>
                <input type="number" min={0} max={240} step={15} value={activityMinutes} onChange={(event) => updateProfile({ activityMinutes: Number(event.target.value) })} />
                <small>دقيقة</small>
              </div>
            </label>
            <label>
              <span><CloudSun size={16} />حالة الجو</span>
              <select value={weather} onChange={(event) => updateProfile({ weather: event.target.value as WeatherLevel })}>
                <option value="بارد">بارد</option>
                <option value="معتدل">معتدل</option>
                <option value="حار">حار</option>
                <option value="شديد الحرارة">شديد الحرارة</option>
              </select>
            </label>
          </div>

          <div className={styles.breakdown}>
            <div>
              <span className={styles.breakdownIcon}><Weight size={16} /></span>
              <span>الوزن × 30 مل</span>
              <strong>{formatMl(recommendation.baseMl)}</strong>
            </div>
            <div>
              <span className={styles.breakdownIcon}><Dumbbell size={16} /></span>
              <span>إضافة النشاط</span>
              <strong>+{formatMl(recommendation.activityMl)}</strong>
            </div>
            <div>
              <span className={styles.breakdownIcon}><ThermometerSun size={16} /></span>
              <span>إضافة الجو</span>
              <strong>+{formatMl(recommendation.weatherMl)}</strong>
            </div>
          </div>

          <div className={styles.recommendationResult}>
            <div><Droplets size={23} /><span>هدفك الإرشادي اليوم</span></div>
            <strong>{formatLiters(targetMl)}</strong>
          </div>
        </section>}

        <aside className={styles.guidanceCard} aria-labelledby="hydration-guide-title">
          <div className={styles.guideIntro}>
            <span><HeartPulse size={21} /></span>
            <div><h2 id="hydration-guide-title">كيف تعرف أنك على المسار الصحيح؟</h2><p>الرقم نقطة بداية، وإشارات جسمك تكمل الصورة.</p></div>
          </div>
          <ul>
            <li><span><Check size={15} /></span><div><strong>وزّع الماء على اليوم</strong><p>رشفات منتظمة أسهل من كمية كبيرة مرة واحدة.</p></div></li>
            <li><span><Check size={15} /></span><div><strong>راقب لون البول</strong><p>الأصفر الفاتح عادةً علامة عملية على ترطيب جيد.</p></div></li>
            <li><span><Info size={15} /></span><div><strong>الطعام والمشروبات تُحسب</strong><p>جزء من سوائل يومك يأتي من الطعام ومشروبات أخرى.</p></div></li>
          </ul>
          <div className={styles.healthNote}>
            <HeartPulse size={17} />
            <p><strong>تنبيه مهم:</strong> إذا لديك مرض بالكلى أو القلب، أو وصف لك الطبيب تقييد السوائل، اتبع تعليماته بدل هذه الحاسبة.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
