-- ============================================================
-- Journey of Change - Additional Indexes and Constraints
-- ============================================================

-- ============================================================
-- FOREIGN KEY TO participant_presence
-- ============================================================

-- Add FK after both tables exist
ALTER TABLE participant_presence
  ADD CONSTRAINT fk_presence_active_task
  FOREIGN KEY (active_task_progress_id)
  REFERENCES daily_task_progress(id)
  ON DELETE SET NULL;

-- ============================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================

-- Leaderboard queries
CREATE INDEX idx_daily_sessions_leaderboard_daily
  ON daily_sessions (session_date DESC, earned_points DESC, completion_percentage DESC)
  WHERE status IN ('ENDED', 'AUTO_COMPLETED');

-- Recent activity for "What's happening now"
CREATE INDEX idx_activity_logs_live_feed
  ON activity_logs (occurred_at DESC)
  WHERE event_type IN ('TASK_STARTED', 'TASK_FULL_COMPLETED', 'TASK_PARTIAL_COMPLETED', 'BADGE_AWARDED', 'TITLE_AWARDED');

-- Task completion analysis
CREATE INDEX idx_task_progress_completion_analysis
  ON daily_task_progress (task_id, completion_result, created_at DESC)
  WHERE completion_result IS NOT NULL;

-- Points history for participant
CREATE INDEX idx_points_ledger_participant_chronological
  ON points_ledger (participant_id, created_at ASC);

-- Task time analysis
CREATE INDEX idx_task_attempts_duration_analysis
  ON task_attempts (daily_task_progress_id, active_seconds DESC)
  WHERE finished_at IS NOT NULL;

-- Streak calculation support
CREATE INDEX idx_daily_sessions_streak_calc
  ON daily_sessions (participant_id, session_date ASC, is_successful);

-- Active sessions
CREATE INDEX idx_daily_sessions_active
  ON daily_sessions (participant_id, status)
  WHERE status = 'ACTIVE';

-- Notification delivery
CREATE INDEX idx_notifications_delivery
  ON notifications (recipient_id, is_persistent, read_at)
  WHERE dismissed_at IS NULL;

-- AI report completion tracking
CREATE INDEX idx_ai_reports_pending
  ON ai_reports (status, created_at ASC)
  WHERE status = 'PENDING';

-- ============================================================
-- PERFORMANCE NOTES
-- ============================================================

-- The system serves ~30-50 users, so indexes are selective.
-- Partial indexes are used where filtering is common.
-- Composite indexes support common query patterns.
-- Historical data grows over time, so date-based indexes are critical.

COMMENT ON INDEX idx_daily_sessions_leaderboard_daily IS 'Supports daily leaderboard queries';
COMMENT ON INDEX idx_activity_logs_live_feed IS 'Supports real-time activity feed';
COMMENT ON INDEX idx_task_progress_completion_analysis IS 'Supports task completion analytics';
