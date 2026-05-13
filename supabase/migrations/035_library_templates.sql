-- Migración 035: Biblioteca de plantillas del nutriólogo
-- Plantillas reutilizables: planes alimenticios, mensajes guardados, recetas

CREATE TABLE library_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('plan','mensaje','receta')),
  title           TEXT NOT NULL CHECK (length(trim(title)) > 0),
  body            TEXT NOT NULL DEFAULT '',
  -- Para plantillas tipo 'plan': verdura/fruta/carb/leguminosa/proteina/grasa en JSON
  -- Para 'mensaje' y 'receta': null
  plan_equivs     JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON library_templates (practitioner_id, kind, updated_at DESC);

ALTER TABLE library_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioner manages own library"
  ON library_templates
  USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE user_id = auth.uid() AND active = true
    )
  )
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE OR REPLACE FUNCTION set_library_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_library_templates_updated_at
  BEFORE UPDATE ON library_templates
  FOR EACH ROW EXECUTE FUNCTION set_library_templates_updated_at();
