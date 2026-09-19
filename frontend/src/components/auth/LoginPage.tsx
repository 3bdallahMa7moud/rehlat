import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { KeyRound, Eye, EyeOff, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, participants } = useApp();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>(participants[0]?.id || '');

  const selectedUser = participants.find(p => p.id === selectedUserId) || participants[0];

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!pin && !selectedUserId) {
      setErrorMsg('يرجى إدخال الرقم السري المكون من 4 أرقام');
      return;
    }

    const success = login(pin, selectedUserId);
    if (!success) {
      setErrorMsg('الرقم السري غير صحيح. الرقم الافتراضي للمعاينة هو 1234');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-[#f8f9fb] dark:bg-[#0a0e17] transition-colors duration-200">
      
      {/* هالة إضاءة معمارية خلفية خافتة وراقية */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      <div className="relative w-full max-w-md craft-card p-7 sm:p-9 shadow-xl border border-slate-200/80 dark:border-white/10 space-y-7 z-10">
        
        {/* اللوجو الرسمي في إطار متقن مع الهوية الرسمية */}
        <div className="text-center space-y-3">
          <div className="relative mx-auto w-20 h-20 rounded-2xl p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center overflow-hidden">
            <img
              src="/logo.jpg"
              alt="رحلة التغيير"
              className="w-full h-full object-cover rounded-xl"
            />
            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              رحلة التغيير
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              تسجيل الدخول ومتابعة إنجاز الورد والعادات اليومية
            </p>
          </div>
        </div>

        {/* اختيار المشارك المعروض مع الصورة والرتبة */}
        <div className="space-y-2 text-right">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            الحساب النشط:
          </label>
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img
                src={selectedUser?.avatarUrl}
                alt={selectedUser?.displayName}
                className="w-9 h-9 rounded-lg object-cover border border-teal-500/40"
              />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedUser?.displayName}
                </div>
                <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                  {selectedUser?.rankTitle} • {selectedUser?.role === 'ADMIN' ? 'مشرف المنظومة' : selectedUser?.jobTitle}
                </div>
              </div>
            </div>

            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-teal-500"
            >
              {participants.map(p => (
                <option key={p.id} value={p.id}>
                  {p.displayName} {p.role === 'ADMIN' ? '👑' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* نموذج الـ PIN مع دعم Enter وإصلاح زر إظهار الرقم السري */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5 text-right">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                الرقم السري (PIN):
              </label>
              <span className="text-[11px] text-slate-400 tabular-nums">الافتراضي: 1234</span>
            </div>

            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleLoginSubmit();
                  }
                }}
                placeholder="••••"
                className="w-full p-3.5 pl-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-center font-mono text-xl tracking-[0.4em] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
                autoFocus
              />

              {/* زر إظهار / إخفاء الـ PIN */}
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                title={showPin ? 'إخفاء الرقم السري' : 'إظهار الرقم السري'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60">
              {errorMsg}
            </p>
          )}

          {/* زر الدخول الفوري الرزين */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#3b185f] hover:bg-[#4c1d95] dark:bg-[#7c3aed] dark:hover:bg-[#6d28d9] text-white font-bold text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_8px_rgba(59,24,95,0.25)] flex items-center justify-center gap-2 transition-all btn-press"
          >
            <span>دخول إلى رحلة اليوم</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>

        {/* أزرار التجربة السريعة بنقرة واحدة */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
          <span className="text-[11px] text-slate-400 block">تجربة سريعة بنقرة واحدة:</span>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {participants.slice(0, 3).map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedUserId(p.id);
                  setPin('1234');
                  login('1234', p.id);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition"
              >
                {p.displayName} {p.role === 'ADMIN' ? '(مشرف)' : ''}
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
