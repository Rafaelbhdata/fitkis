-- Migración 034: Notas de consulta del nutriólogo
-- Cada nota pertenece a un practitioner+patient y opcionalmente a una appointment.
-- Tags permiten clasificar la nota (ajuste de plan, recordatorio, reagenda, etc).

CREATE TABLE consultation_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  note_date       DATE NOT NULL DEFAULT current_date,
  body            TEXT NOT NULL CHECK (length(trim(body)) > 0),
  tags            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON consultation_notes (practitioner_id, patient_id, note_date DESC);
CREATE INDEX ON consultation_notes (appointment_id) WHERE appointment_id IS NOT NULL;

ALTER TABLE consultation_notes ENABLE ROW LEVEL SECURITY;

-- Practitioner: acceso completo a sus notas
CREATE POLICY "Practitioner manages own consultation notes"
  ON consultation_notes
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

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION set_consultation_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consultation_notes_updated_at
  BEFORE UPDATE ON consultation_notes
  FOR EACH ROW EXECUTE FUNCTION set_consultation_notes_updated_at();
