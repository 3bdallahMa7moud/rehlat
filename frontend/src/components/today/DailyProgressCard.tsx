import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { HelpCircle, CheckCircle, Flame, Trophy, Sparkles, TrendingUp, Info } from 'lucide-react';

export const DailyProgressCard: React.FC = () => {
  const { daySession, tasks, currentUser } = useApp();
  const [showInfoModal, setShowInfoModal] = useState(false);

  const totalPoints = tasks.reduce((sum, t) => sum + t.fullPoints, 0);
  const earnedPoints = tasks.reduce((sum, t) => sum + t.earnedPoints, 0);
  const isTargetAchieved = daySession.completionPercentage >= daySession.successThresholdPercent;

  return (
    <div className="craft-card p-6 sm:p-7 border border-slate-200/80 dark:border-white/5 space-y-6">
      
      {/* رأس بطاقة التقدم */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                مؤشر التقدم اليومي
              </h3>
              <button
                onClick={() => setShowInfoModal(!showInfoModal)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-0.5"
                title="شرح طريقة احتساب التقدم"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              حساب تفصيلي مبني على نقاط المهام المسجلة لليوم
            </p>
          </div>
        </div>

        {/* شارة النجاح أو قيد التقدم */}
        {isTargetAchieved ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>يوم ناجح • الـ Streak محمي 🛡️</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>الهدف: 90% لتثبيت اليوم</span>
          </span>
        )}
      </div>

      {/* شريط التقدم الهندسي الدقيق */}
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2.5">
            <span className="tabular-nums text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {daySession.completionPercentage}%
            </span>
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              ({earnedPoints} من أصل {totalPoints} نقطة)
            </span>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>حد الأمان:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">90.00%</span>
          </div>
        </div>

        {/* مسار المقياس */}
        <div className="relative w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isTargetAchieved 
                ? 'bg-emerald-500 dark:bg-emerald-400 shadow-sm' 
                : 'bg-gradient-to-l from-teal-500 to-indigo-600'
            }`}
            style={{ width: `${Math.min(100, daySession.completionPercentage)}%` }}
          />

          {/* خط علامة الـ 90% الدقيق */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
            style={{ right: '90%' }} // RTL: 90% starts from right
            title="علامة الـ 90% المطلوبة للنجاح"
          />
        </div>
      </div>

      {/* نافذة الشرح المفسرة لما يعنيه التقدم اليومي */}
      {showInfoModal && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
            <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>كيف يُحسب التقدم اليومي؟</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            يُحسب المؤشر بنسبة النقاط المكتسبة من مجموع نقاط مهام اليوم (إنجاز كامل = علامة كاملة، إنجاز جزئي = نصف العلامة). تحقيق <strong>90% أو أكثر</strong> يحمي الـ Streak الأسبوعي ويعزز رتبتك في لوحة الشرف.
          </p>
        </div>
      )}

      {/* مصفوفة المؤشرات السريعة بنظام الفواصل النظيفة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5">
          <span className="text-[11px] text-slate-400 block mb-0.5">مهام مكتملة</span>
          <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
            {tasks.filter(t => t.status === 'COMPLETED_FULL').length} / {tasks.length}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5">
          <span className="text-[11px] text-slate-400 block mb-0.5">إنجاز جزئي</span>
          <span className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {tasks.filter(t => t.status === 'COMPLETED_PARTIAL').length} مهام
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5">
          <span className="text-[11px] text-slate-400 block mb-0.5">الوقت الفعلي المسجل</span>
          <span className="text-base font-bold text-teal-700 dark:text-teal-400 tabular-nums font-mono">
            {Math.round(tasks.reduce((sum, t) => sum + t.elapsedSeconds, 0) / 60)} دقيقة
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5">
          <span className="text-[11px] text-slate-400 block mb-0.5">الـ Streak المستمر</span>
          <span className="text-base font-bold text-amber-700 dark:text-amber-400 tabular-nums">
            {currentUser?.currentStreakDays || 0} أيام 🔥
          </span>
        </div>
      </div>

    </div>
  );
};
