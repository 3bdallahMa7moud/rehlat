-- ============================================================
-- Journey of Change - Database Views
-- ============================================================

-- ============================================================
-- PARTICIPANT DAILY SUMMARY
-- ============================================================

CREATE OR REPLACE VIEW v_participant_daily_summary AS
SELECT
  ds.participant_id,
  p.display_name,
  ds.session_date,
  ds.status,
  ds.started_at,
  ds.ended_at,
  ds.earned_points,
  ds.possible_points,
  ds.completion_percentage,
  ds.active_seconds,
  ds.is_successful,
  COUNT(dtp.id) FILTER (WHERE dtp.completion_result = 'FULL') AS tasks_full,
  COUNT(dtp.id) FILTER (WHERE dtp.completion_result = 'PARTIAL') AS tasks_partial,
  COUNT(dtp.id) FILTER (WHERE dtp.completion_result = 'NOT_COMPLETED') AS tasks_not_completed,
  COUNT(dtp.id) FILTER (WHERE dtp.runtime_state = 'NOT_STARTED') AS tasks_not_started,
  COUNT(dtp.id) AS total_tasks
FROM daily_sessions ds
JOIN participants p ON p.id = ds.participant_id
LEFT JOIN daily_task_progress dtp ON dtp.daily_session_id = ds.id
GROUP BY ds.id, ds.participant_id, p.display_name, ds.session_date, ds.status,
  ds.started_at, ds.ended_at, ds.earned_points, ds.possible_points,
  ds.completion_percentage, ds.active_seconds, ds.is_successful;

COMMENT ON VIEW v_participant_daily_summary IS 'Daily performance summary per participant';

-- ============================================================
-- DAILY LEADERBOARD
-- ============================================================

CREATE OR REPLACE VIEW v_daily_leaderboard AS
SELECT
  ROW_NUMBER() OVER (PARTITION BY session_date ORDER BY completion_percentage DESC, earned_points DESC, active_seconds DESC) AS rank,
  participant_id,
  display_name,
  session_date,
  earned_points,
  possible_points,
  completion_percentage,
  active_seconds,
  is_successful,
  tasks_full,
  tasks_partial
FROM v_participant_daily_summary
WHERE status IN ('ENDED', 'AUTO_COMPLETED')
ORDER BY session_date DESC, rank;

COMMENT ON VIEW v_daily_leaderboard IS 'Daily leaderboard ranked by completion percentage';

-- ============================================================
-- WEEKLY LEADERBOARD
-- ============================================================

CREATE OR REPLACE VIEW v_weekly_leaderboard AS
WITH weekly_stats AS (
  SELECT
    participant_id,
    p.display_name,
    get_week_start_sunday(session_date) AS week_start,
    SUM(earned_points) AS total_points,
    AVG(completion_percentage) AS avg_completion,
    SUM(active_seconds) AS total_active_seconds,
    COUNT(*) FILTER (WHERE is_successful = true) AS successful_days,
    COUNT(*) AS total_days
  FROM daily_sessions ds
  JOIN participants p ON p.id = ds.participant_id
  WHERE ds.status IN ('ENDED', 'AUTO_COMPLETED')
  GROUP BY participant_id, p.display_name, get_week_start_sunday(session_date)
)
SELECT
  ROW_NUMBER() OVER (PARTITION BY week_start ORDER BY total_points DESC, avg_completion DESC) AS rank,
  participant_id,
  display_name,
  week_start,
  week_start + INTERVAL '6 days' AS week_end,
  total_points,
  ROUND(avg_completion, 2) AS avg_completion_percentage,
  total_active_seconds,
  successful_days,
  total_days
FROM weekly_stats
ORDER BY week_start DESC, rank;

COMMENT ON VIEW v_weekly_leaderboard IS 'Weekly leaderboard aggregated by points and completion (Sunday-based weeks)';

-- ============================================================
-- MONTHLY LEADERBOARD
-- ============================================================

