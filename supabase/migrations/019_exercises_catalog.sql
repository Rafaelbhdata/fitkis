-- Local mirror of the ExerciseDB catalog.
-- Populated by /api/exercises/sync (admin-triggered, idempotent). After
-- the initial sync, the gym module reads from this table and never hits
-- RapidAPI directly except for the GIF proxy. Keeps the experience fast
-- and disconnects us from the upstream's quota.

CREATE TABLE IF NOT EXISTS exercises (
  -- ExerciseDB id (e.g. "0001"). Stays string to match the upstream.
  id TEXT PRIMARY KEY,

  -- Core metadata pulled from /exercises.
  name TEXT NOT NULL,
  gif_url TEXT NOT NULL,
  body_part TEXT,
  target TEXT,
  equipment TEXT,
  secondary_muscles TEXT[] DEFAULT ARRAY[]::TEXT[],
  instructions TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Optional fields some upstream tiers expose. We accept them when
  -- present and leave NULL otherwise.
  description TEXT,
  difficulty TEXT,
  category TEXT,

  -- Spanish translation of `instructions`. Populated by the translate
  -- pass (Phase C of the migration plan), one-time + on demand.
  instructions_es TEXT[],
  translated_at TIMESTAMPTZ,

  -- Bookkeeping.
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_body_part ON exercises(body_part);
CREATE INDEX IF NOT EXISTS idx_exercises_target ON exercises(target);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);

-- Catalog is read-only for users (anyone authenticated can browse it,
-- but only the service role can write — the sync endpoint runs with
-- the service role key).
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read exercises"
    ON exercises FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
