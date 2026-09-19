-- ============================================================
-- Journey of Change - Database Functions
-- ============================================================

-- ============================================================
-- START DAY
-- ============================================================

CREATE OR REPLACE FUNCTION start_day(
  p_request_id UUID,
  p_participant_id UUID,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  session_id UUID,
  status VARCHAR,
  message TEXT
) AS $$
DECLARE
  v_session_id UUID;
  v_existing_session RECORD;
  v_task RECORD;
  v_task_snapshot JSONB;
  v_possible_points INTEGER := 0;
  v_session_date DATE;
BEGIN
  -- Derive project date from configured timezone
  v_session_date := get_project_local_date(p_now);

  -- Check idempotency
  IF EXISTS (SELECT 1 FROM operation_requests WHERE request_id = p_request_id) THEN
    SELECT result_snapshot INTO v_existing_session
    FROM operation_requests
    WHERE request_id = p_request_id;

    RETURN QUERY SELECT
      (v_existing_session->>'session_id')::UUID,
      'IDEMPOTENT'::VARCHAR,
      'Day already started with this request'::TEXT;
    RETURN;
  END IF;

  -- Validate participant is active
  IF NOT EXISTS (
    SELECT 1 FROM participants
    WHERE id = p_participant_id
      AND is_active = true
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Participant is not active or does not exist';
  END IF;

  -- Check if day already started
  SELECT * INTO v_existing_session
  FROM daily_sessions
  WHERE participant_id = p_participant_id
    AND session_date = v_session_date;

  IF FOUND THEN
    -- Record idempotency and return existing session
    INSERT INTO operation_requests (request_id, participant_id, operation_type, entity_id, result_snapshot)
    VALUES (
      p_request_id,
      p_participant_id,
      'START_DAY',
      v_existing_session.id,
      jsonb_build_object('session_id', v_existing_session.id)
    );

    RETURN QUERY SELECT
      v_existing_session.id,
      v_existing_session.status::VARCHAR,
      'Day already started'::TEXT;
    RETURN;
  END IF;

  -- Create new daily session
  INSERT INTO daily_sessions (
    participant_id,
    session_date,
    status,
    started_at,
    possible_points
  ) VALUES (
    p_participant_id,
    v_session_date,
    'ACTIVE',
    p_now,
    0  -- Will be calculated next
  ) RETURNING id INTO v_session_id;

  -- Create daily_task_progress for all active tasks
  FOR v_task IN
    SELECT t.*
    FROM tasks t
    WHERE t.is_active = true
      AND t.deleted_at IS NULL
    ORDER BY t.sort_order
  LOOP
    -- Create task snapshot
    v_task_snapshot := jsonb_build_object(
      'task_id', v_task.id,
      'name_ar', v_task.name_ar,
      'name_en', v_task.name_en,
      'category_id', v_task.category_id,
      'task_type_id', v_task.task_type_id,
      'full_points', v_task.full_points,
      'partial_points', v_task.partial_points,
      'configuration', v_task.configuration
    );

    -- Insert progress row
    INSERT INTO daily_task_progress (
      daily_session_id,
      task_id,
      task_snapshot,
      runtime_state
    ) VALUES (
      v_session_id,
      v_task.id,
      v_task_snapshot,
      'NOT_STARTED'
    );

    v_possible_points := v_possible_points + v_task.full_points;
  END LOOP;

  -- Update session with possible points
  UPDATE daily_sessions
  SET possible_points = v_possible_points
  WHERE id = v_session_id;

  -- Log activity
  INSERT INTO activity_logs (
    participant_id,
    daily_session_id,
    event_type,
    metadata,
    occurred_at
  ) VALUES (
    p_participant_id,
    v_session_id,
    'DAY_STARTED',
    jsonb_build_object('possible_points', v_possible_points, 'session_date', v_session_date),
    p_now
  );

  -- Record operation
  INSERT INTO operation_requests (request_id, participant_id, operation_type, entity_id, result_snapshot)
  VALUES (
    p_request_id,
    p_participant_id,
    'START_DAY',
    v_session_id,
    jsonb_build_object('session_id', v_session_id)
  );

  RETURN QUERY SELECT
    v_session_id,
    'ACTIVE'::VARCHAR,
    'Day started successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION start_day IS 'Start a new daily work session with all active tasks. Session date derived from project timezone.';

-- ============================================================
-- START TASK
-- ============================================================

CREATE OR REPLACE FUNCTION start_task(
  p_request_id UUID,
  p_participant_id UUID,
  p_task_progress_id UUID
)
RETURNS TABLE(
  attempt_id UUID,
  segment_id UUID,
  message TEXT
) AS $$
DECLARE
  v_progress RECORD;
  v_attempt_id UUID;
  v_segment_id UUID;
  v_attempt_number INTEGER;
BEGIN
  -- Check idempotency
  IF EXISTS (SELECT 1 FROM operation_requests WHERE request_id = p_request_id) THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::UUID,
      'Task already started with this request'::TEXT;
    RETURN;
  END IF;

  -- Lock and get progress with ownership validation
  SELECT dtp.*, ds.participant_id AS session_participant_id INTO v_progress
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE dtp.id = p_task_progress_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task progress not found';
  END IF;

  -- Validate ownership
  IF v_progress.session_participant_id != p_participant_id THEN
    RAISE EXCEPTION 'Task progress does not belong to this participant';
  END IF;

  -- Validate state
  IF v_progress.runtime_state = 'RUNNING' THEN
    RAISE EXCEPTION 'Task is already running';
  END IF;

  IF v_progress.runtime_state = 'FINISHED' THEN
    RAISE EXCEPTION 'Task is finished. Use reopen_task to restart';
  END IF;

  -- Determine attempt number
  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
  FROM task_attempts
  WHERE daily_task_progress_id = p_task_progress_id;

  -- Create new attempt
  INSERT INTO task_attempts (
    daily_task_progress_id,
    attempt_number,
    started_at
  ) VALUES (
    p_task_progress_id,
    v_attempt_number,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_attempt_id;

  -- Create time segment
  INSERT INTO task_time_segments (
    task_attempt_id,
    started_at
  ) VALUES (
    v_attempt_id,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_segment_id;

  -- Update progress
  UPDATE daily_task_progress
  SET
    runtime_state = 'RUNNING',
    started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
    attempt_count = v_attempt_number
  WHERE id = p_task_progress_id;

  -- Log activity
  INSERT INTO activity_logs (
    participant_id,
    daily_session_id,
    task_id,
    task_progress_id,
    event_type,
    metadata,
    occurred_at
  ) VALUES (
    p_participant_id,
    v_progress.daily_session_id,
    v_progress.task_id,
    p_task_progress_id,
    'TASK_STARTED',
    jsonb_build_object('attempt_number', v_attempt_number),
    CURRENT_TIMESTAMP
  );

  -- Record operation
  INSERT INTO operation_requests (request_id, participant_id, operation_type, entity_id)
  VALUES (p_request_id, p_participant_id, 'START_TASK', p_task_progress_id);

  RETURN QUERY SELECT
    v_attempt_id,
    v_segment_id,
    'Task started'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION start_task IS 'Start or resume a task, creating new attempt and time segment';

-- ============================================================
-- PAUSE TASK
-- ============================================================

CREATE OR REPLACE FUNCTION pause_task(
  p_request_id UUID,
  p_participant_id UUID,
  p_task_progress_id UUID
)
RETURNS TABLE(
  segment_duration INTEGER,
  message TEXT
) AS $$
DECLARE
  v_progress RECORD;
  v_attempt RECORD;
  v_segment RECORD;
  v_duration INTEGER;
BEGIN
  -- Check idempotency
  IF EXISTS (SELECT 1 FROM operation_requests WHERE request_id = p_request_id) THEN
    RETURN QUERY SELECT
      0::INTEGER,
      'Task already paused with this request'::TEXT;
    RETURN;
  END IF;

  -- Lock progress with ownership validation
  SELECT dtp.*, ds.participant_id AS session_participant_id INTO v_progress
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE dtp.id = p_task_progress_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task progress not found';
  END IF;

  -- Validate ownership
  IF v_progress.session_participant_id != p_participant_id THEN
    RAISE EXCEPTION 'Task progress does not belong to this participant';
  END IF;

  IF v_progress.runtime_state != 'RUNNING' THEN
    RAISE EXCEPTION 'Task is not running (state: %)', v_progress.runtime_state;
  END IF;

  -- Get current attempt
  SELECT * INTO v_attempt
  FROM task_attempts
  WHERE daily_task_progress_id = p_task_progress_id
      AND finished_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No open attempt found';
  END IF;

  -- Get open segment
  SELECT * INTO v_segment
  FROM task_time_segments
  WHERE task_attempt_id = v_attempt.id
    AND ended_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No open time segment found';
  END IF;

  -- Close segment
  v_duration := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_segment.started_at))::INTEGER;

  UPDATE task_time_segments
  SET
    ended_at = CURRENT_TIMESTAMP,
    duration_seconds = v_duration
  WHERE id = v_segment.id;

  -- Update attempt active time
  UPDATE task_attempts
  SET active_seconds = active_seconds + v_duration
  WHERE id = v_attempt.id;

  -- Update progress
  UPDATE daily_task_progress
  SET
    runtime_state = 'PAUSED',
    active_seconds = active_seconds + v_duration
  WHERE id = p_task_progress_id;

  -- Log activity
  INSERT INTO activity_logs (
    participant_id,
    daily_session_id,
    task_id,
    task_progress_id,
    event_type,
    metadata,
    occurred_at
  ) VALUES (
    p_participant_id,
    v_progress.daily_session_id,
    v_progress.task_id,
    p_task_progress_id,
    'TASK_PAUSED',
    jsonb_build_object('segment_duration', v_duration),
    CURRENT_TIMESTAMP
  );

  -- Record operation
  INSERT INTO operation_requests (request_id, participant_id, operation_type, entity_id)
  VALUES (p_request_id, p_participant_id, 'PAUSE_TASK', p_task_progress_id);

  RETURN QUERY SELECT
    v_duration,
    'Task paused'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION pause_task IS 'Pause a running task, closing the current time segment';

-- ============================================================
-- RESUME TASK
-- ============================================================

CREATE OR REPLACE FUNCTION resume_task(
  p_request_id UUID,
  p_participant_id UUID,
  p_task_progress_id UUID
)
RETURNS TABLE(
  segment_id UUID,
  message TEXT
) AS $$
DECLARE
  v_progress RECORD;
  v_attempt RECORD;
  v_segment_id UUID;
BEGIN
  -- Check idempotency
  IF EXISTS (SELECT 1 FROM operation_requests WHERE request_id = p_request_id) THEN
    RETURN QUERY SELECT
      NULL::UUID,
      'Task already resumed with this request'::TEXT;
    RETURN;
  END IF;

  -- Lock progress with ownership validation
  SELECT dtp.*, ds.participant_id AS session_participant_id INTO v_progress
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE dtp.id = p_task_progress_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task progress not found';
  END IF;

  -- Validate ownership
  IF v_progress.session_participant_id != p_participant_id THEN
    RAISE EXCEPTION 'Task progress does not belong to this participant';
  END IF;

  IF v_progress.runtime_state != 'PAUSED' THEN
    RAISE EXCEPTION 'Task is not paused (state: %)', v_progress.runtime_state;
  END IF;

  -- Get current attempt
  SELECT * INTO v_attempt
  FROM task_attempts
  WHERE daily_task_progress_id = p_task_progress_id
    AND finished_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No open attempt found';
  END IF;

  -- Create new time segment
  INSERT INTO task_time_segments (
    task_attempt_id,
    started_at
  ) VALUES (
    v_attempt.id,
    CURRENT_TIMESTAMP
  ) RETURNING id INTO v_segment_id;

  -- Update progress
  UPDATE daily_task_progress
  SET runtime_state = 'RUNNING'
  WHERE id = p_task_progress_id;

  -- Log activity
  INSERT INTO activity_logs (
    participant_id,
    daily_session_id,
    task_id,
    task_progress_id,
    event_type,
    occurred_at
  ) VALUES (
    p_participant_id,
    v_progress.daily_session_id,
    v_progress.task_id,
    p_task_progress_id,
    'TASK_RESUMED',
    CURRENT_TIMESTAMP
  );

  -- Record operation
  INSERT INTO operation_requests (request_id, participant_id, operation_type, entity_id)
  VALUES (p_request_id, p_participant_id, 'RESUME_TASK', p_task_progress_id);

  RETURN QUERY SELECT
    v_segment_id,
    'Task resumed'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resume_task IS 'Resume a paused task, opening new time segment';

-- ============================================================
-- FINISH TASK
-- ============================================================

CREATE OR REPLACE FUNCTION finish_task(
  p_request_id UUID,
  p_participant_id UUID,
  p_task_progress_id UUID,
  p_result VARCHAR
)
RETURNS TABLE(
  points_awarded INTEGER,
  message TEXT
) AS $$
DECLARE
  v_progress RECORD;
  v_attempt RECORD;
  v_segment RECORD;
  v_duration INTEGER;
  v_points INTEGER;
  v_previous_points INTEGER;
  v_points_delta INTEGER;
  v_task_snapshot JSONB;
BEGIN
  -- Check idempotency
  IF EXISTS (SELECT 1 FROM operation_requests WHERE request_id = p_request_id) THEN
    RETURN QUERY SELECT
      0::INTEGER,
      'Task already finished with this request'::TEXT;
    RETURN;
  END IF;

  -- Validate result
  IF p_result NOT IN ('FULL', 'PARTIAL', 'NOT_COMPLETED') THEN
    RAISE EXCEPTION 'Invalid result: %. Must be FULL, PARTIAL, or NOT_COMPLETED', p_result;
  END IF;

  -- Lock progress with ownership validation
  SELECT dtp.*, ds.participant_id AS session_participant_id INTO v_progress
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE dtp.id = p_task_progress_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task progress not found';
  END IF;

  -- Validate ownership
  IF v_progress.session_participant_id != p_participant_id THEN
    RAISE EXCEPTION 'Task progress does not belong to this participant';
  END IF;

  IF v_progress.runtime_state = 'FINISHED' THEN
    RAISE EXCEPTION 'Task already finished';
  END IF;

  -- Get current attempt
  SELECT * INTO v_attempt
  FROM task_attempts
  WHERE daily_task_progress_id = p_task_progress_id
    AND finished_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No open attempt found';
  END IF;

  -- Close any open segment
  SELECT * INTO v_segment
  FROM task_time_segments
  WHERE task_attempt_id = v_attempt.id
    AND ended_at IS NULL;

  IF FOUND THEN
    v_duration := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_segment.started_at))::INTEGER;

    UPDATE task_time_segments
    SET
      ended_at = CURRENT_TIMESTAMP,
      duration_seconds = v_duration
    WHERE id = v_segment.id;

    UPDATE task_attempts
    SET active_seconds = active_seconds + v_duration
    WHERE id = v_attempt.id;

    UPDATE daily_task_progress
    SET active_seconds = active_seconds + v_duration
    WHERE id = p_task_progress_id;
  END IF;

  -- Calculate points for this result
  v_task_snapshot := v_progress.task_snapshot;

  CASE p_result
    WHEN 'FULL' THEN
      v_points := (v_task_snapshot->>'full_points')::INTEGER;
    WHEN 'PARTIAL' THEN
      v_points := (v_task_snapshot->>'partial_points')::INTEGER;
    WHEN 'NOT_COMPLETED' THEN
      v_points := 0;
  END CASE;

  -- Store previous points (before this finish)
  v_previous_points := v_progress.points_awarded;

  -- Calculate delta (points to add/remove from ledger)
  v_points_delta := v_points - v_previous_points;

  -- Finish attempt
  UPDATE task_attempts
  SET
    finished_at = CURRENT_TIMESTAMP,
    result = p_result
  WHERE id = v_attempt.id;

  -- Update progress with new points
  UPDATE daily_task_progress
  SET
    runtime_state = 'FINISHED',
    completion_result = p_result,
    points_awarded = v_points,
    finished_at = CURRENT_TIMESTAMP
  WHERE id = p_task_progress_id;

  -- Award points delta only (handles reopen correctly)
  IF v_points_delta != 0 THEN
    INSERT INTO points_ledger (
      participant_id,
      daily_session_id,
      task_id,
      task_progress_id,
      source_type,
      points_delta,
      reason
    ) VALUES (
      p_participant_id,
      v_progress.daily_session_id,
      v_progress.task_id,
      p_task_progress_id,
      'TASK_' || p_result,
      v_points_delta,
      'Task completed: ' || p_result
    );
  END IF;

  -- Log activity
  INSERT INTO activity_logs (
    participant_id,
    daily_session_id,
    task_id,
    task_progress_id,
    event_type,
    metadata,
    occurred_at
  ) VALUES (
    p_participant_id,
    v_progress.daily_session_id,
    v_progress.task_id,
    p_task_progress_id,
    'TASK_' || p_result || '_COMPLETED',
    jsonb_build_object('points_awarded', v_points),
    CURRENT_TIMESTAMP
  );

  -- Recalculate daily session
  PERFORM recalculate_daily_session(v_progress.daily_session_id);

  -- Record operation
  INSERT INTO operation_requests (request_id, participant_id, operation_type, entity_id)
  VALUES (p_request_id, p_participant_id, 'FINISH_TASK', p_task_progress_id);

  RETURN QUERY SELECT
    v_points,
    'Task finished: ' || p_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION finish_task IS 'Finish a task with result (FULL, PARTIAL, NOT_COMPLETED) and award points delta correctly for reopens';

