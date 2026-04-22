-- ===========================================
-- Migration 010: Plate Analysis with AI
-- ===========================================
-- Logs plate photo analysis results from Claude Vision
-- for practitioner review and training data

-- ===========================================
-- 1. PLATE ANALYSIS LOGS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS plate_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal TEXT CHECK (meal IS NULL OR meal IN ('desayuno', 'snack1', 'comida', 'snack2', 'cena', 'snack3')),
  analysis_result JSONB NOT NULL,
  -- Practitioner can mark as reviewed/corrected
  reviewed_by UUID REFERENCES practitioners(id),
  reviewed_at TIMESTAMPTZ,
  corrections JSONB,
  -- Whether the user applied the analysis to their food log
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_plate_analysis_user ON plate_analysis_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_plate_analysis_date ON plate_analysis_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plate_analysis_reviewed ON plate_analysis_logs(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- ===========================================
-- 3. RLS POLICIES
-- ===========================================

ALTER TABLE plate_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own analysis logs
CREATE POLICY "Users can view own plate analysis" ON plate_analysis_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own analysis logs
CREATE POLICY "Users can insert own plate analysis" ON plate_analysis_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own analysis logs (to mark as applied)
CREATE POLICY "Users can update own plate analysis" ON plate_analysis_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Practitioners can view patient analysis logs
CREATE POLICY "Practitioners can view patient plate analysis" ON plate_analysis_logs
  FOR SELECT USING (is_practitioner_of(user_id));

-- Practitioners can update patient analysis logs (to review/correct)
CREATE POLICY "Practitioners can update patient plate analysis" ON plate_analysis_logs
  FOR UPDATE USING (is_practitioner_of(user_id));

-- ===========================================
-- 4. COMMENTS
-- ===========================================

COMMENT ON TABLE plate_analysis_logs IS 'Stores AI analysis results from plate photos for food logging';
COMMENT ON COLUMN plate_analysis_logs.analysis_result IS 'JSON with items array, total_equivalents, reasoning, and suggestions';
COMMENT ON COLUMN plate_analysis_logs.corrections IS 'JSON with practitioner corrections if different from AI analysis';
