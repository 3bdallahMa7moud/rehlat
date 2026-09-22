"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, CircleAlert, Headphones, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { adhkarContent, tasbeehContent, type AdhkarSession } from "@/data/adhkar";
import { Badge, Button, Card, ProgressBar, SectionHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useDemo } from "@/state/DemoContext";
import type { Task } from "@/types/models";

export function AdhkarReader({ task, onDetails, onProgress }: { task: Task; onDetails: (details: Record<string, string | number | boolean | string[]>) => void; onProgress: (value: number) => void }) {
  const details = useMemo(() => task.details ?? {}, [task.details]);
  const [session, setSession] = useState<AdhkarSession>(details.session === "evening" || task.group === "evening" ? "evening" : "morning");
  const items = adhkarContent[session];
  const checked = useMemo(() => {
    if (Array.isArray(details.completedAdhkar)) return details.completedAdhkar as string[];
    return task.status === "completed" ? items.map((item) => item.id) : [];
  }, [details.completedAdhkar, items, task.status]);
  const completed = useMemo(() => items.filter((item) => checked.includes(item.id)).length, [checked, items]);
  const tasbeehCounts = useMemo(() => Object.fromEntries(tasbeehContent.map((item) => [item.id, typeof details[`tasbeeh_${item.id}`] === "number" ? details[`tasbeeh_${item.id}`] as number : task.status === "completed" ? item.target : 0])) as Record<string, number>, [details, task.status]);
  const tasbeehDone = tasbeehContent.reduce((total, item) => total + Math.min(item.target, tasbeehCounts[item.id] ?? 0), 0);
  const tasbeehTarget = tasbeehContent.reduce((total, item) => total + item.target, 0);
  const toggle = (id: string) => {
    const next = checked.includes(id) ? checked.filter((item) => item !== id) : [...checked, id];
    onDetails({ session, completedAdhkar: next });
    onProgress(next.length === items.length && tasbeehDone >= tasbeehTarget ? 1 : 0);
  };
  const changeSession = (next: AdhkarSession) => { setSession(next); onDetails({ session: next, completedAdhkar: [] }); onProgress(0); };
  const incrementTasbeeh = (id: string, target: number) => { const next = Math.min(target, (tasbeehCounts[id] ?? 0) + 1); onDetails({ [`tasbeeh_${id}`]: next }); onProgress(completed === items.length && tasbeehDone + (next - (tasbeehCounts[id] ?? 0)) >= tasbeehTarget ? 1 : 0); };
  const resetTasbeeh = () => { onDetails(Object.fromEntries(tasbeehContent.map((item) => [`tasbeeh_${item.id}`, 0]))); onProgress(0); };
  return <Card className="religious-reader adhkar-reader">
    <SectionHeader title="اقرأ الأذكار من الموقع" description="افتح الذكر هنا، وعلّم كل فقرة بعد قراءتها بهدوء." action={<Sparkles size={19} className="text-[var(--teal-strong)]" />} />
    <div className="reader-tabs" role="tablist" aria-label="اختيار وقت الأذكار">
      {(["morning", "evening"] as const).map((value) => <button type="button" role="tab" aria-selected={session === value} key={value} className={cn(session === value && "reader-tab-active")} onClick={() => changeSession(value)}>{value === "morning" ? "أذكار الصباح والاستيقاظ" : "أذكار المساء وقبل النوم"}</button>)}
    </div>
    <div className="reader-progress"><div><span>{completed} من {items.length} أذكار</span><strong>{Math.round((completed / items.length) * 100)}%</strong></div><ProgressBar value={(completed / items.length) * 100} tone="teal" /></div>
    <div className="adhkar-list">{items.map((item, index) => { const isDone = checked.includes(item.id); return <article className={cn("dhikr-item", isDone && "dhikr-item-done")} key={item.id}><div className="dhikr-heading"><span>{index + 1}</span><div><strong>{item.title}</strong><Badge tone="teal">يُقرأ {item.count} {item.count === 1 ? "مرة" : "مرات"}</Badge>{item.note && <small>{item.note}</small>}</div></div><p>{item.text}</p><Button size="sm" variant={isDone ? "secondary" : "outline"} onClick={() => toggle(item.id)}>{isDone ? <><Check size={15} />تم الذكر</> : "تمت القراءة"}</Button></article>; })}</div>
    <div className="tasbeeh-panel"><div className="tasbeeh-panel-heading"><div><strong>عداد التسبيح</strong><small>اضغط على الزر مع كل تسبيحة</small></div><Button size="sm" variant="ghost" onClick={resetTasbeeh}><RotateCcw size={15} />تصفير</Button></div><div className="tasbeeh-grid">{tasbeehContent.map((item) => <div className="tasbeeh-counter" key={item.id}><span>{item.label}</span><strong>{tasbeehCounts[item.id] ?? 0}<small> / {item.target}</small></strong><button type="button" className="tasbeeh-tap" onClick={() => incrementTasbeeh(item.id, item.target)} aria-label={`تسبيح ${item.label}`}>اضغط للتسبيح</button></div>)}</div><div className="reader-progress tasbeeh-progress"><div><span>التسبيح</span><strong>{tasbeehDone} من {tasbeehTarget}</strong></div><ProgressBar value={(tasbeehDone / tasbeehTarget) * 100} tone="teal" /></div></div>
    {completed === items.length && tasbeehDone >= tasbeehTarget && <div className="reader-complete"><Check size={18} /><span>ما شاء الله، اكتملت جلسة {session === "morning" ? "الصباح والاستيقاظ" : "المساء وقبل النوم"}.</span></div>}
  </Card>;
}

