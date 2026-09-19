-- ============================================================
-- Journey of Change - Task Tracking
-- ============================================================

-- ============================================================
-- DAILY TASK PROGRESS
-- ============================================================

CREATE TABLE daily_task_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_session_id UUID NOT NULL REFERENCES daily_sessions(id),
  task_id UUID NOT NULL REFERENCES tasks(id),
  task_snapshot JSONB NOT NULL,
  runtime_state VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
  completion_result VARCHAR(20),
  progress_value INTEGER,
  progress_target INTEGER,
  metrics JSONB DEFAULT '{}',
  active_seconds INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  reopen_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_session_task UNIQUE (daily_session_id, task_id),
  CONSTRAINT chk_runtime_state CHECK (runtime_state IN ('NOT_STARTED', 'RUNNING', 'PAUSED', 'FINISHED')),
  CONSTRAINT chk_completion_result CHECK (completion_result IS NULL OR completion_result IN ('FULL', 'PARTIAL', 'NOT_COMPLETED')),
  CONSTRAINT chk_active_seconds_valid CHECK (active_seconds >= 0),
  CONSTRAINT chk_points_awarded_valid CHECK (points_awarded >= 0),
  CONSTRAINT chk_attempt_count_valid CHECK (attempt_count >= 0),
  CONSTRAINT chk_reopen_count_valid CHECK (reopen_count >= 0),
  CONSTRAINT chk_finished_after_started CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at)
);

CREATE INDEX idx_task_progress_session ON daily_task_progress (daily_session_id);
CREATE INDEX idx_task_progress_task ON daily_task_progress (task_id);
CREATE INDEX idx_task_progress_state ON daily_task_progress (runtime_state);
CREATE INDEX idx_task_progress_result ON daily_task_progress (completion_result);

CREATE TRIGGER task_progress_updated_at BEFORE UPDATE ON daily_task_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE daily_task_progress IS 'Daily progress tracking for each task in a session';
COMMENT ON COLUMN daily_task_progress.task_snapshot IS 'Historical task data (name, points, config) at time of session creation';
COMMENT ON COLUMN daily_task_progress.runtime_state IS 'Current execution state of the task';
COMMENT ON COLUMN daily_task_progress.completion_result IS 'Final result: FULL, PARTIAL, or NOT_COMPLETED';
COMMENT ON COLUMN daily_task_progress.metrics IS 'Task-specific metrics (JSON)';

-- ============================================================
-- TASK ATTEMPTS
-- ============================================================

CREATE TABLE task_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_task_progress_id UUID NOT NULL REFERENCES daily_task_progress(id),
  attempt_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  result VARCHAR(20),
  active_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_progress_attempt UNIQUE (daily_task_progress_id, attempt_number),
  CONSTRAINT chk_attempt_number_positive CHECK (attempt_number > 0),
  CONSTRAINT chk_attempt_result CHECK (result IS NULL OR result IN ('FULL', 'PARTIAL', 'NOT_COMPLETED')),
  CONSTRAINT chk_attempt_active_seconds CHECK (active_seconds >= 0),
  CONSTRAINT chk_attempt_finished_after_started CHECK (finished_at IS NULL OR finished_at >= started_at)
);

-- Only one open/unfinished attempt per progress
CREATE UNIQUE INDEX idx_task_attempts_open_unique
  ON task_attempts (daily_task_progress_id)
  WHERE finished_at IS NULL;

CREATE INDEX idx_task_attempts_progress ON task_attempts (daily_task_progress_id, attempt_number);
CREATE INDEX idx_task_attempts_started ON task_attempts (started_at DESC);

COMMENT ON TABLE task_attempts IS 'Individual task attempts - supports retry/reopen with full history';
COMMENT ON COLUMN task_attempts.attempt_number IS 'Sequential attempt number (1, 2, 3, ...)';

-- ============================================================
-- TASK TIME SEGMENTS
-- ============================================================

