-- Add day_type to routines table
ALTER TABLE routines ADD COLUMN day_type TEXT DEFAULT 'everyday' CHECK (day_type IN ('everyday', 'weekday', 'weekend'));

-- Update existing routines to 'everyday' (already handled by DEFAULT, but explicit for clarity)
UPDATE routines SET day_type = 'everyday' WHERE day_type IS NULL;
