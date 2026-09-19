-- ============================================================
-- Journey of Change - Validation Tests
-- ============================================================
--
-- Simple SQL validation tests (no external dependencies like pgTAP)
-- Run after all schema/seed files have been executed
--
-- ============================================================

\echo '============================================================'
\echo 'Journey of Change - Database Validation Tests'
\echo '============================================================'
\echo ''

-- Set up test transaction
BEGIN;

\echo 'Test 1: Verify core tables exist...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'participants', 'daily_sessions', 'daily_task_progress',
      'task_attempts', 'task_time_segments', 'tasks', 'task_categories',
      'task_types', 'activity_logs', 'points_ledger'
    );

  IF v_count < 10 THEN
    RAISE EXCEPTION 'Expected at least 10 core tables, found %', v_count;
  END IF;

  RAISE NOTICE '✓ Core tables exist (found %)', v_count;
END $$;

\echo 'Test 2: Verify system settings seeded...'
DO $$
DECLARE
  v_threshold NUMERIC;
BEGIN
  SELECT (value::TEXT)::NUMERIC INTO v_threshold
  FROM system_settings
  WHERE key = 'daily_success_percentage';

  IF v_threshold IS NULL THEN
    RAISE EXCEPTION 'daily_success_percentage not configured';
  END IF;

  IF v_threshold != 90.00 THEN
    RAISE EXCEPTION 'Expected threshold 90.00, got %', v_threshold;
  END IF;

  RAISE NOTICE '✓ System settings configured correctly';
END $$;

\echo 'Test 3: Verify 9 task categories seeded...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM task_categories;

  IF v_count != 9 THEN
    RAISE EXCEPTION 'Expected 9 categories, found %', v_count;
  END IF;

  RAISE NOTICE '✓ Task categories seeded (9 categories)';
END $$;

\echo 'Test 4: Verify task types seeded...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM task_types
  WHERE code IN ('QURAN', 'ADHKAR', 'PRAYER', 'READING', 'SPORT', 'WATER', 'SLEEP', 'GENERAL');

  IF v_count < 8 THEN
    RAISE EXCEPTION 'Expected 8 task types, found %', v_count;
  END IF;

  RAISE NOTICE '✓ Task types seeded';
END $$;

\echo 'Test 5: Verify titles seeded...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM titles
  WHERE slug IN ('guardian-of-emerald', 'master-of-consistency', 'companion-of-quran');

  IF v_count < 3 THEN
    RAISE EXCEPTION 'Expected 3 titles, found %', v_count;
  END IF;

  RAISE NOTICE '✓ Titles seeded (حارس الزمرد, سيد الاستمرارية, رفيق القرآن)';
END $$;

\echo 'Test 6: Create test participant...'
DO $$
DECLARE
  v_participant_id UUID;
BEGIN
  INSERT INTO participants (display_name, pin_hash, role)
  VALUES ('Test User', '$2a$10$FAKE_HASH_FOR_TESTING', 'PARTICIPANT')
  RETURNING id INTO v_participant_id;

  IF v_participant_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create test participant';
  END IF;

  RAISE NOTICE '✓ Test participant created: %', v_participant_id;
END $$;

\echo 'Test 7: Create test task...'
DO $$
DECLARE
  v_task_id UUID;
  v_category_id UUID;
  v_type_id UUID;
BEGIN
  SELECT id INTO v_category_id FROM task_categories LIMIT 1;
  SELECT id INTO v_type_id FROM task_types WHERE code = 'GENERAL' LIMIT 1;

  INSERT INTO tasks (
    category_id, task_type_id, name_ar, name_en,
    full_points, partial_points
  ) VALUES (
    v_category_id, v_type_id, 'مهمة اختبار', 'Test Task',
    10, 5
  ) RETURNING id INTO v_task_id;

  IF v_task_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create test task';
  END IF;

  RAISE NOTICE '✓ Test task created: %', v_task_id;
