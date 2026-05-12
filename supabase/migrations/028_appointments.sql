-- Migration 028: Tabla de citas (appointments)
-- Soporta el módulo de agenda del portal clínico y la página pública de reservas.

CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  patient_id      UUID REFERENCES auth.users ON DELETE SET NULL,
  patient_name    TEXT NOT NULL,
  patient_email   TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 50,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON appointments (practitioner_id, starts_at);
CREATE INDEX ON appointments (patient_id, starts_at);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Practitioner: acceso completo a sus citas
CREATE POLICY "Practitioner manages own appointments"
  ON appointments
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

-- Paciente: solo lectura de sus propias citas
CREATE POLICY "Patient reads own appointments"
  ON appointments FOR SELECT
  USING (patient_id = auth.uid());

-- Vista pública de slots ocupados: expone solo practitioner_id, starts_at y duration_minutes.
-- Sin datos personales — permite que la página de reservas calcule disponibilidad.
CREATE OR REPLACE VIEW appointment_slots
  WITH (security_invoker = false) AS
  SELECT practitioner_id, starts_at, duration_minutes
  FROM appointments
  WHERE status NOT IN ('cancelled', 'no_show');

GRANT SELECT ON appointment_slots TO anon, authenticated;
