import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/AppContext';
import { Play, Pause, RotateCcw, Sparkles, CheckCircle2, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';

export const FocusPage: React.FC = () => {
  const { playNotificationSound } = useApp();
  
  // مدة الجلسة المحددة بالدقائق (الافتراضي 25 دقيقة)
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  // الثواني المتبقية
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  // حالة المؤقت (لا يبدأ تلقائياً كما طُلب في المتطلبات الصريحة)
  const [isActive, setIsActive] = useState(false);
  const [completedSessionsCount, setCompletedSessionsCount] = useState(1);

  // تحديث الثواني عند تغيير المدة فقط إذا لم يكن المؤقت يعمل
  const selectDuration = (mins: number) => {
    if (!isActive) {
      setSelectedMinutes(mins);
      setSecondsLeft(mins * 60);
      playNotificationSound('tap');
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      setCompletedSessionsCount(prev => prev + 1);
      playNotificationSound('success');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft, playNotificationSound]);

  const toggleTimer = () => {
    setIsActive(!isActive);
    playNotificationSound('tap');
  };

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(selectedMinutes * 60);
    playNotificationSound('tap');
  };

  const formatDisplay = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = ((selectedMinutes * 60 - secondsLeft) / (selectedMinutes * 60)) * 100;

  return (
    <div className="max-w-xl mx-auto py-10 text-center space-y-9 animate-in fade-in duration-200">
      
      {/* الترويسة الهادئة */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 inline-flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>بيئة التركيز الصامتة • Deep Focus</span>
        </span>
        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          جلسة العمل والتركيز العميق
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          عزل المشتتات والتركيز على هدف واحد. اختر المدة ثم اضغط «ابدأ»
        </p>
      </div>

      {/* خيارات المدة (لا تبدأ تلقائياً) */}
      <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5">
        {[15, 25, 45, 60].map(mins => (
          <button
            key={mins}
            onClick={() => selectDuration(mins)}
            disabled={isActive}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 btn-press ${
              selectedMinutes === mins
                ? 'bg-white dark:bg-[#182033] text-slate-900 dark:text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            } ${isActive ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {mins} دقيقة
          </button>
        ))}
      </div>

      {/* العداد الرقمي الهادئ بدون اهتزاز إطلاقاً */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center">
        {/* حلقة دائرية تملأ مع الوقت بدقة هندسية */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="43"
            className="stroke-slate-100 dark:stroke-slate-850 fill-none"
            strokeWidth="4"
          />
          <circle
            cx="50"
            cy="50"
            r="43"
            className="stroke-teal-600 dark:stroke-teal-400 fill-none transition-all duration-1000 ease-linear"
            strokeWidth="4"
            strokeDasharray={270.17}
            strokeDashoffset={270.17 - (270.17 * progressPercent) / 100}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular-nums font-mono text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-widest">
            {formatDisplay(secondsLeft)}
          </span>
          <span className="text-xs text-slate-400 font-medium mt-2">
            {isActive ? 'الجلسة جارية في سكون 🧘‍♂️' : 'بانتظار انطلاق جلستك'}
          </span>
        </div>
      </div>

      {/* أزرار التحكم بالتركيز */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={toggleTimer}
          className={`px-8 py-3 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-all btn-press ${
            isActive
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_rgba(217,119,6,0.3)]'
              : 'bg-teal-600 hover:bg-teal-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_rgba(0,168,150,0.3)]'
          }`}
        >
          {isActive ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>إيقاف مؤقت</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>ابدأ الجلسة</span>
            </>
          )}
        </button>

        <button
          onClick={resetTimer}
          className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition btn-press"
          title="إعادة ضبط المؤقت"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* جلسات اليوم المنجزة */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>أنجزت <strong className="tabular-nums text-slate-900 dark:text-white">{completedSessionsCount}</strong> جلسات تركيز اليوم</span>
      </div>

    </div>
  );
};
