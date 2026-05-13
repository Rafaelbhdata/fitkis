-- Migración 036: RPC para obtener email + nombre de UN paciente específico
-- de UN practitioner. Reemplaza el patrón de traer toda la lista vía
-- get_practitioner_patients solo para extraer un email.

CREATE OR REPLACE FUNCTION get_patient_for_practitioner(
  practitioner_uuid UUID,
  patient_uuid      UUID
)
RETURNS TABLE (
  patient_id    UUID,
  patient_email TEXT,
  patient_name  TEXT,
  status        TEXT,
  invited_at    TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rel.patient_id,
    u.email::TEXT          AS patient_email,
    COALESCE(up.display_name, u.email::TEXT) AS patient_name,
    rel.status::TEXT,
    rel.invited_at,
    rel.accepted_at
  FROM practitioner_patients rel
  JOIN auth.users u            ON u.id = rel.patient_id
  LEFT JOIN user_profiles up   ON up.user_id = rel.patient_id
  WHERE rel.practitioner_id = practitioner_uuid
    AND rel.patient_id      = patient_uuid
    -- Solo permite si el caller es el practitioner dueño de la relación
    AND EXISTS (
      SELECT 1 FROM practitioners p
      WHERE p.id = practitioner_uuid
        AND p.user_id = auth.uid()
        AND p.active = true
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_patient_for_practitioner(UUID, UUID) TO authenticated;