-- ============================================================
-- REOPEN TASK
-- ============================================================

CREATE OR REPLACE FUNCTION reopen_task(
  p_request_id UUID,
  p_participant_id UUID,
  p_task_progress_id UUID
)
RETURNS TABLE(
  message TEXT
) AS $$
DECLARE
  v_progress RECORD;
BEGIN
  -- Check idempotency
  IF EXISTS (SELECT 1 FROM operation_requests WHERE request_id = p_request_id) THEN
    RETURN QUERY SELECT 'Task already reopened with this request'::TEXT;
    RETURN;
  END IF;

  -- Lock progress with ownership validation
  SELECT dtp.*, ds.participant_id AS session_participant_id INTO v_progress
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE dtp.id = p_task_progress_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task progress not found';
  END IF;

  -- Validate ownership
  IF v_progress.session_participant_id != p_participant_id THEN
    RAISE EXCEPTION 'Task progress does not belong to this participant';
  END IF;

  IF v_progress.runtime_state != 'FINISHED' THEN
    RAISE EXCEPTION 'Task must be finished to reopen (current state: %)', v_progress.runtime_state;
  END IF;

  -- Update progress - preserve previous attempt history and points
  -- Points will be recalculated when the task is finished again
  UPDATE daily_task_progress
  SET
    runtime_state = 'NOT_STARTED',
    reopen_count = reopen_count + 1,
    completion_result = NULL,
    finished_at = NULL
  WHERE id = p_task_progress_id;

  -- Log activity
  INSERT INTO activity_logs (
    participant_id,
    daily_session_id,
    task_id,
    task_progress_id,
    event_type,
    metadata,
    occurred_at
  ) VALUES (
    p_participant_id,
    v_progress.daily_session_id,
    v_progress.task_id,
    p_task_progress_id,
    'TASK_REOPENED',
    jsonb_build_object('previous_result', v_progress.completion_result, 'previous_points', v_progress.points_awarded),
    CURRENT_TIMESTAMP
  );

  -- Record operation
  INSERT INTO operation_requests (request_id, participant_id, operation_type, entity_id)
  VALUES (p_request_id, p_participant_id, 'REOPEN_TASK', p_task_progress_id);

  RETURN QUERY SELECT 'Task reopened successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reopen_task IS 'Reopen a finished task for retry, preserving previous attempt history. Points are recalculated on next finish.';

