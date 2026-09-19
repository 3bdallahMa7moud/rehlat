import React from 'react';
import { useApp } from '../../store/AppContext';
import { Play, Pause, ArrowLeft, Clock, Sparkles } from 'lucide-react';

export const StickyActivityBar: React.FC = () => {
  const { activeTask, tasks, pauseTask, resumeTask, openTaskDrawer } = useApp();

  // تنسيق الثواني إلى hh:mm:ss أو mm:ss بدون أي اهتزاز للخط
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // إيجاد المهمة القادمة
  const upcomingTask = tasks.find(t => t.status === 'NOT_STARTED');

  return (
    <div className="sticky bottom-0 z-30 w-full bg-white/90 dark:bg-[#0d1322]/90 border-t border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.04)] py-2.5 px-4 transition-all duration-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* المهمة قيد التنفيذ حالياً */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3">
          {activeTask ? (
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span className="w-4 h-4 rounded-full bg-teal-500/20 absolute animate-ping" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/40">
                    جارية الآن
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs">
                    {activeTask.title}
                  </h4>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>لا توجد مهمة قيد التشغيل حالياً</span>
            </div>
          )}

          {/* المؤقت الرقمي الثابت بدون اهتزاز والأزرار السريعة */}
          {activeTask && (
            <div className="flex items-center gap-2 mr-auto sm:mr-4">
              <span className="tabular-nums font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
                {formatTime(activeTask.elapsedSeconds)}
              </span>

              {activeTask.isTimerRunning ? (
                <button
                  onClick={() => pauseTask(activeTask.id)}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60 text-xs font-semibold flex items-center gap-1.5 transition-all btn-press"
                  title="إيقاف مؤقت"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">إيقاف</span>
                </button>
              ) : (
                <button
                  onClick={() => resumeTask(activeTask.id)}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all btn-press shadow-sm"
                  title="استئناف المؤقت"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">استئناف</span>
                </button>
              )}

              <button
                onClick={() => openTaskDrawer(activeTask)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all btn-press border border-slate-200 dark:border-slate-700"
                title="فتح نافذة المهمة"
              >
                <span>تفاصيل</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* المهمة القادمة */}
        {upcomingTask && (
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">التالية:</span>
            <button
              onClick={() => openTaskDrawer(upcomingTask)}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1.5 bg-slate-100/60 dark:bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800 transition group"
            >
              <span className="truncate max-w-[180px]">{upcomingTask.title}</span>
              <ArrowLeft className="w-3 h-3 text-slate-400 group-hover:-translate-x-0.5 transition" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
