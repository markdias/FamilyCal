-- Create routines table
CREATE TABLE routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE, -- Optional: if NULL, it's a family routine
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Name of the icon to display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create routine items table
CREATE TABLE routine_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create routine completions table
CREATE TABLE routine_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES routine_items(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completion_date DATE DEFAULT CURRENT_DATE, -- For easier daily querying
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_id, contact_id, completion_date)
);

-- Add indexes
CREATE INDEX idx_routines_family_id ON routines(family_id);
CREATE INDEX idx_routines_contact_id ON routines(contact_id);
CREATE INDEX idx_routine_items_routine_id ON routine_items(routine_id);
CREATE INDEX idx_routine_completions_item_id ON routine_completions(item_id);
CREATE INDEX idx_routine_completions_contact_id ON routine_completions(contact_id);
CREATE INDEX idx_routine_completions_date ON routine_completions(completion_date);

-- Enable RLS
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;

-- Routines policies
CREATE POLICY "Users can view family routines" ON routines
    FOR SELECT USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage routines" ON routines
    FOR ALL USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

-- Routine items policies
CREATE POLICY "Users can view routine items" ON routine_items
    FOR SELECT USING (
        routine_id IN (
            SELECT r.id FROM routines r WHERE r.family_id IN (
                SELECT fm.family_id 
                FROM family_members fm
                JOIN contacts c ON c.id = fm.contact_id
                WHERE c.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage routine items" ON routine_items
    FOR ALL USING (
        routine_id IN (
            SELECT r.id FROM routines r WHERE r.family_id IN (
                SELECT fm.family_id 
                FROM family_members fm
                JOIN contacts c ON c.id = fm.contact_id
                WHERE c.user_id = auth.uid()
            )
        )
    );

-- Routine completions policies
CREATE POLICY "Users can view routine completions" ON routine_completions
    FOR SELECT USING (
        item_id IN (
            SELECT ri.id FROM routine_items ri 
            JOIN routines r ON r.id = ri.routine_id
            WHERE r.family_id IN (
                SELECT fm.family_id 
                FROM family_members fm
                JOIN contacts c ON c.id = fm.contact_id
                WHERE c.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage routine completions" ON routine_completions
    FOR ALL USING (
        item_id IN (
            SELECT ri.id FROM routine_items ri 
            JOIN routines r ON r.id = ri.routine_id
            WHERE r.family_id IN (
                SELECT fm.family_id 
                FROM family_members fm
                JOIN contacts c ON c.id = fm.contact_id
                WHERE c.user_id = auth.uid()
            )
        )
    );

-- Add triggers for updated_at
CREATE TRIGGER update_routines_updated_at BEFORE UPDATE ON routines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routine_items_updated_at BEFORE UPDATE ON routine_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
