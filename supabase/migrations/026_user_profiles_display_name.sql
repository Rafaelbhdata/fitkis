-- ============================================================
-- Migración 026 · user_profiles.display_name (defensiva)
-- ============================================================
--
-- La migración 023_onboarding_redesign.sql hace UPDATE de
-- `user_profiles.display_name` sin un ALTER TABLE previo, lo que
-- implica que la columna ya existía en alguna migración anterior
-- (probablemente añadida vía dashboard de Supabase fuera de este repo).
--
-- Esta migración es defensiva: idempotente con `IF NOT EXISTS`, así
-- que es no-op si la columna ya existe, y la crea si por alguna razón
-- no fue creada en la BD donde se aplique.
--
-- También es la columna que lee `lib/clinic/queries.ts loadPatientDetail`
-- para mostrar el nombre del paciente en el detalle clínico.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Índice no necesario — no se filtra por display_name, solo se lee.
