import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import confetti from 'canvas-confetti';
import type { 
  Participant, 
  TaskItem, 
  ActivityEvent, 
  TaskCompletionStatus, 
  DaySession 
} from '../types';
import { 
  INITIAL_PARTICIPANTS, 
  INITIAL_TASKS, 
  INITIAL_ACTIVITIES, 
  INITIAL_CATEGORIES 
} from './mockData';

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'cheer';
  title: string;
  message: string;
}

interface AppContextType {
  // الثيم
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // المصادقة
  currentUser: Participant | null;
  login: (pin: string, participantId?: string) => boolean;
  logout: () => void;
  switchUserFast: (participantId: string) => void;
  
  // المشاركون
  participants: Participant[];
  
  // جلسة اليوم وحساب الـ 90%
  daySession: DaySession;
  startDay: () => void;
  endDay: () => void;
  finishAllTasks: () => void;
  
  // المهام والمؤقتات
  tasks: TaskItem[];
  activeTask: TaskItem | null;
  activeDrawerTask: TaskItem | null;
  openTaskDrawer: (task: TaskItem) => void;
  closeTaskDrawer: () => void;
  startTask: (taskId: string) => void;
  pauseTask: (taskId: string) => void;
  resumeTask: (taskId: string) => void;
  completeTask: (taskId: string, degree: 'FULL' | 'PARTIAL' | 'NOT_COMPLETED') => void;
  updateTaskMeta: (taskId: string, metaPatch: Partial<TaskItem['meta']>) => void;
  
  // ما يحدث الآن والنشاط المباشر
  activities: ActivityEvent[];
  sendCheer: (targetParticipantId: string, message?: string) => void;
  
  // الإشعارات والصوت
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  playNotificationSound: (type?: 'success' | 'tap' | 'cheer') => void;
  isSoundMuted: boolean;
  toggleSound: () => void;

  // البوت الذكي
  isBotOpen: boolean;
  setBotOpen: (open: boolean) => void;
  botMessage: string;
  askBotForTaskRecommendation: () => void;

  // لوحة الإدارة الآمنة
  adminResetPin: (participantId: string, newPin: string) => boolean;
  adminToggleUserStatus: (participantId: string) => void;
  adminClearData: (scope: 'DAY' | 'WEEK' | 'MONTH' | 'USER', targetId?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. الثيم: الافتراضي لايت، وإذا غيّره المستخدم إلى دارك يُحفظ ويبقى دارك
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('rehlat_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light'; // الافتراضي لايت كما طلب المستخدم
  });

  useEffect(() => {
    localStorage.setItem('rehlat_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // 2. الصوت
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(() => {
    return localStorage.getItem('rehlat_muted') === 'true';
  });

  const toggleSound = () => {
    setIsSoundMuted(prev => {
      const next = !prev;
      localStorage.setItem('rehlat_muted', String(next));
      return next;
    });
  };

  const playNotificationSound = (type: 'success' | 'tap' | 'cheer' = 'tap') => {
    if (isSoundMuted) return;
    try {
      // استخدام Web Audio API لتوليد نغمات نقية وخفيفة دون الحاجة لملفات صوتية ثقيلة
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'cheer') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // نقرة خفيفة
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // متصفحات قد تقيد الصوت قبل التفاعل الأول
    }
  };

  // 3. المشاركون والمصادقة
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('rehlat_participants');
    return saved ? JSON.parse(saved) : INITIAL_PARTICIPANTS;
  });

  const [currentUser, setCurrentUser] = useState<Participant | null>(() => {
    const savedId = localStorage.getItem('rehlat_current_user_id');
    const list = INITIAL_PARTICIPANTS;
    if (savedId) {
      const found = list.find(p => p.id === savedId);
      if (found) return found;
    }
    return INITIAL_PARTICIPANTS[0]; // الدخول الافتراضي بعبدالله للتجربة المباشرة
  });

  useEffect(() => {
    localStorage.setItem('rehlat_participants', JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('rehlat_current_user_id', currentUser.id);
    } else {
      localStorage.removeItem('rehlat_current_user_id');
    }
  }, [currentUser]);

