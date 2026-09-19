-- ============================================================
-- Journey of Change - Task-Specific Tracking
-- ============================================================

-- ============================================================
-- QURAN READING LOGS
-- ============================================================

CREATE TABLE quran_reading_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  daily_task_progress_id UUID NOT NULL REFERENCES daily_task_progress(id),
  surah_from INTEGER,
  ayah_from INTEGER,
  page_from INTEGER,
  surah_to INTEGER,
  ayah_to INTEGER,
  page_to INTEGER,
  verses_read INTEGER,
  pages_read INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_quran_surah_from CHECK (surah_from IS NULL OR (surah_from >= 1 AND surah_from <= 114)),
  CONSTRAINT chk_quran_surah_to CHECK (surah_to IS NULL OR (surah_to >= 1 AND surah_to <= 114)),
  CONSTRAINT chk_quran_page_from CHECK (page_from IS NULL OR (page_from >= 1 AND page_from <= 604)),
  CONSTRAINT chk_quran_page_to CHECK (page_to IS NULL OR (page_to >= 1 AND page_to <= 604)),
  CONSTRAINT chk_quran_verses CHECK (verses_read IS NULL OR verses_read >= 0),
  CONSTRAINT chk_quran_pages CHECK (pages_read IS NULL OR pages_read >= 0)
);

CREATE INDEX idx_quran_logs_participant ON quran_reading_logs (participant_id, created_at DESC);
CREATE INDEX idx_quran_logs_progress ON quran_reading_logs (daily_task_progress_id);

COMMENT ON TABLE quran_reading_logs IS 'Quran reading tracking - references only, no Quran text stored';
COMMENT ON COLUMN quran_reading_logs.surah_from IS 'Starting surah number (1-114)';
COMMENT ON COLUMN quran_reading_logs.page_from IS 'Starting page number (1-604)';

-- ============================================================
-- PRAYER LOGS
-- ============================================================

CREATE TABLE prayer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  daily_task_progress_id UUID NOT NULL REFERENCES daily_task_progress(id),
  prayer_name VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_prayer_name CHECK (prayer_name IN ('FAJR', 'DHUHR', 'ASR', 'MAGHRIB', 'ISHA')),
  CONSTRAINT chk_prayer_status CHECK (status IN ('COMPLETED', 'MISSED', 'MAKEUP'))
);

-- Prevent duplicate prayer entries for same participant/progress/prayer
CREATE UNIQUE INDEX idx_prayer_logs_unique
  ON prayer_logs (participant_id, daily_task_progress_id, prayer_name);

CREATE INDEX idx_prayer_logs_participant ON prayer_logs (participant_id, created_at DESC);
CREATE INDEX idx_prayer_logs_progress ON prayer_logs (daily_task_progress_id);

CREATE TRIGGER prayer_logs_updated_at BEFORE UPDATE ON prayer_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE prayer_logs IS 'Individual prayer tracking (5 daily prayers)';

-- ============================================================
-- READING LOGS
-- ============================================================

CREATE TABLE reading_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  daily_task_progress_id UUID NOT NULL REFERENCES daily_task_progress(id),
  book_title VARCHAR(300),
  from_page INTEGER,
  to_page INTEGER,
  pages_read INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_reading_pages CHECK (pages_read IS NULL OR pages_read >= 0),
  CONSTRAINT chk_reading_from_page CHECK (from_page IS NULL OR from_page > 0),
  CONSTRAINT chk_reading_to_page CHECK (to_page IS NULL OR to_page > 0)
);

CREATE INDEX idx_reading_logs_participant ON reading_logs (participant_id, created_at DESC);
CREATE INDEX idx_reading_logs_progress ON reading_logs (daily_task_progress_id);

COMMENT ON TABLE reading_logs IS 'Book reading tracking';

-- ============================================================
-- SPORT LOGS
-- ============================================================

CREATE TABLE sport_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  daily_task_progress_id UUID NOT NULL REFERENCES daily_task_progress(id),
  sport_type VARCHAR(100),
  target_minutes INTEGER,
  actual_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_sport_target CHECK (target_minutes IS NULL OR target_minutes > 0),
  CONSTRAINT chk_sport_actual CHECK (actual_minutes IS NULL OR actual_minutes >= 0)
);

CREATE INDEX idx_sport_logs_participant ON sport_logs (participant_id, created_at DESC);
CREATE INDEX idx_sport_logs_progress ON sport_logs (daily_task_progress_id);

COMMENT ON TABLE sport_logs IS 'Sport/exercise activity tracking';

-- ============================================================
-- WATER LOGS
-- ============================================================

CREATE TABLE water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  daily_task_progress_id UUID NOT NULL REFERENCES daily_task_progress(id),
  amount_ml INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_water_amount CHECK (amount_ml > 0)
);

CREATE INDEX idx_water_logs_participant ON water_logs (participant_id, recorded_at DESC);
CREATE INDEX idx_water_logs_progress ON water_logs (daily_task_progress_id);

COMMENT ON TABLE water_logs IS 'Water intake tracking - multiple entries per day allowed';

-- ============================================================
-- SLEEP LOGS
-- ============================================================

CREATE TABLE sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  daily_task_progress_id UUID NOT NULL REFERENCES daily_task_progress(id),
  sleep_started_at TIMESTAMPTZ,
  woke_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_sleep_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT chk_sleep_woke_after_started CHECK (woke_at IS NULL OR sleep_started_at IS NULL OR woke_at >= sleep_started_at)
);

CREATE INDEX idx_sleep_logs_participant ON sleep_logs (participant_id, created_at DESC);
CREATE INDEX idx_sleep_logs_progress ON sleep_logs (daily_task_progress_id);

COMMENT ON TABLE sleep_logs IS 'Sleep tracking';
