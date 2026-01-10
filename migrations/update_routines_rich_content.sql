-- Update routines table to support ordering and rich display
ALTER TABLE routines ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update routine_items to support cover images
ALTER TABLE routine_items ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Re-enable RLS just in case (already should be enabled)
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_items ENABLE ROW LEVEL SECURITY;
