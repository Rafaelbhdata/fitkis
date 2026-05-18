-- ===========================================
-- Migration 041: tier default → 'lite'
-- ===========================================
-- La columna `tier` ya existe en user_profiles (text NOT NULL, default 'pro',
-- CHECK tier IN ('lite','pro')). Hasta ahora cada paciente nuevo entraba como
-- 'pro' automáticamente, lo que regalaba acceso a features de pago.
--
-- Cambio: el default pasa a 'lite'. La nutrióloga sube manualmente a 'pro'
-- desde el portal cuando el paciente pague la licencia.
--
-- No toca filas existentes — el DEFAULT solo aplica a INSERTs futuros.
-- La gestión del tier desde el portal pasa por /api/patient-tier (service
-- role + validación de ownership). No agregamos policy de UPDATE para
-- nutriólogas en user_profiles porque hoy la mesa expone columnas sensibles
-- que no queremos delegar al cliente.

ALTER TABLE user_profiles ALTER COLUMN tier SET DEFAULT 'lite';