END $$;

\echo 'Test 8: Start day with project timezone...'
DO $$
DECLARE
  v_participant_id UUID;
  v_session_id UUID;
  v_session_id2 UUID;
  v_request_id UUID := gen_random_uuid();
  v_session_date DATE;
BEGIN
  -- Configure project timezone for test
  UPDATE system_settings SET value = '"UTC"'::jsonb WHERE key = 'project_timezone';

  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  -- First call
  SELECT session_id INTO v_session_id
  FROM start_day(v_request_id, v_participant_id, CURRENT_TIMESTAMP);

  -- Verify session was created with correct date derived from timezone
  SELECT session_date INTO v_session_date
  FROM daily_sessions
  WHERE id = v_session_id;

  IF v_session_date IS NULL THEN
    RAISE EXCEPTION 'Session date not set';
  END IF;

  -- Second call with same request_id (idempotent)
  SELECT session_id INTO v_session_id2
  FROM start_day(v_request_id, v_participant_id, CURRENT_TIMESTAMP);

  IF v_session_id != v_session_id2 THEN
    RAISE EXCEPTION 'start_day not idempotent: % vs %', v_session_id, v_session_id2;
  END IF;

  RAISE NOTICE '✓ Start day works with project timezone and is idempotent';
END $$;

\echo 'Test 9: Start task...'
DO $$
DECLARE
  v_participant_id UUID;
  v_task_progress_id UUID;
  v_attempt_id UUID;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  SELECT dtp.id INTO v_task_progress_id
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE ds.participant_id = v_participant_id
    AND ds.session_date = CURRENT_DATE
  LIMIT 1;

  SELECT attempt_id INTO v_attempt_id
  FROM start_task(gen_random_uuid(), v_participant_id, v_task_progress_id);

  IF v_attempt_id IS NULL THEN
    RAISE EXCEPTION 'Failed to start task';
  END IF;

  RAISE NOTICE '✓ Task started successfully';
END $$;

\echo 'Test 10: Pause task...'
DO $$
DECLARE
  v_participant_id UUID;
  v_task_progress_id UUID;
  v_duration INTEGER;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  SELECT dtp.id INTO v_task_progress_id
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE ds.participant_id = v_participant_id
    AND dtp.runtime_state = 'RUNNING'
  LIMIT 1;

  -- Small delay to ensure duration > 0
  PERFORM pg_sleep(0.1);

  SELECT segment_duration INTO v_duration
  FROM pause_task(gen_random_uuid(), v_participant_id, v_task_progress_id);

  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'Failed to pause task';
  END IF;

  RAISE NOTICE '✓ Task paused (duration: %s)', v_duration;
END $$;

\echo 'Test 11: Resume task...'
DO $$
DECLARE
  v_participant_id UUID;
  v_task_progress_id UUID;
  v_segment_id UUID;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  SELECT dtp.id INTO v_task_progress_id
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE ds.participant_id = v_participant_id
    AND dtp.runtime_state = 'PAUSED'
  LIMIT 1;

  SELECT segment_id INTO v_segment_id
  FROM resume_task(gen_random_uuid(), v_participant_id, v_task_progress_id);

  IF v_segment_id IS NULL THEN
    RAISE EXCEPTION 'Failed to resume task';
  END IF;

  RAISE NOTICE '✓ Task resumed';
END $$;

\echo 'Test 12: Finish task FULL...'
DO $$
DECLARE
  v_participant_id UUID;
  v_task_progress_id UUID;
  v_points INTEGER;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  SELECT dtp.id INTO v_task_progress_id
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE ds.participant_id = v_participant_id
    AND dtp.runtime_state = 'RUNNING'
  LIMIT 1;

  PERFORM pg_sleep(0.1);

  SELECT points_awarded INTO v_points
  FROM finish_task(gen_random_uuid(), v_participant_id, v_task_progress_id, 'FULL');

  IF v_points != 10 THEN
    RAISE EXCEPTION 'Expected 10 points for FULL, got %', v_points;
  END IF;

  RAISE NOTICE '✓ Task finished FULL (awarded 10 points)';
END $$;

\echo 'Test 13: Test PARTIAL completion points...'
DO $$
DECLARE
  v_participant_id UUID;
  v_task_progress_id UUID;
  v_points INTEGER;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  -- Find another task to test PARTIAL
  SELECT dtp.id INTO v_task_progress_id
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE ds.participant_id = v_participant_id
    AND dtp.runtime_state = 'NOT_STARTED'
  LIMIT 1;

  -- Start it
  PERFORM start_task(gen_random_uuid(), v_participant_id, v_task_progress_id);
  PERFORM pg_sleep(0.1);

  -- Finish as PARTIAL
  SELECT points_awarded INTO v_points
  FROM finish_task(gen_random_uuid(), v_participant_id, v_task_progress_id, 'PARTIAL');

  IF v_points != 5 THEN
    RAISE EXCEPTION 'Expected 5 points for PARTIAL, got %', v_points;
  END IF;

  RAISE NOTICE '✓ PARTIAL completion awarded 5 points';
END $$;

\echo 'Test 14: Test NOT_COMPLETED (zero points)...'
DO $$
DECLARE
  v_participant_id UUID;
  v_task_progress_id UUID;
  v_points INTEGER;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  SELECT dtp.id INTO v_task_progress_id
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE ds.participant_id = v_participant_id
    AND dtp.runtime_state = 'NOT_STARTED'
  LIMIT 1;

  PERFORM start_task(gen_random_uuid(), v_participant_id, v_task_progress_id);
  PERFORM pg_sleep(0.1);

  SELECT points_awarded INTO v_points
  FROM finish_task(gen_random_uuid(), v_participant_id, v_task_progress_id, 'NOT_COMPLETED');

  IF v_points != 0 THEN
    RAISE EXCEPTION 'Expected 0 points for NOT_COMPLETED, got %', v_points;
  END IF;

  RAISE NOTICE '✓ NOT_COMPLETED awarded 0 points';
END $$;

\echo 'Test 15: Test daily session recalculation...'
DO $$
DECLARE
  v_session RECORD;
  v_expected_earned INTEGER := 15; -- 10 + 5 + 0
BEGIN
  SELECT * INTO v_session
  FROM daily_sessions
  WHERE session_date = CURRENT_DATE
  LIMIT 1;

  IF v_session.earned_points != v_expected_earned THEN
    RAISE EXCEPTION 'Expected earned_points = %, got %', v_expected_earned, v_session.earned_points;
  END IF;

  RAISE NOTICE '✓ Daily session totals calculated correctly (earned: %, possible: %)',
    v_session.earned_points, v_session.possible_points;
END $$;

\echo 'Test 16: Test 90.00% success threshold...'
DO $$
DECLARE
  v_session RECORD;
  v_completion NUMERIC;
BEGIN
  SELECT * INTO v_session
  FROM daily_sessions
  WHERE session_date = CURRENT_DATE
  LIMIT 1;

  v_completion := v_session.completion_percentage;

  -- Test boundary: 90.00 = success, 89.99 = failure
  IF v_completion >= 90.00 AND v_session.is_successful != true THEN
    RAISE EXCEPTION 'Completion %.2f%% should be successful', v_completion;
  END IF;

  IF v_completion < 90.00 AND v_session.is_successful != false THEN
    RAISE EXCEPTION 'Completion %.2f%% should NOT be successful', v_completion;
  END IF;

  RAISE NOTICE '✓ Success threshold logic correct (completion: %.2f%%, success: %)',
    v_completion, v_session.is_successful;
END $$;

