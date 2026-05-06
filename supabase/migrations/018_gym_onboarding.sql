-- Gym onboarding wizard data + per-user exercise weights.
-- The wizard is forced for new users at first login (gating in mobile reads
-- gym_onboarding_completed_at). The AI maps the answers to one of the
-- templates declared in lib/routine-templates.ts and seeds initial weights
-- per exercise. The user can override any of those at any time.

-- Onboarding answers + active template selection
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS gym_goal TEXT
    CHECK (gym_goal IN ('lose_weight', 'gain_muscle', 'strength', 'maintain'));

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS gym_experience TEXT
    CHECK (gym_experience IN ('new', 'returning', 'intermediate', 'advanced'));

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS gym_days_per_week INTEGER
    CHECK (gym_days_per_week BETWEEN 2 AND 6);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS gym_session_minutes INTEGER
    CHECK (gym_session_minutes IN (45, 60, 75, 90));

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS gym_equipment TEXT
    CHECK (gym_equipment IN ('full_gym', 'home_weights', 'bodyweight'));

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS gym_injuries TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS active_template_key TEXT DEFAULT 'upper_lower_4d';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS gym_onboarding_completed_at TIMESTAMPTZ;

-- Per-user current weight per exercise. Overrides the template's defaults
-- once the user logs at least one set. Updated automatically by the gym
-- session save flow and by the Coach Fit chat tool.
CREATE TABLE IF NOT EXISTS user_exercise_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_id TEXT NOT NULL,
  weight_lbs DECIMAL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_user_exercise_weights_user
  ON user_exercise_weights(user_id);

ALTER TABLE user_exercise_weights ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users own exercise weights select"
    ON user_exercise_weights FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users own exercise weights insert"
    ON user_exercise_weights FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users own exercise weights update"
    ON user_exercise_weights FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users own exercise weights delete"
    ON user_exercise_weights FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill: existing users (incl. the dev account) keep working without
-- having to re-onboard. Mark them as already onboarded with the legacy
-- Upper/Lower template and "now" as the completion timestamp.
UPDATE user_profiles
SET
  gym_onboarding_completed_at = COALESCE(gym_onboarding_completed_at, now()),
  active_template_key = COALESCE(active_template_key, 'upper_lower_4d')
WHERE gym_onboarding_completed_at IS NULL;
