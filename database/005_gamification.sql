-- ============================================================
-- Journey of Change - Gamification (Streaks, Badges, Titles)
-- ============================================================

-- ============================================================
-- STREAK PERIOD RESULTS
-- ============================================================

CREATE TABLE streak_period_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  task_id UUID REFERENCES tasks(id),
  scope VARCHAR(20) NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  completion_percentage NUMERIC(5,2),
  qualified BOOLEAN NOT NULL DEFAULT false,
  successful_days INTEGER DEFAULT 0,
  successful_weeks INTEGER DEFAULT 0,
  consecutive_count INTEGER NOT NULL DEFAULT 0,
  best_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_scope CHECK (scope IN ('OVERALL', 'TASK')),
  CONSTRAINT chk_period_type CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY')),
  CONSTRAINT chk_task_scope CHECK ((scope = 'TASK' AND task_id IS NOT NULL) OR (scope = 'OVERALL' AND task_id IS NULL)),
  CONSTRAINT chk_completion_percentage CHECK (completion_percentage IS NULL OR (completion_percentage >= 0 AND completion_percentage <= 100)),
  CONSTRAINT chk_successful_days CHECK (successful_days >= 0),
  CONSTRAINT chk_successful_weeks CHECK (successful_weeks >= 0),
  CONSTRAINT chk_consecutive_count CHECK (consecutive_count >= 0),
  CONSTRAINT chk_best_count CHECK (best_count >= 0),
  CONSTRAINT chk_period_end_after_start CHECK (period_end >= period_start)
);

-- Prevent duplicate period results
CREATE UNIQUE INDEX idx_streak_period_unique_overall
  ON streak_period_results (participant_id, scope, period_type, period_start, period_end)
  WHERE task_id IS NULL;

CREATE UNIQUE INDEX idx_streak_period_unique_task
  ON streak_period_results (participant_id, task_id, scope, period_type, period_start, period_end)
  WHERE task_id IS NOT NULL;

CREATE INDEX idx_streak_participant ON streak_period_results (participant_id, period_type, period_end DESC);
CREATE INDEX idx_streak_task ON streak_period_results (task_id, period_end DESC) WHERE task_id IS NOT NULL;
CREATE INDEX idx_streak_qualified ON streak_period_results (qualified, period_end DESC);

CREATE TRIGGER streak_period_updated_at BEFORE UPDATE ON streak_period_results
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE streak_period_results IS 'Generalized streak tracking for daily/weekly/monthly periods, overall and per-task';
COMMENT ON COLUMN streak_period_results.scope IS 'OVERALL for participant-wide streaks, TASK for specific task streaks';
COMMENT ON COLUMN streak_period_results.qualified IS 'Whether this period met the success criteria';
COMMENT ON COLUMN streak_period_results.consecutive_count IS 'Current consecutive streak count';
COMMENT ON COLUMN streak_period_results.best_count IS 'Best streak count ever achieved';

-- ============================================================
-- BADGES
-- ============================================================

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon VARCHAR(50),
  rarity VARCHAR(20) DEFAULT 'COMMON',
  criteria JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_rarity CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY'))
);

CREATE INDEX idx_badges_slug ON badges (slug);
CREATE INDEX idx_badges_active ON badges (is_active);
CREATE INDEX idx_badges_rarity ON badges (rarity);

CREATE TRIGGER badges_updated_at BEFORE UPDATE ON badges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE badges IS 'Badge definitions';
COMMENT ON COLUMN badges.criteria IS 'Badge earning criteria (JSON - to be implemented in business logic)';

-- ============================================================
-- PARTICIPANT BADGES
-- ============================================================

CREATE TABLE participant_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  badge_id UUID NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

-- Prevent duplicate one-time badge awards (unless badge explicitly supports repeatability)
CREATE UNIQUE INDEX idx_participant_badges_unique
  ON participant_badges (participant_id, badge_id);

CREATE INDEX idx_participant_badges_participant ON participant_badges (participant_id, earned_at DESC);
CREATE INDEX idx_participant_badges_badge ON participant_badges (badge_id, earned_at DESC);

COMMENT ON TABLE participant_badges IS 'Badges earned by participants';
COMMENT ON COLUMN participant_badges.metadata IS 'Additional context about when/how badge was earned';

-- ============================================================
-- TITLES
-- ============================================================

CREATE TABLE titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  criteria JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_titles_slug ON titles (slug);
CREATE INDEX idx_titles_active ON titles (is_active);

CREATE TRIGGER titles_updated_at BEFORE UPDATE ON titles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE titles IS 'Title/rank definitions';
COMMENT ON COLUMN titles.criteria IS 'Title earning criteria (JSON - to be implemented in business logic)';

-- ============================================================
-- PARTICIPANT TITLES
-- ============================================================

CREATE TABLE participant_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  title_id UUID NOT NULL REFERENCES titles(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_current BOOLEAN NOT NULL DEFAULT false
);

-- Only one current title per participant
CREATE UNIQUE INDEX idx_participant_titles_current_unique
  ON participant_titles (participant_id)
  WHERE is_current = true;

-- Prevent duplicate title awards
CREATE UNIQUE INDEX idx_participant_titles_unique
  ON participant_titles (participant_id, title_id);

CREATE INDEX idx_participant_titles_participant ON participant_titles (participant_id, earned_at DESC);
CREATE INDEX idx_participant_titles_title ON participant_titles (title_id, earned_at DESC);
CREATE INDEX idx_participant_titles_current ON participant_titles (is_current) WHERE is_current = true;

COMMENT ON TABLE participant_titles IS 'Titles earned by participants';
COMMENT ON COLUMN participant_titles.is_current IS 'Only one current title per participant';