  // 4. المهام
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('rehlat_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  useEffect(() => {
    localStorage.setItem('rehlat_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // 5. المؤقت التلقائي للمهمة النشطة
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prevTasks => {
        let hasRunning = false;
        const updated = prevTasks.map(task => {
          if (task.isTimerRunning && task.status === 'IN_PROGRESS') {
            hasRunning = true;
            return { ...task, elapsedSeconds: task.elapsedSeconds + 1 };
          }
          return task;
        });
        return hasRunning ? updated : prevTasks;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // المهمة النشطة حالياً
  const activeTask = tasks.find(t => t.isTimerRunning && t.status === 'IN_PROGRESS') || null;

  // 6. جلسة اليوم والنسبة المئوية
  const [daySession, setDaySession] = useState<DaySession>(() => {
    return {
      date: new Date().toISOString().split('T')[0],
      formattedArabicDate: 'السبت، ١٩ سبتمبر ٢٠٢٦',
      isDayStarted: true,
      isDayEnded: false,
      successThresholdPercent: 90.0,
      completionPercentage: 65,
      isSuccessful: false,
    };
  });

  // إعادة حساب نسبة إنجاز اليوم بناء على مجموع النقاط
  useEffect(() => {
    const totalMaxPoints = tasks.reduce((sum, t) => sum + t.fullPoints, 0);
    const earnedPoints = tasks.reduce((sum, t) => sum + t.earnedPoints, 0);
    const percent = totalMaxPoints > 0 ? Math.round((earnedPoints / totalMaxPoints) * 100) : 0;
    
    setDaySession(prev => ({
      ...prev,
      completionPercentage: percent,
      isSuccessful: percent >= prev.successThresholdPercent,
    }));
  }, [tasks]);

  // 7. الإشعارات
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast-' + Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };
  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 8. سجل النشاط المباشر
  const [activities, setActivities] = useState<ActivityEvent[]>(INITIAL_ACTIVITIES);

  const addActivity = (event: Omit<ActivityEvent, 'id' | 'timestamp' | 'timeFormatted'>) => {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newEvent: ActivityEvent = {
      ...event,
      id: 'act-' + Date.now(),
      timestamp: now.toISOString(),
      timeFormatted,
    };
    setActivities(prev => [newEvent, ...prev.slice(0, 49)]); // احتفظ بآخر 50 حدث
  };

  // 9. النافذة المنبثقة للمهمة (Task Drawer)
  const [activeDrawerTask, setActiveDrawerTask] = useState<TaskItem | null>(null);
  const openTaskDrawer = (task: TaskItem) => {
    playNotificationSound('tap');
    setActiveDrawerTask(task);
  };
  const closeTaskDrawer = () => {
    setActiveDrawerTask(null);
  };

  // 10. إجراءات اليوم
  const startDay = () => {
    setDaySession(prev => ({ ...prev, isDayStarted: true, dayStartedAt: new Date().toISOString() }));
    playNotificationSound('success');
    addToast({
      type: 'success',
      title: 'بداية مباركة!',
      message: 'تم بدء يومك بنجاح. استعن بالله وانطلق في رحلة اليوم 🚀',
    });
    if (currentUser) {
      addActivity({
        participantId: currentUser.id,
        participantName: currentUser.displayName,
        participantAvatar: currentUser.avatarUrl,
        type: 'STARTED',
        taskTitle: 'بدء رحلة اليوم',
      });
    }
  };

  const endDay = () => {
    setDaySession(prev => ({ ...prev, isDayEnded: true, dayEndedAt: new Date().toISOString() }));
    const isSuccess = daySession.completionPercentage >= daySession.successThresholdPercent;
    
    if (isSuccess) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00A896', '#F59E0B', '#3B185F', '#00F5D4'],
      });
      playNotificationSound('success');
      addToast({
        type: 'success',
        title: 'يوم ناجح ومبهر! 🌟🔥',
        message: `حققت ${daySession.completionPercentage}% وتجاوزت عتبة الـ 90%! تم تعزيز الـ Streak بنجاح.`,
      });
    } else {
      addToast({
        type: 'warning',
        title: 'تم إنهاء اليوم',
        message: `نسبة إنجازك اليوم ${daySession.completionPercentage}%. غداً فرصة جديدة للتعويض وحماية الـ Streak!`,
      });
    }

    if (currentUser) {
      addActivity({
        participantId: currentUser.id,
        participantName: currentUser.displayName,
        participantAvatar: currentUser.avatarUrl,
        type: 'FINISHED_FULL',
        taskTitle: 'إنهاء اليوم',
      });
    }
  };

