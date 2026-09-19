import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { 
  X, 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock, 
  Check, 
  Minus, 
  Volume2, 
  BookOpen, 
  ZoomIn, 
  Coffee, 
  Droplet, 
  Moon, 
  Sun, 
  Heart,
  HelpCircle,
  Sparkles,
  Info 
} from 'lucide-react';

export const TaskDrawerContainer: React.FC = () => {
  const { 
    activeDrawerTask, 
    closeTaskDrawer, 
    startTask, 
    pauseTask, 
    resumeTask, 
    completeTask, 
    updateTaskMeta,
    playNotificationSound 
  } = useApp();

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [textSizeZoom, setTextSizeZoom] = useState<'normal' | 'large' | 'huge'>('normal');
  const [showWakeupAdhkar, setShowWakeupAdhkar] = useState(false);
  const [activeBreathingStep, setActiveBreathingStep] = useState<'شهيق (٤ ثوان)' | 'حبس (٤ ثوان)' | 'زفير (٤ ثوان)'>('شهيق (٤ ثوان)');

  if (!activeDrawerTask) return null;

  const task = activeDrawerTask;
  const isRunning = task.isTimerRunning;

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleQuranAudio = () => {
    setIsAudioPlaying(!isAudioPlaying);
    playNotificationSound('tap');
  };

  const handleWakeup = () => {
    setShowWakeupAdhkar(true);
    playNotificationSound('success');
  };

  const addWaterCup = () => {
    const current = task.meta.currentWaterCups || 0;
    const target = task.meta.targetWaterCups || 10;
    if (current < target) {
      updateTaskMeta(task.id, { currentWaterCups: current + 1 });
      playNotificationSound('tap');
    }
  };

  const togglePrayer = (prayerName: string) => {
    const list = task.meta.prayersCompleted || [];
    const updated = list.includes(prayerName)
      ? list.filter(p => p !== prayerName)
      : [...list, prayerName];
    updateTaskMeta(task.id, { prayersCompleted: updated });
    playNotificationSound('tap');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* خلفية الإغلاق عند النقر بالخارج */}
      <div className="absolute inset-0" onClick={closeTaskDrawer} />

      {/* لوحة المهمة المنزلقة (Slide-over على الكمبيوتر وترتفع كـ Bottom Sheet على الجوال) */}
      <div className="relative w-full max-w-xl h-full bg-white dark:bg-[#111827] border-r sm:border-r-0 sm:border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col justify-between overflow-hidden z-10 animate-in slide-in-from-bottom sm:slide-in-from-left duration-300">
        
        {/* الترويسة العلوية */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                {task.categoryId === 'deen' ? '🕌 دين' : task.categoryId === 'culture' ? '📚 ثقافة' : task.categoryId === 'sport' ? '⚽ رياضة' : '🌟 رحلة التغيير'}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                القيمة: {task.fullPoints} نقطة
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              {task.title}
            </h3>
          </div>

          <button
            onClick={closeTaskDrawer}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            title="إغلاق النافذة"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* محتوى المهمة التخصصي والتفاعلي */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* قسم المؤقت الحي والتحكم السريع بالوقت */}
          <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold">الوقت الفعلي المسجل</span>
                <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-widest">
                  {formatSeconds(task.elapsedSeconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isRunning ? (
                <button
                  onClick={() => pauseTask(task.id)}
                  className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition btn-press shadow-md shadow-amber-500/20"
                >
                  <Pause className="w-4 h-4 fill-current" />
                  <span>إيقاف مؤقت</span>
                </button>
              ) : (
                <button
                  onClick={() => (task.elapsedSeconds > 0 ? resumeTask(task.id) : startTask(task.id))}
                  className="px-4 py-2 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold flex items-center gap-1.5 transition btn-press shadow-md shadow-teal-500/20"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{task.elapsedSeconds > 0 ? 'استئناف' : 'بدء المهمة'}</span>
                </button>
              )}
            </div>
          </div>

          {/* ======================= تخصيص: ورد القرآن الكريم ======================= */}
          {task.typeCode === 'QURAN' && (
            <div className="space-y-4">
              {/* بطاقة تأمل اليوم في القرآن */}
              <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span>تأمل اليوم في القرآن الكريم</span>
                  </span>
                  <button
                    onClick={toggleQuranAudio}
                    className={`p-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isAudioPlaying ? 'bg-emerald-600 text-white' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isAudioPlaying ? 'جارٍ الاستماع...' : 'استماع للآية'}</span>
                  </button>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed font-serif text-center py-2">
                  «وَاصْبِرْ نَفْسَكَ مَعَ الَّذِينَ يَدْعُونَ رَبَّهُم بِالْغَدَاةِ وَالْعَشِيِّ يُرِيدُونَ وَجْهَهُ»
                </p>
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 p-3 rounded-2xl border border-emerald-500/20 mt-2 leading-relaxed">
                  <strong>التفسير الميسر:</strong> الزم صحبة الأخيار الذين يذكرون الله في الصباح والمساء، فإن الاستمرارية على الطاعة تحتاج بيئة تعينك وتثبتك في رحلة التغيير.
                </div>
              </div>

              {/* بطاقة الورد وإتمام الورد */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">مقدار الورد المستهدف اليوم</h4>
                  <p className="text-xs text-slate-500">نصف جزء (١٠ صفحات بتأنٍ وترتيل)</p>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  سورة الكهف • الآية ٢٨
                </span>
              </div>
            </div>
          )}

          {/* ======================= تخصيص: الصلوات الخمس (أخضر روحاني موحد) ======================= */}
          {task.typeCode === 'PRAYER' && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/30">
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-1">
                  <span>🕌 صفحة الصلوات الخمس الموحدة</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono">
                    {(task.meta.prayersCompleted || []).length} / 5 مكتملة
                  </span>
                </h4>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400">
                  صممت بألوان روحانية هادئة تجمع كل الصلوات في موضع واحد دون تشتيت.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { name: 'FAJR', label: 'صلاة الفجر', time: '٤:٣٢ ص' },
                  { name: 'DHUHR', label: 'صلاة الظهر', time: '١١:٥٨ ص' },
                  { name: 'ASR', label: 'صلاة العصر', time: '٣:٢٢ م' },
                  { name: 'MAGHRIB', label: 'صلاة المغرب', time: '٥:٥٦ م' },
                  { name: 'ISHA', label: 'صلاة العشاء', time: '٧:٢٦ م' },
                ].map(prayer => {
                  const isDone = (task.meta.prayersCompleted || []).includes(prayer.name);
                  return (
                    <button
                      key={prayer.name}
                      onClick={() => togglePrayer(prayer.name)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition ${
                        isDone
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                          isDone ? 'bg-emerald-500 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {isDone && <Check className="w-4 h-4" />}
                        </span>
                        <span className="text-sm">{prayer.label}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{prayer.time}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================= تخصيص: قراءة الكتب والثقافة ======================= */}
          {task.typeCode === 'READING' && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block mb-0.5">
                    معدل القراءة اليومي
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {task.meta.bookTitle}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    أنجزت <strong>{task.meta.currentPages}</strong> من أصل <strong>{task.meta.targetPages}</strong> صفحة
                  </p>
                </div>

                <button
                  onClick={() => setTextSizeZoom(prev => prev === 'normal' ? 'large' : prev === 'large' ? 'huge' : 'normal')}
                  className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  title="تكبير وتصغير خط القراءة"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span>تكبير الخط ({textSizeZoom})</span>
                </button>
              </div>

              {/* ملاحظات الجلسة والفوائد استجابة لطلب العميل */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  📝 ملاحظات جلسة القراءة وتوثيق الفوائد:
                </label>
                <textarea
                  rows={3}
                  placeholder="سجل أهم فكرة أو فائدة خرجت بها من صفحات اليوم..."
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}

          {/* ======================= تخصيص: النشاط الرياضي ======================= */}
          {task.typeCode === 'SPORT' && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-orange-500/10 border border-orange-500/30">
                <h4 className="text-sm font-bold text-orange-700 dark:text-orange-300 mb-1">
                  حرية الحركة واللياقة (بدون إلزام مسبق)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  تطبيقاً للملاحظات: اختر الرياضة التي تناسبك اليوم (مشي، جري، كارديو، حديد) وحدد هدفك بحرية.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نوع النشاط الممارس اليوم:</label>
                <input
                  type="text"
                  defaultValue={task.meta.sportActivity}
                  onChange={e => updateTaskMeta(task.id, { sportActivity: e.target.value })}
                  placeholder="مثال: مشي سريع في الحديقة"
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}

          {/* ======================= تخصيص: شرب الماء والارتواء ======================= */}
          {task.typeCode === 'WATER' && (
            <div className="space-y-4 text-center">
              <div className="p-5 rounded-3xl bg-teal-500/10 border border-teal-500/30">
                <span className="text-xs font-bold text-teal-700 dark:text-teal-300 block mb-1">
                  الهدف: ١٠ كؤوس ماء نقي (٢.٥ لتر)
                </span>
                <div className="text-3xl font-black text-teal-600 dark:text-teal-400 font-mono my-2">
                  {task.meta.currentWaterCups} / {task.meta.targetWaterCups} كؤوس 💧
                </div>
                
                {/* رسم تفاعلي لكأس الماء */}
                <div className="w-20 h-28 mx-auto border-4 border-teal-500/40 rounded-b-3xl relative overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner my-3">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-teal-500 to-cyan-400 transition-all duration-500 rounded-b-2xl opacity-90"
                    style={{
                      height: `${((task.meta.currentWaterCups || 0) / (task.meta.targetWaterCups || 10)) * 100}%`,
                    }}
                  />
                </div>

                <button
                  onClick={addWaterCup}
                  className="px-5 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold shadow-lg shadow-teal-500/25 transition btn-press inline-flex items-center gap-2"
                >
                  <Droplet className="w-4 h-4 fill-current" />
                  <span>شربت كوب ماء (+١)</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================= تخصيص: النوم والاستيقاظ وأدعية الصباح ======================= */}
          {task.typeCode === 'SLEEP' && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300">ساعات النوم المسجلة</h4>
                  <p className="text-xs text-slate-500">معدل صحي ومريح لبداية قوية</p>
                </div>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {task.meta.sleepHours} ساعات
                </span>
              </div>

              {/* زر الاستيقاظ مع أدعية الصباح */}
              <button
                onClick={handleWakeup}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-900 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition btn-press"
              >
                <Sun className="w-4 h-4" />
                <span>تسجيل الاستيقاظ وظهور الأدعية المباركة ☀️</span>
              </button>

              {showWakeupAdhkar && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-800 dark:text-slate-200 text-xs space-y-2 animate-in fade-in duration-200">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block text-sm">
                    دعاء الاستيقاظ من النوم:
                  </span>
                  <p className="italic font-serif text-sm leading-relaxed">
                    «الحمد لله الذي أحيانا بعد ما أماتنا وإليه النشور. أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له.»
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ======================= تخصيص: الاسترخاء والتأمل الروحي ======================= */}
          {task.typeCode === 'MEDITATION' && (
            <div className="space-y-4 text-center">
              <div className="p-5 rounded-3xl bg-purple-500/10 border border-purple-500/30">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 block mb-1">
                  دائرة التنفس والتأمل الروحي (٤-٤-٤)
                </span>

                {/* دائرة نيونية متحركة للتنفس */}
                <div className="my-6">
                  <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-tr from-purple-600 to-teal-400 p-1 flex items-center justify-center shadow-xl shadow-purple-500/20 animate-pulse">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300">
                      {activeBreathingStep}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-2">
                  {(['شهيق (٤ ثوان)', 'حبس (٤ ثوان)', 'زفير (٤ ثوان)'] as const).map(step => (
                    <button
                      key={step}
                      onClick={() => setActiveBreathingStep(step)}
                      className={`text-[11px] font-bold px-3 py-1 rounded-xl transition ${
                        activeBreathingStep === step
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {step}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                  تفريغ ذهني كامل واستشعار لنعم الله والتسبيح الهادئ مع سكون النفس.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* أزرار الإنجاز الثلاثية الصريحة المعتمدة في المتطلبات */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 space-y-2">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            تسجيل درجة الإنجاز:
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* إنجاز كامل = 100% النقاط */}
            <button
              onClick={() => completeTask(task.id, 'FULL')}
              className="py-2.5 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-md shadow-emerald-500/20 flex flex-col items-center justify-center gap-0.5 transition btn-press"
              title="إنجاز كامل (العلامة كاملة)"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>إنجاز كامل (١٠٠٪)</span>
              <span className="text-[10px] opacity-80">+{task.fullPoints} نقطة</span>
            </button>

            {/* إنجاز جزئي = 50% النقاط */}
            <button
              onClick={() => completeTask(task.id, 'PARTIAL')}
              className="py-2.5 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md shadow-amber-500/20 flex flex-col items-center justify-center gap-0.5 transition btn-press"
              title="إنجاز جزئي (نصف العلامة)"
            >
              <Minus className="w-4 h-4" />
              <span>إنجاز جزئي (٥٠٪)</span>
              <span className="text-[10px] opacity-80">+{task.partialPoints} نقطة</span>
            </button>

            {/* عدم إنجاز / إغلاق بحفظ الوقت */}
            <button
              onClick={() => completeTask(task.id, 'NOT_COMPLETED')}
              className="py-2.5 px-2 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition btn-press"
              title="إغلاق المهمة مع حفظ الوقت بالسجل"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>إغلاق بحفظ الوقت</span>
              <span className="text-[10px] text-slate-400">بدون نقاط</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
