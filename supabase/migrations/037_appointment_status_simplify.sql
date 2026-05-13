-- 037 — Simplificación del status de citas
--
-- Antes: scheduled | confirmed | completed | cancelled | no_show | rescheduling
-- Ahora: scheduled | cancelled | no_show | rescheduling
--
-- Motivo: "completada" y "confirmada" eran ruido. Una cita scheduled cuyo
-- starts_at + duración ya pasó se considera completada por lógica; no hace
-- falta un estado explícito (que en la práctica nadie marcaba manualmente).
--
-- Migración de filas existentes:
--   confirmed → scheduled  (era un sinónimo poco usado)
--   completed → scheduled  (la lógica de "ya pasó" lo deriva)

BEGIN;

-- Drop CHECK actual antes de actualizar filas
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Migrar datos
UPDATE appointments SET status = 'scheduled' WHERE status IN ('confirmed', 'completed');

-- Nuevo CHECK
ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('scheduled', 'cancelled', 'no_show', 'rescheduling'));

COMMIT;
