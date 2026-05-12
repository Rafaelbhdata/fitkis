-- Migración 027
-- El admin puede leer practitioner_patients para contar pacientes por nutriólogo.
-- La migración 025 ya le dio acceso a la tabla practitioners pero olvidó esta.

CREATE POLICY "Admin can view all practitioner_patients"
  ON practitioner_patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );
