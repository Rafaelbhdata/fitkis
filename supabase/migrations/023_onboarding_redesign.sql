-- 023_onboarding_redesign.sql
--
-- New onboarding captures identity + body + diet + habits + gym in
-- a multi-step editorial flow instead of the single gym-only wizard.
-- This migration:
--   1. Adds the columns the new flow writes to.
--   2. Resets every existing user so they pass through the new flow.
--   3. Disables the auto-seed trigger that was inserting hardcoded
--      habits + a fake 86 kg weight log on signup. The new flow
--      gathers those values from the user instead.
--   4. Cleans up rows the old auto-seed left on accounts that never
--      actually used them.

-- 1. New columns on user_profiles.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS diet_type TEXT,
  ADD COLUMN IF NOT EXISTS allergies TEXT[],
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 2. Reset every existing user. They re-onboard on next dashboard load.
UPDATE user_profiles SET
  onboarding_completed_at = NULL,
  gym_onboarding_completed_at = NULL,
  active_template_key = NULL,
  display_name = NULL,
  coach_tone = NULL;

-- 3. Disable the old auto-seed trigger so new signups don't get a
--    hardcoded 86 kg weight log + 3 default habits anymore.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Replace the seed function: it just ensures a user_profiles row
--    exists for the new user. The onboarding fills in the rest.
CREATE OR REPLACE FUNCTION initialize_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_profiles (user_id, created_at, updated_at)
  VALUES (p_user_id, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Wipe the auto-seeded "starter" rows on accounts that never used
--    them. Only deletes the exact fingerprint of the old seed (86 kg
--    weight log with notes='Peso inicial', and the three named habits
--    when no habit_logs reference them).
DELETE FROM weight_logs
WHERE notes = 'Peso inicial' AND weight_kg = 86;

DELETE FROM habits h
WHERE h.name IN ('Agua', 'Lectura', 'Creatina')
  AND NOT EXISTS (SELECT 1 FROM habit_logs WHERE habit_id = h.id);