-- ============================================================
-- RECALCULATE DAILY SESSION
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_daily_session(
  p_session_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_earned_points INTEGER;
  v_possible_points INTEGER;
  v_active_seconds INTEGER;
  v_completion_percentage NUMERIC;
  v_success_threshold NUMERIC;
  v_is_successful BOOLEAN;
BEGIN
  -- Calculate totals from task progress
  SELECT
    COALESCE(SUM(points_awarded), 0),
    COALESCE(SUM((task_snapshot->>'full_points')::INTEGER), 0),
    COALESCE(SUM(active_seconds), 0)
  INTO
    v_earned_points,
    v_possible_points,
    v_active_seconds
  FROM daily_task_progress
  WHERE daily_session_id = p_session_id;

  -- Calculate completion percentage
  IF v_possible_points > 0 THEN
    v_completion_percentage := (v_earned_points::NUMERIC / v_possible_points::NUMERIC * 100);
  ELSE
    v_completion_percentage := 0;
  END IF;

  -- Get success threshold
  SELECT (value::TEXT)::NUMERIC INTO v_success_threshold
  FROM system_settings
  WHERE key = 'daily_success_percentage';

  -- Default to 90.00 if not configured
  v_success_threshold := COALESCE(v_success_threshold, 90.00);

  -- Determine success
  v_is_successful := v_completion_percentage >= v_success_threshold;

  -- Update session
  UPDATE daily_sessions
  SET
    earned_points = v_earned_points,
    possible_points = v_possible_points,
    active_seconds = v_active_seconds,
    completion_percentage = v_completion_percentage,
    is_successful = v_is_successful
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_daily_session IS 'Recalculate daily session totals and success status';

-- ============================================================
-- END DAY
-- ============================================================

CREATE OR REPLACE FUNCTION end_day(
  p_request_id UUID,
  p_participant_id UUID,
  p_session_id UUID
)
RETURNS TABLE(
  completion_percentage NUMERIC,
  is_successful BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_session RECORD;
  v_open_task RECORD;
  v_segment RECORD;
  v_duration INTEGER;
BEGIN
  -- Check idempotency
  IF EXISTS (SELECT 1 FROM operation_requests WHERE request_id = p_request_id) THEN
    SELECT ds.completion_percentage, ds.is_successful INTO v_session
    FROM daily_sessions ds
    WHERE id = p_session_id;

    RETURN QUERY SELECT
      v_session.completion_percentage,
      v_session.is_successful,
      'Day already ended with this request'::TEXT;
    RETURN;
  END IF;

  -- Lock session with ownership validation
  SELECT ds.* INTO v_session
  FROM daily_sessions ds
  WHERE ds.id = p_session_id
    AND ds.participant_id = p_participant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Daily session not found or does not belong to this participant';
  END IF;

  IF v_session.status IN ('ENDED', 'AUTO_COMPLETED') THEN
    RAISE EXCEPTION 'Day already ended';
  END IF;

  -- Handle any open tasks (RUNNING or PAUSED)
  FOR v_open_task IN
    SELECT dtp.id, dtp.runtime_state, ta.id AS attempt_id
    FROM daily_task_progress dtp
    LEFT JOIN task_attempts ta ON ta.daily_task_progress_id = dtp.id AND ta.finished_at IS NULL
    WHERE dtp.daily_session_id = p_session_id
      AND dtp.runtime_state IN ('RUNNING', 'PAUSED')
  LOOP
    -- Close any open segment
    IF v_open_task.runtime_state = 'RUNNING' AND v_open_task.attempt_id IS NOT NULL THEN
      SELECT * INTO v_segment
      FROM task_time_segments
      WHERE task_attempt_id = v_open_task.attempt_id
        AND ended_at IS NULL;

      IF FOUND THEN
        v_duration := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_segment.started_at))::INTEGER;

        UPDATE task_time_segments
        SET
          ended_at = CURRENT_TIMESTAMP,
          duration_seconds = v_duration
        WHERE id = v_segment.id;

        UPDATE task_attempts
        SET active_seconds = active_seconds + v_duration
        WHERE id = v_open_task.attempt_id;

        UPDATE daily_task_progress
        SET active_seconds = active_seconds + v_duration
        WHERE id = v_open_task.id;
      END IF;
    END IF;

    -- Finish open attempt as NOT_COMPLETED
    IF v_open_task.attempt_id IS NOT NULL THEN
      UPDATE task_attempts
      SET
        finished_at = CURRENT_TIMESTAMP,
        result = 'NOT_COMPLETED'
      WHERE id = v_open_task.attempt_id;
    END IF;

    -- Update task progress
    UPDATE daily_task_progress
    SET
      runtime_state = 'FINISHED',
      completion_result = 'NOT_COMPLETED',
      points_awarded = 0,
      finished_at = CURRENT_TIMESTAMP
    WHERE id = v_open_task.id;

    -- Log auto-completion
    INSERT INTO activity_logs (
      participant_id,
      daily_session_id,
      task_progress_id,
      event_type,
      metadata,
      occurred_at
    ) VALUES (
      p_participant_id,
      p_session_id,
      v_open_task.id,
      'TASK_AUTO_NOT_COMPLETED',
      jsonb_build_object('reason', 'end_day'),
      CURRENT_TIMESTAMP
    );
  END LOOP;

  -- Recalculate final totals
  PERFORM recalculate_daily_session(p_session_id);

  -- Update session
  UPDATE daily_sessions
  SET
    status = 'ENDED',
    ended_at = CURRENT_TIMESTAMP
  WHERE id = p_session_id
  RETURNING completion_percentage, is_successful INTO v_session;

  -- Log activity
  INSERT INTO activity_logs (
    participant_id,
    daily_session_id,
    event_type,
    metadata,
    occurred_at
  ) VALUES (
    p_participant_id,
    p_session_id,
    'DAY_ENDED',
    jsonb_build_object(
      'completion_percentage', v_session.completion_percentage,
      'is_successful', v_session.is_successful
    ),
    CURRENT_TIMESTAMP
  );

  -- Record operation
  INSERT INTO operation_requests (request_id, participant_id, operation_type, entity_id)
  VALUES (p_request_id, p_participant_id, 'END_DAY', p_session_id);

  -- Refresh streaks atomically
  -- This updates daily/weekly/monthly streak_period_results
  PERFORM refresh_participant_streaks(p_participant_id, v_session.session_date);

  RETURN QUERY SELECT
    v_session.completion_percentage,
    v_session.is_successful,
    'Day ended successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION end_day IS 'End a daily session, auto-completing any open tasks as NOT_COMPLETED, finalizing all calculations, and refreshing streaks';

