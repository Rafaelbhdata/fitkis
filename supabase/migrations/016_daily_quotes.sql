-- 016_daily_quotes.sql
-- Quote del día generado por Claude. UN quote por fecha para todos los users.
-- No tiene user_id porque es global. RLS solo permite SELECT autenticado;
-- INSERT/UPDATE solo via service role desde la API route.

CREATE TABLE IF NOT EXISTS daily_quotes (
  date DATE PRIMARY KEY,
  quote TEXT NOT NULL,
  author TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE daily_quotes ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read quotes
CREATE POLICY "Authenticated users can read daily quotes"
  ON daily_quotes FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy → only service role can write (which the
-- /api/daily-quote route uses via the SUPABASE_SERVICE_ROLE_KEY).
