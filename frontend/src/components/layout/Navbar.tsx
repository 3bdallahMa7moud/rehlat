import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Flame, 
  Sparkles, 
  Users, 
  LogOut,
  ChevronDown 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    theme, 
    toggleTheme, 
    currentUser, 
    logout, 
    switchUserFast, 
    participants, 
    isSoundMuted, 
    toggleSound,
    daySession
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#0a0e17]/90 border-b border-slate-200/80 dark:border-white/5 backdrop-blur-xl transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* اللوجو الرسمي في إطار متقن مع الهوية الرسمية */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl p-0.5 bg-gradient-to-b from-purple-500/30 to-teal-500/30 dark:from-purple-500/20 dark:to-teal-500/20 border border-purple-500/40 shadow-sm flex items-center justify-center overflow-hidden">
              <img
                src="/logo.jpg"
                alt="شعار رحلة التغيير"
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <span className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#0a0e17] rounded-full" title="المزامنة نشطة" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                رحلة التغيير
              </h1>
              {currentUser?.role === 'ADMIN' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                  <ShieldCheck className="w-3 h-3 text-purple-500" /> المشرف
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              {daySession.formattedArabicDate} • المنظومة الموحدة للمهام والعادات
            </p>
          </div>
        </div>

        {/* الأدوات السريعة ومعلومات المستخدم */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* عداد الستريك والنقاط - بتصميم وقور وأرقام ثابتة */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400" title="أيام الاستمرارية">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="tabular-nums">{currentUser.currentStreakDays} أيام</span>
              </span>
              <span className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />
              <span className="flex items-center gap-1 font-bold text-teal-700 dark:text-teal-400" title="إجمالي النقاط المكتسبة">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                <span className="tabular-nums">{currentUser.totalPoints} نقطة</span>
              </span>
            </div>
          )}

          {/* زر كتم / تفعيل الصوت */}
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition-all btn-press"
            title={isSoundMuted ? 'تفعيل المؤثرات الصوتية' : 'كتم الصوت'}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
          </button>

          {/* زر تبديل الثيم الداكن / النهاري */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition-all btn-press"
            title={theme === 'dark' ? 'التحويل للوضع النهاري' : 'التحويل للوضع الداكن'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-purple-700" />
            )}
          </button>

          {/* قائمة المشارك والتبديل السريع */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/60 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-white/5 transition-all btn-press"
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className="w-7 h-7 rounded-lg object-cover border border-teal-500/40"
                />
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    {currentUser.displayName}
                  </div>
                  <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                    {currentUser.rankTitle}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* القائمة المنسدلة لاختيار المستخدم السريع */}
              {isUserMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      تبديل الحساب السريع (معاينة)
                    </div>
                  </div>

                  <div className="space-y-1">
                    {participants.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          switchUserFast(p.id);
                          setIsUserMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-right text-xs transition ${
                          currentUser.id === p.id 
                            ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img src={p.avatarUrl} alt={p.displayName} className="w-7 h-7 rounded-lg object-cover" />
                          <div>
                            <div className="font-semibold leading-tight">{p.displayName}</div>
                            <div className="text-[10px] text-slate-400">{p.jobTitle}</div>
                          </div>
                        </div>
                        {p.role === 'ADMIN' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 font-bold">
                            مشرف
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                    <button
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition font-medium"
                    >
                      <LogOut className="w-4 h-4" /> تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