CREATE OR REPLACE VIEW v_monthly_leaderboard AS
WITH monthly_stats AS (
  SELECT
    participant_id,
    p.display_name,
    DATE_TRUNC('month', session_date)::DATE AS month_start,
    SUM(earned_points) AS total_points,
    AVG(completion_percentage) AS avg_completion,
    SUM(active_seconds) AS total_active_seconds,
    COUNT(*) FILTER (WHERE is_successful = true) AS successful_days,
    COUNT(*) AS total_days
  FROM daily_sessions ds
  JOIN participants p ON p.id = ds.participant_id
  WHERE ds.status IN ('ENDED', 'AUTO_COMPLETED')
  GROUP BY participant_id, p.display_name, DATE_TRUNC('month', session_date)::DATE
)
SELECT
  ROW_NUMBER() OVER (PARTITION BY month_start ORDER BY total_points DESC, avg_completion DESC) AS rank,
  participant_id,
  display_name,
  month_start,
  (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS month_end,
  total_points,
  ROUND(avg_completion, 2) AS avg_completion_percentage,
  total_active_seconds,
  successful_days,
  total_days
FROM monthly_stats
ORDER BY month_start DESC, rank;

COMMENT ON VIEW v_monthly_leaderboard IS 'Monthly leaderboard aggregated by points and completion';

-- ============================================================
-- TASK PERFORMANCE SUMMARY
-- ============================================================

CREATE OR REPLACE VIEW v_task_performance_summary AS
SELECT
  t.id AS task_id,
  t.name_ar AS task_name_ar,
  t.name_en AS task_name_en,
  tc.name_ar AS category_name_ar,
  tc.name_en AS category_name_en,
  tt.name_ar AS task_type_name_ar,
  tt.name_en AS task_type_name_en,
  COUNT(dtp.id) AS total_attempts,
  COUNT(dtp.id) FILTER (WHERE dtp.completion_result = 'FULL') AS full_completions,
  COUNT(dtp.id) FILTER (WHERE dtp.completion_result = 'PARTIAL') AS partial_completions,
  COUNT(dtp.id) FILTER (WHERE dtp.completion_result = 'NOT_COMPLETED') AS not_completed,
  COUNT(dtp.id) FILTER (WHERE dtp.runtime_state = 'NOT_STARTED') AS not_started,
  ROUND(AVG(dtp.active_seconds) FILTER (WHERE dtp.completion_result IS NOT NULL), 0) AS avg_active_seconds,
  SUM(dtp.active_seconds) AS total_active_seconds,
  SUM(dtp.points_awarded) AS total_points_awarded
FROM tasks t
JOIN task_categories tc ON tc.id = t.category_id
JOIN task_types tt ON tt.id = t.task_type_id
LEFT JOIN daily_task_progress dtp ON dtp.task_id = t.id
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name_ar, t.name_en, tc.name_ar, tc.name_en, tt.name_ar, tt.name_en
ORDER BY total_active_seconds DESC NULLS LAST;

COMMENT ON VIEW v_task_performance_summary IS 'Performance metrics per task across all participants';

-- ============================================================
-- PARTICIPANT TASK STATISTICS
-- ============================================================

CREATE OR REPLACE VIEW v_participant_task_statistics AS
SELECT
  dtp.task_id,
  t.name_ar AS task_name_ar,
  t.name_en AS task_name_en,
  ds.participant_id,
  p.display_name,
  COUNT(dtp.id) AS total_attempts,
  COUNT(dtp.id) FILTER (WHERE dtp.completion_result = 'FULL') AS full_count,
  COUNT(dtp.id) FILTER (WHERE dtp.completion_result = 'PARTIAL') AS partial_count,
  COUNT(dtp.id) FILTER (WHERE dtp.completion_result = 'NOT_COMPLETED') AS not_completed_count,
  ROUND(AVG(dtp.active_seconds) FILTER (WHERE dtp.completion_result IS NOT NULL), 0) AS avg_seconds,
  SUM(dtp.points_awarded) AS total_points,
  MAX(dtp.created_at) AS last_attempt_date
FROM daily_task_progress dtp
JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
JOIN participants p ON p.id = ds.participant_id
JOIN tasks t ON t.id = dtp.task_id
GROUP BY dtp.task_id, t.name_ar, t.name_en, ds.participant_id, p.display_name;

COMMENT ON VIEW v_participant_task_statistics IS 'Task performance statistics per participant';

-- ============================================================
-- TIME DISTRIBUTION BY CATEGORY
-- ============================================================

CREATE OR REPLACE VIEW v_time_distribution_by_category AS
SELECT
  tc.id AS category_id,
  tc.name_ar AS category_name,
  ds.participant_id,
  p.display_name,
  SUM(dtp.active_seconds) AS total_active_seconds,
  COUNT(DISTINCT ds.session_date) AS days_worked,
  ROUND(AVG(dtp.active_seconds) FILTER (WHERE dtp.active_seconds > 0), 0) AS avg_seconds_per_task
FROM task_categories tc
JOIN tasks t ON t.category_id = tc.id
JOIN daily_task_progress dtp ON dtp.task_id = t.id
JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
JOIN participants p ON p.id = ds.participant_id
WHERE dtp.active_seconds > 0
GROUP BY tc.id, tc.name_ar, ds.participant_id, p.display_name
ORDER BY total_active_seconds DESC;

COMMENT ON VIEW v_time_distribution_by_category IS 'Time spent per category per participant';

-- ============================================================
-- MOST TIME-CONSUMING TASKS
-- ============================================================

CREATE OR REPLACE VIEW v_most_time_consuming_tasks AS
SELECT
  t.id AS task_id,
  t.name_ar AS task_name_ar,
  t.name_en AS task_name_en,
  tc.name_ar AS category_name_ar,
  tc.name_en AS category_name_en,
  SUM(dtp.active_seconds) AS total_seconds,
  COUNT(dtp.id) AS completion_count,
  ROUND(AVG(dtp.active_seconds) FILTER (WHERE dtp.active_seconds > 0), 0) AS avg_seconds,
  COUNT(DISTINCT ds.participant_id) AS participant_count
FROM tasks t
JOIN task_categories tc ON tc.id = t.category_id
JOIN daily_task_progress dtp ON dtp.task_id = t.id
JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
WHERE dtp.active_seconds > 0
GROUP BY t.id, t.name_ar, t.name_en, tc.name_ar, tc.name_en
ORDER BY total_seconds DESC;

COMMENT ON VIEW v_most_time_consuming_tasks IS 'Tasks ranked by total time spent';

-- ============================================================
-- RECENT LIVE ACTIVITY
-- ============================================================

CREATE OR REPLACE VIEW v_recent_live_activity AS
SELECT
  al.id,
  al.participant_id,
  p.display_name,
  al.event_type,
  al.metadata,
  al.occurred_at,
  t.name_ar AS task_name_ar,
  t.name_en AS task_name_en,
  ds.session_date
FROM activity_logs al
JOIN participants p ON p.id = al.participant_id
LEFT JOIN tasks t ON t.id = al.task_id
LEFT JOIN daily_sessions ds ON ds.id = al.daily_session_id
WHERE al.event_type IN (
  'DAY_STARTED', 'DAY_ENDED',
  'TASK_STARTED', 'TASK_FULL_COMPLETED', 'TASK_PARTIAL_COMPLETED',
  'BADGE_AWARDED', 'TITLE_AWARDED'
)
ORDER BY al.occurred_at DESC
LIMIT 100;

COMMENT ON VIEW v_recent_live_activity IS $$Recent activity feed for "What's happening now"$$;

-- ============================================================
-- ADMIN PARTICIPANT OVERVIEW
-- ============================================================

CREATE OR REPLACE VIEW v_admin_participant_overview AS
WITH daily_agg AS (
  SELECT
    participant_id,
    COUNT(*) AS total_days_worked,
    COUNT(*) FILTER (WHERE is_successful = true) AS successful_days,
    COALESCE(SUM(earned_points), 0) AS total_points,
    ROUND(AVG(completion_percentage), 2) AS avg_completion_percentage,
    COALESCE(SUM(active_seconds), 0) AS total_active_seconds,
    MAX(session_date) AS last_work_date
  FROM daily_sessions
  WHERE status IN ('ENDED', 'AUTO_COMPLETED')
  GROUP BY participant_id
),
badge_agg AS (
  SELECT
    participant_id,
    COUNT(DISTINCT badge_id) AS badges_earned
  FROM participant_badges
  GROUP BY participant_id
)
SELECT
  p.id,
  p.display_name,
  p.role,
  p.is_active,
  p.last_seen_at,
  COALESCE(da.total_days_worked, 0) AS total_days_worked,
  COALESCE(da.successful_days, 0) AS successful_days,
  COALESCE(da.total_points, 0) AS total_points,
  COALESCE(da.avg_completion_percentage, 0) AS avg_completion_percentage,
  COALESCE(da.total_active_seconds, 0) AS total_active_seconds,
  COALESCE(ba.badges_earned, 0) AS badges_earned,
  da.last_work_date
FROM participants p
LEFT JOIN daily_agg da ON da.participant_id = p.id
LEFT JOIN badge_agg ba ON ba.participant_id = p.id
WHERE p.deleted_at IS NULL
ORDER BY total_points DESC, p.display_name;

COMMENT ON VIEW v_admin_participant_overview IS 'Overview of all participants for admin dashboard';

-- ============================================================
-- UNFINISHED ATTEMPTS
-- ============================================================

CREATE OR REPLACE VIEW v_unfinished_attempts AS
SELECT
  ta.id AS attempt_id,
  ds.participant_id,
  p.display_name,
  ds.session_date,
  t.name_ar AS task_name_ar,
  t.name_en AS task_name_en,
  ta.attempt_number,
  ta.started_at,
  ta.active_seconds,
  dtp.runtime_state
FROM task_attempts ta
JOIN daily_task_progress dtp ON dtp.id = ta.daily_task_progress_id
JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
JOIN participants p ON p.id = ds.participant_id
JOIN tasks t ON t.id = dtp.task_id
WHERE ta.finished_at IS NULL
ORDER BY ta.started_at DESC;

COMMENT ON VIEW v_unfinished_attempts IS 'Currently open/unfinished task attempts';

-- ============================================================
-- PARTICIPANT CURRENT STREAKS
-- ============================================================

CREATE OR REPLACE VIEW v_participant_current_streaks AS
WITH latest_daily AS (
  SELECT DISTINCT ON (participant_id)
    participant_id,
    consecutive_count
  FROM streak_period_results
  WHERE period_type = 'DAILY'
    AND scope = 'OVERALL'
    AND task_id IS NULL
  ORDER BY participant_id, period_start DESC
),
latest_weekly AS (
  SELECT DISTINCT ON (participant_id)
    participant_id,
    consecutive_count
  FROM streak_period_results
  WHERE period_type = 'WEEKLY'
    AND scope = 'OVERALL'
    AND task_id IS NULL
  ORDER BY participant_id, period_start DESC
),
latest_monthly AS (
  SELECT DISTINCT ON (participant_id)
    participant_id,
    consecutive_count
  FROM streak_period_results
  WHERE period_type = 'MONTHLY'
    AND scope = 'OVERALL'
    AND task_id IS NULL
  ORDER BY participant_id, period_start DESC
),
best_streaks AS (
  SELECT
    participant_id,
    MAX(best_count) FILTER (
      WHERE period_type = 'DAILY'
        AND scope = 'OVERALL'
        AND task_id IS NULL
    ) AS best_daily_streak,
    MAX(best_count) FILTER (
      WHERE period_type = 'WEEKLY'
        AND scope = 'OVERALL'
        AND task_id IS NULL
    ) AS best_weekly_streak,
    MAX(best_count) FILTER (
      WHERE period_type = 'MONTHLY'
        AND scope = 'OVERALL'
        AND task_id IS NULL
    ) AS best_monthly_streak
  FROM streak_period_results
  GROUP BY participant_id
)
SELECT
  p.id AS participant_id,
  p.display_name,
  COALESCE(ld.consecutive_count, 0) AS daily_streak,
  COALESCE(bs.best_daily_streak, 0) AS best_daily_streak,
  COALESCE(lw.consecutive_count, 0) AS weekly_streak,
  COALESCE(bs.best_weekly_streak, 0) AS best_weekly_streak,
  COALESCE(lm.consecutive_count, 0) AS monthly_streak,
  COALESCE(bs.best_monthly_streak, 0) AS best_monthly_streak
FROM participants p
LEFT JOIN latest_daily ld ON ld.participant_id = p.id
LEFT JOIN latest_weekly lw ON lw.participant_id = p.id
LEFT JOIN latest_monthly lm ON lm.participant_id = p.id
LEFT JOIN best_streaks bs ON bs.participant_id = p.id
WHERE p.deleted_at IS NULL
  AND p.is_active = true
ORDER BY daily_streak DESC, p.display_name;

COMMENT ON VIEW v_participant_current_streaks IS 'Current streaks from latest periods plus historical best streaks';
