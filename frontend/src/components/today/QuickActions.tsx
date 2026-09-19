import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Play, CheckCheck, Flag, Sparkles, AlertCircle } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const { daySession, startDay, endDay, finishAllTasks } = useApp();
  const [showConfirmAll, setShowConfirmAll] = useState(false);

  return (
    <div className="craft-card p-3.5 sm:p-4 border border-slate-200/80 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 shadow-sm">

      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500" />
          <span>الإجراءات اليومية:</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">

        {/* زر بدء يومي */}
        {!daySession.isDayStarted ? (
          <button
            onClick={startDay}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_6px_rgba(0,168,150,0.25)] flex items-center justify-center gap-1.5 transition-all btn-press"
            title="بدء اليوم"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>بدء اليوم</span>
          </button>
        ) : (
          <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/60 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            اليوم نشط
          </span>
        )}

        {/* زر إنهاء اليوم */}
        <button
          onClick={endDay}
          className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all btn-press"
          title="إنهاء اليوم ومراجعة الستريك"
        >
          <Flag className="w-3.5 h-3.5 text-slate-400" />
          <span>إنهاء اليوم</span>
        </button>

        {/* زر إنهاء جميع المهام */}
        {!showConfirmAll ? (
          <button
            onClick={() => setShowConfirmAll(true)}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium flex items-center justify-center gap-1.5 transition-all btn-press"
            title="إتمام كافة المهام بعلامة كاملة"
          >
            <CheckCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>إنهاء كل المهام</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-1 rounded-xl animate-in fade-in duration-150">
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 px-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> تأكيد إتمام الكل؟
            </span>
            <button
              onClick={() => {
                finishAllTasks();
                setShowConfirmAll(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition-all btn-press"
            >
              نعم، إتمام
            </button>
            <button
              onClick={() => setShowConfirmAll(false)}
              className="px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[11px] transition"
            >
              إلغاء
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
