"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, LoaderCircle, MoreHorizontal, Volume2 } from "lucide-react";
import { Button, Card, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { reciterLabel } from "@/lib/quran-recitation";
import { useDemo } from "@/state/DemoContext";
import type { Task } from "@/types/models";

interface QuranAyah { number: number; audioNumber?: number; text: string; tafsir: string; juz?: number; page?: number }
interface QuranPayload { surah: { number: number; name: string; englishName: string; revelationType?: string; ayahs: QuranAyah[] } }
type ReaderTab = "tafsir" | "progress";

export const quranSurahNames = "الفاتحة|البقرة|آل عمران|النساء|المائدة|الأنعام|الأعراف|الأنفال|التوبة|يونس|هود|يوسف|الرعد|إبراهيم|الحجر|النحل|الإسراء|الكهف|مريم|طه|الأنبياء|الحج|المؤمنون|النور|الفرقان|الشعراء|النمل|القصص|العنكبوت|الروم|لقمان|السجدة|الأحزاب|سبأ|فاطر|يس|الصافات|ص|الزمر|غافر|فصلت|الشورى|الزخرف|الدخان|الجاثية|الأحقاف|محمد|الفتح|الحجرات|ق|الذاريات|الطور|النجم|القمر|الرحمن|الواقعة|الحديد|المجادلة|الحشر|الممتحنة|الصف|الجمعة|المنافقون|التغابن|الطلاق|التحريم|الملك|القلم|الحاقة|المعارج|نوح|الجن|المزمل|المدثر|القيامة|الإنسان|المرسلات|النبأ|النازعات|عبس|التكوير|الانفطار|المطففين|الانشقاق|البروج|الطارق|الأعلى|الغاشية|الفجر|البلد|الشمس|الليل|الضحى|الشرح|التين|العلق|القدر|البينة|الزلزلة|العاديات|القارعة|التكاثر|العصر|الهمزة|الفيل|قريش|الماعون|الكوثر|الكافرون|النصر|المسد|الإخلاص|الفلق|الناس".split("|");
const arabicNumber = (value: number) => new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(value);

function initialSurah(task: Task) {
  const saved = task.details?.quranBookmarked === true && Number.isFinite(task.details?.quranBookmarkedSurah)
    ? task.details?.quranBookmarkedSurah
    : task.details?.quranSurah;
  if (typeof saved === "number" && saved >= 1 && saved <= 114) return saved;
  if ((task.supportingText ?? "").includes("الكهف")) return 18;
  return 1;
}

export function QuranBatchReader({ task, onProgress, onDetails: saveDetails, initialSurahOverride }: { task: Task; onProgress: (value: number) => void; onDetails: (details: Record<string, string | number | boolean | string[]>) => void; initialSurahOverride?: number }) {
  const { quranAyahsPerPage, quranReadingMode, quranReciter } = useDemo();
  // A reader position changes while navigating. A saved bookmark must keep its
  // own coordinates so moving to another page cannot overwrite it.
  const onDetails = (details: Record<string, string | number | boolean | string[]>) => {
    if (details.quranBookmarked === true) {
      const ayah = Number.isFinite(details.quranAyahStart) ? details.quranAyahStart as number : 1;
      saveDetails({ ...details, quranBookmarkedSurah: surah, quranBookmarkedAyah: ayah });
      return;
    }
    saveDetails(details);
  };
  const startingSurah = initialSurahOverride ?? initialSurah(task);
  const savedAyah = initialSurahOverride && initialSurahOverride !== initialSurah(task) ? 1 : typeof task.details?.quranAyahStart === "number" ? task.details.quranAyahStart : 1;
  const savedBookmarkAyah = initialSurahOverride && initialSurahOverride !== initialSurah(task) ? 1
    : task.details?.quranBookmarked === true && Number.isFinite(task.details?.quranBookmarkedAyah)
    ? task.details?.quranBookmarkedAyah as number
    : savedAyah;
  const [surah, setSurah] = useState(startingSurah);
  const [payload, setPayload] = useState<QuranPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAyahNumber, setSelectedAyahNumber] = useState(savedBookmarkAyah);
  const [batchStart, setBatchStart] = useState(Math.floor((savedBookmarkAyah - 1) / quranAyahsPerPage) * quranAyahsPerPage);
  const [fontScale, setFontScale] = useState(1);
  const [activeTab, setActiveTab] = useState<ReaderTab>("tafsir");
  const [moreOpen, setMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ayahs = payload?.surah.ayahs ?? [];
  const safeStart = Math.min(batchStart, Math.max(0, ayahs.length - 1));
  const activeAyah = ayahs[selectedAyahNumber - 1] ?? ayahs[safeStart];
  const visibleAyahs = useMemo(() => {
    if (quranReadingMode === "pages") {
      const activePage = activeAyah?.page ?? ayahs[safeStart]?.page;
      return activePage ? ayahs.filter((ayah) => ayah.page === activePage) : ayahs.slice(safeStart, safeStart + quranAyahsPerPage);
    }
    return ayahs.slice(safeStart, safeStart + quranAyahsPerPage);
  }, [activeAyah?.page, ayahs, quranAyahsPerPage, quranReadingMode, safeStart]);
  const firstAyah = visibleAyahs[0];
  const lastAyah = visibleAyahs.at(-1);
  const activePage = firstAyah?.page;
  const pageOptions = useMemo(() => [...new Set(ayahs.map((ayah) => ayah.page).filter((value): value is number => typeof value === "number"))], [ayahs]);
  const bookmarkAyah = Number.isFinite(task.details?.quranBookmarkedAyah)
    ? task.details?.quranBookmarkedAyah
    : task.details?.quranAyahStart;
  const bookmarkSurah = Number.isFinite(task.details?.quranBookmarkedSurah)
    ? task.details?.quranBookmarkedSurah
    : task.details?.quranSurah;
  const bookmarked = task.details?.quranBookmarked === true
    && bookmarkAyah === activeAyah?.number
    && bookmarkSurah === surah;
  const juzOptions = useMemo(() => [...new Set(ayahs.map((ayah) => ayah.juz).filter((value): value is number => typeof value === "number"))], [ayahs]);
  const currentJuz = activeAyah?.juz ?? juzOptions[0];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/quran?surah=" + surah, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data as QuranPayload;
      })
      .then(setPayload)
      .catch((reason: unknown) => {
        if ((reason as Error).name !== "AbortError") setError(reason instanceof Error ? reason.message : "تعذر تحميل السورة.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [surah, refreshKey]);

  const selectAyah = (number: number) => {
    if (number < 1 || number > ayahs.length) return;
    setSelectedAyahNumber(number);
    setCopied(false);
    if (quranReadingMode === "ayahs") setBatchStart(Math.floor((number - 1) / quranAyahsPerPage) * quranAyahsPerPage);
    onDetails({ quranSurah: surah, quranAyahStart: number });
  };
  const chooseSurah = (next: number) => {
    if (next === surah) return;
    setSurah(next);
    setPayload(null);
    setSelectedAyahNumber(1);
    setBatchStart(0);
    setLoading(true);
    setError("");
    onDetails({ quranSurah: next, quranAyahStart: 1 });
  };
  const chooseJuz = (juz: number) => {
    const first = ayahs.find((ayah) => ayah.juz === juz);
    if (first) selectAyah(first.number);
  };
  const completedBatches = Array.isArray(task.details?.quranCompletedBatches) ? task.details.quranCompletedBatches : [];
  const batchKey = quranReadingMode === "pages" ? "pages:" + surah + ":" + (activePage ?? 0) : "ayahs:" + surah + ":" + (firstAyah?.number ?? 0) + "-" + (lastAyah?.number ?? 0);
  const batchCompleted = completedBatches.includes(batchKey);
  const batchUnits = quranReadingMode === "pages" ? 1 : visibleAyahs.length;
  const moveBatch = (direction: -1 | 1) => {
    if (!firstAyah || !lastAyah) return;
    if (quranReadingMode === "pages") {
      const targetPage = pageOptions[pageOptions.indexOf(activePage ?? 0) + direction];
      const target = ayahs.find((ayah) => ayah.page === targetPage);
      if (target) selectAyah(target.number);
      return;
    }
    selectAyah(direction === 1 ? Math.min(ayahs.length, lastAyah.number + 1) : Math.max(1, firstAyah.number - quranAyahsPerPage));
  };
  const completeBatch = () => {
    if (!firstAyah || !lastAyah || batchCompleted) return;
    onDetails({ quranCompletedBatches: [...completedBatches, batchKey], readSurah: surah, readAyahs: lastAyah.number, quranSurah: surah, quranAyahStart: firstAyah.number });
    onProgress(Math.min(task.target, task.current + batchUnits));
  };
  const copyAyah = async () => {
    if (!activeAyah) return;
    try {
      await navigator.clipboard.writeText(activeAyah.text);
      setCopied(true);
      setMoreOpen(false);
    } catch {
      setCopied(false);
    }
  };

  return <div className="quran-reader-stack">
    <Card id="quran-reader-card" className="quran-reader" padding="sm">
      <div className="quran-reader-crumb"><Link href="/dashboard">الرئيسية</Link><ChevronLeft size={13} /><strong>القرآن الكريم</strong></div>
      <div className="quran-reader-toolbar">
        <div className="quran-toolbar-selects">
          <label className="quran-toolbar-select"><span className="sr-only">السورة</span><select value={surah} onChange={(event) => chooseSurah(Number(event.target.value))}>{quranSurahNames.map((name, index) => <option key={name} value={index + 1}>سورة {name}</option>)}</select><ChevronDown size={14} /></label>
          <label className="quran-toolbar-select quran-juz-select"><span className="sr-only">الجزء</span><select value={currentJuz ?? ""} onChange={(event) => chooseJuz(Number(event.target.value))} disabled={!juzOptions.length}>{juzOptions.length ? juzOptions.map((juz) => <option value={juz} key={juz}>الجزء {juz}</option>) : <option value="">الجزء</option>}</select><ChevronDown size={14} /></label>
        </div>
        <div className="quran-toolbar-position">
          <button type="button" aria-label="الآية السابقة" onClick={() => selectAyah(selectedAyahNumber - 1)} disabled={loading || selectedAyahNumber <= 1}><ChevronRight size={18} /></button>
          <span>الآية {activeAyah?.number ?? "—"} من {ayahs.length || "—"}</span>
          <button type="button" aria-label="الآية التالية" onClick={() => selectAyah(selectedAyahNumber + 1)} disabled={loading || selectedAyahNumber >= ayahs.length}><ChevronLeft size={18} /></button>
        </div>
        <div className="quran-toolbar-actions"><span className="quran-reciter-label" title={"\u0627\u0644\u0642\u0627\u0631\u0626: " + reciterLabel(quranReciter)}>{reciterLabel(quranReciter)}</span>
          <button type="button" aria-label="استمع للآية" title="استمع للآية" onClick={() => { void audioRef.current?.play(); }} disabled={!activeAyah}><Volume2 size={18} /></button>
          <button type="button" className={cn(bookmarked && "is-active")} aria-label="حفظ موضع الآية" aria-pressed={bookmarked} title="حفظ الموضع" onClick={() => onDetails({ quranBookmarked: !bookmarked, quranSurah: surah, quranAyahStart: activeAyah?.number ?? 1 })}><Bookmark size={18} /></button>
          <div className="quran-more-wrap"><button type="button" aria-label="خيارات الآية" aria-expanded={moreOpen} title="خيارات الآية" onClick={() => setMoreOpen((value) => !value)}><MoreHorizontal size={19} /></button>{moreOpen && <div className="quran-more-menu"><button type="button" onClick={() => { void copyAyah(); }}>نسخ الآية</button><Link href="/tasks" onClick={() => setMoreOpen(false)}>كل المهام</Link></div>}</div>
        </div>
      </div>

      {loading && <div className="reader-state"><LoaderCircle className="spin" size={22} />جارٍ تحميل السورة والتفسير…</div>}
      {error && <div className="reader-state reader-error"><CircleAlert size={22} /><span>{error}</span><Button size="sm" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>إعادة المحاولة</Button></div>}
      {payload && !loading && <>
        <div className="quran-mushaf">
          <div className="quran-mushaf-corner quran-mushaf-corner-tr" aria-hidden="true">✦</div>
          <div className="quran-mushaf-corner quran-mushaf-corner-tl" aria-hidden="true">✦</div>
          <div className="quran-mushaf-corner quran-mushaf-corner-br" aria-hidden="true">✦</div>
          <div className="quran-mushaf-corner quran-mushaf-corner-bl" aria-hidden="true">✦</div>
          <div className="quran-mushaf-title"><span className="quran-mushaf-ornament" aria-hidden="true">۞</span><div><h2>{payload.surah.name}</h2><p>{payload.surah.revelationType === "Meccan" ? "مكية" : payload.surah.revelationType === "Medinan" ? "مدنية" : "سورة من القرآن الكريم"} · {ayahs.length} آية</p></div><span className="quran-mushaf-ornament" aria-hidden="true">۞</span></div>
          <div className="quran-verse-flow" style={{ fontSize: (31 * fontScale) + "px" }}>
            {visibleAyahs.map((ayah) => <button type="button" key={ayah.number} className={cn("quran-flow-verse", ayah.number === activeAyah?.number && "quran-flow-verse-active")} aria-pressed={ayah.number === activeAyah?.number} onClick={() => selectAyah(ayah.number)}><span>{ayah.text}</span><span className="quran-verse-number" aria-hidden="true">{arabicNumber(ayah.number)}</span></button>)}
          </div>
          {visibleAyahs.length > 0 && (quranReadingMode === "pages" ? pageOptions.length > 1 : ayahs.length > quranAyahsPerPage) && <div className="quran-mushaf-pager"><button type="button" onClick={() => moveBatch(-1)} disabled={quranReadingMode === "pages" ? pageOptions.indexOf(activePage ?? 0) <= 0 : safeStart === 0}><ChevronRight size={16} />{quranReadingMode === "pages" ? "\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629" : "الدفعة \u0627\u0644\u0633\u0627\u0628\u0642\u0629"}</button><span>{quranReadingMode === "pages" ? "\u0635\u0641\u062d\u0629 " + (activePage ?? "?") : arabicNumber(Math.floor(safeStart / quranAyahsPerPage) + 1) + " / " + arabicNumber(Math.ceil(ayahs.length / quranAyahsPerPage))}</span><button type="button" onClick={() => moveBatch(1)} disabled={quranReadingMode === "pages" ? pageOptions.indexOf(activePage ?? 0) >= pageOptions.length - 1 : safeStart + quranAyahsPerPage >= ayahs.length}>{quranReadingMode === "pages" ? "\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629" : "الدفعة \u0627\u0644\u062a\u0627\u0644\u064a\u0629"}<ChevronLeft size={16} /></button></div>}
        </div>
        <div className="quran-reading-tools">
          <div className="quran-reader-size"><button type="button" onClick={() => setFontScale((value) => Math.min(1.5, Number((value + 0.1).toFixed(1))))}>A+</button><button type="button" onClick={() => setFontScale(1)}>A</button><button type="button" onClick={() => setFontScale((value) => Math.max(0.75, Number((value - 0.1).toFixed(1))))}>A−</button></div>
          <div className="quran-reader-progress"><span>{task.current} من {task.target} {task.unit}</span><ProgressBar value={(task.current / Math.max(1, task.target)) * 100} tone="teal" /></div>
          <span className="quran-batch-label">{quranReadingMode === "pages" ? "\u0648\u0636\u0639 \u0627\u0644\u0635\u0641\u062d\u0627\u062a" : visibleAyahs.length + " \u0622\u064a\u0627\u062a \u0641\u064a الدفعة"}</span>
        </div>
      </>}
    </Card>

    {payload && !loading && activeAyah && <Card className="quran-tafsir-card" padding="sm">
      <div className="quran-tafsir-heading"><div><BookOpen size={20} /><h2>تفسير الآية</h2></div><span>الآية {activeAyah.number}</span></div>
      <div className="quran-tafsir-tabs" role="tablist" aria-label="تفاصيل الآية">
        <button type="button" role="tab" aria-selected={activeTab === "tafsir"} className={cn(activeTab === "tafsir" && "is-active")} onClick={() => setActiveTab("tafsir")}>التفسير الميسر</button>
        <button type="button" role="tab" aria-selected={activeTab === "progress"} className={cn(activeTab === "progress" && "is-active")} onClick={() => setActiveTab("progress")}>تقدم القراءة</button>
      </div>
      <div className="quran-tafsir-verse"><span className="quran-verse-number">{arabicNumber(activeAyah.number)}</span><p>{activeAyah.text}</p><span className="quran-ayah-label">الآية {activeAyah.number}</span></div>
      {activeTab === "tafsir" && <div className="quran-tafsir-copy"><p>{activeAyah.tafsir || "التفسير غير متاح لهذه الآية الآن."}</p></div>}
      {activeTab === "progress" && <div className="quran-progress-panel"><strong>{task.current} من {task.target} {task.unit} مقروءة اليوم</strong><ProgressBar value={(task.current / Math.max(1, task.target)) * 100} tone="teal" /></div>}
      <div className="quran-tafsir-footer"><audio ref={audioRef} key={activeAyah.audioNumber ?? activeAyah.number} preload="none" src={"https://cdn.islamic.network/quran/audio/128/" + quranReciter + "/" + (activeAyah.audioNumber ?? activeAyah.number) + ".mp3"} /><button type="button" className={cn("quran-batch-complete", batchCompleted && "is-read")} onClick={completeBatch} disabled={batchCompleted}>{batchCompleted ? <><Check size={16} />تم تسجيل هذه الدفعة</> : <><Check size={16} />تمت قراءة الآيات كلها</>}</button>{copied && <span className="quran-copied">?? ??? ?????</span>}</div>
    </Card>}
  </div>;
}
