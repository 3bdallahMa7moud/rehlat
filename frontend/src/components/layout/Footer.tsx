import React from 'react';
import { Heart, Globe, MessageCircle, Send, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-white/5 py-10 px-4 sm:px-8 mt-16 transition-colors duration-200 bg-white/40 dark:bg-black/20">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* توقيع المشروع والرسالة */}
        <div className="flex items-center gap-3.5 text-center sm:text-right">
          <div className="w-9 h-9 rounded-xl p-0.5 border border-purple-500/30 bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden">
            <img src="/logo.jpg" alt="رحلة التغيير" className="w-full h-full object-cover rounded-[10px]" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 justify-center sm:justify-start">
              <span>رحلة التغيير • Journey of Change</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              منظومة متكاملة لصناعة الأثر وتطوير العادات اليومية المستمرة
            </p>
          </div>
        </div>

        {/* روابط التواصل وتوقيع المطور/المشرف */}
        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          <a
            href="https://t.me"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition font-medium"
          >
            <Send className="w-3.5 h-3.5 text-sky-500" />
            <span>قناة التليجرام</span>
          </a>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          <a
            href="https://wa.me"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400 transition font-medium"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>مجتمع المشاركين</span>
          </a>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          <span className="text-xs text-slate-400">
            بإشراف ورعاية <strong className="text-slate-700 dark:text-slate-300 font-semibold">عبدالله محمود</strong>
          </span>
        </div>

      </div>
    </footer>
  );
};
