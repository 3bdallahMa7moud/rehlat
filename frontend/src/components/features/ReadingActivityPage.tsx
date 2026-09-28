"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Check,
  FileText,
  Flame,
  LoaderCircle,
  Pause,
  Play,
  Settings2,
  Upload,
} from "lucide-react";
import { Badge, Button, Card, Dialog, EmptyState, Input, ProgressBar } from "@/components/ui";
import { getBookFile, saveBookFile } from "@/lib/book-file-storage";
import { cn } from "@/lib/cn";
import { getProjectDateKey } from "@/lib/date-time";
import { getTaskDetailElapsedSeconds } from "@/lib/task-details";
import { useDemo } from "@/state/DemoContext";
import styles from "./ReadingActivityPage.module.css";

function numericDetail(details: Record<string, string | number | boolean | string[]>, key: string, fallback = 0) {
  return typeof details[key] === "number" ? Number(details[key]) : fallback;
}

function stringDetail(details: Record<string, string | number | boolean | string[]>, key: string, fallback = "") {
  return typeof details[key] === "string" ? String(details[key]) : fallback;
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatReadingTime(totalSeconds: number) {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  if (minutes < 1) return "أقل من دقيقة";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return String(minutes) + " دقيقة";
  return rest ? String(hours) + " س و" + String(rest) + " د" : String(hours) + " ساعة";
}

function fallbackBookName(supportingText?: string) {
  const cleaned = supportingText?.replace(/^كتاب:\s*/, "").trim();
  return cleaned || "كتابي الحالي";
}

export function ReadingActivityPage({ taskId }: { taskId: string }) {
  const {
    tasks,
    taskStreaks,
    startTaskDetail,
    pauseTaskDetail,
    updateTaskProgress,
    updateTaskDetails,
    pushToast,
  } = useDemo();
  const task = tasks.find((item) => item.id === taskId);
  const [tick, setTick] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [fileStatus, setFileStatus] = useState<"idle" | "reading" | "success" | "error">("idle");
  const [fileStatusMessage, setFileStatusMessage] = useState("");
  const [startPageDraft, setStartPageDraft] = useState("");
  const [endPageDraft, setEndPageDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [validationError, setValidationError] = useState("");
  const bookFileInputRef = useRef<HTMLInputElement | null>(null);

  const detail = task?.detailItems?.[0];
  const isRunning = detail?.status === "running";

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  useEffect(() => {
    let active = true;
    void getBookFile(taskId).then((storedFile) => {
      if (!active || !storedFile) return;
      setFileUrl(URL.createObjectURL(storedFile.blob));
      setFileStatus("success");
      setFileStatusMessage("الكتاب محفوظ على هذا المتصفح وجاهز للقراءة.");
    }).catch(() => {
      if (!active) return;
      setFileStatus("error");
      setFileStatusMessage("تعذر استعادة ملف الكتاب المحفوظ على هذا المتصفح.");
    });
    return () => {
      active = false;
    };
  }, [taskId]);

  const streak = taskStreaks.find((item) => item.taskId === taskId);
  const weekDays = useMemo(() => {
    const now = new Date();
    const today = getProjectDateKey(now);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getTime() - (6 - index) * 86_400_000);
      const key = getProjectDateKey(date);
      const record = streak?.history.find((item) => item.date === key);
      const label = new Intl.DateTimeFormat("ar-EG", { weekday: "narrow" }).format(date);
      return { key, label, status: record?.status ?? (key === today ? "today" : "unsuccessful"), isToday: key === today };
    });
  }, [streak?.history]);

  if (!task || !detail) {
    return <EmptyState title="مهمة القراءة غير موجودة" description="ربما حُذفت المهمة أو لم تعد متاحة." action={<Link className={styles.inlineLink} href="/tasks">العودة إلى المهام</Link>} />;
  }

  const details = task.details ?? {};
  const readingConfig = task.config?.type === "reading" ? task.config : null;
  const bookName = stringDetail(details, "bookName", stringDetail(details, "book", readingConfig?.bookName || fallbackBookName(task.supportingText)));
  const author = stringDetail(details, "bookAuthor", readingConfig?.author ?? "");
  const lastPage = Math.max(0, numericDetail(details, "bookPage", Math.max(0, (readingConfig?.startPage ?? 1) - 1)));
  const totalPages = Math.max(0, numericDetail(details, "bookTotalPages", readingConfig?.totalPages ?? 0));
  const sessionStartPage = Math.max(0, numericDetail(details, "readingSessionStartPage", lastPage));
  const bookmarkText = stringDetail(details, "bookmark");
  const fileName = stringDetail(details, "bookFileName");
  const elapsedSeconds = Math.max(
    Math.round(Math.max(0, task.actualMinutes) * 60),
    getTaskDetailElapsedSeconds(detail, tick),
  );
  const dailyPercent = task.target > 0 ? (task.current / task.target) * 100 : 0;
  const bookPercent = totalPages > 0 ? (lastPage / totalPages) * 100 : 0;
  const isCompleted = task.status === "completed";

  const beginSession = () => {
    setFinishing(false);
    setValidationError("");
    startTaskDetail(task.id, detail.id);
    updateTaskDetails(task.id, { readingSessionStartPage: lastPage > 0 ? lastPage + 1 : 1 });
    if (fileUrl) {
      setPreviewOpen(true);
      window.setTimeout(() => document.getElementById("book-reader")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    } else if (fileName) {
      setFileStatus("error");
      setFileStatusMessage("اختر ملف الكتاب مرة واحدة حتى نتمكن من عرضه وحفظه على هذا المتصفح.");
      setSettingsOpen(true);
      bookFileInputRef.current?.click();
    }
  };

  const openFinishForm = () => {
    if (isRunning) pauseTaskDetail(task.id, detail.id);
    const suggestedStartPage = Math.max(1, sessionStartPage || (lastPage > 0 ? lastPage + 1 : 1));
    setStartPageDraft(String(suggestedStartPage));
    setEndPageDraft("");
    setNoteDraft(bookmarkText);
    setValidationError("");
    setFinishing(true);
  };

  const saveSession = () => {
    const startPage = Number(startPageDraft);
    const endPage = Number(endPageDraft);
    if (!Number.isInteger(startPage) || startPage < 1) {
      setValidationError("أدخل رقم صفحة بداية صحيحًا.");
      return;
    }
    if (!Number.isInteger(endPage) || endPage < startPage) {
      setValidationError("صفحة الوصول يجب أن تساوي صفحة البداية أو تأتي بعدها.");
      return;
    }
    if (totalPages > 0 && (startPage > totalPages || endPage > totalPages)) {
      setValidationError("رقم الصفحة أكبر من عدد صفحات الكتاب.");
      return;
    }
    const pagesRead = endPage - startPage + 1;
    const nextProgress = Math.min(task.target, task.current + pagesRead);
    updateTaskProgress(task.id, nextProgress);
    updateTaskDetails(task.id, {
      bookPage: Math.round(endPage),
      bookmark: noteDraft.trim(),
      readingSessionStartPage: Math.round(endPage),
    });
    setFinishing(false);
    setValidationError("");
    pushToast({
      tone: nextProgress >= task.target ? "success" : "info",
      title: nextProgress >= task.target ? "اكتمل هدف القراءة اليوم" : "تم حفظ جلسة القراءة",
      body: "قرأت " + String(pagesRead) + " صفحة، وتوقفت عند الصفحة " + String(Math.round(endPage)) + ".",
    });
  };

  const chooseBookFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(URL.createObjectURL(file));
    setPreviewOpen(true);
    setFileStatus("reading");
    setFileStatusMessage("جارٍ قراءة بيانات الكتاب…");
    const storageResult = saveBookFile(task.id, file).then(() => true).catch(() => false);

    const nameFromFile = file.name
      .replace(/\\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\\s+/g, " ")
      .trim();
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      const storedLocally = await storageResult;
      updateTaskDetails(task.id, {
        bookFileName: file.name,
        bookName: nameFromFile || bookName,
        bookTotalPages: 0,
      });
      setFileStatus(storedLocally ? "success" : "error");
      setFileStatusMessage(storedLocally
        ? "تم حفظ الكتاب على هذا المتصفح. الملفات النصية لا تحتوي على عدد صفحات ثابت."
        : "الكتاب متاح الآن، لكن تعذر حفظه على هذا المتصفح.");
      return;
    }

    try {
      const [{ PDFDocument }, bytes, storedLocally] = await Promise.all([
        import("pdf-lib"),
        file.arrayBuffer(),
        storageResult,
      ]);
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
      const detectedTitle = pdf.getTitle()?.trim();
      const detectedAuthor = pdf.getAuthor()?.trim();
      const detectedPages = pdf.getPageCount();
      updateTaskDetails(task.id, {
        bookFileName: file.name,
        bookName: detectedTitle || nameFromFile || bookName,
        bookTotalPages: detectedPages,
        ...(detectedAuthor ? { bookAuthor: detectedAuthor } : {}),
      });
      setFileStatus("success");
      setFileStatusMessage(
        "تم التعرف على " + String(detectedPages) + " صفحة"
        + (detectedTitle ? " واسم الكتاب" : "")
        + (detectedAuthor ? " واسم المؤلف" : "")
        + (storedLocally ? "، وحُفظ الكتاب على هذا المتصفح." : ". تعذر حفظ الملف على هذا المتصفح."),
      );
      pushToast({
        tone: "success",
        title: "تمت قراءة بيانات الكتاب",
        body: String(detectedPages) + " صفحة" + (detectedAuthor ? " · " + detectedAuthor : ""),
      });
    } catch {
      updateTaskDetails(task.id, {
        bookFileName: file.name,
        bookName: nameFromFile || bookName,
      });
      setFileStatus("error");
      setFileStatusMessage("تعذر قراءة بيانات هذا الملف تلقائيًا. يمكنك إدخال المؤلف وعدد الصفحات يدويًا.");
      pushToast({
        tone: "warning",
        title: "لم نتمكن من قراءة بيانات PDF",
        body: "تم اختيار الملف، ويمكنك استكمال بياناته يدويًا.",
      });
    }
  };

  return <div className={styles.page}>
    <input
      ref={bookFileInputRef}
      className={styles.hiddenFileInput}
      type="file"
      accept=".pdf,.txt,text/plain,application/pdf"
      onChange={chooseBookFile}
      tabIndex={-1}
      aria-hidden="true"
    />
    <div className={styles.breadcrumbRow}>
      <Link className={styles.backLink} href="/tasks"><ArrowRight size={17} />كل المهام</Link>
      <span>قراءة الكتاب</span>
    </div>

    <header className={styles.bookHeader}>
      <div className={styles.cover} aria-hidden="true"><BookOpen size={34} /></div>
      <div className={styles.bookCopy}>
        <span className={styles.kicker}>مهمة اليوم</span>
        <h1>{bookName}</h1>
        <p>{author || "أضف اسم المؤلف من إعدادات الكتاب"}</p>
      </div>
      <div className={styles.headerActions}>
        <Badge tone="warning"><Flame size={15} />{streak?.current ?? 0} أيام</Badge>
        {fileUrl && <Button variant="outline" onClick={() => setPreviewOpen((value) => !value)}><FileText size={17} />{previewOpen ? "إخفاء الكتاب" : "فتح الكتاب"}</Button>}
        <Button variant="outline" onClick={() => setSettingsOpen(true)}><Settings2 size={17} />إعدادات الكتاب</Button>
      </div>
    </header>

    {fileUrl && previewOpen && <section id="book-reader" className={styles.readerPanel} aria-label="معاينة الكتاب">
      <div className={styles.readerHeading}><div><FileText size={19} /><strong>{fileName}</strong></div><Button size="sm" variant="ghost" onClick={() => setPreviewOpen(false)}>إغلاق المعاينة</Button></div>
      <iframe title={"معاينة " + fileName} src={fileUrl} />
    </section>}

    <div className={styles.layout}>
      <Card className={styles.sessionCard} padding="lg">
        <div className={styles.sessionHeading}>
          <div><span>جلسة القراءة</span><h2>{isCompleted ? "أحسنت، أنهيت هدف اليوم" : finishing ? "احفظ ما قرأته" : isRunning ? "أنت تقرأ الآن" : "جاهز للقراءة؟"}</h2></div>
          <Badge tone={isCompleted ? "success" : isRunning ? "primary" : "teal"}>{isCompleted ? "مكتمل" : isRunning ? "جلسة جارية" : task.status === "paused" ? "متوقفة مؤقتًا" : "جاهز"}</Badge>
        </div>

        {isCompleted ? <div className={styles.sessionBody}>
          <span className={cn(styles.sessionIcon, styles.successIcon)}><Check size={34} /></span>
          <strong className={styles.timer}>{task.current} صفحات</strong>
          <p>اكتمل هدفك اليومي. توقفت في الكتاب عند الصفحة <strong>{lastPage}</strong>.</p>
          <Link className={styles.primaryLink} href="/tasks">العودة إلى مهام اليوم</Link>
        </div> : finishing ? <div className={styles.finishForm}>
          <p>سجّل الصفحة التي وصلت إليها لنحسب تقدّم اليوم ونحفظ موضعك في الكتاب.</p>
          <div className={styles.pageFields}>
            <Input type="number" min={1} max={totalPages || undefined} label="بدأت من صفحة" value={startPageDraft} onChange={(event) => { setStartPageDraft(event.target.value); setValidationError(""); }} autoFocus />
            <Input type="number" min={Math.max(1, Number(startPageDraft) || 1)} max={totalPages || undefined} label="وصلت إلى صفحة" value={endPageDraft} onChange={(event) => { setEndPageDraft(event.target.value); setValidationError(""); }} />
          </div>
          <label className="field">
            <span className="field-label">علامة توقف أو ملاحظة اختيارية</span>
            <textarea className="input" rows={3} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="مثال: أكمل من بداية الفصل الثالث…" />
          </label>
          {validationError && <p className={styles.validation} role="alert">{validationError}</p>}
          <div className={styles.finishActions}>
            <Button onClick={saveSession}><Check size={18} />حفظ الجلسة</Button>
            <Button variant="ghost" onClick={() => setFinishing(false)}>إلغاء</Button>
          </div>
        </div> : <div className={styles.sessionBody}>
          <span className={styles.sessionIcon}>{isRunning ? <BookOpen size={34} /> : <BookMarked size={34} />}</span>
          <div className={styles.goal}>
            <span>{isRunning ? "وقت القراءة" : "ابدأ من"}</span>
            <strong>{isRunning ? <span className={styles.timer} dir="ltr">{formatDuration(elapsedSeconds)}</span> : "الصفحة " + String(lastPage > 0 ? lastPage + 1 : 1)}</strong>
          </div>
          <p>{isRunning ? "اقرأ بهدوء، والمؤقت يحفظ وقتك تلقائيًا." : bookmarkText || "جلسة قصيرة ومنتظمة أفضل من انتظار الوقت المثالي."}</p>
          {fileName && !fileUrl && <button type="button" className={styles.missingBookAction} onClick={() => bookFileInputRef.current?.click()}><Upload size={18} />اختر ملف الكتاب لإظهاره</button>}
          {isRunning ? <div className={styles.runningActions}>
            <Button onClick={openFinishForm}><Check size={18} />إنهاء الجلسة وحفظها</Button>
            <Button variant="outline" onClick={() => pauseTaskDetail(task.id, detail.id)}><Pause size={18} />إيقاف مؤقت</Button>
          </div> : <Button size="lg" onClick={beginSession}><Play size={19} />{task.status === "paused" ? "استئناف جلسة القراءة" : "ابدأ جلسة القراءة"}</Button>}
        </div>}
      </Card>

      <aside className={styles.sidebar}>
        <Card className={styles.sideCard}>
          <div className={styles.sideHeading}><div><span>هدف اليوم</span><strong>{task.current} من {task.target} {task.unit}</strong></div><b>{Math.min(100, Math.round(dailyPercent))}%</b></div>
          <ProgressBar value={dailyPercent} tone="primary" />
          <p>{task.current >= task.target ? "أنجزت هدف اليوم بالكامل." : "باقي " + String(Math.max(0, task.target - task.current)) + " " + task.unit + " لإكمال الهدف."}</p>
        </Card>

        <Card className={styles.sideCard}>
          <div className={styles.sideHeading}><div><span>تقدّم الكتاب</span><strong>الصفحة {lastPage || 0}{totalPages ? " من " + String(totalPages) : ""}</strong></div>{totalPages > 0 && <b>{Math.min(100, Math.round(bookPercent))}%</b>}</div>
          {totalPages > 0 ? <ProgressBar value={bookPercent} tone="teal" /> : <button type="button" className={styles.addTotalPages} onClick={() => setSettingsOpen(true)}>أضف عدد صفحات الكتاب لعرض النسبة</button>}
        </Card>

        <Card className={styles.sideCard}>
          <div className={styles.sideHeading}><div><span>الاستمرارية</span><strong>{streak?.current ?? 0} أيام متتالية</strong></div><Flame size={24} /></div>
          <div className={styles.week} aria-label="نشاط القراءة خلال آخر سبعة أيام">
            {weekDays.map((day) => <div key={day.key} className={cn(styles.weekDay, day.status === "successful" && styles.weekDaySuccess, day.status === "partial" && styles.weekDayPartial, day.isToday && styles.weekDayToday)} title={day.key}><span>{day.label}</span><b>{day.status === "successful" ? <Check size={14} /> : day.status === "partial" ? "•" : day.isToday ? "اليوم" : "–"}</b></div>)}
          </div>
        </Card>

        <Card className={styles.sideCard}>
          <div className={styles.stats}>
            <div><span>وقت القراءة اليوم</span><strong>{formatReadingTime(elapsedSeconds)}</strong></div>
            <div><span>صفحات اليوم</span><strong>{task.current} صفحة</strong></div>
          </div>
        </Card>
      </aside>
    </div>

    <Dialog
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      title="إعدادات الكتاب"
      description="ارفع ملف PDF وسنحاول ملء اسم الكتاب والمؤلف وعدد الصفحات تلقائيًا."
      footer={<Button onClick={() => setSettingsOpen(false)}>تم</Button>}
    >
      <div className={styles.settingsForm}>
        <Input label="اسم الكتاب" value={bookName} onChange={(event) => updateTaskDetails(task.id, { bookName: event.target.value })} />
        <Input label="اسم المؤلف" value={author} placeholder="اختياري" onChange={(event) => updateTaskDetails(task.id, { bookAuthor: event.target.value })} />
        <Input type="number" min={0} label="عدد صفحات الكتاب" value={totalPages || ""} placeholder="مثال: 320" onChange={(event) => updateTaskDetails(task.id, { bookTotalPages: Math.max(0, Number(event.target.value)) })} />
        <button type="button" className={styles.uploadControl} onClick={() => bookFileInputRef.current?.click()} disabled={fileStatus === "reading"}>
          {fileStatus === "reading" ? <LoaderCircle className="animate-spin" size={20} /> : <Upload size={20} />}
          <span><strong>{fileStatus === "reading" ? "جارٍ قراءة بيانات الكتاب…" : fileName || "اختر نسخة من الكتاب"}</strong><small>PDF: استخراج الاسم والمؤلف والصفحات تلقائيًا</small></span>
        </button>
        {fileStatusMessage && <p className={cn(styles.fileStatus, fileStatus === "error" && styles.fileStatusError)} role={fileStatus === "error" ? "alert" : "status"}>{fileStatusMessage}</p>}
        {fileName && <p className={styles.fileHint}>الملف محفوظ محليًا على هذا المتصفح ولا يُرفع إلى الخادم.</p>}
      </div>
    </Dialog>
  </div>;
}
