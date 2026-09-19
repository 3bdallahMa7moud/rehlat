// تعريفات النماذج والأنواع المطابقة لقاعدة بيانات PostgreSQL لمشروع رحلة التغيير

export type UserRole = 'ADMIN' | 'PARTICIPANT';

export type PresenceStatus = 'ONLINE' | 'WORKING' | 'PAUSED' | 'IDLE' | 'OFFLINE';

export type TaskCompletionStatus = 
  | 'NOT_STARTED' 
  | 'IN_PROGRESS' 
  | 'PAUSED' 
  | 'COMPLETED_FULL'      // إنجاز كامل = 100% النقاط
  | 'COMPLETED_PARTIAL'   // إنجاز جزئي = 50% النقاط
  | 'NOT_COMPLETED';      // عدم إنجاز / إغلاق دون إكمال مع حفظ الوقت

export type CategorySlug = 
  | 'deen' 
  | 'culture' 
  | 'sport' 
  | 'self-development' 
  | 'skill' 
  | 'life' 
  | 'family' 
  | 'health' 
  | 'ethics';

export interface Participant {
  id: string;
  displayName: string;
  role: UserRole;
  avatarUrl: string;
  pin: string;
  rankTitle: string;        // رتبة الشرف: حارس الزمرد، رفيق القرآن...
  jobTitle: string;         // المسمى أو الدور: مهندس، طالب، رائد أعمال...
  presence: PresenceStatus;
  lastSeenAt: string;
  currentStreakDays: number;
  isStreakAtRisk: boolean;  // هل الـ Streak في خطر اليوم؟
  totalPoints: number;
  todayPoints: number;
  isActive: boolean;
}

export interface TaskCategory {
  id: string;
  slug: CategorySlug;
  nameAr: string;
  icon: string;
  color: string;
  bgGradient: string;
}

export interface TaskItem {
  id: string;
  categoryId: CategorySlug;
  typeCode: 'QURAN' | 'ADHKAR' | 'PRAYER' | 'READING' | 'SPORT' | 'WATER' | 'SLEEP' | 'MEDITATION' | 'GENERAL';
  title: string;
  subtitle: string;
  fullPoints: number;
  partialPoints: number;
  earnedPoints: number;
  status: TaskCompletionStatus;
  elapsedSeconds: number; // الوقت الفعلي المسجل بالثواني بدقة
  isTimerRunning: boolean;
  
  // بيانات مخصصة لطبيعة المهمة
  meta: {
    bookTitle?: string;
    targetPages?: number;
    currentPages?: number;
    sportActivity?: string;
    targetDurationMinutes?: number;
    targetWaterCups?: number;
    currentWaterCups?: number;
    sleepHours?: number;
    prayersCompleted?: string[]; // FAJR, DHUHR, ASR, MAGHRIB, ISHA
    quranSurah?: string;
    quranAyah?: number;
    tafsirSummary?: string;
  };
}

export interface ActivityEvent {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  type: 'STARTED' | 'PAUSED' | 'RESUMED' | 'FINISHED_FULL' | 'FINISHED_PARTIAL' | 'CLOSED' | 'LOGIN' | 'CHEER';
  taskTitle?: string;
  categorySlug?: CategorySlug;
  timestamp: string;
  timeFormatted: string;
  cheerMessage?: string;
}

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'EMERALD';
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface DaySession {
  date: string;
  formattedArabicDate: string;
  isDayStarted: boolean;
  isDayEnded: boolean;
  dayStartedAt?: string;
  dayEndedAt?: string;
  successThresholdPercent: number; // 90.00%
  completionPercentage: number;
  isSuccessful: boolean;
}
