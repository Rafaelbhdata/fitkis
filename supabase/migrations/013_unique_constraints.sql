-- Migration 013: Add UNIQUE constraints required by existing .upsert() calls
--
-- The Coach AI chat route uses .upsert() with onConflict targets that assume
-- these unique constraints exist. Without them, PostgREST throws 42P10 and
-- the upsert fails silently from the user's perspective.
--
-- Safety: dedupe first, keeping the most recent row per (user_id, date)
-- or (habit_id, date), before adding the constraint.

-- ---------- weight_logs ----------
-- Keep only the most recent entry per (user_id, date)
DELETE FROM weight_logs a
USING weight_logs b
WHERE a.user_id = b.user_id
  AND a.date = b.date
  AND a.created_at < b.created_at;

ALTER TABLE weight_logs
  ADD CONSTRAINT weight_logs_user_date_unique UNIQUE (user_id, date);

-- ---------- habit_logs ----------
-- habit_id already implies user_id via FK to habits.user_id, so (habit_id, date) is sufficient
DELETE FROM habit_logs a
USING habit_logs b
WHERE a.habit_id = b.habit_id
  AND a.date = b.date
  AND a.created_at < b.created_at;

ALTER TABLE habit_logs
  ADD CONSTRAINT habit_logs_habit_date_unique UNIQUE (habit_id, date);
