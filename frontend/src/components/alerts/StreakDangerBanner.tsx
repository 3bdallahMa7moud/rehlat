import React from 'react';
import { useApp } from '../../store/AppContext';
import { Flame, AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';

export const StreakDangerBanner: React.FC = () => {
  const { daySession, tasks, openTaskDrawer } = useApp();

  // لا يظهر التحذير إذا حقق المستخدم 90% فأكثر (الستريك في أمان تام)
  if (daySession.completionPercentage >= daySession.successThresholdPercent) {
    return null;
  }

  // إيجاد أول مهمة غير مكتملة لتوجيهه إليها مباشرة
  const firstIncompleteTask = tasks.find(t => t.status !== 'COMPLETED_FULL');
  if (!firstIncompleteTask) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/50 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-4 sm:p-5 shadow-sm transition-colors duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 text-amber-700 dark:text-amber-400">
            <Flame className="w-5 h-5 fill-amber-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                حماية الـ Streak اليومي
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 tabular-nums">
                متبقي {(daySession.successThresholdPercent - daySession.completionPercentage).toFixed(0)}% للوصول إلى 90%
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              إنجازك الحالي <span className="font-bold tabular-nums text-slate-800 dark:text-slate-100">{daySession.completionPercentage}%</span>. يتطلب تثبيت الستريك إتمام المهام لتتجاوز عتبة الـ 90.00%.
            </p>
          </div>
        </div>

        {/* زر التوجيه المباشر للمهمة الناقصة */}
        <button
          onClick={() => openTaskDrawer(firstIncompleteTask)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_6px_rgba(217,119,6,0.25)] flex items-center justify-center gap-2 transition-all btn-press shrink-0"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>متابعة: {firstIncompleteTask.title}</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

      </div>
    </div>
  );
};
