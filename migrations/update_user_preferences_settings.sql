-- Add app settings columns to user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS events_per_person INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS default_screen TEXT DEFAULT 'family' CHECK (default_screen IN ('family', 'calendar')),
ADD COLUMN IF NOT EXISTS auto_refresh_minutes INTEGER,
ADD COLUMN IF NOT EXISTS default_maps_app TEXT DEFAULT 'apple' CHECK (default_maps_app IN ('apple', 'google', 'waze')),
ADD COLUMN IF NOT EXISTS appearance TEXT DEFAULT 'system' CHECK (appearance IN ('light', 'dark', 'system')),
ADD COLUMN IF NOT EXISTS family_calendar_color TEXT DEFAULT '#334155';
