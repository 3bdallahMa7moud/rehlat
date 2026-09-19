-- ============================================================
-- Journey of Change - Core Schema
-- ============================================================

-- ============================================================
-- PARTICIPANTS
-- ============================================================

CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(100) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'PARTICIPANT',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  pin_reset_required BOOLEAN NOT NULL DEFAULT false,
  failed_pin_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_role CHECK (role IN ('PARTICIPANT', 'ADMIN')),
  CONSTRAINT chk_failed_attempts CHECK (failed_pin_attempts >= 0)
);

-- Unique active display names (case-insensitive)
CREATE UNIQUE INDEX idx_participants_active_display_name
  ON participants (LOWER(display_name))
  WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX idx_participants_last_seen ON participants (last_seen_at DESC);
CREATE INDEX idx_participants_deleted ON participants (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER participants_updated_at BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE participants IS 'Application users - participants and admins';
COMMENT ON COLUMN participants.pin_hash IS 'Hashed PIN (never store plaintext)';

-- ============================================================
-- AUTH SESSIONS
-- ============================================================

CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  token_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_auth_sessions_participant ON auth_sessions (participant_id);
CREATE INDEX idx_auth_sessions_token_hash ON auth_sessions (token_hash);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions (expires_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE auth_sessions IS 'Authentication sessions (not daily work sessions)';

-- ============================================================
-- PARTICIPANT PRESENCE
-- ============================================================

CREATE TABLE participant_presence (
  participant_id UUID PRIMARY KEY REFERENCES participants(id),
  status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
  active_task_progress_id UUID,
  connected_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_status CHECK (status IN ('ONLINE', 'WORKING', 'PAUSED', 'IDLE', 'OFFLINE'))
);

CREATE INDEX idx_presence_status ON participant_presence (status);
CREATE INDEX idx_presence_heartbeat ON participant_presence (last_heartbeat_at DESC);

CREATE TRIGGER presence_updated_at BEFORE UPDATE ON participant_presence
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE participant_presence IS 'Real-time participant presence/online status';

-- ============================================================
-- TASK CATEGORIES
-- ============================================================

CREATE TABLE task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_sort ON task_categories (sort_order, name_ar);
CREATE INDEX idx_categories_active ON task_categories (is_active, sort_order);

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON task_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE task_categories IS 'Task categories (دين، ثقافة، رياضة، etc.)';

-- ============================================================
-- TASK TYPES
-- ============================================================

CREATE TABLE task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  ui_component_key VARCHAR(100),
  has_dedicated_page BOOLEAN NOT NULL DEFAULT false,
  default_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_types_code ON task_types (code);
CREATE INDEX idx_task_types_active ON task_types (is_active);

CREATE TRIGGER task_types_updated_at BEFORE UPDATE ON task_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE task_types IS 'Task type definitions (QURAN, PRAYER, READING, etc.)';

-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES task_categories(id),
  task_type_id UUID NOT NULL REFERENCES task_types(id),
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon VARCHAR(50),
  full_points INTEGER NOT NULL DEFAULT 10,
  partial_points INTEGER NOT NULL DEFAULT 5,
  configuration JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_points_valid CHECK (full_points >= 0 AND partial_points >= 0),
  CONSTRAINT chk_partial_lte_full CHECK (partial_points <= full_points)
);

CREATE INDEX idx_tasks_category ON tasks (category_id);
CREATE INDEX idx_tasks_type ON tasks (task_type_id);
CREATE INDEX idx_tasks_active ON tasks (is_active, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_deleted ON tasks (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE tasks IS 'Shared task definitions';
COMMENT ON COLUMN tasks.full_points IS 'Points awarded for FULL completion';
COMMENT ON COLUMN tasks.partial_points IS 'Points awarded for PARTIAL completion';

-- ============================================================
-- PARTICIPANT TASK PROFILES
-- ============================================================

CREATE TABLE participant_task_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  task_id UUID NOT NULL REFERENCES tasks(id),
  settings JSONB NOT NULL DEFAULT '{}',
  state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_participant_task UNIQUE (participant_id, task_id)
);

CREATE INDEX idx_participant_profiles_participant ON participant_task_profiles (participant_id);
CREATE INDEX idx_participant_profiles_task ON participant_task_profiles (task_id);

CREATE TRIGGER participant_profiles_updated_at BEFORE UPDATE ON participant_task_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE participant_task_profiles IS 'Participant-specific task configuration and persistent state';
COMMENT ON COLUMN participant_task_profiles.settings IS 'User configuration/preferences for this task';
COMMENT ON COLUMN participant_task_profiles.state IS 'Persistent progress state between days';

-- ============================================================
-- DAILY SESSIONS
-- ============================================================

CREATE TABLE daily_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  session_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  completion_percentage NUMERIC(5,2),
  earned_points INTEGER NOT NULL DEFAULT 0,
  possible_points INTEGER NOT NULL DEFAULT 0,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  is_successful BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_participant_session_date UNIQUE (participant_id, session_date),
  CONSTRAINT chk_status CHECK (status IN ('NOT_STARTED', 'ACTIVE', 'ENDED', 'AUTO_COMPLETED')),
  CONSTRAINT chk_completion_range CHECK (completion_percentage IS NULL OR (completion_percentage >= 0 AND completion_percentage <= 100)),
  CONSTRAINT chk_points_non_negative CHECK (earned_points >= 0 AND possible_points >= 0),
  CONSTRAINT chk_earned_lte_possible CHECK (earned_points <= possible_points),
  CONSTRAINT chk_active_seconds CHECK (active_seconds >= 0),
  CONSTRAINT chk_ended_after_started CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX idx_daily_sessions_participant ON daily_sessions (participant_id, session_date DESC);
CREATE INDEX idx_daily_sessions_date ON daily_sessions (session_date DESC);
CREATE INDEX idx_daily_sessions_status ON daily_sessions (status);
CREATE INDEX idx_daily_sessions_successful ON daily_sessions (is_successful, session_date DESC);

CREATE TRIGGER daily_sessions_updated_at BEFORE UPDATE ON daily_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE daily_sessions IS 'Daily work sessions - one per participant per day';
COMMENT ON COLUMN daily_sessions.session_date IS 'Project date (not necessarily UTC date)';
COMMENT ON COLUMN daily_sessions.is_successful IS 'True if completion >= daily success threshold';

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================

CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE system_settings IS 'Global system configuration';
COMMENT ON COLUMN system_settings.value IS 'Setting value as JSON (supports strings, numbers, booleans, objects)';
