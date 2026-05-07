-- 022_inbody_photo_url.sql
--
-- Adds support for archiving the InBody scan photo that produced a
-- weight_logs row. The image lives in Supabase Storage; this column
-- holds the path inside the `inbody-scans` bucket.

ALTER TABLE weight_logs
  ADD COLUMN IF NOT EXISTS inbody_photo_url TEXT;

-- Storage bucket for InBody scan photos. Private (signed URLs only).
INSERT INTO storage.buckets (id, name, public)
VALUES ('inbody-scans', 'inbody-scans', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can read/write only files inside their own folder
-- (path starts with their auth uid).
DROP POLICY IF EXISTS "users read own inbody scans" ON storage.objects;
CREATE POLICY "users read own inbody scans" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'inbody-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "users upload own inbody scans" ON storage.objects;
CREATE POLICY "users upload own inbody scans" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'inbody-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "users delete own inbody scans" ON storage.objects;
CREATE POLICY "users delete own inbody scans" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'inbody-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
