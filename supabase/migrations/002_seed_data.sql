-- FitLife Seed Data
-- Run this AFTER creating a user and setting the user_id variable

-- To use: Replace 'YOUR_USER_ID' with the actual user UUID from auth.users
-- Or run after registering and get the user_id from: SELECT id FROM auth.users LIMIT 1;

-- ========================================
-- SEED GYM SESSIONS (Historical data from CLAUDE.md)
-- ========================================

-- Session 1: Upper A - March 23, 2026
-- Press Banca (Smith): 90lbs/-, 80lbs/8, 80lbs/7, 80lbs/5 | Muy pesado
-- Press Militar (Mancuernas): 20lbs × (12, 10, 10) | Difícil
-- Pec Deck: 60lbs × (12, 12, 12) | Difícil
-- Elevaciones Laterales: 10lbs × (12, 12, 12) | Difícil
-- Tríceps Polea: 40lbs/10, 40lbs/6, 30lbs/10 | Difícil

-- Session 2: Upper A - April 3, 2026
-- Press Banca (Mancuernas): 25lbs × (10, 10, 10, 10)
-- Press Militar (Mancuernas): 25lbs/10, 25lbs/10, 25lbs/10, 25lbs/8
-- Aperturas (Mancuernas banco): 20lbs × (12, 10, 10) | Difícil
-- Elevaciones Laterales: 10lbs × (12, 12, 12)
-- Tríceps Polea: 30lbs/12, 30lbs/12, 30lbs/8 | Difícil
-- Cardio: 12 min caminadora 5.5 km/h

-- ========================================
-- SEED HABITS (Default habits from CLAUDE.md)
-- ========================================

-- Note: Run this after user registration with the actual user_id
-- Example:
/*
DO $$
DECLARE
  v_user_id UUID := 'YOUR_USER_ID_HERE';
BEGIN
  -- Insert default habits
  INSERT INTO habits (user_id, name, type, target_value, unit) VALUES
    (v_user_id, 'Agua', 'quantity', 2, 'litros'),
    (v_user_id, 'Lectura', 'weekly_frequency', 4, 'días/semana'),
    (v_user_id, 'Creatina', 'daily_check', NULL, NULL);

  -- Insert initial weight
  INSERT INTO weight_logs (user_id, date, weight_kg, notes) VALUES
    (v_user_id, '2026-03-23', 86, 'Peso inicial');
END $$;
*/

-- ========================================
-- FUNCTION: Initialize user data
-- ========================================

CREATE OR REPLACE FUNCTION initialize_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert default habits
  INSERT INTO habits (user_id, name, type, target_value, unit)
  SELECT p_user_id, name, type, target_value, unit
  FROM (VALUES
    ('Agua', 'quantity', 2::DECIMAL, 'litros'),
    ('Lectura', 'weekly_frequency', 4::DECIMAL, 'días/semana'),
    ('Creatina', 'daily_check', NULL::DECIMAL, NULL)
  ) AS defaults(name, type, target_value, unit)
  WHERE NOT EXISTS (
    SELECT 1 FROM habits WHERE user_id = p_user_id
  );

  -- Insert initial weight if no weight logs exist
  INSERT INTO weight_logs (user_id, date, weight_kg, notes)
  SELECT p_user_id, CURRENT_DATE, 86, 'Peso inicial'
  WHERE NOT EXISTS (
    SELECT 1 FROM weight_logs WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION initialize_user_data(UUID) TO authenticated;

-- ========================================
-- TRIGGER: Auto-initialize on user creation (optional)
-- ========================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Initialize default data for new user
  PERFORM initialize_user_data(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users (run as superuser in Supabase dashboard)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();
