import React, { useState } from 'react';
import { useApp } from './store/AppContext';
import { Navbar } from './components/layout/Navbar';
import { StickyActivityBar } from './components/layout/StickyActivityBar';
import { Footer } from './components/layout/Footer';
import { ToastContainer } from './components/common/ToastContainer';
import { FloatingAIBot } from './components/bot/FloatingAIBot';
import { LoginPage } from './components/auth/LoginPage';
import { TaskDrawerContainer } from './components/tasks/TaskDrawerContainer';

// أقسام الشاشة الرئيسية
import { TodayHero } from './components/today/TodayHero';
import { StreakDangerBanner } from './components/alerts/StreakDangerBanner';
import { DailyProgressCard } from './components/today/DailyProgressCard';
import { QuickActions } from './components/today/QuickActions';
import { JourneyStations } from './components/today/JourneyStations';
import { WhatIsHappeningNow } from './components/live/WhatIsHappeningNow';
import { WhoIsOnlineNow } from './components/live/WhoIsOnlineNow';

// الصفحات والتبويبات المستقلة
import { HallOfFame } from './components/leaderboard/HallOfFame';
import { FocusPage } from './components/focus/FocusPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { AdminPanel } from './components/admin/AdminPanel';

import { 
  Home, 
  Trophy, 
  Target, 
  BarChart3, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';

type TabType = 'today' | 'leaderboard' | 'focus' | 'reports' | 'admin';

export const MainApp: React.FC = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('today');

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      
      {/* الإشعارات العلوية السريعة */}
      <ToastContainer />

      {/* الشريط العلوي مع اللوجو والتحكم */}
      <Navbar />

      {/* شريط التبويبات الرئيسي الاحترافي (Segmented Control عالي الحرفية) */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5">
        <div className="flex items-center justify-between overflow-x-auto p-1.5 rounded-2xl bg-slate-200/50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/5 backdrop-blur-md gap-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
          
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 btn-press shrink-0 ${
                activeTab === 'today'
                  ? 'bg-white dark:bg-[#182033] text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-slate-900/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-white/5'
              }`}
            >
              <Home className={`w-4 h-4 ${activeTab === 'today' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
              <span>رحلة اليوم</span>
              {activeTab === 'today' && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 btn-press shrink-0 ${
                activeTab === 'leaderboard'
                  ? 'bg-white dark:bg-[#182033] text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-slate-900/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-white/5'
              }`}
            >
              <Trophy className={`w-4 h-4 ${activeTab === 'leaderboard' ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>لوحة الشرف والرتب</span>
            </button>

            <button
              onClick={() => setActiveTab('focus')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 btn-press shrink-0 ${
                activeTab === 'focus'
                  ? 'bg-white dark:bg-[#182033] text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-slate-900/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-white/5'
              }`}
            >
              <Target className={`w-4 h-4 ${activeTab === 'focus' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
              <span>جلسة التركيز</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 btn-press shrink-0 ${
                activeTab === 'reports'
                  ? 'bg-white dark:bg-[#182033] text-slate-900 dark:text-white shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-slate-900/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-white/5'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${activeTab === 'reports' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span>التقارير والأسابيع</span>
            </button>
          </div>

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 btn-press shrink-0 ${
                activeTab === 'admin'
                  ? 'bg-[#3b185f] text-white shadow-sm ring-1 ring-purple-500/30'
                  : 'text-purple-700 dark:text-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>لوحة المشرف</span>
            </button>
          )}

        </div>
      </div>

      {/* المحتوى الرئيسي للتبويب النشط */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* ======================== تبويب: رحلة اليوم ======================== */}
        {activeTab === 'today' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* الترحيب وحكمة الصباح وصورة القهوة */}
            <TodayHero />

            {/* تنبيه هل الـ Streak في خطر مع زر التوجيه المباشر للمهمة */}
            <StreakDangerBanner />

            {/* كارت التقدم اليومي المفسر مع إبراز شرط الـ 90% */}
            <DailyProgressCard />

            {/* أزرار الإجراءات السريعة (بدء اليوم، إنهائه، إنهاء الكل) */}
            <QuickActions />

            {/* محطات الرحلة (التصنيفات الـ 9 مع تقاطيع الستريك والتحكم السريع) */}
            <JourneyStations />

            {/* شبكة البث المباشر (ما يحدث الآن + من المتصل الآن) استجابة للتصميم الثاني */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
              <WhatIsHappeningNow />
              <WhoIsOnlineNow />
            </div>
          </div>
        )}

        {/* ======================== تبويب: لوحة الشرف والرتب ======================== */}
        {activeTab === 'leaderboard' && <HallOfFame />}

        {/* ======================== تبويب: جلسة التركيز ======================== */}
        {activeTab === 'focus' && <FocusPage />}

        {/* ======================== تبويب: التقارير والأسابيع ======================== */}
        {activeTab === 'reports' && <ReportsPage />}

        {/* ======================== تبويب: الإدارة ======================== */}
        {activeTab === 'admin' && <AdminPanel />}

      </main>

      {/* تذييل الصفحة Footer بتوقيع المشروع */}
      <Footer />

      {/* الشريط الثابت للمهمة الجارية والقادمة */}
      <StickyActivityBar />

      {/* نافذة المهمة التخصصية المنزلقة السلسة (Task Drawer) */}
      <TaskDrawerContainer />

      {/* البوت الذكي العائم التفاعلي */}
      <FloatingAIBot />

    </div>
  );
};

export default function App() {
  return <MainApp />;
}
