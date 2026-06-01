-- Practitioner-scoped SMAE overrides
-- Cada nutrióloga puede editar equivalentes existentes o crear alimentos
-- custom. Los cambios aplican solo a sus pacientes vía una VIEW que
-- reemplaza la tabla original.

BEGIN;

-- 1) Renombrar la tabla actual sin perder data ni FKs.
ALTER TABLE food_equivalents RENAME TO food_equivalents_global;

-- 2) Tabla de overrides (overrides de existentes + custom foods).
CREATE TABLE practitioner_smae_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  -- food_id apunta a food_equivalents_global cuando es override de existente.
  -- NULL cuando es un alimento custom creado por la nutri.
  food_id UUID REFERENCES food_equivalents_global(id) ON DELETE CASCADE,
  -- Equivalentes (siempre presentes; reemplazan los del global si es override)
  verdura DECIMAL NOT NULL DEFAULT 0,
  fruta DECIMAL NOT NULL DEFAULT 0,
  carb DECIMAL NOT NULL DEFAULT 0,
  proteina DECIMAL NOT NULL DEFAULT 0,
  grasa DECIMAL NOT NULL DEFAULT 0,
  leguminosa DECIMAL NOT NULL DEFAULT 0,
  -- Campos solo para customs (NULL cuando food_id está presente).
  -- Para overrides reusamos name/portion del global vía JOIN.
  name TEXT,
  portion TEXT,
  weight_g INTEGER,
  category_smae TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- O es override (food_id presente, name NULL) o es custom (food_id NULL,
  -- name presente). No ambos, no ninguno.
  CONSTRAINT either_override_or_custom CHECK (
    (food_id IS NOT NULL AND name IS NULL) OR
    (food_id IS NULL AND name IS NOT NULL AND length(trim(name)) > 0)
  ),
  -- Una nutri solo puede tener UN override por food existente.
  UNIQUE (practitioner_id, food_id)
);

-- Nombres de customs únicos por practitioner (case-insensitive).
CREATE UNIQUE INDEX practitioner_smae_overrides_custom_name_idx
  ON practitioner_smae_overrides (practitioner_id, lower(name))
  WHERE food_id IS NULL;

CREATE INDEX practitioner_smae_overrides_practitioner_idx
  ON practitioner_smae_overrides (practitioner_id);

-- 3) VIEW que reemplaza la tabla original. Mobile y código existente
-- siguen queryeando `food_equivalents` sin cambios.
-- security_invoker=false hace que la VIEW corra con permisos del owner
-- (postgres), no del usuario que la llama. Esto evita problemas de RLS
-- y permite que la VIEW use auth.uid() directo.
CREATE VIEW food_equivalents
WITH (security_invoker = false) AS
WITH user_practitioner AS (
  SELECT practitioner_id
  FROM practitioner_patients
  WHERE patient_id = auth.uid()
    AND status = 'active'
  ORDER BY accepted_at DESC NULLS LAST
  LIMIT 1
),
overrides AS (
  SELECT
    feg.id,
    feg.name,
    feg.portion,
    feg.weight_g,
    feg.category_smae,
    pso.verdura,
    pso.fruta,
    pso.carb,
    pso.proteina,
    pso.grasa,
    pso.leguminosa,
    feg.created_at
  FROM practitioner_smae_overrides pso
  JOIN food_equivalents_global feg ON feg.id = pso.food_id
  WHERE pso.practitioner_id = (SELECT practitioner_id FROM user_practitioner)
)
SELECT * FROM overrides
UNION ALL
-- Customs (food_id NULL)
SELECT
  pso.id,
  pso.name,
  pso.portion,
  pso.weight_g,
  pso.category_smae,
  pso.verdura,
  pso.fruta,
  pso.carb,
  pso.proteina,
  pso.grasa,
  pso.leguminosa,
  pso.created_at
FROM practitioner_smae_overrides pso
WHERE pso.practitioner_id = (SELECT practitioner_id FROM user_practitioner)
  AND pso.food_id IS NULL
UNION ALL
-- Globals NO sobreescritos por el practitioner del usuario
SELECT
  feg.id,
  feg.name,
  feg.portion,
  feg.weight_g,
  feg.category_smae,
  feg.verdura,
  feg.fruta,
  feg.carb,
  feg.proteina,
  feg.grasa,
  feg.leguminosa,
  feg.created_at
FROM food_equivalents_global feg
WHERE NOT EXISTS (
  SELECT 1 FROM practitioner_smae_overrides pso
  WHERE pso.practitioner_id = (SELECT practitioner_id FROM user_practitioner)
    AND pso.food_id = feg.id
);

-- Grant SELECT on the renamed table (Postgres preserves grants by OID
-- through rename, but we make it explicit for clarity).
GRANT SELECT ON food_equivalents_global TO authenticated, anon;
GRANT SELECT ON food_equivalents TO authenticated, anon;

-- 4) RLS para practitioner_smae_overrides.
ALTER TABLE practitioner_smae_overrides ENABLE ROW LEVEL SECURITY;

-- Practitioners gestionan SUS overrides
CREATE POLICY "Practitioner manages own SMAE overrides"
  ON practitioner_smae_overrides
  FOR ALL
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners
      WHERE user_id = auth.uid() AND active = true
    )
  )
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM practitioners
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Service role full access (necesario para AI endpoints + cron)
-- (RLS no aplica al service role por default — sin policy necesaria.)

-- 5) Trigger para updated_at
CREATE TRIGGER set_practitioner_smae_overrides_updated_at
  BEFORE UPDATE ON practitioner_smae_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