  const finishAllTasks = () => {
    setTasks(prev => 
      prev.map(t => ({
        ...t,
        status: 'COMPLETED_FULL',
        earnedPoints: t.fullPoints,
        isTimerRunning: false,
      }))
    );
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#10B981', '#F59E0B', '#00F5D4'],
    });
    playNotificationSound('success');
    addToast({
      type: 'success',
      title: 'ما شاء الله! إنجاز أسطوري 🔥',
      message: 'تم إنهاء جميع مهام اليوم بنجاح كامل 100%! كفو عليك.',
    });
  };

  // 11. إجراءات المهمة
  const startTask = (taskId: string) => {
    setTasks(prev => 
      prev.map(t => {
        if (t.id === taskId) {
          return { ...t, status: 'IN_PROGRESS', isTimerRunning: true };
        }
        // إيقاف أي مهمة أخرى قيد التشغيل لتركيز واحد
        if (t.isTimerRunning) {
          return { ...t, isTimerRunning: false, status: 'PAUSED' };
        }
        return t;
      })
    );
    playNotificationSound('tap');
    const target = tasks.find(t => t.id === taskId);
    if (target && currentUser) {
      addActivity({
        participantId: currentUser.id,
        participantName: currentUser.displayName,
        participantAvatar: currentUser.avatarUrl,
        type: 'STARTED',
        taskTitle: target.title,
        categorySlug: target.categoryId,
      });
      addToast({
        type: 'info',
        title: 'بدأت المهمة',
        message: `تم بدء مؤقت «${target.title}». ركز وأبدع!`,
      });
    }
  };

  const pauseTask = (taskId: string) => {
    setTasks(prev => 
      prev.map(t => (t.id === taskId ? { ...t, isTimerRunning: false, status: 'PAUSED' } : t))
    );
    playNotificationSound('tap');
    const target = tasks.find(t => t.id === taskId);
    if (target && currentUser) {
      addActivity({
        participantId: currentUser.id,
        participantName: currentUser.displayName,
        participantAvatar: currentUser.avatarUrl,
        type: 'PAUSED',
        taskTitle: target.title,
        categorySlug: target.categoryId,
      });
    }
  };

  const resumeTask = (taskId: string) => {
    setTasks(prev => 
      prev.map(t => (t.id === taskId ? { ...t, isTimerRunning: true, status: 'IN_PROGRESS' } : t))
    );
    playNotificationSound('tap');
    const target = tasks.find(t => t.id === taskId);
    if (target && currentUser) {
      addActivity({
        participantId: currentUser.id,
        participantName: currentUser.displayName,
        participantAvatar: currentUser.avatarUrl,
        type: 'RESUMED',
        taskTitle: target.title,
        categorySlug: target.categoryId,
      });
    }
  };

  const completeTask = (taskId: string, degree: 'FULL' | 'PARTIAL' | 'NOT_COMPLETED') => {
    let earned = 0;
    let status: TaskCompletionStatus = 'NOT_COMPLETED';

    setTasks(prev => 
      prev.map(t => {
        if (t.id === taskId) {
          if (degree === 'FULL') {
            earned = t.fullPoints;
            status = 'COMPLETED_FULL';
          } else if (degree === 'PARTIAL') {
            earned = t.partialPoints;
            status = 'COMPLETED_PARTIAL';
          } else {
            earned = 0;
            status = 'NOT_COMPLETED';
          }
          return {
            ...t,
            status,
            earnedPoints: earned,
            isTimerRunning: false,
          };
        }
        return t;
      })
    );

    const target = tasks.find(t => t.id === taskId);
    if (degree === 'FULL') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
      playNotificationSound('success');
      addToast({
        type: 'success',
        title: 'إنجاز كامل! 🟢',
        message: `أحسنت! كسبت ${earned} نقطة في «${target?.title}».`,
      });
    } else if (degree === 'PARTIAL') {
      playNotificationSound('tap');
      addToast({
        type: 'info',
        title: 'إنجاز جزئي 🟡',
        message: `تم تسجيل نصف النقاط (${earned} نقطة) في «${target?.title}».`,
      });
    } else {
      addToast({
        type: 'info',
        title: 'تم إغلاق المهمة ⚪',
        message: 'تم حفظ الوقت المنقضي في السجل التاريخي دون احتساب نقاط.',
      });
    }

    if (target && currentUser) {
      addActivity({
        participantId: currentUser.id,
        participantName: currentUser.displayName,
        participantAvatar: currentUser.avatarUrl,
        type: degree === 'FULL' ? 'FINISHED_FULL' : degree === 'PARTIAL' ? 'FINISHED_PARTIAL' : 'CLOSED',
        taskTitle: target.title,
        categorySlug: target.categoryId,
      });
    }

    // إغلاق نافذة المهمة إن كانت مفتوحة
    setActiveDrawerTask(null);
  };

  const updateTaskMeta = (taskId: string, metaPatch: Partial<TaskItem['meta']>) => {
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, meta: { ...t.meta, ...metaPatch } } : t)
    );
  };

  // 12. إرسال التشجيع المباشر
  const sendCheer = (targetParticipantId: string, customMessage?: string) => {
    const target = participants.find(p => p.id === targetParticipantId);
    if (!target || !currentUser) return;

    const message = customMessage || `أرسل لك ${currentUser.displayName} طاقة تشجيعية: استمر يا بطل، فخورين بإنجازك! 🔥`;
    
    addActivity({
      participantId: currentUser.id,
      participantName: currentUser.displayName,
      participantAvatar: currentUser.avatarUrl,
      type: 'CHEER',
      cheerMessage: `أرسل تشجيعاً لـ ${target.displayName}: «${customMessage || 'كفو عليك واستمر! 🔥'}»`,
    });

    playNotificationSound('cheer');
    addToast({
      type: 'cheer',
      title: `تم إرسال التشجيع لـ ${target.displayName}! 📣`,
      message,
    });
  };

  // 13. المساعد الذكي
  const [isBotOpen, setBotOpen] = useState(false);
  const [botMessage, setBotMessage] = useState(
    'أهلاً بك يا بطل في رحلة التغيير! 🔥 أداؤك رائع اليوم؛ باقي لك خطوة بسيطة ونقفل هدف الـ 90% كاملاً!'
  );

  const askBotForTaskRecommendation = () => {
    const incomplete = tasks.find(t => t.status !== 'COMPLETED_FULL');
    if (incomplete) {
      setBotMessage(`أقترح عليك البدء في «${incomplete.title}» الآن! مدتها مناسبة وستقربك جداً من حماية الستريك اليوم ⚡`);
      addToast({
        type: 'info',
        title: 'اقتراح الذكاء الاصطناعي 🤖',
        message: `المساعد يقترح عليك: «${incomplete.title}». اضغط لبدء الإنجاز!`,
      });
      openTaskDrawer(incomplete);
    } else {
      setBotMessage('ما شاء الله عليك! أنهيت كل المهام اليوم. خذ قسطاً من الراحة واستمتع بإنجازك المبارك 🌟');
    }
  };

  // 14. تسجيل الدخول
  const login = (pin: string, participantId?: string): boolean => {
    const targetUser = participantId 
      ? participants.find(p => p.id === participantId)
      : participants.find(p => p.pin === pin);

    if (targetUser && (participantId || targetUser.pin === pin)) {
      setCurrentUser(targetUser);
      playNotificationSound('success');
      addToast({
        type: 'success',
        title: `مرحباً بعودتك، ${targetUser.displayName}! ✨`,
        message: `رتبتك الحالية: ${targetUser.rankTitle}`,
      });
      addActivity({
        participantId: targetUser.id,
        participantName: targetUser.displayName,
        participantAvatar: targetUser.avatarUrl,
        type: 'LOGIN',
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    playNotificationSound('tap');
    addToast({
      type: 'info',
      title: 'تم تسجيل الخروج',
      message: 'نراك قريباً على خير في رحلة التغيير.',
    });
  };

  const switchUserFast = (participantId: string) => {
    const u = participants.find(p => p.id === participantId);
    if (u) {
      setCurrentUser(u);
      playNotificationSound('tap');
      addToast({
        type: 'info',
        title: `تم التبديل إلى: ${u.displayName}`,
        message: u.role === 'ADMIN' ? 'صلاحيات المشرف مفعلة 🛡️' : 'حساب مشارك',
      });
    }
  };

  // 15. لوحة الإدارة
  const adminResetPin = (participantId: string, newPin: string) => {
    setParticipants(prev => 
      prev.map(p => p.id === participantId ? { ...p, pin: newPin } : p)
    );
    addToast({
      type: 'success',
      title: 'تم إعادة تعيين الـ PIN بنجاح',
      message: `تم تحديث الرقم السري للمشارك وتفعيله فوراً: ${newPin}`,
    });
    return true;
  };

  const adminToggleUserStatus = (participantId: string) => {
    setParticipants(prev => 
      prev.map(p => p.id === participantId ? { ...p, isActive: !p.isActive } : p)
    );
    addToast({
      type: 'info',
      title: 'تم تحديث حالة المشارك',
      message: 'تم الحفظ بأمان مع الاحتفاظ بكافة السجلات والستريك دون حذف.',
    });
  };

  const adminClearData = (scope: 'DAY' | 'WEEK' | 'MONTH' | 'USER') => {
    if (scope === 'DAY') {
      setTasks(prev => prev.map(t => ({ ...t, status: 'NOT_STARTED', earnedPoints: 0, elapsedSeconds: 0, isTimerRunning: false })));
      addToast({
        type: 'info',
        title: 'تم مسح مهام اليوم بأمان',
        message: 'تمت إعادة تعيين مهام اليوم مع الحفاظ على السجلات التاريخية.',
      });
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        currentUser,
        login,
        logout,
        switchUserFast,
        participants,
        daySession,
        startDay,
        endDay,
        finishAllTasks,
        tasks,
        activeTask,
        activeDrawerTask,
        openTaskDrawer,
        closeTaskDrawer,
        startTask,
        pauseTask,
        resumeTask,
        completeTask,
        updateTaskMeta,
        activities,
        sendCheer,
        toasts,
        dismissToast,
        playNotificationSound,
        isSoundMuted,
        toggleSound,
        isBotOpen,
        setBotOpen,
        botMessage,
        askBotForTaskRecommendation,
        adminResetPin,
        adminToggleUserStatus,
        adminClearData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
