-- Custom Foods - User-defined food items
CREATE TABLE IF NOT EXISTS custom_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  group_type TEXT NOT NULL, -- 'verdura' | 'fruta' | 'carb' | 'proteina' | 'grasa' | 'leguminosa'
  portion TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own custom foods" ON custom_foods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom foods" ON custom_foods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom foods" ON custom_foods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom foods" ON custom_foods
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS custom_foods_user_id_idx ON custom_foods(user_id);
CREATE INDEX IF NOT EXISTS custom_foods_group_type_idx ON custom_foods(group_type);