-- ============================================================
-- UPDATE PARTICIPANT LAST SEEN
-- ============================================================

CREATE OR REPLACE FUNCTION update_participant_last_seen(
  p_participant_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE participants
  SET last_seen_at = CURRENT_TIMESTAMP
  WHERE id = p_participant_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_participant_last_seen IS 'Update participant last seen timestamp';

-- ============================================================
-- AWARD BADGE
-- ============================================================

CREATE OR REPLACE FUNCTION award_badge_if_missing(
  p_participant_id UUID,
  p_badge_id UUID,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_awarded BOOLEAN := false;
BEGIN
  -- Check if already awarded
  IF NOT EXISTS (
    SELECT 1 FROM participant_badges
    WHERE participant_id = p_participant_id
      AND badge_id = p_badge_id
  ) THEN
    -- Award badge
    INSERT INTO participant_badges (
      participant_id,
      badge_id,
      metadata
    ) VALUES (
      p_participant_id,
      p_badge_id,
      p_metadata
    );

    -- Log activity
    INSERT INTO activity_logs (
      participant_id,
      event_type,
      metadata,
      occurred_at
    ) VALUES (
      p_participant_id,
      'BADGE_AWARDED',
      jsonb_build_object('badge_id', p_badge_id),
      CURRENT_TIMESTAMP
    );

    v_awarded := true;
  END IF;

  RETURN v_awarded;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION award_badge_if_missing IS 'Award a badge if not already earned';

-- ============================================================
-- SET CURRENT TITLE
-- ============================================================

CREATE OR REPLACE FUNCTION set_current_title(
  p_participant_id UUID,
  p_title_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Clear current title
  UPDATE participant_titles
  SET is_current = false
  WHERE participant_id = p_participant_id
    AND is_current = true;

  -- Check if participant has this title
  IF EXISTS (
    SELECT 1 FROM participant_titles
    WHERE participant_id = p_participant_id
      AND title_id = p_title_id
  ) THEN
    -- Set as current
    UPDATE participant_titles
    SET is_current = true
    WHERE participant_id = p_participant_id
      AND title_id = p_title_id;
  ELSE
    -- Award and set as current
    INSERT INTO participant_titles (
      participant_id,
      title_id,
      is_current
    ) VALUES (
      p_participant_id,
      p_title_id,
      true
    );

    -- Log activity
    INSERT INTO activity_logs (
      participant_id,
      event_type,
      metadata,
      occurred_at
    ) VALUES (
      p_participant_id,
      'TITLE_AWARDED',
      jsonb_build_object('title_id', p_title_id),
      CURRENT_TIMESTAMP
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_current_title IS 'Set a title as current (awards if not already earned)';

-- ============================================================
-- RECORD NOTIFICATION
-- ============================================================

CREATE OR REPLACE FUNCTION record_notification(
  p_recipient_id UUID,
  p_sender_id UUID,
  p_source VARCHAR,
  p_type VARCHAR,
  p_title_ar VARCHAR DEFAULT NULL,
  p_title_en VARCHAR DEFAULT NULL,
  p_message_ar TEXT DEFAULT NULL,
  p_message_en TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_is_persistent BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    source,
    type,
    title_ar,
    title_en,
    message_ar,
    message_en,
    metadata,
    is_persistent
  ) VALUES (
    p_recipient_id,
    p_sender_id,
    p_source,
    p_type,
    p_title_ar,
    p_title_en,
    p_message_ar,
    p_message_en,
    p_metadata,
    p_is_persistent
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_notification IS 'Create a bilingual notification for a participant';

-- ============================================================
-- TIMEZONE HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION get_project_timezone()
RETURNS TEXT AS $$
DECLARE
  v_tz TEXT;
BEGIN
  SELECT value#>>'{}' INTO v_tz
  FROM system_settings
  WHERE key = 'project_timezone';

  IF v_tz IS NULL OR v_tz = 'null' THEN
    RAISE EXCEPTION 'Project timezone must be configured in system_settings before performing time-sensitive operations';
  END IF;

  RETURN v_tz;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_project_timezone IS 'Get configured project timezone, raise exception if not set';

CREATE OR REPLACE FUNCTION get_project_local_date(p_timestamp TIMESTAMPTZ DEFAULT NOW())
RETURNS DATE AS $$
DECLARE
  v_tz TEXT;
BEGIN
  v_tz := get_project_timezone();
  RETURN (p_timestamp AT TIME ZONE v_tz)::DATE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_project_local_date IS 'Convert timestamp to project local date using configured timezone';

-- ============================================================
-- SUNDAY-BASED WEEK CALCULATION
-- ============================================================

CREATE OR REPLACE FUNCTION get_week_start_sunday(p_date DATE)
RETURNS DATE AS $$
BEGIN
  -- PostgreSQL DATE_TRUNC('week') uses Monday
  -- This function returns the Sunday that starts the week containing p_date
  RETURN p_date - EXTRACT(DOW FROM p_date)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_week_start_sunday IS 'Get Sunday-based week start for a given date (Sunday = start of week)';

-- ============================================================
-- CALCULATE DAILY SUCCESS
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_daily_success(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_completion NUMERIC;
  v_threshold NUMERIC;
BEGIN
  -- Get completion percentage
  SELECT completion_percentage INTO v_completion
  FROM daily_sessions
  WHERE id = p_session_id;

  IF v_completion IS NULL THEN
    RETURN false;
  END IF;

  -- Get threshold from system settings
  SELECT (value::TEXT)::NUMERIC INTO v_threshold
  FROM system_settings
  WHERE key = 'daily_success_percentage';

  v_threshold := COALESCE(v_threshold, 90.00);

  -- Return true if >= threshold (90.00 = success, 89.99 = failure)
  RETURN v_completion >= v_threshold;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_daily_success IS 'Determine if a daily session meets success threshold (>= 90.00%)';

-- ============================================================
-- CALCULATE WEEKLY RESULT
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_weekly_result(
  p_participant_id UUID,
  p_week_start DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_week_end DATE;
  v_successful_days INTEGER;
  v_required_days INTEGER;
BEGIN
  v_week_end := p_week_start + INTERVAL '6 days';

  -- Count successful days in this week
  SELECT COUNT(*) INTO v_successful_days
  FROM daily_sessions
  WHERE participant_id = p_participant_id
    AND session_date >= p_week_start
    AND session_date <= v_week_end
    AND status IN ('ENDED', 'AUTO_COMPLETED')
    AND is_successful = true;

  -- Get required successful days from system settings
  SELECT (value::TEXT)::INTEGER INTO v_required_days
  FROM system_settings
  WHERE key = 'weekly_required_success_days';

  v_required_days := COALESCE(v_required_days, 3);

  -- Return true if participant has required successful days
  -- Days do NOT need to be consecutive
  RETURN v_successful_days >= v_required_days;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_weekly_result IS 'Calculate weekly success (Sunday-Saturday, any 3+ successful days)';

-- ============================================================
-- CALCULATE MONTHLY RESULT
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_monthly_result(
  p_participant_id UUID,
  p_month_start DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_month_end DATE;
  v_successful_weeks INTEGER;
  v_required_weeks INTEGER;
  v_attribution_mode TEXT;
  v_week_start DATE;
  v_week_end DATE;
  v_week_record RECORD;
BEGIN
  -- Get month boundaries
  v_month_end := (DATE_TRUNC('month', p_month_start) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Get required successful weeks
  SELECT (value::TEXT)::INTEGER INTO v_required_weeks
  FROM system_settings
  WHERE key = 'monthly_required_success_weeks';

  v_required_weeks := COALESCE(v_required_weeks, 3);

  -- Get attribution mode for cross-month weeks
  SELECT value#>>'{}' INTO v_attribution_mode
  FROM system_settings
  WHERE key = 'monthly_week_attribution_mode';

  IF v_attribution_mode IS NULL OR v_attribution_mode = 'null' THEN
    RAISE EXCEPTION 'monthly_week_attribution_mode must be configured before calculating monthly results';
  END IF;

  -- Count successful weeks based on attribution mode
  v_successful_weeks := 0;

  FOR v_week_record IN
    SELECT DISTINCT get_week_start_sunday(session_date) AS week_start
    FROM daily_sessions
    WHERE participant_id = p_participant_id
      AND session_date >= p_month_start
      AND session_date <= v_month_end
      AND status IN ('ENDED', 'AUTO_COMPLETED')
    ORDER BY week_start
  LOOP
    v_week_start := v_week_record.week_start;
    v_week_end := v_week_start + INTERVAL '6 days';

    -- Check if this week is successful
    IF calculate_weekly_result(p_participant_id, v_week_start) THEN
      -- Apply attribution mode for cross-month weeks
      IF v_week_start >= p_month_start AND v_week_end <= v_month_end THEN
        -- Week fully within month - always count
        v_successful_weeks := v_successful_weeks + 1;
      ELSIF v_attribution_mode = 'MONTH_OF_MAJORITY' THEN
        -- Count if majority of week days fall in this month
        IF v_week_start < p_month_start THEN
          -- Week starts before month - count if >= 4 days in month
          IF (v_week_end - p_month_start + 1) >= 4 THEN
            v_successful_weeks := v_successful_weeks + 1;
          END IF;
        ELSIF v_week_end > v_month_end THEN
          -- Week ends after month - count if >= 4 days in month
          IF (v_month_end - v_week_start + 1) >= 4 THEN
            v_successful_weeks := v_successful_weeks + 1;
          END IF;
        END IF;
      ELSIF v_attribution_mode = 'IGNORE_CROSS_MONTH' THEN
        -- Only count weeks fully within the month (already handled above)
        NULL;
      ELSE
        RAISE EXCEPTION 'Unsupported monthly_week_attribution_mode: %. Supported: MONTH_OF_MAJORITY, IGNORE_CROSS_MONTH', v_attribution_mode;
      END IF;
    END IF;
  END LOOP;

  RETURN v_successful_weeks >= v_required_weeks;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_monthly_result IS 'Calculate monthly success (3+ successful weeks, respects attribution mode)';

-- ============================================================
-- REFRESH PARTICIPANT STREAKS
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_participant_streaks(
  p_participant_id UUID,
  p_trigger_date DATE DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_date DATE;
  v_session_id UUID;
  v_is_successful BOOLEAN;
  v_week_start DATE;
  v_month_start DATE;
  v_daily_consecutive INTEGER := 0;
  v_daily_best INTEGER := 0;
  v_weekly_consecutive INTEGER := 0;
  v_weekly_best INTEGER := 0;
  v_monthly_consecutive INTEGER := 0;
  v_monthly_best INTEGER := 0;
  v_last_success_date DATE := NULL;
  v_last_success_week DATE := NULL;
  v_last_success_month DATE := NULL;
  v_current_consecutive INTEGER;
  v_current_best INTEGER;
BEGIN
  v_date := COALESCE(p_trigger_date, CURRENT_DATE);

  -- ============================================================
  -- DAILY STREAK PROCESSING
  -- ============================================================

  -- Process all completed daily sessions for this participant
  FOR v_session_id, v_date, v_is_successful IN
    SELECT id, session_date, is_successful
    FROM daily_sessions
    WHERE participant_id = p_participant_id
      AND status IN ('ENDED', 'AUTO_COMPLETED')
      AND session_date <= COALESCE(p_trigger_date, CURRENT_DATE)
    ORDER BY session_date
  LOOP
    -- Update or insert daily streak result
    INSERT INTO streak_period_results (
      participant_id,
      task_id,
      scope,
      period_type,
      period_start,
      period_end,
      completion_percentage,
      qualified,
      consecutive_count,
      best_count
    )
    SELECT
      p_participant_id,
      NULL,
      'OVERALL',
      'DAILY',
      v_date,
      v_date,
      ds.completion_percentage,
      v_is_successful,
      CASE
        WHEN v_is_successful THEN
          CASE
            WHEN v_last_success_date IS NULL OR v_date = v_last_success_date + INTERVAL '1 day' THEN
              COALESCE((SELECT consecutive_count FROM streak_period_results
                WHERE participant_id = p_participant_id
                  AND period_type = 'DAILY'
                  AND scope = 'OVERALL'
                  AND task_id IS NULL
                  AND period_start < v_date
                ORDER BY period_start DESC LIMIT 1), 0) + 1
            ELSE 1
          END
        ELSE 0
      END,
      CASE
        WHEN v_is_successful THEN
          GREATEST(
            COALESCE((SELECT MAX(best_count) FROM streak_period_results
              WHERE participant_id = p_participant_id
                AND period_type = 'DAILY'
                AND scope = 'OVERALL'
                AND task_id IS NULL
                AND period_start < v_date), 0),
            CASE
              WHEN v_last_success_date IS NULL OR v_date = v_last_success_date + INTERVAL '1 day' THEN
                COALESCE((SELECT consecutive_count FROM streak_period_results
                  WHERE participant_id = p_participant_id
                    AND period_type = 'DAILY'
                    AND scope = 'OVERALL'
                    AND task_id IS NULL
                    AND period_start < v_date
                  ORDER BY period_start DESC LIMIT 1), 0) + 1
              ELSE 1
            END
          )
        ELSE COALESCE((SELECT MAX(best_count) FROM streak_period_results
            WHERE participant_id = p_participant_id
              AND period_type = 'DAILY'
              AND scope = 'OVERALL'
              AND task_id IS NULL
              AND period_start < v_date), 0)
      END
    FROM daily_sessions ds
    WHERE ds.id = v_session_id
    ON CONFLICT (participant_id, scope, period_type, period_start, period_end)
      WHERE task_id IS NULL
    DO UPDATE SET
      completion_percentage = EXCLUDED.completion_percentage,
      qualified = EXCLUDED.qualified,
      consecutive_count = EXCLUDED.consecutive_count,
      best_count = EXCLUDED.best_count,
      updated_at = CURRENT_TIMESTAMP;

    IF v_is_successful THEN
      v_last_success_date := v_date;
    END IF;
  END LOOP;

  -- ============================================================
  -- WEEKLY STREAK PROCESSING
  -- ============================================================

  -- Process all unique weeks
  FOR v_week_start IN
    SELECT DISTINCT get_week_start_sunday(session_date) AS week_start
    FROM daily_sessions
    WHERE participant_id = p_participant_id
      AND status IN ('ENDED', 'AUTO_COMPLETED')
      AND session_date <= COALESCE(p_trigger_date, CURRENT_DATE)
    ORDER BY week_start
  LOOP
    v_is_successful := calculate_weekly_result(p_participant_id, v_week_start);

    -- Calculate consecutive and best counts
    IF v_is_successful THEN
      IF v_last_success_week IS NULL OR v_week_start = v_last_success_week + INTERVAL '7 days' THEN
        v_weekly_consecutive := v_weekly_consecutive + 1;
      ELSE
        v_weekly_consecutive := 1;
      END IF;
      v_weekly_best := GREATEST(v_weekly_best, v_weekly_consecutive);
      v_last_success_week := v_week_start;
    ELSE
      v_weekly_consecutive := 0;
    END IF;

    -- Insert or update weekly streak result
    INSERT INTO streak_period_results (
      participant_id,
      task_id,
      scope,
      period_type,
      period_start,
      period_end,
      qualified,
      successful_days,
      consecutive_count,
      best_count
    )
    SELECT
      p_participant_id,
      NULL,
      'OVERALL',
      'WEEKLY',
      v_week_start,
      v_week_start + INTERVAL '6 days',
      v_is_successful,
      (SELECT COUNT(*) FROM daily_sessions
        WHERE participant_id = p_participant_id
          AND session_date >= v_week_start
          AND session_date <= v_week_start + INTERVAL '6 days'
          AND status IN ('ENDED', 'AUTO_COMPLETED')
          AND is_successful = true),
      v_weekly_consecutive,
      v_weekly_best
    ON CONFLICT (participant_id, scope, period_type, period_start, period_end)
      WHERE task_id IS NULL
    DO UPDATE SET
      qualified = EXCLUDED.qualified,
      successful_days = EXCLUDED.successful_days,
      consecutive_count = EXCLUDED.consecutive_count,
      best_count = EXCLUDED.best_count,
      updated_at = CURRENT_TIMESTAMP;
  END LOOP;

  -- ============================================================
  -- MONTHLY STREAK PROCESSING
  -- ============================================================

  -- Process all unique months (only if attribution mode is configured)
  BEGIN
    FOR v_month_start IN
      SELECT DISTINCT DATE_TRUNC('month', session_date)::DATE AS month_start
      FROM daily_sessions
      WHERE participant_id = p_participant_id
        AND status IN ('ENDED', 'AUTO_COMPLETED')
        AND session_date <= COALESCE(p_trigger_date, CURRENT_DATE)
      ORDER BY month_start
    LOOP
      v_is_successful := calculate_monthly_result(p_participant_id, v_month_start);

      -- Calculate consecutive and best counts
      IF v_is_successful THEN
        IF v_last_success_month IS NULL OR v_month_start = (v_last_success_month + INTERVAL '1 month')::DATE THEN
          v_monthly_consecutive := v_monthly_consecutive + 1;
        ELSE
          v_monthly_consecutive := 1;
        END IF;
        v_monthly_best := GREATEST(v_monthly_best, v_monthly_consecutive);
        v_last_success_month := v_month_start;
      ELSE
        v_monthly_consecutive := 0;
      END IF;

      -- Insert or update monthly streak result
      INSERT INTO streak_period_results (
        participant_id,
        task_id,
        scope,
        period_type,
        period_start,
        period_end,
        qualified,
        successful_weeks,
        consecutive_count,
        best_count
      )
      SELECT
        p_participant_id,
        NULL,
        'OVERALL',
        'MONTHLY',
        v_month_start,
        (DATE_TRUNC('month', v_month_start) + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
        v_is_successful,
        (SELECT COUNT(DISTINCT get_week_start_sunday(session_date))
          FROM daily_sessions
          WHERE participant_id = p_participant_id
            AND session_date >= v_month_start
            AND session_date < (v_month_start + INTERVAL '1 month')::DATE
            AND status IN ('ENDED', 'AUTO_COMPLETED')
            AND is_successful = true),
        v_monthly_consecutive,
        v_monthly_best
      ON CONFLICT (participant_id, scope, period_type, period_start, period_end)
        WHERE task_id IS NULL
      DO UPDATE SET
        qualified = EXCLUDED.qualified,
        successful_weeks = EXCLUDED.successful_weeks,
        consecutive_count = EXCLUDED.consecutive_count,
        best_count = EXCLUDED.best_count,
        updated_at = CURRENT_TIMESTAMP;
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      -- If monthly calculation fails due to missing configuration, that's OK
      -- Monthly results will remain uncalculated until configuration is added
      IF SQLERRM NOT LIKE '%monthly_week_attribution_mode%' THEN
        RAISE;
      END IF;
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_participant_streaks IS 'Recalculate and update all streak results (daily/weekly/monthly) for a participant';

-- ============================================================
-- AUTH SESSION SECURITY
-- ============================================================

-- Add unique constraint on token_hash if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_auth_sessions_token_hash'
  ) THEN
    ALTER TABLE auth_sessions ADD CONSTRAINT uq_auth_sessions_token_hash UNIQUE (token_hash);
  END IF;
END $$;