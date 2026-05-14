-- 039_practitioner_weight_rls.sql
--
-- Permite a la nutrióloga insertar, editar y borrar registros de peso
-- (incluyendo fotos InBody) en pacientes bajo su cuidado.

-- weight_logs: INSERT / UPDATE / DELETE para practitioners
DROP POLICY IF EXISTS "Practitioners can insert patient weight logs" ON weight_logs;
CREATE POLICY "Practitioners can insert patient weight logs" ON weight_logs
  FOR INSERT WITH CHECK (is_practitioner_of(user_id));

DROP POLICY IF EXISTS "Practitioners can update patient weight logs" ON weight_logs;
CREATE POLICY "Practitioners can update patient weight logs" ON weight_logs
  FOR UPDATE USING (is_practitioner_of(user_id));

DROP POLICY IF EXISTS "Practitioners can delete patient weight logs" ON weight_logs;
CREATE POLICY "Practitioners can delete patient weight logs" ON weight_logs
  FOR DELETE USING (is_practitioner_of(user_id));

-- storage.objects: acceso del practitioner a la carpeta del paciente en inbody-scans
DROP POLICY IF EXISTS "practitioners read patient inbody scans" ON storage.objects;
CREATE POLICY "practitioners read patient inbody scans" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'inbody-scans'
    AND is_practitioner_of((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "practitioners upload patient inbody scans" ON storage.objects;
CREATE POLICY "practitioners upload patient inbody scans" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'inbody-scans'
    AND is_practitioner_of((storage.foldername(name))[1]::uuid)
  );

DROP POLICY IF EXISTS "practitioners delete patient inbody scans" ON storage.objects;
CREATE POLICY "practitioners delete patient inbody scans" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'inbody-scans'
    AND is_practitioner_of((storage.foldername(name))[1]::uuid)
  );