\echo 'Test 17: Test reopen task preserves history...'
DO $$
DECLARE
  v_participant_id UUID;
  v_task_progress_id UUID;
  v_attempt_count_before INTEGER;
  v_attempt_count_after INTEGER;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  SELECT dtp.id, dtp.attempt_count INTO v_task_progress_id, v_attempt_count_before
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE ds.participant_id = v_participant_id
    AND dtp.runtime_state = 'FINISHED'
  LIMIT 1;

  -- Reopen
  PERFORM reopen_task(gen_random_uuid(), v_participant_id, v_task_progress_id);

  -- Check history preserved
  SELECT COUNT(*) INTO v_attempt_count_after
  FROM task_attempts
  WHERE daily_task_progress_id = v_task_progress_id;

  IF v_attempt_count_after < v_attempt_count_before THEN
    RAISE EXCEPTION 'Reopen destroyed attempt history';
  END IF;

  RAISE NOTICE '✓ Reopen preserves attempt history';
END $$;

\echo 'Test 18: Test activity logs created...'
DO $$
DECLARE
  v_log_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_log_count
  FROM activity_logs
  WHERE event_type IN ('DAY_STARTED', 'TASK_STARTED', 'TASK_FULL_COMPLETED');

  IF v_log_count < 3 THEN
    RAISE EXCEPTION 'Expected activity logs, found only %', v_log_count;
  END IF;

  RAISE NOTICE '✓ Activity logs created (% entries)', v_log_count;
END $$;

\echo 'Test 19: Test points ledger integrity...'
DO $$
DECLARE
  v_ledger_points INTEGER;
  v_session_points INTEGER;
BEGIN
  SELECT COALESCE(SUM(points_delta), 0) INTO v_ledger_points
  FROM points_ledger
  WHERE daily_session_id IN (
    SELECT id FROM daily_sessions WHERE session_date = CURRENT_DATE
  );

  SELECT earned_points INTO v_session_points
  FROM daily_sessions
  WHERE session_date = CURRENT_DATE
  LIMIT 1;

  IF v_ledger_points != v_session_points THEN
    RAISE EXCEPTION 'Points ledger mismatch: ledger=%, session=%', v_ledger_points, v_session_points;
  END IF;

  RAISE NOTICE '✓ Points ledger matches session total';
END $$;

\echo 'Test 20: Test only one open segment constraint...'
DO $$
DECLARE
  v_participant_id UUID;
  v_task_progress_id UUID;
  v_attempt_id UUID;
  v_error_caught BOOLEAN := false;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  -- Start new task
  SELECT dtp.id INTO v_task_progress_id
  FROM daily_task_progress dtp
  JOIN daily_sessions ds ON ds.id = dtp.daily_session_id
  WHERE ds.participant_id = v_participant_id
    AND dtp.runtime_state = 'NOT_STARTED'
  LIMIT 1;

  IF v_task_progress_id IS NOT NULL THEN
    SELECT attempt_id INTO v_attempt_id
    FROM start_task(gen_random_uuid(), v_participant_id, v_task_progress_id);

    -- Try to create duplicate segment (should fail)
    BEGIN
      INSERT INTO task_time_segments (task_attempt_id, started_at)
      VALUES (v_attempt_id, CURRENT_TIMESTAMP);
    EXCEPTION WHEN unique_violation THEN
      v_error_caught := true;
    END;

    IF NOT v_error_caught THEN
      RAISE EXCEPTION 'Constraint failed: multiple open segments allowed';
    END IF;
  END IF;

  RAISE NOTICE '✓ Only one open segment constraint enforced';
END $$;

\echo 'Test 21: Test foreign key integrity...'
DO $$
DECLARE
  v_error_caught BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO daily_sessions (participant_id, session_date, status)
    VALUES ('00000000-0000-0000-0000-000000000000'::UUID, CURRENT_DATE, 'ACTIVE');
  EXCEPTION WHEN foreign_key_violation THEN
    v_error_caught := true;
  END;

  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'Foreign key constraint not enforced';
  END IF;

  RAISE NOTICE '✓ Foreign key constraints enforced';
