-- 021_coach_dashboard_greetings.sql
--
-- Per-user, per-day cached greeting shown in the dashboard's Coach Fit
-- card. One row per user per date. The endpoint generates via Claude
-- on first read of the day, then re-serves cached for the rest.

CREATE TABLE IF NOT EXISTS coach_dashboard_greetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_dashboard_greetings_user_date
  ON coach_dashboard_greetings(user_id, date);

ALTER TABLE coach_dashboard_greetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read their greetings" ON coach_dashboard_greetings;
CREATE POLICY "users read their greetings" ON coach_dashboard_greetings
  FOR SELECT
  USING (auth.uid() = user_id);
