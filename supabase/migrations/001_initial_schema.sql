-- FitLife Database Schema
-- Run this in Supabase SQL Editor

-- ========================================
-- TABLES
-- ========================================

-- Sesiones de gym
CREATE TABLE IF NOT EXISTS gym_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  routine_type TEXT NOT NULL CHECK (routine_type IN ('upper_a', 'upper_b', 'lower_a', 'lower_b')),
  cardio_minutes INTEGER,
  cardio_speed DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Series por ejercicio en cada sesión
CREATE TABLE IF NOT EXISTS session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES gym_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  lbs DECIMAL,
  reps INTEGER,
  feeling TEXT CHECK (feeling IN ('muy_pesado', 'dificil', 'perfecto', 'ligero', 'quiero_mas')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Registro de peso corporal
CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg DECIMAL NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log de alimentación por equivalentes
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal TEXT NOT NULL CHECK (meal IN ('desayuno', 'snack', 'comida', 'cena')),
  group_type TEXT NOT NULL CHECK (group_type IN ('verdura', 'fruta', 'carb', 'proteina', 'grasa', 'leguminosa')),
  quantity DECIMAL NOT NULL,
  food_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comidas favoritas
CREATE TABLE IF NOT EXISTS favorite_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal TEXT NOT NULL CHECK (meal IN ('desayuno', 'snack', 'comida', 'cena')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hábitos definidos por el usuario
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily_check', 'quantity', 'weekly_frequency')),
  target_value DECIMAL,
  unit TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log de hábitos completados
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  value DECIMAL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_gym_sessions_user_date ON gym_sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_gym_sessions_routine ON gym_sessions(user_id, routine_type);
CREATE INDEX IF NOT EXISTS idx_session_sets_session ON session_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_food_logs_meal ON food_logs(user_id, date, meal);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id, active);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, date);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE gym_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;

-- Gym Sessions policies
CREATE POLICY "Users can view own gym sessions"
  ON gym_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gym sessions"
  ON gym_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gym sessions"
  ON gym_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gym sessions"
  ON gym_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Session Sets policies (through gym_sessions)
CREATE POLICY "Users can view sets of own sessions"
  ON session_sets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM gym_sessions
    WHERE gym_sessions.id = session_sets.session_id
    AND gym_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert sets to own sessions"
  ON session_sets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM gym_sessions
    WHERE gym_sessions.id = session_sets.session_id
    AND gym_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can update sets of own sessions"
  ON session_sets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM gym_sessions
    WHERE gym_sessions.id = session_sets.session_id
    AND gym_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete sets of own sessions"
  ON session_sets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM gym_sessions
    WHERE gym_sessions.id = session_sets.session_id
    AND gym_sessions.user_id = auth.uid()
  ));

-- Weight Logs policies
CREATE POLICY "Users can view own weight logs"
  ON weight_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs"
  ON weight_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight logs"
  ON weight_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight logs"
  ON weight_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Food Logs policies
CREATE POLICY "Users can view own food logs"
  ON food_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food logs"
  ON food_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food logs"
  ON food_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food logs"
  ON food_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Favorite Meals policies
CREATE POLICY "Users can view own favorite meals"
  ON favorite_meals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite meals"
  ON favorite_meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorite meals"
  ON favorite_meals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite meals"
  ON favorite_meals FOR DELETE
  USING (auth.uid() = user_id);

-- Habits policies
CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits"
  ON habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  USING (auth.uid() = user_id);

-- Habit Logs policies
CREATE POLICY "Users can view own habit logs"
  ON habit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habit logs"
  ON habit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habit logs"
  ON habit_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habit logs"
  ON habit_logs FOR DELETE
  USING (auth.uid() = user_id);
