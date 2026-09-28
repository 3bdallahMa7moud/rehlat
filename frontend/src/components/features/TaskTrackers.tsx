"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, Clock3, Droplets, Pause, Play, RotateCcw, Upload } from "lucide-react";
import { Button, Card, Input, SectionHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Task } from "@/types/models";

type Details = NonNullable<Task["details"]>;
type Update = (details: Details) => void;

export function PrayerTracker({ task, onProgress, onDetails }: { task: Task; onProgress: (value: number) => void; onDetails: Update }) {
  const prayers = ["الفجر", "الظهر", "العصر", "المغرب", "العشاء"];
  const sunnah = ["ركعتان قبل الفجر", "أربع قبل الظهر", "ركعتان بعد الظهر", "ركعتان بعد المغرب", "ركعتان بعد العشاء"];
  const completedPrayers = Array.isArray(task.details?.completedPrayers) ? task.details?.completedPrayers as string[] : prayers.slice(0, task.current);
  const completedSunnah = Array.isArray(task.details?.completedSunnah) ? task.details?.completedSunnah as string[] : [];
  const toggle = (name: string, key: "completedPrayers" | "completedSunnah") => {
    const current = key === "completedPrayers" ? completedPrayers : completedSunnah;
    const next = current.includes(name) ? current.filter((item) => item !== name) : [...current, name];
    onDetails({ [key]: next });
    if (key === "completedPrayers") onProgress(next.length);
  };
  return <Card className="task-specialized-fields"><SectionHeader title="الصلاة كاملة في مهمة واحدة" description="الصلوات الخمس لها الدرجة الأساسية، والسنن الرواتب محفوظة بتفصيلها." /><h4 className="tracker-subtitle">الصلوات المفروضة · {completedPrayers.length} / 5</h4><div className="prayer-check-grid">{prayers.map((label) => <button type="button" key={label} aria-pressed={completedPrayers.includes(label)} className={cn("prayer-check", completedPrayers.includes(label) && "prayer-check-active")} onClick={() => toggle(label, "completedPrayers")}><span>{completedPrayers.includes(label) ? "✓" : "—"}</span>{label}</button>)}</div><h4 className="tracker-subtitle">السنن الرواتب · {completedSunnah.length} / 5 مجموعات · 12 ركعة</h4><div className="sunnah-check-list">{sunnah.map((label) => <button type="button" key={label} aria-pressed={completedSunnah.includes(label)} className={cn("sunnah-check", completedSunnah.includes(label) && "sunnah-check-active")} onClick={() => toggle(label, "completedSunnah")}><span>{completedSunnah.includes(label) ? <Check size={15} /> : ""}</span>{label}</button>)}</div></Card>;
}

export function WaterTracker({ task, onProgress, onDetails }: { task: Task; onProgress: (value: number) => void; onDetails: Update }) {
  const details = task.details ?? {};
  const gender = typeof details.gender === "string" ? details.gender : "ذكر";
  const weight = typeof details.weightKg === "number" ? details.weightKg : 70;
  const height = typeof details.heightCm === "number" ? details.heightCm : 170;
  const weather = typeof details.weather === "string" ? details.weather : "معتدل";
  const activity = typeof details.activityMinutes === "number" ? details.activityMinutes : 30;
  const heightAdjustment = Math.max(0, (height - 170) * 2);
  const targetMl = Math.round((weight * (gender === "أنثى" ? 30 : 35) + heightAdjustment + (weather === "حار" ? 500 : weather === "بارد" ? 0 : 250) + Math.floor(activity / 30) * 350) / 50) * 50;
  const currentMl = typeof details.waterLoggedMl === "number" ? details.waterLoggedMl : Math.round(task.current * 250);
  const updateProfile = (key: string, value: string | number) => onDetails({ [key]: value, waterTargetMl: targetMl });
  const add = (amount: number) => { const next = currentMl + amount; onDetails({ waterLoggedMl: next, waterTargetMl: targetMl, lastWater: amount }); onProgress(Math.min(task.target, Math.round((next / targetMl) * task.target * 10) / 10)); };
  return <Card className="task-specialized-fields"><SectionHeader title="هدف الماء اليومي" description="المعادلة تتغير حسب الوزن والطقس والنشاط، ويمكن تعديل النشاط يوميًا." /><div className="water-profile-grid"><label className="field"><span className="field-label">الجنس</span><select className="input" value={gender} onChange={(event) => updateProfile("gender", event.target.value)}><option>ذكر</option><option>أنثى</option></select></label><Input label="الوزن (كجم)" type="number" min={20} value={weight} onChange={(event) => updateProfile("weightKg", Number(event.target.value))} /><Input label="الطول (سم)" type="number" min={100} value={height} onChange={(event) => updateProfile("heightCm", Number(event.target.value))} /><label className="field"><span className="field-label">الطقس</span><select className="input" value={weather} onChange={(event) => updateProfile("weather", event.target.value)}><option>معتدل</option><option>حار</option><option>بارد</option></select></label><Input label="نشاط اليوم (دقيقة)" type="number" min={0} value={activity} onChange={(event) => updateProfile("activityMinutes", Number(event.target.value))} /></div><div className="water-target-callout"><Droplets size={20} /><strong>{targetMl} مل تقريبًا</strong><span>الهدف المحسوب لهذا اليوم</span></div><div className="quick-progress-actions"><Button size="sm" variant="outline" onClick={() => add(250)}>+250 مل</Button><Button size="sm" variant="secondary" onClick={() => add(500)}>+500 مل</Button></div><p className="field-hint">المسجل: {currentMl} مل · الوزن والطول محفوظان، والنشاط قابل للتغيير يوميًا.</p></Card>;
}

