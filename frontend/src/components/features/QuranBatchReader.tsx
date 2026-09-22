"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, CircleAlert, Headphones, LoaderCircle, RotateCcw } from "lucide-react";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useDemo } from "@/state/DemoContext";
import type { Task } from "@/types/models";

interface QuranAyah { number: number; audioNumber?: number; text: string; tafsir: string }
interface QuranPayload { surah: { number: number; name: string; englishName: string; ayahs: QuranAyah[] } }

function initialSurah(task: Task) {
  const saved = task.details?.quranSurah;
  if (typeof saved === "number" && saved >= 1 && saved <= 114) return saved;
  if ((task.supportingText ?? "").includes("الكهف")) return 18;
  return 1;
}

export function QuranBatchReader({ task, onProgress, onDetails }: { task: Task; onProgress: (value: number) => void; onDetails: (details: Record<string, string | number | boolean | string[]>) => void }) {
  const { quranAyahsPerPage } = useDemo();
  const startingSurah = initialSurah(task);
  const [surah, setSurah] = useState(startingSurah);
  const [surahInput, setSurahInput] = useState(String(startingSurah));
  const [payload, setPayload] = useState<QuranPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTafsir, setShowTafsir] = useState(true);
  const [batchStart, setBatchStart] = useState(() => task.details?.readSurah === startingSurah && typeof task.details?.quranAyahStart === "number" ? Math.max(0, task.details.quranAyahStart - 1) : 0);
  const ayahs = payload?.surah.ayahs ?? [];
  const safeStart = Math.max(0, Math.min(batchStart, Math.max(0, ayahs.length - 1)));
  const visibleAyahs = useMemo(() => ayahs.slice(safeStart, safeStart + quranAyahsPerPage), [ayahs, safeStart, quranAyahsPerPage]);
  const readAyahs = task.details?.readSurah === surah && typeof task.details.readAyahs === "number" ? task.details.readAyahs : 0;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(`/api/quran?surah=${surah}`, { signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data as QuranPayload; })
      .then(setPayload)
      .catch((reason: unknown) => { if ((reason as Error).name !== "AbortError") setError(reason instanceof Error ? reason.message : "تعذر تحميل السورة."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [surah]);

  const chooseSurah = (value: number) => {
    if (!Number.isInteger(value) || value < 1 || value > 114) { setSurahInput(String(surah)); return; }
    setSurah(value); setSurahInput(String(value)); setBatchStart(0); onDetails({ quranSurah: value, quranAyahStart: 1 });
  };
  const showBatch = (nextStart: number) => {
    const next = Math.max(0, Math.min(nextStart, Math.max(0, ayahs.length - 1)));
    setBatchStart(next); onDetails({ quranAyahStart: next + 1 });
  };
  const markRead = (number: number) => {
    onDetails({ readSurah: surah, readAyahs: number, quranAyahStart: safeStart + 1 });
    onProgress(Math.min(task.target, Math.max(task.current, Math.ceil((number / (ayahs.length || number)) * task.target))));
  };

  return <Card className="religious-reader quran-reader">
    <SectionHeader title="اقرأ القرآن وتفسيره" description={`اختر أي سورة؛ يعرض القارئ ${quranAyahsPerPage} آيات في كل دفعة مع التفسير والصوت.`} action={<BookOpen size={19} className="text-[var(--teal-strong)]" />} />
    <div className="quran-controls"><label className="field"><span className="field-label">رقم السورة</span><input className="input" type="number" min="1" max="114" inputMode="numeric" value={surahInput} onChange={(event) => setSurahInput(event.target.value)} onBlur={() => chooseSurah(Number(surahInput))} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><span className="field-hint">من 1 إلى 114 — القرآن كامل متاح للقراءة.</span></label><Button size="sm" variant={showTafsir ? "secondary" : "outline"} onClick={() => setShowTafsir((value) => !value)}>{showTafsir ? "إخفاء التفسير" : "إظهار التفسير"}</Button></div>
    {loading && <div className="reader-state"><LoaderCircle className="spin" size={22} />جارٍ تحميل السورة والتفسير…</div>}
    {error && <div className="reader-state reader-error"><CircleAlert size={22} /><span>{error}</span><Button size="sm" variant="outline" onClick={() => setSurah((value) => value)}>إعادة المحاولة</Button></div>}
    {payload && !loading && <><div className="quran-surah-heading"><div><Badge tone="teal">{payload.surah.englishName}</Badge><h3>{payload.surah.name}</h3></div><span>{readAyahs} / {ayahs.length} آية مقروءة</span></div><div className="quran-batch-heading"><strong>الآيات {safeStart + 1}–{Math.min(safeStart + quranAyahsPerPage, ayahs.length)}</strong><span>{quranAyahsPerPage} آيات في الدفعة</span></div><div className="quran-ayah-list">{visibleAyahs.map((ayah) => <article className={cn("quran-ayah", readAyahs >= ayah.number && "quran-ayah-read")} key={ayah.number}><div className="ayah-number">{ayah.number}</div><div className="ayah-copy"><p className="ayah-text">{ayah.text}</p><div className="ayah-audio"><Headphones size={15} /><span>استماع للآية</span><audio controls preload="none" src={`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayah.audioNumber ?? ayah.number}.mp3`} /></div><button type="button" className="ayah-read-button" onClick={() => markRead(ayah.number)}>{readAyahs >= ayah.number ? <><Check size={15} />تمت القراءة</> : <>علّمها كمقروءة <ChevronLeft size={15} /></>}</button></div>{showTafsir && <div className="ayah-tafsir"><strong>التفسير الميسر</strong><p>{ayah.tafsir}</p></div>}</article>)}</div><div className="quran-batch-nav"><Button variant="outline" disabled={safeStart === 0} onClick={() => showBatch(safeStart - quranAyahsPerPage)}><ChevronRight size={17} />الآيات السابقة</Button><Button disabled={safeStart + quranAyahsPerPage >= ayahs.length} onClick={() => showBatch(safeStart + quranAyahsPerPage)}>الآيات التالية<ChevronLeft size={17} /></Button></div><div className="reader-source-note"><RotateCcw size={14} />عدد الآيات الظاهر تحدده إدارة المنصة، بينما اختيار السورة والورد متروك لك.</div></>}
  </Card>;
}
