-- ============================================================
-- Journey of Change - Seed Data
-- ============================================================

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================

INSERT INTO system_settings (key, value, description) VALUES
  ('daily_success_percentage', '90.00', 'Daily completion threshold for success (percentage)'),
  ('weekly_required_success_days', '3', 'Number of successful days required for weekly streak'),
  ('monthly_required_success_weeks', '3', 'Number of successful weeks required for monthly streak'),
  ('partial_completion_ratio', '0.50', 'Ratio for partial completion points (0.50 = 50%)'),
  ('week_start', '"SUNDAY"', 'Week start day'),
  ('completion_calculation_mode', '"POINTS_BASED"', 'Completion calculation strategy: POINTS_BASED or TASK_COUNT_BASED'),
  ('project_timezone', 'null', 'Project timezone (MUST be configured before production use)'),
  ('monthly_week_attribution_mode', 'null', 'How to attribute cross-month weeks: null for unconfigured')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

COMMENT ON TABLE system_settings IS 'Global system configuration - editable by admin';

-- ============================================================
-- TASK CATEGORIES (9 categories as specified)
-- ============================================================

INSERT INTO task_categories (slug, name_ar, name_en, icon, color, sort_order) VALUES
  ('deen', 'دين', 'Religion', '🕌', '#4CAF50', 1),
  ('culture', 'ثقافة', 'Culture', '📚', '#2196F3', 2),
  ('sport', 'رياضة', 'Sports', '⚽', '#FF9800', 3),
  ('self-development', 'تطوير الذات', 'Self Development', '🎯', '#9C27B0', 4),
  ('skill', 'مهارة', 'Skill', '🛠️', '#00BCD4', 5),
  ('life', 'حياة', 'Life', '🌟', '#FFEB3B', 6),
  ('family', 'أهل وبيت', 'Family & Home', '👨‍👩‍👧‍👦', '#E91E63', 7),
  ('health', 'صحة', 'Health', '💪', '#4CAF50', 8),
  ('ethics', 'أخلاق', 'Ethics', '💎', '#673AB7', 9)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

-- ============================================================
-- TASK TYPES
-- ============================================================

INSERT INTO task_types (code, name_ar, name_en, ui_component_key, has_dedicated_page, default_config) VALUES
  ('QURAN', 'قرآن كريم', 'Holy Quran', 'QuranTask', true, '{"useQuranAPI": true}'::jsonb),
  ('ADHKAR', 'أذكار', 'Adhkar', 'AdhkarTask', false, '{}'::jsonb),
  ('PRAYER', 'صلاة', 'Prayer', 'PrayerTask', true, '{"prayers": ["FAJR", "DHUHR", "ASR", "MAGHRIB", "ISHA"]}'::jsonb),
  ('READING', 'قراءة', 'Reading', 'ReadingTask', false, '{"trackPages": true}'::jsonb),
  ('SPORT', 'رياضة', 'Sports', 'SportTask', false, '{"trackDuration": true}'::jsonb),
  ('WATER', 'ماء', 'Water', 'WaterTask', false, '{"trackAmount": true, "unit": "ml"}'::jsonb),
  ('SLEEP', 'نوم', 'Sleep', 'SleepTask', false, '{"trackDuration": true}'::jsonb),
  ('GENERAL', 'عام', 'General', 'GeneralTask', false, '{}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  ui_component_key = EXCLUDED.ui_component_key,
  has_dedicated_page = EXCLUDED.has_dedicated_page,
  default_config = EXCLUDED.default_config;

-- ============================================================
-- TITLES (3 titles explicitly requested by client)
-- ============================================================

INSERT INTO titles (slug, name_ar, name_en, description_ar, description_en, criteria) VALUES
  ('guardian-of-emerald', 'حارس الزمرد', 'Guardian of Emerald', 'لقب مرموق يُمنح للمتميزين', 'Prestigious title awarded to distinguished participants', '{}'::jsonb),
  ('master-of-consistency', 'سيد الاستمرارية', 'Master of Consistency', 'لقب يُمنح لمن يحافظ على الاستمرارية', 'Title awarded to those who maintain consistency', '{}'::jsonb),
  ('companion-of-quran', 'رفيق القرآن', 'Companion of Quran', 'لقب يُمنح لملازمي القرآن الكريم', 'Title awarded to devoted Quran readers', '{}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en;

COMMENT ON TABLE titles IS 'Title definitions - criteria to be implemented in business logic';

-- ============================================================
-- SAMPLE BADGE STRUCTURE (empty for now)
-- ============================================================

-- Badges will be defined later based on actual gamification rules
-- This demonstrates the structure only

INSERT INTO badges (slug, name_ar, name_en, description_ar, description_en, icon, rarity, criteria) VALUES
  ('first-day', 'اليوم الأول', 'First Day', 'أكمل أول يوم بنجاح', 'Complete your first successful day', '🎉', 'COMMON', '{"type": "first_successful_day"}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon,
  rarity = EXCLUDED.rarity,
  criteria = EXCLUDED.criteria;

-- ============================================================
-- NOTES
-- ============================================================

-- Participants: Do NOT create fake participants with fake PIN hashes here
-- Tasks: Global task definitions should be created by admin through the application
-- This seed file contains only core/structural data needed for the system to function
