import React from 'react';
import { useApp } from '../../store/AppContext';
import { Radio, Sparkles, Send, Clock } from 'lucide-react';

export const WhatIsHappeningNow: React.FC = () => {
  const { activities, sendCheer, currentUser } = useApp();

  return (
    <div className="craft-card p-5 border border-slate-200/80 dark:border-white/5 flex flex-col h-full shadow-sm">
      
      {/* الترويسة */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            موجز النشاط اللحظي
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
          تزامن فوري
        </span>
      </div>

      {/* قائمة الأحداث الحية مع Scroll ناعم */}
      <div className="space-y-2.5 overflow-y-auto max-h-80 pr-1 pl-1">
        {activities.map(act => {
          let actionLabel = 'بدأ:';
          let actionColor = 'text-slate-600 dark:text-slate-300';

          if (act.type === 'PAUSED') {
            actionLabel = 'أوقف مؤقتاً:';
            actionColor = 'text-amber-600 dark:text-amber-400';
          } else if (act.type === 'FINISHED_FULL') {
            actionLabel = 'أنجز بالكامل:';
            actionColor = 'text-emerald-600 dark:text-emerald-400 font-bold';
          } else if (act.type === 'CHEER') {
            actionLabel = 'أرسل تشجيعاً:';
            actionColor = 'text-purple-600 dark:text-purple-400';
          }

          return (
            <div
              key={act.id}
              className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-150"
            >
              <div className="flex items-start gap-2.5">
                <img
                  src={act.participantAvatar}
                  alt={act.participantName}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5"
                />

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {act.participantName}
                    </span>
                    <span className={`text-[11px] ${actionColor}`}>
                      {act.cheerMessage ? 'أرسل تشجيعاً' : actionLabel}
                    </span>
                    {act.taskTitle && (
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                        {act.taskTitle}
                      </span>
                    )}
                  </div>

                  {act.cheerMessage && (
                    <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                      «{act.cheerMessage}»
                    </p>
                  )}

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 tabular-nums font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{act.timeFormatted}</span>
                  </div>
                </div>
              </div>

              {/* زر إرسال تشجيع فوري */}
              {currentUser && currentUser.id !== act.participantId && (
                <button
                  onClick={() => sendCheer(act.participantId)}
                  className="p-1.5 px-2 rounded-lg bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-950/40 text-slate-600 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold flex items-center gap-1 transition-all btn-press shrink-0"
                  title="أرسل له تشجيعاً"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span className="hidden sm:inline">تشجيع</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
