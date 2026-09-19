import React from 'react';
import { useApp } from '../../store/AppContext';
import { CheckCircle2, AlertTriangle, Info, Sparkles, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 left-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        let icon = <Info className="w-5 h-5 text-sky-500 shrink-0" />;
        let borderColor = 'border-sky-500/30';
        let bgGlow = 'bg-sky-500/10';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
          borderColor = 'border-emerald-500/40';
          bgGlow = 'bg-emerald-500/10';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
          borderColor = 'border-amber-500/40';
          bgGlow = 'bg-amber-500/10';
        } else if (toast.type === 'cheer') {
          icon = <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />;
          borderColor = 'border-purple-500/40';
          bgGlow = 'bg-purple-500/10';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl glass-card border ${borderColor} ${bgGlow} shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toast.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="إغلاق الإشعار"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