CREATE TABLE task_time_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_attempt_id UUID NOT NULL REFERENCES task_attempts(id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_segment_ended_after_started CHECK (ended_at IS NULL OR ended_at >= started_at),
  CONSTRAINT chk_segment_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

-- Only one open segment per attempt
CREATE UNIQUE INDEX idx_time_segments_open_unique
  ON task_time_segments (task_attempt_id)
  WHERE ended_at IS NULL;

CREATE INDEX idx_time_segments_attempt ON task_time_segments (task_attempt_id, started_at);
CREATE INDEX idx_time_segments_started ON task_time_segments (started_at DESC);

COMMENT ON TABLE task_time_segments IS 'Precise time tracking segments for pause/resume support';
COMMENT ON COLUMN task_time_segments.duration_seconds IS 'Calculated on segment close (ended_at - started_at)';

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id),
  actor_id UUID REFERENCES participants(id),
  daily_session_id UUID REFERENCES daily_sessions(id),
  task_id UUID REFERENCES tasks(id),
  task_progress_id UUID REFERENCES daily_task_progress(id),
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_participant ON activity_logs (participant_id, occurred_at DESC);
CREATE INDEX idx_activity_session ON activity_logs (daily_session_id, occurred_at DESC);
CREATE INDEX idx_activity_event_type ON activity_logs (event_type, occurred_at DESC);
CREATE INDEX idx_activity_recent ON activity_logs (occurred_at DESC);

COMMENT ON TABLE activity_logs IS 'Complete audit trail of all system events';
COMMENT ON COLUMN activity_logs.participant_id IS 'Subject of the event';
COMMENT ON COLUMN activity_logs.actor_id IS 'Who triggered the event (NULL for system events)';
COMMENT ON COLUMN activity_logs.event_type IS 'DAY_STARTED, TASK_FULL_COMPLETED, BADGE_AWARDED, etc.';

-- ============================================================
-- POINTS LEDGER
-- ============================================================

CREATE TABLE points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  daily_session_id UUID REFERENCES daily_sessions(id),
  task_id UUID REFERENCES tasks(id),
  task_progress_id UUID REFERENCES daily_task_progress(id),
  source_type VARCHAR(50) NOT NULL,
  points_delta INTEGER NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_source_type CHECK (source_type IN ('TASK_FULL', 'TASK_PARTIAL', 'BADGE_BONUS', 'MANUAL_ADJUSTMENT'))
);

CREATE INDEX idx_points_participant ON points_ledger (participant_id, created_at DESC);
CREATE INDEX idx_points_session ON points_ledger (daily_session_id);
CREATE INDEX idx_points_task ON points_ledger (task_id);
CREATE INDEX idx_points_source ON points_ledger (source_type);

COMMENT ON TABLE points_ledger IS 'Auditable points history - never modify, only insert';
COMMENT ON COLUMN points_ledger.points_delta IS 'Points change (positive or negative)';

-- ============================================================
-- IDEMPOTENCY TRACKING
-- ============================================================

CREATE TABLE operation_requests (
  request_id UUID PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES participants(id),
  operation_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  request_payload_hash VARCHAR(64),
  result_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_operation_type CHECK (operation_type IN (
    'START_DAY', 'END_DAY',
    'START_TASK', 'PAUSE_TASK', 'RESUME_TASK', 'FINISH_TASK', 'REOPEN_TASK'
  ))
);

CREATE INDEX idx_operation_participant ON operation_requests (participant_id, created_at DESC);
CREATE INDEX idx_operation_type ON operation_requests (operation_type);
CREATE INDEX idx_operation_entity ON operation_requests (entity_id) WHERE entity_id IS NOT NULL;

COMMENT ON TABLE operation_requests IS 'Idempotency tracking for critical mutations';
COMMENT ON COLUMN operation_requests.request_id IS 'Client-provided UUID for idempotency';

-- ============================================================
-- FOCUS SESSIONS
-- ============================================================

CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  target_seconds INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'READY',
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_focus_status CHECK (status IN ('READY', 'RUNNING', 'PAUSED', 'FINISHED', 'CANCELLED')),
  CONSTRAINT chk_focus_target CHECK (target_seconds > 0),
  CONSTRAINT chk_focus_active CHECK (active_seconds >= 0)
);

CREATE INDEX idx_focus_participant ON focus_sessions (participant_id, created_at DESC);
CREATE INDEX idx_focus_status ON focus_sessions (status);

COMMENT ON TABLE focus_sessions IS 'Pomodoro-style focus session tracking';
