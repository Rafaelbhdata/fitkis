-- Migration 014: Allow practitioners to configure diets for PENDING patients
--
-- Current behavior: is_practitioner_of() only returns true for status='active',
-- so a practitioner can't pre-configure a diet before the patient accepts the
-- invitation. This forces an extra back-and-forth ("accept first, then I'll
-- set up your plan") instead of ("here's your plan, just accept").
--
-- Fix: the INSERT/UPDATE policies on diet_configs now accept both 'pending'
-- and 'active' relationships. SELECT remains 'active'-only — a patient who
-- hasn't accepted shouldn't have their plan loaded into their own view yet.

-- Helper: same as is_practitioner_of but includes pending relationships.
-- Used only for diet_configs write policies.
CREATE OR REPLACE FUNCTION is_practitioner_of_pending_or_active(patient_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM practitioner_patients pp
    JOIN practitioners p ON p.id = pp.practitioner_id
    WHERE pp.patient_id = patient_uuid
      AND pp.status IN ('pending', 'active')
      AND p.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the two write policies
DROP POLICY IF EXISTS "Practitioners can insert patient diet configs" ON diet_configs;
DROP POLICY IF EXISTS "Practitioners can update patient diet configs" ON diet_configs;

CREATE POLICY "Practitioners can insert patient diet configs" ON diet_configs
  FOR INSERT WITH CHECK (is_practitioner_of_pending_or_active(user_id));

CREATE POLICY "Practitioners can update patient diet configs" ON diet_configs
  FOR UPDATE USING (is_practitioner_of_pending_or_active(user_id));
