-- Horario semanal y duración por defecto de citas
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_duration INTEGER NOT NULL DEFAULT 60;