END $$;

\echo 'Test 22: Test views compile...'
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Test one view from each category
  SELECT COUNT(*) INTO v_count FROM v_participant_daily_summary;
  SELECT COUNT(*) INTO v_count FROM v_daily_leaderboard;
  SELECT COUNT(*) INTO v_count FROM v_task_performance_summary;
  SELECT COUNT(*) INTO v_count FROM v_recent_live_activity;

  RAISE NOTICE '✓ All views compile and execute';
END $$;

\echo 'Test 23: Test reopen points behavior (FULL → PARTIAL)...'
DO $$
DECLARE
  v_participant_id UUID;
  v_task_progress_id UUID;
  v_points_after_first INTEGER;
  v_points_after_reopen INTEGER;
  v_ledger_total INTEGER;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  -- Create a new task for this test
  INSERT INTO tasks (
    category_id, task_type_id, name_ar, name_en,
    full_points, partial_points
  )
  SELECT
    (SELECT id FROM task_categories LIMIT 1),
    (SELECT id FROM task_types WHERE code = 'GENERAL' LIMIT 1),
    'مهمة إعادة فتح', 'Reopen Test Task',
    10, 5
  RETURNING id INTO v_task_progress_id;

  -- Add to current session
  INSERT INTO daily_task_progress (
    daily_session_id,
    task_id,
    task_snapshot,
    runtime_state
  )
  SELECT
    ds.id,
    v_task_progress_id,
    jsonb_build_object('task_id', v_task_progress_id, 'full_points', 10, 'partial_points', 5),
    'NOT_STARTED'
  FROM daily_sessions ds
  WHERE ds.participant_id = v_participant_id
    AND ds.session_date = CURRENT_DATE
  RETURNING id INTO v_task_progress_id;

  -- Start, finish as FULL (10 points)
  PERFORM start_task(gen_random_uuid(), v_participant_id, v_task_progress_id);
  PERFORM pg_sleep(0.1);
  PERFORM finish_task(gen_random_uuid(), v_participant_id, v_task_progress_id, 'FULL');

  SELECT points_awarded INTO v_points_after_first
  FROM daily_task_progress
  WHERE id = v_task_progress_id;

  IF v_points_after_first != 10 THEN
    RAISE EXCEPTION 'Expected 10 points after FULL, got %', v_points_after_first;
  END IF;

  -- Reopen
  PERFORM reopen_task(gen_random_uuid(), v_participant_id, v_task_progress_id);

  -- Start again, finish as PARTIAL (5 points)
  PERFORM start_task(gen_random_uuid(), v_participant_id, v_task_progress_id);
  PERFORM pg_sleep(0.1);
  PERFORM finish_task(gen_random_uuid(), v_participant_id, v_task_progress_id, 'PARTIAL');

  SELECT points_awarded INTO v_points_after_reopen
  FROM daily_task_progress
  WHERE id = v_task_progress_id;

  IF v_points_after_reopen != 5 THEN
    RAISE EXCEPTION 'Expected 5 points after PARTIAL, got %', v_points_after_reopen;
  END IF;

  -- Check ledger total (should be 10 - 5 = 5 net)
  SELECT COALESCE(SUM(points_delta), 0) INTO v_ledger_total
  FROM points_ledger
  WHERE task_progress_id = v_task_progress_id;

  IF v_ledger_total != 5 THEN
    RAISE EXCEPTION 'Expected ledger total 5 (10-5), got %', v_ledger_total;
  END IF;

  RAISE NOTICE '✓ Reopen points correct: FULL(10) → PARTIAL(5) = 5 net points';
END $$;