interface QuranAyah { number: number; audioNumber?: number; text: string; tafsir: string }
interface QuranPayload { surah: { number: number; name: string; englishName: string; ayahs: QuranAyah[] } }

const quranSurahOptions = [
  { number: 1, label: "الفاتحة" }, { number: 2, label: "البقرة" }, { number: 3, label: "آل عمران" },
  { number: 4, label: "النساء" }, { number: 5, label: "المائدة" }, { number: 6, label: "الأنعام" },
  { number: 7, label: "الأعراف" }, { number: 18, label: "الكهف" }, { number: 36, label: "يس" },
  { number: 55, label: "الرحمن" }, { number: 67, label: "الملك" }, { number: 112, label: "الإخلاص" },
  { number: 113, label: "الفلق" }, { number: 114, label: "الناس" },
] as const;

function suggestedSurah(task: Task) {
  const saved = task.details?.quranSurah;
  if (typeof saved === "number" && quranSurahOptions.some((option) => option.number === saved)) return saved;
  const text = `${task.title} ${task.supportingText ?? ""}`;
  return quranSurahOptions.find((option) => text.includes(option.label))?.number ?? 1;
}

const fallbackQuran: QuranPayload = { surah: { number: 1, name: "سُورَةُ الْفَاتِحَةِ", englishName: "Al-Fatihah", ayahs: [
  { number: 1, text: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ", tafsir: "أبتدئ قراءة القرآن باسم الله مستعينًا به، اللهِ ذي الرحمة الواسعة." },
  { number: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", tafsir: "الثناء كله لله، رب كل شيء وخالقه ومدبره." },
  { number: 3, text: "الرَّحْمَنِ الرَّحِيمِ", tafsir: "الرحمن برحمته العامة، الرحيم برحمته الخاصة بالمؤمنين." },
  { number: 4, text: "مَالِكِ يَوْمِ الدِّينِ", tafsir: "المالك المتصرف في يوم الجزاء والحساب." },
  { number: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", tafsir: "نخصك وحدك بالعبادة، ونطلب منك وحدك العون في أمورنا كلها." },
  { number: 6, text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", tafsir: "أرشدنا ووفقنا إلى الطريق الواضح الذي لا اعوجاج فيه." },
  { number: 7, text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", tafsir: "طريق من أنعمت عليهم من النبيين والصديقين والشهداء والصالحين، لا طريق من عرف الحق وتركه ولا من ضل عنه." },
] } };

export function QuranReader({ task, onProgress, onDetails }: { task: Task; onProgress: (value: number) => void; onDetails: (details: Record<string, string | number | boolean | string[]>) => void }) {
  const [surah, setSurah] = useState(() => suggestedSurah(task));
  const [payload, setPayload] = useState<QuranPayload | null>(fallbackQuran);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTafsir, setShowTafsir] = useState(true);
  const [tafsirSource, setTafsirSource] = useState<"muyassar" | "tabari">("muyassar");
  const readAyahs = task.details?.readSurah === surah && typeof task.details.readAyahs === "number" ? task.details.readAyahs : 0;
  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/quran?surah=${surah}`, { signal: controller.signal }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data as QuranPayload; }).then(setPayload).catch((reason: unknown) => { if ((reason as Error).name !== "AbortError") setError(reason instanceof Error ? reason.message : "تعذر تحميل السورة."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [surah]);
  const markRead = (number: number) => { onDetails({ readSurah: surah, readAyahs: number }); onProgress(Math.min(task.target, Math.max(task.current, Math.ceil((number / (payload?.surah.ayahs.length || number)) * task.target)))); };
  return <Card className="religious-reader quran-reader">
    <SectionHeader title="اقرأ القرآن وتفسيره من الموقع" description="النص والتفسير يظهران داخل الصفحة، ويمكنك متابعة الآيات التي قرأتها." action={<BookOpen size={19} className="text-[var(--teal-strong)]" />} />
    <div className="quran-controls"><label className="field"><span className="field-label">السورة</span><select className="input" value={surah} onChange={(event) => { const next = Number(event.target.value); setLoading(true); setError(""); setPayload(next === 1 ? fallbackQuran : null); setSurah(next); onDetails({ quranSurah: next }); }}>{quranSurahOptions.map((option) => <option value={option.number} key={option.number}>سورة {option.label}</option>)}</select></label><Button size="sm" variant={showTafsir ? "secondary" : "outline"} onClick={() => setShowTafsir((value) => !value)}>{showTafsir ? "إخفاء التفسير" : "إظهار التفسير"}</Button></div><div className="tafsir-source-tabs" role="tablist" aria-label="مصدر التفسير"><button type="button" className={cn(tafsirSource === "muyassar" && "tafsir-source-active")} onClick={() => setTafsirSource("muyassar")}>التفسير الميسر</button><button type="button" className={cn(tafsirSource === "tabari" && "tafsir-source-active")} onClick={() => setTafsirSource("tabari")}>تفسير الطبري</button></div>
    {loading && <div className="reader-state"><LoaderCircle className="spin" size={22} />جارٍ تحميل السورة والتفسير…</div>}
    {error && <div className="reader-state reader-error"><CircleAlert size={22} /><span>{error}</span><Button size="sm" variant="outline" onClick={() => setSurah((value) => value)}>إعادة المحاولة</Button></div>}
    {payload && !loading && <><div className="quran-surah-heading"><div><Badge tone="teal">{payload.surah.englishName}</Badge><h3>{payload.surah.name}</h3></div><span>{readAyahs} / {payload.surah.ayahs.length} آية مقروءة</span></div><div className="quran-ayah-list">{payload.surah.ayahs.map((ayah) => <article className={cn("quran-ayah", readAyahs >= ayah.number && "quran-ayah-read")} key={ayah.number}><div className="ayah-number">{ayah.number}</div><div className="ayah-copy"><p className="ayah-text">{ayah.text}</p>{showTafsir && <div className="ayah-tafsir"><strong>{tafsirSource === "tabari" ? "تفسير الطبري · واجهة العرض جاهزة للربط" : "التفسير الميسر"}</strong><p>{ayah.tafsir}</p>{tafsirSource === "tabari" && <small className="tafsir-pending">سيتم جلب نص الطبري من مصدره عند توصيل الـbackend.</small>}</div>}<div className="ayah-audio"><Headphones size={15} /><span>استماع للآية</span><audio controls preload="none" src={`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayah.audioNumber ?? ayah.number}.mp3`} /></div><button type="button" className="ayah-read-button" onClick={() => markRead(ayah.number)}>{readAyahs >= ayah.number ? <><Check size={15} />تمت القراءة</> : <>علّمها كمقروءة <ChevronLeft size={15} /></>}</button></div></article>)}</div><div className="reader-source-note"><RotateCcw size={14} />المحتوى يُجلب عند فتح السورة ويُعرض داخل المنصة.</div></>}
  </Card>;
}
