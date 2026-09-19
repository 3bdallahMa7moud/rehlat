import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Coffee, Sparkles, RefreshCw, Quote } from 'lucide-react';

const MORNING_QUOTES = [
  {
    quote: "النجاح لا يأتي من طفرات عشوائية، بل من قرارات واعية صغيرة تتكرر كل صباح دون انقطاع.",
    author: "حكمة الاستمرارية",
    source: "رحلة التغيير",
  },
  {
    quote: "أحب الأعمال إلى الله أدومها وإن قلّ. قليلٌ دائم خيرٌ من كثيرٍ منقطع.",
    author: "حديث نبوي شريف",
    source: "صحيح مسلم",
  },
  {
    quote: "أنت لا ترتقي إلى مستوى أهدافك، بل تهبط إلى مستوى أنظمتك وعاداتك اليومية.",
    author: "جيمس كلير",
    source: "العادات الذرية",
  },
  {
    quote: "كل صباح هو صفحة بيضاء في كتابك، والـ 90% اليوم هي درع ستريك الغد.",
    author: "فريق الإشراف",
    source: "لوحة الهمة",
  },
];

export const TodayHero: React.FC = () => {
  const { currentUser, playNotificationSound, daySession } = useApp();
  const [quoteIndex, setQuoteIndex] = useState(0);

  const nextQuote = () => {
    playNotificationSound('tap');
    setQuoteIndex(prev => (prev + 1) % MORNING_QUOTES.length);
  };

  const currentQ = MORNING_QUOTES[quoteIndex];

  return (
    <div className="relative craft-card p-6 sm:p-7 border border-slate-200/80 dark:border-white/5">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
        
        {/* الترحيب والتحية الصباحية الرزينة */}
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              إشراقة اليوم
            </span>
            <span className="text-xs text-slate-400">
              {daySession.formattedArabicDate}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            صباح الإنجاز والهمة، يا <span className="text-[#3b185f] dark:text-teal-400">{currentUser?.displayName || 'بطل التغيير'}</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
            اليوم هو فرصتك لصنع فارق حقيقي في وردك، علمك، وصحتك. استمرارية العادات الصغيرة تصنع الأثر الكبير.
          </p>
        </div>

        {/* كارت الحكمة اليومية التحريري الراقي */}
        <div className="w-full lg:w-96 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-white/5 p-4.5 flex flex-col justify-between gap-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                حكمة الاستمرارية
              </span>
            </div>

            {/* زر تدوير الحكمة الهادئ */}
            <button
              onClick={nextQuote}
              className="text-[11px] font-medium text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1.5 transition-all btn-press px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700"
              title="عرض حكمة أخرى"
            >
              <RefreshCw className="w-3 h-3" />
              <span>فائدة أخرى</span>
            </button>
          </div>

          <div className="relative px-1 py-0.5">
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              «{currentQ.quote}»
            </p>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800">
            <span className="font-semibold text-teal-700 dark:text-teal-400">— {currentQ.author}</span>
            <span className="text-[10px] text-slate-400">{currentQ.source}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