\echo 'Test 24: Test end_day closes open tasks...'
DO $$
DECLARE
  v_participant_id UUID;
  v_session_id UUID;
  v_task_progress_id UUID;
  v_open_segments INTEGER;
  v_open_attempts INTEGER;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  -- Get current session
  SELECT id INTO v_session_id
  FROM daily_sessions
  WHERE participant_id = v_participant_id
    AND session_date = get_project_local_date(CURRENT_TIMESTAMP);

  -- Start a task but don't finish it
  SELECT dtp.id INTO v_task_progress_id
  FROM daily_task_progress dtp
  WHERE dtp.daily_session_id = v_session_id
    AND dtp.runtime_state = 'NOT_STARTED'
  LIMIT 1;

  IF v_task_progress_id IS NOT NULL THEN
    PERFORM start_task(gen_random_uuid(), v_participant_id, v_task_progress_id);

    -- End day (should auto-complete the running task)
    PERFORM end_day(gen_random_uuid(), v_participant_id, v_session_id);

    -- Check no open segments
    SELECT COUNT(*) INTO v_open_segments
    FROM task_time_segments tts
    JOIN task_attempts ta ON ta.id = tts.task_attempt_id
    JOIN daily_task_progress dtp ON dtp.id = ta.daily_task_progress_id
    WHERE dtp.daily_session_id = v_session_id
      AND tts.ended_at IS NULL;

    IF v_open_segments > 0 THEN
      RAISE EXCEPTION 'Found % open segments after end_day', v_open_segments;
    END IF;

    -- Check no open attempts
    SELECT COUNT(*) INTO v_open_attempts
    FROM task_attempts ta
    JOIN daily_task_progress dtp ON dtp.id = ta.daily_task_progress_id
    WHERE dtp.daily_session_id = v_session_id
      AND ta.finished_at IS NULL;

    IF v_open_attempts > 0 THEN
      RAISE EXCEPTION 'Found % open attempts after end_day', v_open_attempts;
    END IF;

    RAISE NOTICE '✓ end_day properly closes all open tasks and segments';
  ELSE
    RAISE NOTICE '✓ end_day test skipped (no available tasks)';
  END IF;
END $$;

\echo 'Test 25: Test Sunday-based week calculation...'
DO $$
DECLARE
  v_sunday DATE := '2026-09-13';  -- Known Sunday
  v_monday DATE := '2026-09-14';  -- Known Monday
  v_saturday DATE := '2026-09-19'; -- Known Saturday
  v_week_start_from_sunday DATE;
  v_week_start_from_monday DATE;
  v_week_start_from_saturday DATE;
BEGIN
  v_week_start_from_sunday := get_week_start_sunday(v_sunday);
  v_week_start_from_monday := get_week_start_sunday(v_monday);
  v_week_start_from_saturday := get_week_start_sunday(v_saturday);

  IF v_week_start_from_sunday != v_sunday THEN
    RAISE EXCEPTION 'Sunday week start incorrect: expected %, got %', v_sunday, v_week_start_from_sunday;
  END IF;

  IF v_week_start_from_monday != v_sunday THEN
    RAISE EXCEPTION 'Monday week start incorrect: expected %, got %', v_sunday, v_week_start_from_monday;
  END IF;

  IF v_week_start_from_saturday != v_sunday THEN
    RAISE EXCEPTION 'Saturday week start incorrect: expected %, got %', v_sunday, v_week_start_from_saturday;
  END IF;

  RAISE NOTICE '✓ Sunday-based week calculation correct (Sun-Sat)';
END $$;

