-- Add calendar_token to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS calendar_token UUID DEFAULT uuid_generate_v4();

-- Refresh the column for any existing rows if they didn't get one
UPDATE user_preferences SET calendar_token = uuid_generate_v4() WHERE calendar_token IS NULL;

-- Create an index for faster lookups by token
CREATE INDEX IF NOT EXISTS idx_user_preferences_calendar_token ON user_preferences(calendar_token);