export function SportTracker({ task, onProgress, onDetails, onStart, onPause }: { task: Task; onProgress: (value: number) => void; onDetails: Update; onStart: () => void; onPause: () => void }) {
  const sportConfig = task.config?.type === "sport" ? task.config : null;
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(typeof task.details?.sportSeconds === "number" ? task.details.sportSeconds : task.current * 60);
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [running]);
  const minutes = Math.floor(seconds / 60);
  const activity = typeof task.details?.activity === "string" ? task.details.activity : sportConfig?.activity || task.supportingText || "";
  const stopAndSave = () => {
    setRunning(false);
    onProgress(minutes);
    onDetails({ sportSeconds: seconds });
    if (minutes < task.target) onPause();
  };
  return <Card className="task-specialized-fields task-action-card">
    <SectionHeader title={sportConfig?.activity || task.title} description={sportConfig?.timerEnabled === false ? "سجّل مدة النشاط التي أنجزتها اليوم." : "ابدأ العداد الآن، وأوقفه لحفظ مدة نشاطك."} />
    {sportConfig?.timerEnabled === false ? <Input label="الدقائق المنجزة" type="number" min={0} max={task.target} value={task.current} onChange={(event) => onProgress(Number(event.target.value))} /> : <>
      <div className="sport-timer"><Clock3 size={23} /><strong dir="ltr">{String(minutes).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</strong><span>وقت النشاط</span></div>
      <div className="quick-progress-actions task-timer-actions">
        {running ? <Button variant="outline" onClick={stopAndSave}><Pause size={16} />إيقاف وحفظ</Button> : <Button variant="primary" onClick={() => { onStart(); setRunning(true); }}><Play size={16} />{seconds > 0 ? "استئناف العداد" : "ابدأ العداد"}</Button>}
        <Button variant="ghost" onClick={() => { setRunning(false); setSeconds(0); onProgress(0); onDetails({ sportSeconds: 0 }); }}><RotateCcw size={16} />تصفير</Button>
      </div>
    </>}
    <Input label="النشاط" value={activity} placeholder="مشي، تمارين منزلية…" onChange={(event) => onDetails({ activity: event.target.value })} />
    <p className="field-hint">هدف اليوم: {task.target} دقيقة. احفظ الوقت عند التوقف.</p>
  </Card>;
}

