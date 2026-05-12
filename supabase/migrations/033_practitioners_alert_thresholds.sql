-- Umbrales de alertas configurables por practitioner
ALTER TABLE practitioners
  ADD COLUMN IF NOT EXISTS inactivity_threshold_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS min_adherence_pct INTEGER NOT NULL DEFAULT 60;
