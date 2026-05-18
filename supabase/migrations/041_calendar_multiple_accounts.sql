-- Soporte para múltiples cuentas de Google Calendar por nutrióloga
-- (lectura para bloqueo de slots + escritura de eventos al agendar).
--
-- Cambios:
--   1. Eliminar UNIQUE (practitioner_id, provider) — ahora N cuentas por nutrióloga.
--   2. Agregar metadata por conexión: google_email, display_label, flags.
--   3. UNIQUE sobre (practitioner_id, provider, google_email) — no dos veces la misma cuenta.
--   4. Índice parcial único: solo una conexión puede ser write target por nutrióloga.
--   5. Vincular appointments → conexión Google + event_id para update/delete.
--
-- Nota: google_email se agrega NULLABLE para no romper filas existentes.
-- Un script one-shot (scripts/backfill_calendar_google_email.ts) llama a
-- userinfo de Google con cada refresh_token para poblarlo. Cuando todas las
-- filas tengan valor, una migración posterior lo hará NOT NULL.

-- 1. Quitar el UNIQUE viejo
ALTER TABLE practitioner_calendar_connections
  DROP CONSTRAINT IF EXISTS practitioner_calendar_connections_practitioner_id_provider_key;

-- 2. Nuevas columnas
ALTER TABLE practitioner_calendar_connections
  ADD COLUMN IF NOT EXISTS google_email     TEXT,
  ADD COLUMN IF NOT EXISTS display_label    TEXT,
  ADD COLUMN IF NOT EXISTS is_write_target  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS read_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS degraded_at      TIMESTAMPTZ;

-- 3. Las conexiones existentes son write target por default (mantener comportamiento previo).
--    Solo si la nutrióloga tiene exactamente una conexión.
UPDATE practitioner_calendar_connections c
SET is_write_target = TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM practitioner_calendar_connections c2
  WHERE c2.practitioner_id = c.practitioner_id
    AND c2.id <> c.id
);

-- 4. UNIQUE: una cuenta Google no se conecta dos veces para la misma nutrióloga.
--    Se aplica solo cuando google_email no es NULL (filas legacy quedan exentas hasta backfill).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_practitioner_google_email
  ON practitioner_calendar_connections (practitioner_id, provider, google_email)
  WHERE google_email IS NOT NULL;

-- 5. Solo una conexión por nutrióloga puede ser write target (índice parcial único).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_write_target_per_practitioner
  ON practitioner_calendar_connections (practitioner_id)
  WHERE is_write_target = TRUE;

-- 6. Vincular appointments con la conexión y el evento de Google
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS google_event_id              TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_connection_id UUID
    REFERENCES practitioner_calendar_connections(id) ON DELETE SET NULL;

-- Lookup rápido cuando un evento de Google se actualiza/cancela
CREATE INDEX IF NOT EXISTS idx_appointments_google_event
  ON appointments (google_calendar_connection_id, google_event_id)
  WHERE google_event_id IS NOT NULL;
