-- Migration: Add location features (favorite and recent locations)
-- Created: 2025-01-07
-- Description: Adds tables for storing favorite locations and tracking recent locations per family

-- Favorite locations (per family)
-- These are manually saved locations that family members can name and reuse
CREATE TABLE IF NOT EXISTS favorite_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,  -- e.g., "Home", "School", "Work", "Soccer Field"
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    place_id TEXT,  -- Google Place ID for future reference
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by family
CREATE INDEX IF NOT EXISTS idx_favorite_locations_family_id ON favorite_locations(family_id);
CREATE INDEX IF NOT EXISTS idx_favorite_locations_created_by ON favorite_locations(created_by);

-- Recent locations (per family, auto-populated)
-- These are automatically tracked when users select a location for an event
CREATE TABLE IF NOT EXISTS recent_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    place_id TEXT,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    use_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by family and last used
CREATE INDEX IF NOT EXISTS idx_recent_locations_family_id ON recent_locations(family_id);
CREATE INDEX IF NOT EXISTS idx_recent_locations_last_used ON recent_locations(family_id, last_used_at DESC);

-- Create unique constraint to prevent duplicate recent locations
CREATE UNIQUE INDEX IF NOT EXISTS unique_recent_location ON recent_locations(family_id, address);

-- Add trigger to update updated_at on favorite_locations
CREATE TRIGGER update_favorite_locations_updated_at 
    BEFORE UPDATE ON favorite_locations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE favorite_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_locations ENABLE ROW LEVEL SECURITY;

-- Favorite locations policies
CREATE POLICY "Users can view family favorite locations" ON favorite_locations
    FOR SELECT USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create favorite locations" ON favorite_locations
    FOR INSERT WITH CHECK (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update favorite locations" ON favorite_locations
    FOR UPDATE USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete favorite locations" ON favorite_locations
    FOR DELETE USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

-- Recent locations policies
CREATE POLICY "Users can view family recent locations" ON recent_locations
    FOR SELECT USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage family recent locations" ON recent_locations
    FOR ALL USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );
