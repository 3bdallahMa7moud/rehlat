"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, Bookmark, ChevronLeft, Leaf, Search, ScrollText } from "lucide-react";
import { Button, Card, ProgressBar } from "@/components/ui";
import { QuranBatchReader, quranSurahNames } from "@/components/features/QuranBatchReader";
import { useDemo } from "@/state/DemoContext";

export function QuranReadingPage({ taskId }: { taskId?: string }) {
  const { tasks, updateTaskDetails, updateTaskProgress } = useDemo();
  const task = useMemo(() => taskId ? tasks.find((item) => item.id === taskId && item.type === "quran") : tasks.find((item) => item.type === "quran"), [tasks, taskId]);
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState(false);
  const [requestedSurah, setRequestedSurah] = useState<number | undefined>();
  const [readerReset, setReaderReset] = useState(0);
  const details = (() => {
    const currentDetails = task?.details ?? {};
    if (currentDetails.quranBookmarked !== true || !Number.isFinite(currentDetails.quranBookmarkedAyah)) return currentDetails;
    return {
      ...currentDetails,
      quranSurah: Number.isFinite(currentDetails.quranBookmarkedSurah) ? currentDetails.quranBookmarkedSurah : currentDetails.quranSurah,
      quranAyahStart: currentDetails.quranBookmarkedAyah,
    };
  })();
  const progress = task ? Math.min(100, Math.round((task.current / Math.max(1, task.target)) * 100)) : 0;
  const savedAyah = typeof details.quranAyahStart === "number" ? details.quranAyahStart : 1;
  const savedSurah = typeof details.quranSurah === "number" ? details.quranSurah : (task?.supportingText ?? "").includes("الكهف") ? 18 : 1;
  const surahName = quranSurahNames[savedSurah - 1] ?? "القرآن الكريم";
  const goToReader = () => document.getElementById("quran-reader-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goToSavedPosition = () => {
    setRequestedSurah(savedSurah);
    setReaderReset((value) => value + 1);
    window.setTimeout(goToReader, 0);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = search.trim().replace(/^سورة\s*/, "");
    const numeric = Number(term);
    const next = Number.isInteger(numeric) && numeric >= 1 && numeric <= 114 ? numeric : quranSurahNames.findIndex((name) => name.includes(term) && term.length > 1) + 1;
    if (next < 1 || next > 114) { setSearchError(true); return; }
    setSearchError(false);
    setRequestedSurah(next);
    goToReader();
  };

  return <div className="quran-page">
    <header className="quran-page-hero">
      <div className="quran-page-hero-title"><span className="quran-page-hero-icon"><BookOpen size={28} /></span><div><h1>القرآن الكريم</h1><p>صفحة القراءة والتدبر والتفسير</p></div></div>
      <form className="quran-page-search" onSubmit={submitSearch} role="search"><Search size={18} /><input type="search" aria-label="البحث عن سورة" placeholder="ابحث عن سورة أو رقمها..." value={search} onChange={(event) => { setSearch(event.target.value); setSearchError(false); }} /><button type="submit">بحث</button>{searchError && <span role="alert">لم يتم العثور على السورة</span>}</form>
    </header>
    {!task ? <Card className="quran-empty"><BookOpen size={28} /><h2>لا توجد مهمة قرآن مضافة</h2><p>أضف مهمة من نوع القرآن لتسجيل الورد والتقدم هنا.</p><Link href="/tasks"><Button>عرض المهام</Button></Link></Card> : <div className="quran-dashboard-grid">
      <aside className="quran-insights" aria-label="ملخص ورد القرآن">
        <Card className="quran-insight-card quran-progress-card" padding="sm">
          <div className="quran-card-title"><h2>تقدم القراءة</h2><BarChart3 size={20} /></div>
          <div className="quran-progress-body"><div><span>قراءة اليوم</span><strong>{task.current} من {task.target} {task.unit}</strong></div><div className="quran-progress-ring" style={{ background: "conic-gradient(var(--teal) " + progress + "%, var(--surface-raised) 0)" }}><strong>{progress}<small>%</small></strong></div></div>
          <ProgressBar value={progress} tone="teal" />
          <div className="quran-insight-foot"><span>الهدف اليومي</span><strong>متبقي {Math.max(0, task.target - task.current)} {task.unit}</strong></div>
        </Card>
        <Card className="quran-insight-card quran-today-card" padding="sm">
          <div className="quran-card-title"><h2>ورد اليوم</h2><BookOpen size={20} /></div>
          <strong className="quran-journey-surah">سورة {surahName}</strong>
          <p>تابع من الآية {savedAyah}</p>
          <div className="quran-inline-progress"><ProgressBar value={progress} tone="teal" /><span>{progress}%</span></div>
          <Button onClick={goToReader}><ChevronLeft size={17} />متابعة القراءة</Button>
        </Card>
        <Card className="quran-insight-card quran-last-position" padding="sm">
          <div className="quran-card-title"><h2>آخر موضع</h2><Bookmark size={20} /></div>
          <div className="quran-position-preview"><span><ScrollText size={25} /></span><div><strong>سورة {surahName}</strong><p>الآية {savedAyah} · موضعك المحفوظ</p></div></div>
          <Button variant="outline" onClick={goToSavedPosition}>الانتقال إلى آخر موضع <ChevronLeft size={16} /></Button>
        </Card>
        <Card className="quran-reflection-card" padding="sm"><div className="quran-reflection-title"><Leaf size={17} /><strong>تأمل اليوم</strong></div><p>اقرأ على مهل، وتأمل معنى الآية في لوحة التفسير أثناء وردك.</p></Card>
      </aside>
      <div className="quran-reader-column"><QuranBatchReader key={`${requestedSurah ?? savedSurah}-${readerReset}`} initialSurahOverride={requestedSurah} task={task} onProgress={(value) => updateTaskProgress(task.id, value)} onDetails={(next) => updateTaskDetails(task.id, next)} /></div>
    </div>}
  </div>;
}
