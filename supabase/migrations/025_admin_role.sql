-- ============================================================
-- Migración 025 · Rol admin + practitioners.active
-- ============================================================

-- 1. Ampliar el CHECK de user_profiles.role para incluir 'admin'
--    (también 'professional' como alias moderno de 'practitioner')
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('user', 'practitioner', 'professional', 'admin'));

-- 2. Índice para lookups de admin (pocos registros, pero útil en middleware)
CREATE INDEX IF NOT EXISTS idx_user_profiles_role
  ON user_profiles (role)
  WHERE role IN ('admin', 'professional', 'practitioner');

-- 3. Columna active en practitioners para soft-delete
--    Default TRUE → todos los registros existentes quedan activos.
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_practitioners_active
  ON practitioners (active)
  WHERE active = false;

-- 4. Política RLS: admin puede leer todos los practitioners
--    (las políticas actuales solo permiten ver el propio perfil)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'practitioners'
    AND policyname = 'Admin can view all practitioners'
  ) THEN
    CREATE POLICY "Admin can view all practitioners"
      ON practitioners FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.role = 'admin'
        )
      );
  END IF;
END$$;

-- 5. Política RLS: admin puede actualizar (deactivar) practitioners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'practitioners'
    AND policyname = 'Admin can update practitioners'
  ) THEN
    CREATE POLICY "Admin can update practitioners"
      ON practitioners FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.role = 'admin'
        )
      );
  END IF;
END$$;

-- ============================================================
-- DESPUÉS DE EJECUTAR ESTA MIGRACIÓN:
-- Ejecuta en el SQL editor de Supabase para darte rol admin:
--
--   UPDATE user_profiles
--   SET role = 'admin'
--   WHERE user_id = auth.uid();
--
-- O si conoces tu UUID:
--
--   UPDATE user_profiles
--   SET role = 'admin'
--   WHERE user_id = '<TU_USER_ID>';
-- ============================================================
