-- ============================================================
-- Journey of Change - Database Creation
-- ============================================================
--
-- IMPORTANT: This script creates the database safely.
-- It does NOT drop existing databases.
-- For destructive reset, use reset_database.sql instead.
--
-- USAGE:
--
-- From psql command line:
--   psql -U postgres -d postgres -f 000_create_database.sql
--
-- From psql interactive:
--   \c postgres
--   \i 000_create_database.sql
--
-- From pgAdmin:
--   1. Connect to 'postgres' database
--   2. Open Query Tool
--   3. Load and execute this file (remove \c command below if needed)
--
-- ============================================================

-- Create the database (will fail safely if it exists)
CREATE DATABASE journey_of_change
  WITH
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  TEMPLATE = template0;

-- For psql only: Connect to the new database
-- Comment out the next line if using pgAdmin
\c journey_of_change

COMMENT ON DATABASE journey_of_change IS 'رحلة التغيير - Journey of Change: Private productivity and habit tracking application';
