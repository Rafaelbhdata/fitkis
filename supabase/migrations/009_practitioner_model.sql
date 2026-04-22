-- ===========================================
-- Migration 009: B2B Practitioner Model
-- ===========================================
-- Transforms Fitkis from self-tracking to B2B platform
-- for nutritionists managing patients

-- ===========================================
-- 1. ADD ROLE TO USER PROFILES
-- ===========================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
CHECK (role IN ('user', 'practitioner'));

-- ===========================================
-- 2. PRACTITIONERS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  license_number TEXT,
  specialty TEXT,
  clinic_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- 3. PRACTITIONER-PATIENT RELATIONSHIP
-- ===========================================

CREATE TABLE IF NOT EXISTS practitioner_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(practitioner_id, patient_id)
);

-- ===========================================
-- 4. UPDATE MEAL TYPES TO 6 MEALS
-- ===========================================

-- Update food_logs constraint to allow 6 meals
ALTER TABLE food_logs DROP CONSTRAINT IF EXISTS food_logs_meal_check;
ALTER TABLE food_logs ADD CONSTRAINT food_logs_meal_check
  CHECK (meal IN ('desayuno', 'snack1', 'comida', 'snack2', 'cena', 'snack3'));

-- Migrate existing 'snack' to 'snack1'
UPDATE food_logs SET meal = 'snack1' WHERE meal = 'snack';

-- Update favorite_meals constraint (if exists)
ALTER TABLE favorite_meals DROP CONSTRAINT IF EXISTS favorite_meals_meal_check;
-- Make meal nullable (already done in previous migration) and add new constraint
ALTER TABLE favorite_meals ADD CONSTRAINT favorite_meals_meal_check
  CHECK (meal IS NULL OR meal IN ('desayuno', 'snack1', 'comida', 'snack2', 'cena', 'snack3'));

-- ===========================================
-- 5. UPDATE DIET_CONFIGS FOR PRESCRIPTIONS
-- ===========================================

-- Add prescription tracking columns
ALTER TABLE diet_configs
ADD COLUMN IF NOT EXISTS prescribed_by UUID REFERENCES practitioners(id),
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add active_meals to control which meals are enabled per patient
-- Default: all 6 meals enabled
ALTER TABLE diet_configs
ADD COLUMN IF NOT EXISTS active_meals JSONB NOT NULL DEFAULT
  '{"desayuno": true, "snack1": true, "comida": true, "snack2": true, "cena": true, "snack3": true}'::jsonb;

-- Add meal-specific budgets (optional - allows different portions per meal)
ALTER TABLE diet_configs
ADD COLUMN IF NOT EXISTS meal_budgets JSONB;

-- ===========================================
-- 6. INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_practitioners_user ON practitioners(user_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_patients_practitioner ON practitioner_patients(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_patients_patient ON practitioner_patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_patients_status ON practitioner_patients(status);
CREATE INDEX IF NOT EXISTS idx_diet_configs_prescribed_by ON diet_configs(prescribed_by);
CREATE INDEX IF NOT EXISTS idx_diet_configs_active ON diet_configs(user_id, active);

-- ===========================================
-- 7. RLS FOR PRACTITIONERS TABLE
-- ===========================================

ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;

-- Practitioners can view their own profile
CREATE POLICY "Practitioners can view own profile" ON practitioners
  FOR SELECT USING (auth.uid() = user_id);

-- Practitioners can insert their own profile
CREATE POLICY "Practitioners can insert own profile" ON practitioners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Practitioners can update their own profile
CREATE POLICY "Practitioners can update own profile" ON practitioners
  FOR UPDATE USING (auth.uid() = user_id);

-- ===========================================
-- 8. RLS FOR PRACTITIONER_PATIENTS TABLE
-- ===========================================

ALTER TABLE practitioner_patients ENABLE ROW LEVEL SECURITY;

-- Practitioners can view their patient relationships
CREATE POLICY "Practitioners can view own patients" ON practitioner_patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM practitioners
      WHERE practitioners.id = practitioner_patients.practitioner_id
      AND practitioners.user_id = auth.uid()
    )
  );

