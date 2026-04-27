-- Practitioners take body-composition measurements during consultations and
-- need to write them into the patient's record. Until now they could only
-- read weight_logs; this migration adds INSERT/UPDATE/DELETE for active
-- practitioner-patient relationships. Patients keep their own existing
-- write policies.

CREATE POLICY "Practitioners can insert patient weight logs" ON weight_logs
  FOR INSERT WITH CHECK (is_practitioner_of(user_id));

CREATE POLICY "Practitioners can update patient weight logs" ON weight_logs
  FOR UPDATE USING (is_practitioner_of(user_id));

CREATE POLICY "Practitioners can delete patient weight logs" ON weight_logs
  FOR DELETE USING (is_practitioner_of(user_id));
