-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Families table
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    family_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table (for family members and external contacts who may not have auth accounts)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    contact_type TEXT NOT NULL DEFAULT 'family_member' CHECK (
        contact_type IN ('family_member', 'external_driver', 'emergency_contact', 'other')
    ),
    relationship TEXT,
    is_virtual BOOLEAN DEFAULT FALSE,
    date_of_birth DATE,
    avatar_url TEXT,
    notes TEXT,
    invitation_sent BOOLEAN DEFAULT FALSE,
    invitation_sent_at TIMESTAMP WITH TIME ZONE,
    invitation_accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_contact_user ON contacts (family_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX unique_contact_email ON contacts (family_id, email) WHERE email IS NOT NULL;

-- Family invitations table
CREATE TABLE family_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    invitation_token UUID DEFAULT uuid_generate_v4(),
    invitation_message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    declined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_pending_invitation ON family_invitations (family_id, email, status) WHERE status = 'pending';

-- Family members table
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX unique_family_contact ON family_members (family_id, contact_id);

-- Event categories table
CREATE TABLE event_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_category_name ON event_categories (family_id, name);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    category_id UUID REFERENCES event_categories(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    location TEXT,
    structured_location_title TEXT,
    structured_location_address TEXT,
    structured_location_latitude DOUBLE PRECISION,
    structured_location_longitude DOUBLE PRECISION,
    structured_location_radius DOUBLE PRECISION,
    url TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    timezone TEXT DEFAULT 'UTC',
    travel_time INTEGER CHECK (travel_time >= 0),
    start_location_title TEXT,
    start_location_address TEXT,
    start_location_latitude DOUBLE PRECISION,
    start_location_longitude DOUBLE PRECISION,
    availability TEXT DEFAULT 'busy' CHECK (availability IN ('busy', 'free', 'tentative', 'unavailable')),
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
    drop_off_driver_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    collection_driver_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    same_driver BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    recurrence_frequency TEXT CHECK (recurrence_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    recurrence_interval INTEGER DEFAULT 1 CHECK (recurrence_interval > 0),
    recurrence_days_of_week TEXT[],
    recurrence_days_of_month INTEGER[],
    recurrence_months_of_year INTEGER[],
    recurrence_weeks_of_year INTEGER[],
    recurrence_days_of_year INTEGER[],
    recurrence_set_positions INTEGER[],
    recurrence_count INTEGER CHECK (recurrence_count > 0),
    recurrence_end_date TIMESTAMP WITH TIME ZONE,
    recurrence_week_start TEXT DEFAULT 'MO' CHECK (
        recurrence_week_start IN ('MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Event exceptions table
CREATE TABLE event_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    exception_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    title TEXT,
    description TEXT,
    location TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_event_exception ON event_exceptions (event_id, exception_date);

-- Event reminders table
CREATE TABLE event_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('minutes', 'hours', 'days', 'weeks')),
    reminder_value INTEGER NOT NULL CHECK (reminder_value > 0),
    notification_method TEXT NOT NULL DEFAULT 'push' CHECK (notification_method IN ('push', 'email', 'both')),
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_event_reminder ON event_reminders (event_id, user_id, reminder_type, reminder_value);

-- Event participants table
CREATE TABLE event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'maybe')),
    is_organizer BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_event_participant ON event_participants (event_id, contact_id);

-- User preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    upcoming_events_card_view BOOLEAN DEFAULT FALSE,
    events_per_person INTEGER DEFAULT 3,
    default_screen TEXT DEFAULT 'family' CHECK (default_screen IN ('family', 'calendar')),
    auto_refresh_minutes INTEGER,
    default_maps_app TEXT CHECK (default_maps_app IN ('apple', 'google', 'waze')),
    appearance TEXT DEFAULT 'system' CHECK (appearance IN ('light', 'dark', 'system')),
    family_calendar_color TEXT DEFAULT '#334155',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_contacts_family_id ON contacts(family_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_is_virtual ON contacts(is_virtual);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_family_invitations_family_id ON family_invitations(family_id);
CREATE INDEX idx_family_invitations_contact_id ON family_invitations(contact_id);
CREATE INDEX idx_family_invitations_email ON family_invitations(email);
CREATE INDEX idx_family_invitations_token ON family_invitations(invitation_token);
CREATE INDEX idx_family_invitations_status ON family_invitations(status);
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(contact_id);
CREATE INDEX idx_family_members_contact_id ON family_members(contact_id);
CREATE INDEX idx_events_family_id ON events(family_id);
CREATE INDEX idx_events_category_id ON events(category_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_drop_off_driver ON events(drop_off_driver_id);
CREATE INDEX idx_events_collection_driver ON events(collection_driver_id);
CREATE INDEX idx_event_exceptions_event_id ON event_exceptions(event_id);
CREATE INDEX idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX idx_event_reminders_user_id ON event_reminders(user_id);
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_contact_id ON event_participants(contact_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-generate family display name
CREATE OR REPLACE FUNCTION set_family_display_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.name IS NULL OR NEW.name = '' THEN
        NEW.name := NEW.family_name || ' Family';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_family_name_trigger BEFORE INSERT OR UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION set_family_display_name();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_invitations_updated_at BEFORE UPDATE ON family_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_participants_updated_at BEFORE UPDATE ON event_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Families policies
CREATE POLICY "Users can view their families" ON families
    FOR SELECT USING (
        id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their families" ON families
    FOR UPDATE USING (
        id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid() AND fm.role IN ('owner', 'admin')
        )
    );

-- Contacts policies
CREATE POLICY "Users can view family contacts" ON contacts
    FOR SELECT USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage family contacts" ON contacts
    FOR ALL USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

-- Family invitations policies
CREATE POLICY "Users can view family invitations" ON family_invitations
    FOR SELECT USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Users can create invitations" ON family_invitations
    FOR INSERT WITH CHECK (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update invitations" ON family_invitations
    FOR UPDATE USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
        OR (email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'pending')
    );

CREATE POLICY "Users can delete their invitations" ON family_invitations
    FOR DELETE USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid() AND fm.role IN ('owner', 'admin')
        )
    );

-- Family members policies
CREATE POLICY "Users can view family members" ON family_members
    FOR SELECT USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage family members" ON family_members
    FOR ALL USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid() AND fm.role IN ('owner', 'admin')
        )
    );

-- Event categories policies
CREATE POLICY "Users can view family categories" ON event_categories
    FOR SELECT USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage categories" ON event_categories
    FOR ALL USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

-- Events policies
CREATE POLICY "Users can view family events" ON events
    FOR SELECT USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their family events" ON events
    FOR UPDATE USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their family events" ON events
    FOR DELETE USING (
        family_id IN (
            SELECT fm.family_id 
            FROM family_members fm
            JOIN contacts c ON c.id = fm.contact_id
            WHERE c.user_id = auth.uid()
        )
    );

-- Event exceptions policies
CREATE POLICY "Users can manage event exceptions" ON event_exceptions
    FOR ALL USING (
        event_id IN (
            SELECT e.id FROM events e WHERE e.family_id IN (
                SELECT fm.family_id 
                FROM family_members fm
                JOIN contacts c ON c.id = fm.contact_id
                WHERE c.user_id = auth.uid()
            )
        )
    );

-- Event reminders policies
CREATE POLICY "Users can view their reminders" ON event_reminders
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their reminders" ON event_reminders
    FOR ALL USING (user_id = auth.uid());

-- Event participants policies
CREATE POLICY "Users can view event participants" ON event_participants
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM events e WHERE e.family_id IN (
                SELECT fm.family_id 
                FROM family_members fm
                JOIN contacts c ON c.id = fm.contact_id
                WHERE c.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage event participants" ON event_participants
    FOR ALL USING (
        event_id IN (
            SELECT e.id FROM events e WHERE e.family_id IN (
                SELECT fm.family_id 
                FROM family_members fm
                JOIN contacts c ON c.id = fm.contact_id
                WHERE c.user_id = auth.uid()
            )
        )
    );

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own preferences" ON user_preferences
    FOR DELETE USING (user_id = auth.uid());