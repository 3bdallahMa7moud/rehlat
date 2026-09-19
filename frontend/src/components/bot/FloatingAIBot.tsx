import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Bot, Sparkles, X, ArrowLeft, Send, MessageSquare } from 'lucide-react';

export const FloatingAIBot: React.FC = () => {
  const { 
    isBotOpen, 
    setBotOpen, 
    botMessage, 
    askBotForTaskRecommendation, 
    currentUser,
    daySession 
  } = useApp();

  const [customQuery, setCustomQuery] = useState('');
  const [chatLog, setChatLog] = useState<{ sender: 'bot' | 'user'; text: string }[]>([
    { sender: 'bot', text: botMessage }
  ]);

  const handleSendQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim()) return;

    const query = customQuery;
    setCustomQuery('');
    setChatLog(prev => [...prev, { sender: 'user', text: query }]);

    setTimeout(() => {
      let reply = 'أنا هنا لمساعدتك على إتمام رحلة التغيير اليوم والوصول للـ 90%! استمر وستحقق أهدافك المباركة ✨';
      if (query.includes('ستريك') || query.includes('streak')) {
        reply = `الـ Streak الحالي لك هو ${currentUser?.currentStreakDays} أيام متواصلة! لإبقائه آمناً، احرص على إكمال مهام اليوم لتتجاوز نسبة 90% 🔥`;
      } else if (query.includes('صلاة') || query.includes('قرآن')) {
        reply = 'الجانب الروحي هو أساس بركة يومك، احرص على ورد القرآن وصلاة الفجر وستشهد تيسيراً عجيباً في باقي عاداتك 🕌';
      }
      setChatLog(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 400);
  };

  return (
    <div className="fixed bottom-20 left-4 z-40">
      
      {/* نافذة المحادثة الذكية عند الفتح */}
      {isBotOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-3xl glass-card border border-teal-500/40 shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-5 zoom-in-95 duration-200">
          
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">المساعد الذكي لرحلة التغيير</h4>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">متفاعل مع بياناتك الحقيقية 🤖</span>
              </div>
            </div>
            <button
              onClick={() => setBotOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="إغلاق نافذة المساعد"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* سجل الحوار */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
            {chatLog.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-2xl leading-relaxed ${
                  msg.sender === 'bot'
                    ? 'bg-teal-500/10 dark:bg-slate-800 border border-teal-500/20 text-slate-800 dark:text-slate-200 mr-2'
                    : 'bg-purple-600 text-white ml-2 text-left'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* زر اقتراح مهمة فورية ونقل المستخدم إليها مباشرة استجابة للمتطلبات */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={askBotForTaskRecommendation}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-400 hover:to-purple-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition btn-press"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>اقترح لي مهمة الآن وابدأها 🚀</span>
            </button>
          </div>

          {/* نموذج السؤال السريع */}
          <form onSubmit={handleSendQuestion} className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={customQuery}
              onChange={e => setCustomQuery(e.target.value)}
              placeholder="اسأل المساعد عن يومك أو ستريكك..."
              className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition btn-press"
              title="إرسال"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}

      {/* زر البوت العائم الخارجي (مع نبض خفيف وفقاعة تشجيع) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setBotOpen(!isBotOpen)}
          className="relative w-13 h-13 rounded-full bg-gradient-to-tr from-purple-600 via-teal-500 to-cyan-400 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition duration-300 btn-press border-2 border-white dark:border-slate-800"
          title="افتح المساعد الذكي"
        >
          <Bot className="w-6 h-6 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
        </button>

        {!isBotOpen && (
          <div
            onClick={() => setBotOpen(true)}
            className="hidden sm:block cursor-pointer px-3 py-1.5 rounded-2xl glass-card border border-teal-500/30 text-xs text-slate-700 dark:text-slate-200 shadow-lg animate-in fade-in slide-in-from-left duration-300"
          >
            <span>«باقي لك خطوة على الـ 90% يا بطل 🔥»</span>
          </div>
        )}
      </div>

    </div>
  );
};
