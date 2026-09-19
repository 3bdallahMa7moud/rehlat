import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { 
  BarChart3, 
  FileText, 
  FileSpreadsheet, 
  Code, 
  Clock, 
  TrendingUp, 
  CheckCircle2,
  PieChart,
  Calendar,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { tasks, currentUser, playNotificationSound } = useApp();

  const [selectedWeek, setSelectedWeek] = useState<number>(3);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const exportPDF = () => {
    playNotificationSound('tap');
    window.print();
  };

  const exportExcel = () => {
    playNotificationSound('tap');
    const csvContent = "data:text/csv;charset=utf-8," 
      + "المهمة,التصنيف,النقاط المستحقة,النقاط المكتسبة,الوقت بالدقائق,الحالة\n"
      + tasks.map(t => `"${t.title}","${t.categoryId}",${t.fullPoints},${t.earnedPoints},${Math.round(t.elapsedSeconds / 60)},"${t.status}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_رحلة_التغيير_الاسبوع_${selectedWeek}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyJsonPayload = () => {
    playNotificationSound('tap');
    const payload = JSON.stringify({
      week: selectedWeek,
      participant: currentUser?.displayName,
      tasksCount: tasks.length,
      timestamp: new Date().toISOString()
    }, null, 2);
    navigator.clipboard.writeText(payload);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Distribution data
  const timeCategories = [
    { label: 'العبادة والقرآن (دين)', time: '٣٨٠ دقيقة', percent: 34, color: 'bg-emerald-500' },
    { label: 'القراءة وتطوير الذات (ثقافة)', time: '٣١٠ دقائق', percent: 28, color: 'bg-indigo-500' },
    { label: 'النشاط الرياضي واللياقة (صحة)', time: '٢٤٠ دقيقة', percent: 22, color: 'bg-amber-500' },
    { label: 'جلسات التركيز والتأمل', time: '١٨٠ دقيقة', percent: 16, color: 'bg-teal-500' },
  ];

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      
      {/* Editorial Header & Report Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              التقارير التحليلية والأداء الأسبوعي
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mr-10 font-medium">
            تتبع دقيق للوقت الفعلي، الالتزام بالعادات، ونسب النجاح التراكمية
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={exportPDF}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center gap-2 transition-all shadow-xs active:scale-[0.98]"
            title="طباعة التقرير كملف PDF"
          >
            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>تصدير PDF</span>
          </button>

          <button
            onClick={exportExcel}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-[0.98]"
            title="تحميل جدول بيانات Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>تصدير Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Week Selector Ribbon - Native Segmented Control */}
      <div className="craft-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 px-2 self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-teal-500" />
          <span>نطاق العرض الزمني:</span>
        </div>
        
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200/60 dark:border-slate-800 w-full sm:w-auto overflow-x-auto">
          {[1, 2, 3, 4, 5].map(weekNum => {
            const isActive = selectedWeek === weekNum;
            return (
              <button
                key={weekNum}
                onClick={() => {
                  setSelectedWeek(weekNum);
                  playNotificationSound('tap');
                }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-black'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                الأسبوع {weekNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* High-Precision KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Actual Work Time */}
        <div className="craft-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ساعات التركيز الفعلي</span>
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              ١٨.٥ <span className="text-xs sm:text-sm font-bold text-slate-500">ساعة</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              <span>+١٢٪ نمو مقارنة بالسابق</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Successful Days (≥ 90%) */}
        <div className="craft-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الأيام الناجحة (≥ 90%)</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              ٥ <span className="text-xs sm:text-sm font-bold text-slate-500">من ٧ أيام</span>
            </div>
            {/* Week dot visualization */}
            <div className="mt-2.5 flex items-center gap-1.5">
              {[true, true, true, true, false, true, false].map((active, idx) => (
                <span
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    active 
                      ? 'bg-amber-500 shadow-xs shadow-amber-500/50' 
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                  title={active ? 'يوم مكتمل' : 'يوم غير مكتمل'}
                />
              ))}
            </div>
          </div>
        </div>

        {/* KPI 3: Successful Weeks */}
        <div className="craft-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الأسابيع الناجحة شهرياً</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              ٣ <span className="text-xs sm:text-sm font-bold text-slate-500">أسابيع متتالية</span>
            </div>
            <div className="mt-2 text-[11px] font-bold text-purple-600 dark:text-purple-400">
              مؤهل للحصول على وسام الشهر ✨
            </div>
          </div>
        </div>

        {/* KPI 4: Daily Average Rate */}
        <div className="craft-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">متوسط الإنجاز الأسبوعي</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              ممتاز
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 tabular-nums tracking-tight">
              ٩٢.٤٪
            </div>
            {/* Progress track */}
            <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-full rounded-full" style={{ width: '92.4%' }} />
            </div>
          </div>
        </div>

      </div>

      {/* Analytics Breakdown: Time Distribution & Peak Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Section 1: Time Distribution */}
        <div className="craft-card p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <PieChart className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                أين أستهلك وقتي هذا الأسبوع؟
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
              إجمالي: ١,١١٠ دقيقة
            </span>
          </div>

          <div className="space-y-4">
            {timeCategories.map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 tabular-nums">{item.time}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {item.percent}٪
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Peak Hours Distribution */}
        <div className="craft-card p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                تحليلات وقت الذروة (Peak Hours)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
              الذروة: بعد الفجر
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            تؤكد الإحصائيات أن أعلى فترات تركيزك تتركز بين <strong>٥:٠٠ ص إلى ٨:٠٠ ص</strong> بمعدل التزام غير مسبوق، تليها فترة <strong>٨:٠٠ م إلى ١٠:٠٠ م</strong>.
          </p>

          <div className="grid grid-cols-4 gap-2 pt-2">
            
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/40 text-center flex flex-col justify-between">
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 block mb-1">الفجر والصباح</span>
              <span className="text-lg sm:text-xl font-black text-teal-600 dark:text-teal-400 tabular-nums">٤٨٪</span>
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 block mt-1">الذروة الكبرى</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-center flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">الظهيرة</span>
              <span className="text-lg sm:text-xl font-black text-slate-700 dark:text-slate-300 tabular-nums">١٤٪</span>
              <span className="text-[10px] text-slate-400 block mt-1">نشاط متوسط</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-center flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">العصر</span>
              <span className="text-lg sm:text-xl font-black text-slate-700 dark:text-slate-300 tabular-nums">١٢٪</span>
              <span className="text-[10px] text-slate-400 block mt-1">نشاط معتدل</span>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 text-center flex flex-col justify-between">
              <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 block mb-1">المساء</span>
              <span className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 tabular-nums">٢٦٪</span>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block mt-1">ذروة ثانية</span>
            </div>

          </div>
        </div>

      </div>

      {/* Developer & Raw Data Section */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
        <button
          onClick={() => setShowAdvancedJson(!showAdvancedJson)}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition-colors"
        >
          <Code className="w-4 h-4 text-slate-400" />
          <span>{showAdvancedJson ? 'إخفاء البيانات التقنية المتقدمة' : 'عرض السجل الخام وبيانات JSON'}</span>
        </button>

        {showAdvancedJson && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-950 text-slate-200 border border-slate-800 text-xs space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-sans">
                سجل التصدير الخام لبيانات المشترك:
              </span>
              <button
                onClick={copyJsonPayload}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1.5 transition"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الكود</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-teal-400 overflow-x-auto p-2 rounded bg-slate-900 text-[11px]">
              {JSON.stringify({ 
                week: selectedWeek, 
                participant: currentUser?.displayName, 
                tasksCount: tasks.length,
                completionAverage: '92.4%',
                timestamp: new Date().toISOString()
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
};� لطلب العميل) */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
        <button
          onClick={() => setShowAdvancedJson(!showAdvancedJson)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1.5 transition"
        >
          <Code className="w-4 h-4" />
          <span>خيارات متقدمة للمطورين (تصدير كود JSON)</span>
        </button>

        {showAdvancedJson && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto space-y-2">
            <p className="text-slate-400 text-xs font-sans">
              ℹ️ <strong>ما هو JSON؟</strong> هو تنسيق تقني قياسي لتبادل وأرشفة البيانات الخام بين الخوادم والتطبيقات، لا يحتاجه المستخدم العادي.
            </p>
            <pre className="text-teal-400">
              {JSON.stringify({ week: selectedWeek, participant: currentUser?.displayName, tasksCount: tasks.length }, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
};
