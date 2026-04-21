-- Migration: food_equivalents
-- Descripción: Tabla con los alimentos del Sistema Mexicano de Alimentos Equivalentes (SMAE)
-- Fecha: 2026-04-21

-- Crear tabla de equivalentes alimenticios
CREATE TABLE IF NOT EXISTS food_equivalents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  portion TEXT NOT NULL,
  weight_g INTEGER,
  category_smae TEXT NOT NULL,
  -- Equivalentes por grupo alimenticio
  verdura DECIMAL DEFAULT 0,
  fruta DECIMAL DEFAULT 0,
  carb DECIMAL DEFAULT 0,
  proteina DECIMAL DEFAULT 0,
  grasa DECIMAL DEFAULT 0,
  leguminosa DECIMAL DEFAULT 0,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_food_equivalents_name ON food_equivalents USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_food_equivalents_category ON food_equivalents(category_smae);

-- Índice compuesto para búsqueda por cualquier grupo
CREATE INDEX IF NOT EXISTS idx_food_equivalents_groups ON food_equivalents(verdura, fruta, carb, proteina, grasa, leguminosa);

-- Comentarios
COMMENT ON TABLE food_equivalents IS 'Alimentos del Sistema Mexicano de Alimentos Equivalentes (SMAE) - 4ta edición';
COMMENT ON COLUMN food_equivalents.portion IS 'Porción que equivale a 1 unidad del grupo (ej: "1 taza", "30 g")';
COMMENT ON COLUMN food_equivalents.category_smae IS 'Categoría original del SMAE (ej: "CEREALES CON GRASA")';
COMMENT ON COLUMN food_equivalents.verdura IS 'Equivalentes de verdura por porción';
COMMENT ON COLUMN food_equivalents.fruta IS 'Equivalentes de fruta por porción';
COMMENT ON COLUMN food_equivalents.carb IS 'Equivalentes de carbohidrato por porción';
COMMENT ON COLUMN food_equivalents.proteina IS 'Equivalentes de proteína por porción';
COMMENT ON COLUMN food_equivalents.grasa IS 'Equivalentes de grasa por porción';
COMMENT ON COLUMN food_equivalents.leguminosa IS 'Equivalentes de leguminosa por porción';

-- RLS: Esta tabla es de lectura pública (datos de referencia)
-- No se habilita RLS porque todos pueden leer, nadie puede modificar excepto admin
ALTER TABLE food_equivalents ENABLE ROW LEVEL SECURITY;

-- Policy: Todos pueden leer
CREATE POLICY "Allow public read access" ON food_equivalents
  FOR SELECT USING (true);

-- Policy: Solo service_role puede insertar/actualizar/eliminar
CREATE POLICY "Allow service_role full access" ON food_equivalents
  FOR ALL USING (auth.role() = 'service_role');
