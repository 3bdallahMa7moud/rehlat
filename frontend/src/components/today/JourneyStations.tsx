import React from 'react';
import { useApp } from '../../store/AppContext';
import { INITIAL_CATEGORIES } from '../../store/mockData';
import type { TaskItem, CategorySlug } from '../../types';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  Sparkles, 
  Check, 
  Minus 
} from 'lucide-react';

export const JourneyStations: React.FC = () => {
  const { 
    tasks, 
    startTask, 
    pauseTask, 
    openTaskDrawer, 
    completeTask 
  } = useApp();

  const [activeFilter, setActiveFilter] = React.useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    return `${mins} د`;
  };

  return (
    <div className="space-y-6">
      {/* ترويسة المحطات وفلترة العرض الذكية */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              محطات الرحلة اليومية
            </h3>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              9 مجالات
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            توزيع متوازن لبناء شخصية متكاملة روحياً، فكرياً، وبدنياً
          </p>
        </div>

        {/* أزرار الفلترة السريعة (الكل / المتبقية / المكتملة) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 text-xs font-semibold">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'ALL'
                ? 'bg-white dark:bg-[#182033] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            كل المهام ({tasks.length})
          </button>

          <button
            onClick={() => setActiveFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'PENDING'
                ? 'bg-white dark:bg-[#182033] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            المتبقية ({tasks.filter(t => t.status !== 'COMPLETED_FULL').length})
          </button>

          <button
            onClick={() => setActiveFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'COMPLETED'
                ? 'bg-white dark:bg-[#182033] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            المنجزة ({tasks.filter(t => t.status === 'COMPLETED_FULL').length})
          </button>
        </div>
      </div>

      {/* شبكة محطات الرحلة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {INITIAL_CATEGORIES.map(cat => {
          let categoryTasks = tasks.filter(t => t.categoryId === cat.slug);
          
          if (activeFilter === 'PENDING') {
            categoryTasks = categoryTasks.filter(t => t.status !== 'COMPLETED_FULL');
          } else if (activeFilter === 'COMPLETED') {
            categoryTasks = categoryTasks.filter(t => t.status === 'COMPLETED_FULL');
          }

          if (categoryTasks.length === 0 && activeFilter !== 'ALL') return null;

          const completedCount = categoryTasks.filter(t => t.status === 'COMPLETED_FULL').length;

          return (
            <div
              key={cat.id}
              className="craft-card p-5 border border-slate-200/80 dark:border-white/5 flex flex-col justify-between gap-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
            >
              {/* ترويسة المحطة */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                    {cat.icon}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {cat.nameAr}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {categoryTasks.length} {categoryTasks.length === 1 ? 'مهمة' : 'مهام'}
                    </span>
                  </div>
                </div>

                {/* نسبة الإنجاز في المحطة */}
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums">
                  {completedCount}/{categoryTasks.length} مكتمل
                </span>
              </div>

              {/* قائمة مهام المحطة بنمط الفواصل النظيفة بدون كروت متداخلة */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
                {categoryTasks.map(task => {
                  const isRunning = task.isTimerRunning;

                  return (
                    <div
                      key={task.id}
                      className={`py-3 px-2 rounded-xl transition-all duration-150 ${
                        isRunning
                          ? 'bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <button
                          onClick={() => openTaskDrawer(task)}
                          className="text-right flex-1 hover:text-teal-600 dark:hover:text-teal-400 transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold ${
                              task.status === 'COMPLETED_FULL'
                                ? 'text-slate-400 dark:text-slate-500 line-through'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}>
                              {task.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {task.subtitle}
                          </p>
                        </button>

                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums shrink-0">
                          {task.earnedPoints}/{task.fullPoints} ن
                        </span>
                      </div>

                      {/* شريط مراحل المهمة وأزرار التحكم */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/50 text-xs">
                        
                        {/* مؤشرات تقدم الستريك الثلاثي */}
                        <div className="flex items-center gap-1.5" title="مراحل إنجاز المهمة">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              task.status !== 'NOT_STARTED' ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                          <span
                            className={`w-2 h-2 rounded-full ${
                              task.status === 'COMPLETED_PARTIAL' || task.status === 'COMPLETED_FULL'
                                ? 'bg-teal-500'
                                : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                          <span
                            className={`w-2 h-2 rounded-full ${
                              task.status === 'COMPLETED_FULL' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          />
                        </div>

                        {/* أزرار التحكم الفورية */}
                        <div className="flex items-center gap-1.5">
                          {task.elapsedSeconds > 0 && (
                            <span className="text-[11px] tabular-nums font-mono text-slate-400 flex items-center gap-1 ml-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formatSeconds(task.elapsedSeconds)}
                            </span>
                          )}

                          {task.status !== 'COMPLETED_FULL' && (
                            <>
                              {isRunning ? (
                                <button
                                  onClick={() => pauseTask(task.id)}
                                  className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/60 transition btn-press"
                                  title="إيقاف مؤقت"
                                >
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => startTask(task.id)}
                                  className="p-1 rounded-md bg-teal-600 text-white hover:bg-teal-500 transition btn-press shadow-sm"
                                  title="بدء المؤقت"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                              )}

                              <button
                                onClick={() => completeTask(task.id, 'FULL')}
                                className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition btn-press"
                                title="إنجاز كامل (100% النقاط)"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => openTaskDrawer(task)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                            title="عرض التفاصيل"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
