-- Tabla para fotos de progreso corporal
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('front', 'side')),
  photo_url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, photo_type)
);

-- RLS
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own photos" ON progress_photos
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own photos" ON progress_photos
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own photos" ON progress_photos
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own photos" ON progress_photos
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date ON progress_photos(user_id, date DESC);

-- Storage bucket (ejecutar en Supabase Dashboard > Storage)
-- 1. Crear bucket "progress-photos" con acceso privado
-- 2. Políticas RLS para el bucket:
--    - SELECT: auth.uid() = (storage.foldername(name))[1]::uuid
--    - INSERT: auth.uid() = (storage.foldername(name))[1]::uuid
--    - DELETE: auth.uid() = (storage.foldername(name))[1]::uuid
