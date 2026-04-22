-- Migration: Add ON DELETE CASCADE to tables missing it
-- This ensures user data is properly cleaned up when accounts are deleted
-- AUD-017 fix

-- Helper function to drop and recreate FK with CASCADE
-- We need to find constraint names dynamically

-- ========================================
-- journal_entries.user_id
-- ========================================
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'journal_entries'::regclass
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE journal_entries DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE journal_entries
ADD CONSTRAINT journal_entries_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ========================================
-- journal_used_questions.user_id
-- ========================================
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'journal_used_questions'::regclass
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE journal_used_questions DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE journal_used_questions
ADD CONSTRAINT journal_used_questions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ========================================
-- progress_photos.user_id
-- ========================================
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'progress_photos'::regclass
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE progress_photos DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE progress_photos
ADD CONSTRAINT progress_photos_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ========================================
-- user_profiles.user_id
-- ========================================
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'user_profiles'::regclass
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE user_profiles DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ========================================
-- diet_configs.user_id
-- ========================================
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'diet_configs'::regclass
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE diet_configs DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE diet_configs
ADD CONSTRAINT diet_configs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ========================================
-- custom_foods.user_id
-- ========================================
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'custom_foods'::regclass
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE custom_foods DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE custom_foods
ADD CONSTRAINT custom_foods_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ========================================
-- schedule_overrides.user_id
-- ========================================
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'schedule_overrides'::regclass
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE schedule_overrides DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE schedule_overrides
ADD CONSTRAINT schedule_overrides_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ========================================
-- Add practitioner RLS policies for patient data access
-- AUD-034 & AUD-035 fix
-- ========================================

-- Practitioner can view patient's progress photos
DO $$ BEGIN
  CREATE POLICY "Practitioners can view patient photos" ON progress_photos
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM practitioner_patients pp
        JOIN practitioners p ON pp.practitioner_id = p.id
        WHERE pp.patient_id = progress_photos.user_id
          AND pp.status = 'active'
          AND p.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Practitioner can view patient's journal entries
DO $$ BEGIN
  CREATE POLICY "Practitioners can view patient journal" ON journal_entries
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM practitioner_patients pp
        JOIN practitioners p ON pp.practitioner_id = p.id
        WHERE pp.patient_id = journal_entries.user_id
          AND pp.status = 'active'
          AND p.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
