# رحلة التغيير - Journey of Change
## PostgreSQL Database Implementation

Complete production-quality database layer for the Journey of Change productivity and habit tracking application.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Execution Order](#execution-order)
4. [Table Responsibilities](#table-responsibilities)
5. [Critical Business Rules](#critical-business-rules)
6. [Timer Architecture](#timer-architecture)
7. [Streak Architecture](#streak-architecture)
8. [Quran API Boundary](#quran-api-boundary)
9. [Configuration Requirements](#configuration-requirements)
10. [Validation](#validation)
11. [Development Reset](#development-reset)
12. [NestJS + Prisma Integration](#nestjs--prisma-integration)
13. [Timezone Warning](#timezone-warning)
14. [Security Notes](#security-notes)

---

## Prerequisites

- **PostgreSQL**: Version 12 or higher (tested on PostgreSQL 14+)
- **Operating System**: Windows (with PostgreSQL installed locally)
- **psql**: PostgreSQL command-line client
- **User Permissions**: Ability to create databases and extensions

---

## Database Setup

### Step 1: Create the Database

Run from the `postgres` maintenance database:

```bash
psql -U postgres -d postgres -f database/000_create_database.sql
```

This creates the `journey_of_change` database.

### Step 2: Connect to the New Database

```bash
psql -U postgres -d journey_of_change
```

---

## Execution Order

Execute the SQL files **in this exact order**:

```bash
\i database/001_extensions_helpers.sql
\i database/002_core_schema.sql
\i database/003_task_tracking.sql
\i database/004_task_specific_tracking.sql
\i database/005_gamification.sql
\i database/006_ai_notifications_settings.sql
\i database/007_indexes_constraints.sql
\i database/008_functions.sql
\i database/009_views.sql
\i database/010_seed_core.sql
```

### Run Validation Tests

```bash
\i database/011_validation_tests.sql
```

The validation tests run in a transaction and rollback automatically, leaving no test data.

---

## Table Responsibilities

### Core Tables

| Table | Purpose |
|-------|---------|
| `participants` | User accounts (participants and admins) |
| `auth_sessions` | Authentication sessions (not work sessions) |
| `participant_presence` | Real-time online/offline status |
| `task_categories` | 9 task categories (دين، ثقافة، رياضة، etc.) |
| `task_types` | Task type definitions (QURAN, PRAYER, READING, etc.) |
| `tasks` | Shared task definitions |
| `participant_task_profiles` | Participant-specific task settings and state |

### Daily Work Tracking

| Table | Purpose |
|-------|---------|
| `daily_sessions` | One per participant per day |
| `daily_task_progress` | Progress for each task in a daily session |
| `task_attempts` | Individual attempts (supports retry/reopen) |
| `task_time_segments` | Precise timer segments for pause/resume |

### Task-Specific Tracking

| Table | Purpose |
|-------|---------|
| `quran_reading_logs` | Quran reading references (no Quran text stored) |
| `prayer_logs` | Five daily prayers tracking |
| `reading_logs` | Book reading tracking |
| `sport_logs` | Exercise/sport activity |
| `water_logs` | Water intake (multiple entries per day) |
| `sleep_logs` | Sleep duration tracking |

### Gamification

| Table | Purpose |
|-------|---------|
| `streak_period_results` | Daily/weekly/monthly streaks (overall and per-task) |
| `badges` | Badge definitions |
| `participant_badges` | Badges earned by participants |
| `titles` | Title/rank definitions |
| `participant_titles` | Titles earned (one current per participant) |

### System

| Table | Purpose |
|-------|---------|
| `activity_logs` | Complete audit trail |
| `points_ledger` | Auditable points history |
| `operation_requests` | Idempotency tracking |
| `focus_sessions` | Pomodoro-style focus sessions |
| `ai_reports` | AI analysis storage |
| `notifications` | Internal notifications only |
| `daily_content` | Daily inspirational content |
| `system_settings` | Global configuration |

---

## Critical Business Rules

### Task Completion

Task completion has **exactly three outcomes**:

- **FULL**: Awards `full_points`
- **PARTIAL**: Awards `partial_points` (default 50% of full points)
- **NOT_COMPLETED**: Awards zero points

**Runtime state** (NOT_STARTED, RUNNING, PAUSED, FINISHED) is **separate** from completion result.

### Daily Success

- **Success threshold**: 90.00% (configurable in `system_settings`)
- **Calculation**: `earned_points / possible_points * 100`
- **90.00% = success**
- **89.99% = NOT success**

### Weekly Streak

- Week runs **Sunday 00:00 through Saturday 23:59:59**
- Requires **3 successful days** (any 3 days, not necessarily consecutive)
- Example: Sunday + Wednesday + Saturday is valid

### Monthly Streak

- Requires **3 successful weeks**
- Weeks can cross calendar months
- Week attribution for cross-month weeks is configurable via `system_settings.monthly_week_attribution_mode`

---

## Timer Architecture

### Accurate Time Tracking

The database uses **stored timestamps**, NOT browser-based stopwatches.

#### Time Segments

Each task attempt has multiple time segments:

```
10:00 - Start    → Open segment 1
10:20 - Pause    → Close segment 1 (duration: 20 min)
10:40 - Resume   → Open segment 2
11:00 - Finish   → Close segment 2 (duration: 20 min)

Total active time: 40 minutes
```

#### Constraints

- Only **one open segment** per attempt (enforced by partial unique index)
- Pause time **never** counts as active work time
- Browser refresh does not affect stored timing data

#### Database Functions

- `start_task()`: Creates attempt and opens first segment
- `pause_task()`: Closes current segment, calculates duration
- `resume_task()`: Opens new segment
- `finish_task()`: Closes any open segment, awards points

---

## Streak Architecture

### Generalized Streak Table

`streak_period_results` supports:

- **Scope**: OVERALL (participant-wide) or TASK (specific task)
- **Period Type**: DAILY, WEEKLY, MONTHLY
- **Fields**:
  - `qualified`: Whether period met success criteria
  - `consecutive_count`: Current streak
  - `best_count`: Best streak ever
  - `successful_days`: For weekly/monthly periods
  - `successful_weeks`: For monthly periods

### Calculation

Streaks are calculated by backend business logic using:

- `daily_sessions.is_successful`
- Configured thresholds from `system_settings`
- Results stored in `streak_period_results`

---

## Quran API Boundary

### What is NOT Stored

The database does **NOT** store:

- Quran verse text
- Tafsir text
- Quran audio files

### What IS Stored

Only **user tracking information**:

- Surah number, Ayah number, Page number
- Reading start/end references
- Verses/pages completed count
- Reading time
- Completion result
- Notes

### External API

The Quran page will use the **Quran Foundation API** for:

- Quran verses
- Tafsir
- Audio/recitations

---

## Configuration Requirements

### Required Before Production

The following settings **MUST** be configured before production use:

#### 1. Project Timezone

```sql
UPDATE system_settings
SET value = '"Asia/Riyadh"'  -- or appropriate timezone
WHERE key = 'project_timezone';
```

**Critical**: Time-sensitive functions will raise exceptions if this is not configured.

#### 2. Monthly Week Attribution (if needed)

```sql
UPDATE system_settings
SET value = '"START_DATE"'  -- or other policy
WHERE key = 'monthly_week_attribution_mode';
```

### Configurable Settings

All values in `system_settings` are configurable:

- `daily_success_percentage`: Default 90.00
- `weekly_required_success_days`: Default 3
- `monthly_required_success_weeks`: Default 3
- `partial_completion_ratio`: Default 0.50
- `week_start`: Default "SUNDAY"
- `completion_calculation_mode`: Default "POINTS_BASED"

---

## Validation

### Run Validation Tests

```bash
psql -U postgres -d journey_of_change -f database/011_validation_tests.sql
```

### What is Tested

- Core tables exist
- System settings seeded correctly
- Categories and task types seeded
- Participant creation
- Start day (idempotent)
- Task lifecycle (start, pause, resume, finish)
- Point calculations (FULL, PARTIAL, NOT_COMPLETED)
- 90.00% success threshold
- Reopen preserves history
- Activity logs created
- Points ledger integrity
- Constraints enforced
- Views compile

All tests run in a transaction and rollback automatically.

---

## Development Reset

To completely reset the database (destroys all data):

```bash
psql -U postgres -d postgres -f database/reset_database.sql
```

Then re-run all SQL files in order.

---

## NestJS + Prisma Integration

### Database Design

The PostgreSQL schema is designed to be Prisma-friendly:

- Standard naming conventions
- UUID primary keys
- Clear foreign key relationships
- JSONB for flexible data (Prisma supports this)
- Timestamps use TIMESTAMPTZ

### Prisma Introspection

When starting the backend phase:

```bash
# In your NestJS project
npx prisma init
```

Edit `schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Set environment variable:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/journey_of_change"
```

Run introspection:

```bash
npx prisma db pull
```

Prisma will generate a complete schema from the existing database.

### Notes

- PostgreSQL functions will not appear in Prisma schema (use raw SQL for these)
- Views can be introspected as models (read-only)
- Partial indexes and CHECK constraints are preserved in database but may need manual Prisma schema adjustments

---

## Timezone Warning

### The Problem

- The application uses **ONE** project timezone for all participants
- Browser local timezone is **NOT** used
- Day boundaries, week boundaries, and all time-sensitive calculations depend on the configured timezone

### The Solution

1. **Configure** `system_settings.project_timezone` before production
2. **Validate** timezone exists before performing calculations
3. **Use** `TIMESTAMPTZ` for all timestamps (already implemented)
4. **Convert** to project timezone in application layer when needed

### Example

```typescript
// Backend (NestJS)
const projectTimezone = await this.getProjectTimezone(); // From system_settings
const now = moment().tz(projectTimezone);
const sessionDate = now.format('YYYY-MM-DD');
```

---

## Security Notes

### What is Stored Securely

- **PIN Hash**: Only hashed PINs stored (never plaintext)
- Hashing will be done in NestJS backend (Argon2 or bcrypt)

### What is NOT Stored

- **Plaintext PINs**: Never
- **OpenAI API Keys**: Environment variables only
- **Frontend secrets**: Environment variables only

### Account Lockout

The database supports lockout mechanisms:

- `failed_pin_attempts`: Counter
- `locked_until`: Timestamp
- Backend implements lockout policy

### Soft Delete

- Participants: `deleted_at` column
- Tasks: `deleted_at` column
- Historical records preserved

---

## Database Functions Reference

### Core Functions

| Function | Purpose |
|----------|---------|
| `start_day(request_id, participant_id, date)` | Start daily session (idempotent) |
| `end_day(request_id, participant_id, session_id)` | End daily session |
| `start_task(request_id, participant_id, progress_id)` | Start task attempt |
| `pause_task(request_id, participant_id, progress_id)` | Pause running task |
| `resume_task(request_id, participant_id, progress_id)` | Resume paused task |
| `finish_task(request_id, participant_id, progress_id, result)` | Finish task with result |
| `reopen_task(request_id, participant_id, progress_id)` | Reopen finished task |
| `recalculate_daily_session(session_id)` | Recalculate session totals |

### Helper Functions

| Function | Purpose |
|----------|---------|
| `update_participant_last_seen(participant_id)` | Update last seen timestamp |
| `award_badge_if_missing(participant_id, badge_id, metadata)` | Award badge if not earned |
| `set_current_title(participant_id, title_id)` | Set current title |
| `record_notification(...)` | Create notification |

---

## Views Reference

| View | Purpose |
|------|---------|
| `v_participant_daily_summary` | Daily performance per participant |
| `v_daily_leaderboard` | Daily rankings |
| `v_weekly_leaderboard` | Weekly rankings |
| `v_monthly_leaderboard` | Monthly rankings |
| `v_task_performance_summary` | Task metrics across all participants |
| `v_participant_task_statistics` | Task performance per participant |
| `v_time_distribution_by_category` | Time spent by category |
| `v_most_time_consuming_tasks` | Tasks ranked by time |
| `v_recent_live_activity` | Recent activity feed |
| `v_admin_participant_overview` | Admin dashboard overview |
| `v_participant_current_streaks` | Current and best streaks |

---

## File Structure

```
database/
├── 000_create_database.sql        # Database creation
├── 001_extensions_helpers.sql     # Extensions and helper functions
├── 002_core_schema.sql            # Core tables
├── 003_task_tracking.sql          # Task tracking tables
├── 004_task_specific_tracking.sql # Task-specific logs
├── 005_gamification.sql           # Streaks, badges, titles
├── 006_ai_notifications_settings.sql # AI, notifications, daily content
├── 007_indexes_constraints.sql    # Additional indexes
├── 008_functions.sql              # Database functions
├── 009_views.sql                  # Database views
├── 010_seed_core.sql              # Seed data
├── 011_validation_tests.sql       # Validation tests
├── reset_database.sql             # Reset script (development only)
└── README.md                      # This file
```

---

## Support and Maintenance

### Database Version

Compatible with PostgreSQL 12+. Tested on PostgreSQL 14.

### Performance

The database is designed for **30-50 concurrent users**. Indexes are selective and appropriate for this scale.

### Backups

Implement regular backups using:

```bash
pg_dump -U postgres journey_of_change > backup_$(date +%Y%m%d).sql
```

### Monitoring

Monitor:

- `activity_logs` for system events
- `daily_sessions` for daily activity
- `points_ledger` for points integrity
- `operation_requests` for idempotency tracking

---

## Next Steps

1. ✅ Database layer complete
2. ⏳ Implement NestJS backend with Prisma
3. ⏳ Implement frontend (already in progress)
4. ⏳ Integrate Quran Foundation API
5. ⏳ Implement AI analysis features
6. ⏳ Deploy to production

---

## Contact

For questions about this database implementation, refer to:

- PostgreSQL documentation: https://www.postgresql.org/docs/
- Prisma documentation: https://www.prisma.io/docs/
- NestJS documentation: https://docs.nestjs.com/

---

**Database Implementation Status**: ✅ Complete

**Ready for**: Backend Development Phase
