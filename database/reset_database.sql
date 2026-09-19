-- ============================================================
-- Journey of Change - Reset Database Script
-- ============================================================
--
-- WARNING: This script DESTROYS all data and recreates the database
-- Use ONLY for development/testing
--
-- DO NOT RUN IN PRODUCTION
--
-- ============================================================

\echo '============================================================'
\echo 'WARNING: This will destroy all data in journey_of_change'
\echo '============================================================'
\echo ''

-- Must be run from postgres database
\c postgres

-- Terminate existing connections
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'journey_of_change'
  AND pid <> pg_backend_pid();

-- Drop and recreate
DROP DATABASE IF EXISTS journey_of_change;

CREATE DATABASE journey_of_change
  WITH
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  TEMPLATE = template0;

\echo 'Database dropped and recreated'
\echo ''
\echo 'Now run the SQL files in order:'
\echo '  \\c journey_of_change'
\echo '  \\i 001_extensions_helpers.sql'
\echo '  \\i 002_core_schema.sql'
\echo '  ... etc'