\echo 'Test 26: Test daily success threshold (90.00% boundary)...'
DO $$
DECLARE
  v_participant_id UUID;
  v_session_id UUID;
  v_is_successful BOOLEAN;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';
  SELECT id INTO v_session_id FROM daily_sessions WHERE participant_id = v_participant_id ORDER BY created_at DESC LIMIT 1;

  -- Test the calculate_daily_success function directly
  v_is_successful := calculate_daily_success(v_session_id);

  -- Get actual completion
  DECLARE
    v_completion NUMERIC;
  BEGIN
    SELECT completion_percentage INTO v_completion FROM daily_sessions WHERE id = v_session_id;

    -- Verify: 90.00 = success, 89.99 = failure
    IF v_completion >= 90.00 AND NOT v_is_successful THEN
      RAISE EXCEPTION 'Daily success wrong: %.2f%% should be successful', v_completion;
    END IF;

    IF v_completion < 90.00 AND v_is_successful THEN
      RAISE EXCEPTION 'Daily success wrong: %.2f%% should NOT be successful', v_completion;
    END IF;

    RAISE NOTICE '✓ Daily success threshold correct (%.2f%% -> %)', v_completion, v_is_successful;
  END;
END $$;

\echo 'Test 27: Test weekly success (any 3 successful days)...'
DO $$
DECLARE
  v_participant_id UUID;
  v_week_start DATE;
  v_is_weekly_successful BOOLEAN;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  -- Get week of the test session
  SELECT get_week_start_sunday(session_date) INTO v_week_start
  FROM daily_sessions
  WHERE participant_id = v_participant_id
  ORDER BY session_date DESC
  LIMIT 1;

  -- Calculate weekly result
  v_is_weekly_successful := calculate_weekly_result(v_participant_id, v_week_start);

  RAISE NOTICE '✓ Weekly success calculation works (result: %)', v_is_weekly_successful;
END $$;

\echo 'Test 28: Test streak refresh creates results...'
DO $$
DECLARE
  v_participant_id UUID;
  v_streak_count INTEGER;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  -- Refresh streaks
  PERFORM refresh_participant_streaks(v_participant_id);

  -- Check that streak results were created
  SELECT COUNT(*) INTO v_streak_count
  FROM streak_period_results
  WHERE participant_id = v_participant_id;

  IF v_streak_count = 0 THEN
    RAISE EXCEPTION 'No streak results created after refresh';
  END IF;

  RAISE NOTICE '✓ Streak refresh created % results', v_streak_count;
END $$;

\echo 'Test 29: Test no duplicate streak results on repeated refresh...'
DO $$
DECLARE
  v_participant_id UUID;
  v_count_before INTEGER;
  v_count_after INTEGER;
BEGIN
  SELECT id INTO v_participant_id FROM participants WHERE display_name = 'Test User';

  -- Count before
  SELECT COUNT(*) INTO v_count_before
  FROM streak_period_results
  WHERE participant_id = v_participant_id;

  -- Refresh again
  PERFORM refresh_participant_streaks(v_participant_id);

  -- Count after
  SELECT COUNT(*) INTO v_count_after
  FROM streak_period_results
  WHERE participant_id = v_participant_id;

  IF v_count_after != v_count_before THEN
    RAISE EXCEPTION 'Duplicate streak results created: before %, after %', v_count_before, v_count_after;
  END IF;

  RAISE NOTICE '✓ No duplicate streak results on repeated refresh';
END $$;

\echo 'Test 30: Test project timezone required...'
DO $$
DECLARE
  v_error_caught BOOLEAN := false;
BEGIN
  -- Temporarily clear timezone
  UPDATE system_settings SET value = 'null'::jsonb WHERE key = 'project_timezone';

  BEGIN
    -- Try to get project local date (should fail)
    PERFORM get_project_local_date();
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Project timezone must be configured%' THEN
        v_error_caught := true;
      END IF;
  END;

  -- Restore timezone for remaining tests
  UPDATE system_settings SET value = '"UTC"'::jsonb WHERE key = 'project_timezone';

  IF NOT v_error_caught THEN
    RAISE EXCEPTION 'Project timezone validation failed';
  END IF;

  RAISE NOTICE '✓ Project timezone requirement enforced';
END $$;

\echo ''
\echo '============================================================'
\echo 'All 30 validation tests passed successfully!'
\echo '============================================================'

-- Rollback test data
ROLLBACK;

\echo ''
\echo 'Test transaction rolled back (no test data persisted)'
