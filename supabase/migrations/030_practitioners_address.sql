-- Agrega dirección del consultorio a la tabla practitioners
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS address TEXT;
