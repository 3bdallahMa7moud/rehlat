import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { INITIAL_BADGES } from '../../store/mockData';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Sparkles, 
  Send, 
  Medal, 
  ShieldAlert, 
  Clock, 
  CheckCircle,
  X 
} from 'lucide-react';

export const HallOfFame: React.FC = () => {
  const { participants, currentUser, sendCheer } = useApp();
  const [selectedUserForCheer, setSelectedUserForCheer] = useState<string | null>(null);
  const [cheerCustomText, setCheerCustomText] = useState('');

  // ترتيب المشاركين حسب مجموع النقاط تنازلياً
  const sorted = [...participants].sort((a, b) => b.totalPoints - a.totalPoints);
  const topLeader = sorted[0];

  const handleSendCheer = (userId: string) => {
    sendCheer(userId, cheerCustomText || undefined);
    setSelectedUserForCheer(null);
    setCheerCustomText('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* الترويسة الفاخرة */}
      <div>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            لوحة الشرف وتصنيف الرتب
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          تنافس شريف على الخير واستمرارية العادات، وتكريم رواد الالتزام
        </p>
      </div>

      {/* بطاقة المتصدر الأول الفخمة (Prestige Champion Podium) */}
      {topLeader && (
        <div className="relative craft-card p-6 sm:p-8 border border-amber-300/80 dark:border-amber-500/30 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-[#111726] shadow-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative">
            
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-right">
              <div className="relative">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl p-1 bg-white dark:bg-slate-800 border-2 border-amber-400 shadow-md">
                  <img
                    src={topLeader.avatarUrl}
                    alt={topLeader.displayName}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <span className="absolute -top-2 -right-2 p-1 rounded-lg bg-amber-500 text-slate-950 shadow-sm">
                  <Crown className="w-4 h-4 fill-current" />
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950">
                    متصدر الأسبوع 👑
                  </span>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {topLeader.rankTitle}
                  </span>
                </div>
                <h4 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {topLeader.displayName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {topLeader.jobTitle} • آخر ظهور: <span className="tabular-nums">{topLeader.lastSeenAt}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5 bg-white/80 dark:bg-slate-800/80 px-5 py-3.5 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-sm">
              <div className="text-center">
                <span className="text-[11px] text-slate-400 block font-medium">مجموع النقاط</span>
                <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {topLeader.totalPoints}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
              <div className="text-center">
                <span className="text-[11px] text-slate-400 block font-medium">الـ Streak</span>
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                  {topLeader.currentStreakDays} ي
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* قائمة ترتيب باقي المشاركين بنظام الصفوف عالي الكثافة */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          جدول الترتيب العام للمشاركين:
        </h4>

        <div className="craft-card border border-slate-200/80 dark:border-white/5 divide-y divide-slate-100 dark:divide-slate-800/70 overflow-hidden">
          {sorted.map((user, index) => {
            const isCurrentUser = currentUser?.id === user.id;

            return (
              <div
                key={user.id}
                className={`flex flex-col sm:flex-row items-center justify-between p-4 transition-colors duration-150 ${
                  isCurrentUser
                    ? 'bg-teal-50/50 dark:bg-teal-950/20'
                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  {/* رقم المركز */}
                  <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 tabular-nums ${
                    index === 0
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : index === 1
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white'
                      : index === 2
                      ? 'bg-amber-700 text-white'
                      : 'text-slate-500 bg-slate-100 dark:bg-slate-800'
                  }`}>
                    {index + 1}
                  </span>

                  {/* صورة المشارك والمعلومات */}
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {user.displayName}
                        </h5>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {user.rankTitle}
                        </span>
                        {user.isStreakAtRisk && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> الستريك بخطر
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {user.jobTitle} • آخر ظهور: <span className="tabular-nums font-mono">{user.lastSeenAt}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* النقاط والستريك وزر التشجيع */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] text-slate-400 block font-medium">النقاط</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-teal-400 tabular-nums">
                      {user.totalPoints} ن
                    </span>
                  </div>

                  <div className="text-center sm:text-left">
                    <span className="text-[10px] text-slate-400 block font-medium">الـ Streak</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums flex items-center justify-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-amber-500" />
                      {user.currentStreakDays} ي
                    </span>
                  </div>

                  {!isCurrentUser && (
                    <button
                      onClick={() => setSelectedUserForCheer(user.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all btn-press shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>تشجيع</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* معرض الأوسمة والبادجات */}
      <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              معرض الأوسمة والبادجات التكريمية
            </h4>
          </div>
          <span className="text-xs text-slate-400">شارات مستحقة بناءً على الأداء الحقيقي</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {INITIAL_BADGES.map(badge => (
            <div
              key={badge.id}
              className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-between gap-2.5 ${
                badge.isUnlocked
                  ? 'bg-white dark:bg-slate-800/80 border-amber-300 dark:border-amber-500/40 shadow-sm'
                  : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800 opacity-60'
              }`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                  {badge.title}
                </h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-snug">
                  {badge.description}
                </p>
              </div>
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md ${
                badge.isUnlocked ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50' : 'bg-slate-100 text-slate-500'
              }`}>
                {badge.isUnlocked ? `مكتسب (${badge.unlockedAt})` : 'قيد الفتح'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* نافذة إرسال التشجيع المخصص التفاعلية */}
      {selectedUserForCheer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-md w-full craft-card border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>إرسال رسالة تشجيع حماسية</span>
              </h4>
              <button
                onClick={() => setSelectedUserForCheer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              اختر رسالة جاهزة أو اكتب كلماتك المخصصة لتصل فوراً:
            </p>

            {/* نماذج سريعة */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'كفو عليك يا بطل، استمر! 🔥',
                'خطوة واحدة ونقفل هدف اليوم كامل 💪',
                'أداؤك ملهم لكل الفريق اليوم ✨',
                'لا تفرط بالـ Streak، أنت قادر! ⚡',
              ].map(preset => (
                <button
                  key={preset}
                  onClick={() => setCheerCustomText(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={cheerCustomText}
              onChange={e => setCheerCustomText(e.target.value)}
              placeholder="اكتب رسالتك التشجيعية المخصصة..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedUserForCheer(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleSendCheer(selectedUserForCheer)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all btn-press"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال التشجيع</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
