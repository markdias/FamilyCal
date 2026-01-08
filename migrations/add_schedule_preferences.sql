-- Add schedule preferences to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS schedule_day_start TIME DEFAULT '07:00:00',
ADD COLUMN IF NOT EXISTS schedule_day_end TIME DEFAULT '19:30:00';

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.schedule_day_start IS 'User preference for when their day starts (used in schedule view)';
COMMENT ON COLUMN user_preferences.schedule_day_end IS 'User preference for when their day ends (used in schedule view)';