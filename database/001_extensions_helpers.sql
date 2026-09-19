-- ============================================================
-- Journey of Change - Extensions and Helpers
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Reusable trigger function for updated_at timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_updated_at() IS 'Automatically sets updated_at to current timestamp on UPDATE';

-- ============================================================
-- Helper function to validate project timezone is configured
-- ============================================================

CREATE OR REPLACE FUNCTION require_project_timezone()
RETURNS TEXT AS $$
DECLARE
  tz TEXT;
BEGIN
  SELECT value::text FROM system_settings WHERE key = 'project_timezone' INTO tz;

  IF tz IS NULL OR tz = 'null' THEN
    RAISE EXCEPTION 'Project timezone must be configured in system_settings before performing time-sensitive operations';
  END IF;

  RETURN tz;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION require_project_timezone() IS 'Validates that project_timezone is configured, raises exception otherwise';