-- Patients can view their practitioner relationships
CREATE POLICY "Patients can view their practitioners" ON practitioner_patients
  FOR SELECT USING (auth.uid() = patient_id);

-- Practitioners can create patient relationships
CREATE POLICY "Practitioners can insert patient relationships" ON practitioner_patients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM practitioners
      WHERE practitioners.id = practitioner_patients.practitioner_id
      AND practitioners.user_id = auth.uid()
    )
  );

-- Practitioners can update their patient relationships
CREATE POLICY "Practitioners can update patient relationships" ON practitioner_patients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM practitioners
      WHERE practitioners.id = practitioner_patients.practitioner_id
      AND practitioners.user_id = auth.uid()
    )
  );

-- Patients can update their status (to accept invitation)
CREATE POLICY "Patients can accept invitations" ON practitioner_patients
  FOR UPDATE USING (auth.uid() = patient_id);

-- ===========================================
-- 9. RLS FOR PRACTITIONER ACCESS TO PATIENT DATA
-- ===========================================
-- Practitioners can READ (not write) patient data for active relationships
-- EXCLUDES: journal_entries, progress_photos (private to patient)

-- Helper function to check if user is practitioner of patient
CREATE OR REPLACE FUNCTION is_practitioner_of(patient_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM practitioner_patients pp
    JOIN practitioners p ON p.id = pp.practitioner_id
    WHERE pp.patient_id = patient_uuid
    AND pp.status = 'active'
    AND p.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Weight Logs: Practitioners can view patient data
CREATE POLICY "Practitioners can view patient weight logs" ON weight_logs
  FOR SELECT USING (is_practitioner_of(user_id));

-- Food Logs: Practitioners can view patient data
CREATE POLICY "Practitioners can view patient food logs" ON food_logs
  FOR SELECT USING (is_practitioner_of(user_id));

-- Habit Logs: Practitioners can view patient data
CREATE POLICY "Practitioners can view patient habit logs" ON habit_logs
  FOR SELECT USING (is_practitioner_of(user_id));

-- Habits: Practitioners can view patient habits
CREATE POLICY "Practitioners can view patient habits" ON habits
  FOR SELECT USING (is_practitioner_of(user_id));

-- Gym Sessions: Practitioners can view patient data
CREATE POLICY "Practitioners can view patient gym sessions" ON gym_sessions
  FOR SELECT USING (is_practitioner_of(user_id));

-- Session Sets: Practitioners can view patient data (through gym_sessions)
CREATE POLICY "Practitioners can view patient session sets" ON session_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gym_sessions gs
      WHERE gs.id = session_sets.session_id
      AND is_practitioner_of(gs.user_id)
    )
  );

-- Diet Configs: Practitioners can view and manage patient diet configs
CREATE POLICY "Practitioners can view patient diet configs" ON diet_configs
  FOR SELECT USING (is_practitioner_of(user_id));

CREATE POLICY "Practitioners can insert patient diet configs" ON diet_configs
  FOR INSERT WITH CHECK (is_practitioner_of(user_id));

CREATE POLICY "Practitioners can update patient diet configs" ON diet_configs
  FOR UPDATE USING (is_practitioner_of(user_id));

-- User Profiles: Practitioners can view patient profiles (basic info only)
CREATE POLICY "Practitioners can view patient profiles" ON user_profiles
  FOR SELECT USING (is_practitioner_of(user_id));

-- ===========================================
-- 10. UPDATE TRIGGER FOR TIMESTAMPS
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_practitioners_updated_at
  BEFORE UPDATE ON practitioners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- 11. HELPER FUNCTION TO LOOKUP USER BY EMAIL
-- ===========================================
-- Only returns id if caller is a practitioner (for security)

CREATE OR REPLACE FUNCTION get_user_by_email(email_input TEXT)
RETURNS TABLE(id UUID, email TEXT) AS $$
BEGIN
  -- Only allow practitioners to use this function
  IF NOT EXISTS (
    SELECT 1 FROM practitioners WHERE user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT au.id, au.email::TEXT
  FROM auth.users au
  WHERE au.email = lower(email_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
