-- Add favorite_name column to food_logs to group items from favorites
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS favorite_name TEXT;

-- Index for faster grouping queries
CREATE INDEX IF NOT EXISTS idx_food_logs_favorite_name ON food_logs(favorite_name) WHERE favorite_name IS NOT NULL;
