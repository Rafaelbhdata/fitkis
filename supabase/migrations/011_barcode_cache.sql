-- ===========================================
-- Migration 011: Barcode Cache
-- ===========================================
-- Caches Open Food Facts lookups to reduce API calls
-- and improve lookup speed for commonly scanned products

-- ===========================================
-- 1. BARCODE CACHE TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS barcode_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT NOT NULL UNIQUE,
  product_data JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'openfoodfacts',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_barcode_cache_barcode ON barcode_cache(barcode);
CREATE INDEX IF NOT EXISTS idx_barcode_cache_updated ON barcode_cache(updated_at DESC);

-- ===========================================
-- 3. RLS POLICIES
-- ===========================================

ALTER TABLE barcode_cache ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read the cache
CREATE POLICY "Authenticated users can read barcode cache" ON barcode_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- Anyone authenticated can insert into cache
CREATE POLICY "Authenticated users can insert barcode cache" ON barcode_cache
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ===========================================
-- 4. UPDATE TRIGGER
-- ===========================================

CREATE TRIGGER update_barcode_cache_updated_at
  BEFORE UPDATE ON barcode_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- 5. COMMENTS
-- ===========================================

COMMENT ON TABLE barcode_cache IS 'Caches Open Food Facts product lookups for faster barcode scanning';
COMMENT ON COLUMN barcode_cache.product_data IS 'JSON with name, brand, nutrients, and estimated SMAE equivalents';
COMMENT ON COLUMN barcode_cache.source IS 'Data source: openfoodfacts, manual, etc.';
