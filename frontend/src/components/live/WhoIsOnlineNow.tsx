import React from 'react';
import { useApp } from '../../store/AppContext';
import { Users, Sparkles, Send } from 'lucide-react';

export const WhoIsOnlineNow: React.FC = () => {
  const { participants, currentUser, sendCheer } = useApp();

  return (
    <div className="craft-card p-5 border border-slate-200/80 dark:border-white/5 flex flex-col h-full shadow-sm">
      
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            حالة الحضور الآن ({participants.filter(p => p.presence !== 'OFFLINE').length})
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">
          تحديث لحظي
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-80 pr-1">
        {participants.map(user => {
          let badgeText = 'متصل';
          let badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
          let dotColor = 'bg-slate-400';

          if (user.presence === 'WORKING') {
            badgeText = 'يعمل على مهمة';
            badgeColor = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
            dotColor = 'bg-emerald-500';
          } else if (user.presence === 'PAUSED') {
            badgeText = 'متوقف مؤقتاً';
            badgeColor = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
            dotColor = 'bg-amber-500';
          }

          return (
            <div
              key={user.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-150"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${dotColor}`}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      {user.displayName}
                    </h5>
                    {user.isStreakAtRisk && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold" title="الستريك في خطر">
                        ⚠️
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span>{user.jobTitle}</span>
                    <span>•</span>
                    <span className="text-teal-600 dark:text-teal-400 font-medium">{user.rankTitle}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                  {badgeText}
                </span>

                {currentUser && currentUser.id !== user.id && (
                  <button
                    onClick={() => sendCheer(user.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition btn-press"
                    title={`إرسال تشجيع لـ ${user.displayName}`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
