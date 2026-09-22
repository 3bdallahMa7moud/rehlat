import type { ComponentType } from 'react';
import { BookOpen, Bot, CircleDashed, Crown, Droplets, Dumbbell, Flame, Medal, Moon, Sparkles, Trophy, type LucideProps } from 'lucide-react';
import { AppIcon } from '@/components/ui/AppIcon';
import type { TaskType } from '@/types/models';

export type VisualTone = 'primary' | 'teal' | 'success' | 'warning';
type ActivityIconComponent = ComponentType<LucideProps> | 'mosque' | 'quran';

export type ActivityVisual = {
  icon: ActivityIconComponent;
  label: string;
  tone: VisualTone;
};

/** The single visual reference for activities and their related product areas. */
export const activityVisuals: Record<TaskType | 'streak' | 'awards' | 'titles' | 'reports' | 'ai', ActivityVisual> = {
  prayer: { icon: 'mosque', label: 'الصلاة', tone: 'primary' },
  quran: { icon: 'quran', label: 'القرآن', tone: 'primary' },
  adhkar: { icon: Sparkles, label: 'الأذكار', tone: 'teal' },
  reading: { icon: BookOpen, label: 'القراءة', tone: 'teal' },
  sport: { icon: Dumbbell, label: 'الرياضة', tone: 'warning' },
  water: { icon: Droplets, label: 'الماء', tone: 'teal' },
  sleep: { icon: Moon, label: 'النوم', tone: 'primary' },
  general: { icon: CircleDashed, label: 'مهمة عامة', tone: 'success' },
  streak: { icon: Flame, label: 'السلسلة', tone: 'warning' },
  awards: { icon: Trophy, label: 'الجوائز', tone: 'warning' },
  titles: { icon: Crown, label: 'الألقاب', tone: 'primary' },
  reports: { icon: Medal, label: 'التقارير', tone: 'teal' },
  ai: { icon: Bot, label: 'المساعد', tone: 'primary' },
};

export function ActivityIcon({ type, size = 24 }: { type: keyof typeof activityVisuals; size?: number }) {
  const icon = activityVisuals[type].icon;
  if (icon === 'mosque' || icon === 'quran') return <AppIcon name={icon} size={size} />;
  const Icon = icon;
  return <Icon size={size} />;
}