export function ReadingTracker({ task, onProgress, onDetails }: { task: Task; onProgress: (value: number) => void; onDetails: Update }) {
  const [fileName, setFileName] = useState(typeof task.details?.bookFileName === "string" ? task.details.bookFileName : "");
  const [fileUrl, setFileUrl] = useState("");
  const page = typeof task.details?.bookPage === "number" ? task.details.bookPage : task.current;
  const bookmark = typeof task.details?.bookmark === "string" ? task.details.bookmark : "";
  return <Card className="task-specialized-fields"><SectionHeader title="قراءة الكتاب" description="ارفع نسخة محلية للعرض التجريبي، وسجّل الصفحة أو السطر الذي توقفت عنده." /><label className="upload-book-control"><Upload size={18} /><span>{fileName || "رفع كتاب يدويًا"}</span><input type="file" accept=".pdf,.epub,.txt" onChange={(event) => { const file = event.target.files?.[0]; const name = file?.name ?? ""; setFileName(name); if (file) setFileUrl(URL.createObjectURL(file)); onDetails({ bookFileName: name }); }} /></label>{fileName && <div className="book-preview-placeholder"><BookOpen size={20} /><span>{fileName}</span><small>الملف ظاهر الآن في هذه الجلسة، وسيصبح مشتركًا بعد توصيل التخزين.</small></div>}{fileUrl && <iframe className="book-preview-frame" title={`معاينة ${fileName}`} src={fileUrl} />}<label className="share-book-toggle"><input type="checkbox" checked={task.details?.bookShared === true} onChange={(event) => onDetails({ bookShared: event.target.checked })} /><span>إتاحة الكتاب للمجموعة بعد رفعه</span></label><div className="sleep-time-grid"><Input label="اسم الكتاب" value={typeof task.details?.book === "string" ? task.details.book : task.supportingText?.replace(/^كتاب:\s*/, "") ?? ""} onChange={(event) => onDetails({ book: event.target.value })} /><Input type="number" min={0} max={task.target} label="صفحة التوقف" value={page} onChange={(event) => { const next = Number(event.target.value); onDetails({ bookPage: next }); onProgress(next); }} /></div><label className="field"><span className="field-label">علامة أو سطر التوقف</span><textarea className="input" rows={2} value={bookmark} onChange={(event) => onDetails({ bookmark: event.target.value })} placeholder="مثال: السطر الثالث في الصفحة…" /></label><p className="field-hint">الصفحة المحفوظة: {page}. يمكن تحويلها لاحقًا إلى bookmark مشترك.</p></Card>;
}

export function ReviewTracker({ task, onProgress, onDetails, onStart, onPause, title = "مراجعة الدروس", description = "ابدأ المراجعة وسجّل الدقائق بالعداد أو يدويًا.", actionLabel = "المراجعة" }: { task: Task; onProgress: (value: number) => void; onDetails: Update; onStart: () => void; onPause: () => void; title?: string; description?: string; actionLabel?: string }) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(typeof task.details?.reviewSeconds === "number" ? task.details.reviewSeconds : task.current * 60);
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [running]);
  const minutes = Math.floor(seconds / 60);
  const stopAndSave = () => {
    setRunning(false);
    onProgress(minutes);
    onDetails({ reviewSeconds: seconds });
    if (minutes < task.target) onPause();
  };
  const setMinutes = (value: number) => {
    const next = Math.max(0, Math.min(task.target, Number.isFinite(value) ? value : 0));
    setRunning(false);
    setSeconds(next * 60);
    onProgress(next);
    onDetails({ reviewSeconds: next * 60 });
    if (running && next < task.target) onPause();
  };
  return <Card className="task-specialized-fields task-action-card">
    <SectionHeader title={title} description={description} />
    <div className="sport-timer"><Clock3 size={23} /><strong dir="ltr">{String(minutes).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</strong><span>وقت المهمة</span></div>
    <div className="quick-progress-actions task-timer-actions">
      {running ? <Button variant="outline" onClick={stopAndSave}><Pause size={16} />إيقاف وحفظ</Button> : <Button variant="primary" onClick={() => { onStart(); setRunning(true); }}><Play size={16} />{seconds > 0 ? `استئناف ${actionLabel}` : `ابدأ ${actionLabel}`}</Button>}
      <Button variant="secondary" onClick={() => { setRunning(false); onProgress(task.target); onDetails({ reviewSeconds: seconds }); }}><Check size={16} />إنهاء المهمة</Button>
    </div>
    <Input label="تسجيل الدقائق يدويًا" type="number" min={0} max={task.target} value={task.current} onChange={(event) => setMinutes(Number(event.target.value))} />
    <p className="field-hint">الهدف اليومي: {task.target} دقيقة. احفظ الوقت عند التوقف.</p>
  </Card>;
}
