-- Routine blueprints — the catalog of pre-built routines users can pick.
-- Replaces the hardcoded ROUTINES + ROUTINE_SCHEDULE in lib/constants.ts.
-- Each blueprint references exercises by their ExerciseDB id (FK to the
-- `exercises` table from migration 019), so we don't duplicate exercise
-- data in code.

-- One row per template (e.g. upper_lower_4d, ppl_3d, glute_focus_4d).
CREATE TABLE IF NOT EXISTS routine_blueprints (
  template_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  best_for TEXT,
  goal TEXT NOT NULL CHECK (goal IN ('lose_weight', 'gain_muscle', 'strength', 'maintain')),
  experience_min TEXT NOT NULL CHECK (experience_min IN ('new', 'returning', 'intermediate', 'advanced')),
  days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 2 AND 6),
  equipment TEXT NOT NULL CHECK (equipment IN ('full_gym', 'home_weights', 'bodyweight')),

  -- Schedule lives as JSON: { "0": "rest", "1": "upper_a", "2": "lower_a", ... }
  -- Sun=0..Sat=6. Day-key values match the day_key in routine_blueprint_exercises.
  schedule JSONB NOT NULL,

  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- One row per exercise within a day inside a blueprint. order_index keeps
-- the prescribed sequence (compounds first, accessories last).
CREATE TABLE IF NOT EXISTS routine_blueprint_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL REFERENCES routine_blueprints(template_key) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  order_index INTEGER NOT NULL,

  -- Foreign key to the synced ExerciseDB catalog.
  exercise_db_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,

  sets INTEGER NOT NULL CHECK (sets BETWEEN 1 AND 10),
  reps TEXT NOT NULL,                    -- e.g. "8-10", "AMRAP", "30s"
  rest_seconds INTEGER DEFAULT 90,
  tip_es TEXT,                           -- optional Spanish coach tip

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_key, day_key, order_index)
);

CREATE INDEX IF NOT EXISTS idx_blueprint_exercises_template
  ON routine_blueprint_exercises(template_key);
CREATE INDEX IF NOT EXISTS idx_blueprint_exercises_day
  ON routine_blueprint_exercises(template_key, day_key);

-- RLS: any authed user can read; only service-role writes (the generator
-- endpoint runs with service-role).
ALTER TABLE routine_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_blueprint_exercises ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read routine blueprints"
    ON routine_blueprints FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read routine blueprint exercises"
    ON routine_blueprint_exercises FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
