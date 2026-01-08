# Family Calendar App - Database Schema Documentation

## Overview
You have a comprehensive family calendar database designed for shared family scheduling with iOS Calendar compatibility. The system supports both authenticated users (parents, older children) and virtual members (young children, external contacts) who don't need login credentials.

---

## Core Concepts

### 1. **Families**
- Each family has a `family_name` (e.g., "Smith") that auto-generates a display `name` ("Smith Family")
- Families are the top-level container for all calendar data
- All events, contacts, and members belong to a family

### 2. **Contacts**
- Universal person table for everyone in your system
- Two types:
  - **Authenticated contacts**: Linked to `auth.users` via `user_id`, can log in
  - **Virtual contacts**: No `user_id`, cannot log in (e.g., young children, external drivers)
- Contains: name, email, phone, relationship, date of birth, avatar
- Contact types: family_member, external_driver, emergency_contact, other

### 3. **Family Members**
- Links contacts to families
- Both authenticated users AND virtual contacts can be family members
- Only authenticated members have roles: owner, admin, member
- Virtual members have NULL role (they're part of the family but can't manage it)

### 4. **Invitations**
- Send invites to convert virtual members into authenticated users
- Send invites to new people to join the family
- 7-day expiration with unique tokens
- Tracks status: pending, accepted, declined, expired, cancelled

---

## Event System

### Basic Event Fields (iOS Calendar Compatible)
- **Core**: title, description/notes, category
- **Location**: Simple text OR structured with coordinates (lat/long/radius for geofencing)
- **Timing**: start/end time, all-day flag, timezone
- **Travel time**: Minutes before event, starting location with coordinates
- **URL**: For video calls (Zoom, Meet links)
- **Availability**: busy, free, tentative, unavailable (how time shows to others)
- **Status**: confirmed, tentative, cancelled

### Custom Driver Fields
- `drop_off_driver_id`: Contact who drops off (can be family member or external)
- `collection_driver_id`: Contact who picks up
- `same_driver`: Boolean flag if drop-off and collection are the same person

### Recurrence (Full iOS Calendar Support)
- **Frequency**: daily, weekly, monthly, yearly
- **Interval**: Every N periods (e.g., every 2 weeks)
- **Days of week**: Array like ['MO','TU','WE','TH','FR'] for weekdays
- **Days of month**: [1, 15, -1] for 1st, 15th, last day
- **Months of year**: [1, 6, 12] for Jan, June, Dec
- **Weeks of year**: For yearly patterns
- **Days of year**: For yearly patterns
- **Set positions**: [2] for "2nd Tuesday", [-1] for "last Friday"
- **End condition**: By date OR after N occurrences
- **Week start**: Default Monday, customizable
- **RRULE string**: Full RFC 5545 format stored for compatibility

### Event Exceptions
- Modify single instances of recurring events
- Delete single instances
- Override any field (time, title, location, etc.) for specific occurrence

### Event Participants
- Both authenticated users AND virtual members can be participants
- Example: "Emma's soccer practice" - Emma (virtual child) is participant, Mom (auth user) is organizer
- Status: pending, accepted, declined, maybe
- Tracks organizer
- Notification preferences per participant

### Event Reminders
- Only for authenticated users (they need to receive notifications)
- Flexible timing: minutes, hours, days, weeks before event
- Methods: push, email, or both
- Multiple reminders per event per user
- Tracks if sent

### Event Categories
- Custom color-coded categories per family
- Examples: "School", "Sports", "Medical", "Family Time"

---

## What You Need to Build in Your App

### 1. **Authentication & Onboarding**

#### Sign Up Flow
```
1. User signs up with email/password (Supabase Auth)
2. Create contact record:
   - INSERT INTO contacts (family_id, user_id, first_name, last_name, email, is_virtual=FALSE)
3. User creates/joins family:
   Option A - Create New Family:
   - INSERT INTO families (family_name) VALUES ('Smith')
   - Create contact for user
   - INSERT INTO family_members (family_id, contact_id, role='owner')
   
   Option B - Accept Invitation:
   - Find pending invitation by token
   - Update invitation status to 'accepted'
   - Link contact.user_id to new auth user
   - Set contact.is_virtual = FALSE
   - INSERT INTO family_members with appropriate role
```

#### Login Flow
```
1. User logs in (Supabase Auth)
2. Fetch user's families:
   SELECT f.* FROM families f
   JOIN family_members fm ON fm.family_id = f.id
   JOIN contacts c ON c.id = fm.contact_id
   WHERE c.user_id = auth.uid()
3. Load selected family's data
```

---

### 2. **Family Management**

#### View Family Members
```sql
-- Get all family members (both auth and virtual)
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.relationship,
    c.is_virtual,
    c.date_of_birth,
    c.avatar_url,
    fm.role,
    CASE WHEN c.is_virtual THEN 'Virtual' ELSE 'Authenticated' END as type
FROM family_members fm
JOIN contacts c ON c.id = fm.contact_id
WHERE fm.family_id = ?
ORDER BY c.is_virtual, c.first_name;
```

#### Add Virtual Family Member (e.g., child)
```sql
-- 1. Create contact
INSERT INTO contacts (
    family_id, 
    first_name, 
    last_name, 
    contact_type, 
    relationship, 
    is_virtual, 
    date_of_birth
) VALUES (
    'family-uuid', 
    'Emma', 
    'Smith', 
    'family_member', 
    'child', 
    TRUE, 
    '2015-03-15'
) RETURNING id;

-- 2. Add as family member
INSERT INTO family_members (family_id, contact_id, added_by)
VALUES ('family-uuid', 'emma-contact-uuid', auth.uid());
```

#### Add External Contact (e.g., carpool driver)
```sql
INSERT INTO contacts (
    family_id,
    first_name,
    last_name,
    email,
    phone,
    contact_type,
    relationship,
    is_virtual
) VALUES (
    'family-uuid',
    'John',
    'Neighbor',
    'john@email.com',
    '555-1234',
    'external_driver',
    'neighbor',
    TRUE
);
-- Note: External contacts are NOT added to family_members table
```

#### Send Invitation to Upgrade Virtual Member
```sql
INSERT INTO family_invitations (
    family_id,
    contact_id,  -- Link to existing virtual member
    invited_by,
    email,
    first_name,
    last_name,
    role,
    invitation_message
) VALUES (
    'family-uuid',
    'emma-contact-uuid',
    auth.uid(),
    'emma@email.com',
    'Emma',
    'Smith',
    'member',
    'Join our family calendar!'
);

-- Send email with invitation_token
-- Link: yourapp.com/accept-invite?token={invitation_token}
```

---

### 3. **Event Management**

#### Create Simple Event
```sql
INSERT INTO events (
    family_id,
    category_id,
    created_by,
    title,
    description,
    location,
    start_time,
    end_time,
    is_all_day,
    timezone,
    availability,
    status
) VALUES (
    'family-uuid',
    'school-category-uuid',
    auth.uid(),
    'School Drop-off',
    'Emma''s school',
    '123 School St',
    '2025-01-06 08:00:00+00',
    '2025-01-06 08:30:00+00',
    FALSE,
    'America/New_York',
    'busy',
    'confirmed'
) RETURNING id;

-- Add participants
INSERT INTO event_participants (event_id, contact_id, status, is_organizer)
VALUES 
    ('event-uuid', 'mom-contact-uuid', 'accepted', TRUE),
    ('event-uuid', 'emma-contact-uuid', 'accepted', FALSE);

-- Set driver
UPDATE events 
SET 
    drop_off_driver_id = 'mom-contact-uuid',
    collection_driver_id = 'dad-contact-uuid',
    same_driver = FALSE
WHERE id = 'event-uuid';
```

#### Create Recurring Event (Every Weekday)
```sql
INSERT INTO events (
    family_id,
    created_by,
    title,
    start_time,
    end_time,
    is_recurring,
    recurrence_frequency,
    recurrence_interval,
    recurrence_days_of_week,
    recurrence_end_date
) VALUES (
    'family-uuid',
    auth.uid(),
    'Soccer Practice',
    '2025-01-06 15:00:00+00',
    '2025-01-06 16:30:00+00',
    TRUE,
    'weekly',
    1,
    ARRAY['MO','TU','WE','TH','FR'],
    '2025-06-30 23:59:59+00'
);
```

#### Create Recurring Event (2nd Tuesday of Every Month)
```sql
INSERT INTO events (
    -- ... basic fields ...
    is_recurring,
    recurrence_frequency,
    recurrence_interval,
    recurrence_days_of_week,
    recurrence_set_positions,
    recurrence_count
) VALUES (
    -- ... basic values ...
    TRUE,
    'monthly',
    1,
    ARRAY['TU'],
    ARRAY[2],  -- 2nd occurrence
    12  -- 12 months
);
```

#### Modify Single Instance of Recurring Event
```sql
-- Delete single instance
INSERT INTO event_exceptions (
    event_id,
    exception_date,
    is_deleted
) VALUES (
    'recurring-event-uuid',
    '2025-01-15 15:00:00+00',
    TRUE
);

-- Modify single instance (change time)
INSERT INTO event_exceptions (
    event_id,
    exception_date,
    is_deleted,
    start_time,
    end_time,
    title
) VALUES (
    'recurring-event-uuid',
    '2025-01-22 15:00:00+00',
    FALSE,
    '2025-01-22 14:00:00+00',  -- Changed from 3pm to 2pm
    '2025-01-22 15:30:00+00',
    'Soccer Practice (Early)'
);
```

#### Add Reminder
```sql
INSERT INTO event_reminders (
    event_id,
    user_id,
    reminder_type,
    reminder_value,
    notification_method
) VALUES (
    'event-uuid',
    auth.uid(),
    'minutes',
    30,  -- 30 minutes before
    'push'
);

-- Multiple reminders
INSERT INTO event_reminders (event_id, user_id, reminder_type, reminder_value)
VALUES 
    ('event-uuid', auth.uid(), 'days', 1),     -- 1 day before
    ('event-uuid', auth.uid(), 'hours', 2);    -- 2 hours before
```

#### Query Events for Calendar View
```sql
-- Get all events for a date range
SELECT 
    e.*,
    ec.name as category_name,
    ec.color as category_color,
    c_creator.first_name || ' ' || c_creator.last_name as created_by_name,
    c_drop.first_name || ' ' || c_drop.last_name as drop_off_driver_name,
    c_coll.first_name || ' ' || c_coll.last_name as collection_driver_name
FROM events e
LEFT JOIN event_categories ec ON ec.id = e.category_id
LEFT JOIN contacts c_creator ON c_creator.user_id = e.created_by
LEFT JOIN contacts c_drop ON c_drop.id = e.drop_off_driver_id
LEFT JOIN contacts c_coll ON c_coll.id = e.collection_driver_id
WHERE e.family_id = ?
  AND e.start_time >= ?
  AND e.start_time < ?
ORDER BY e.start_time;

-- Get participants for events
SELECT 
    ep.*,
    c.first_name,
    c.last_name,
    c.is_virtual
FROM event_participants ep
JOIN contacts c ON c.id = ep.contact_id
WHERE ep.event_id IN (?);

-- Get exceptions for recurring events
SELECT * FROM event_exceptions
WHERE event_id IN (?)
  AND exception_date >= ?
  AND exception_date < ?;
```

#### Query My Driving Schedule
```sql
-- Events where I'm a driver
SELECT 
    e.*,
    CASE 
        WHEN e.drop_off_driver_id = ? THEN 'drop-off'
        WHEN e.collection_driver_id = ? THEN 'collection'
        WHEN e.drop_off_driver_id = ? AND e.collection_driver_id = ? THEN 'both'
    END as my_role
FROM events e
JOIN family_members fm ON fm.family_id = e.family_id
JOIN contacts c ON c.id = fm.contact_id
WHERE c.user_id = auth.uid()
  AND (e.drop_off_driver_id = ? OR e.collection_driver_id = ?)
  AND e.start_time >= ?
ORDER BY e.start_time;
-- Note: Replace ? with the authenticated user's contact_id
```

---

### 4. **Driver Assignment UI**

#### UI Flow for Assigning Drivers
```
1. User creates/edits event
2. Show "Set Driver" section
3. Ask: "Is drop-off and collection driver the same?" (toggle/checkbox)
   
   IF SAME:
   - Show single driver picker
   - List all family members + external drivers (from contacts)
   - On select:
     UPDATE events SET 
       drop_off_driver_id = selected_contact_id,
       collection_driver_id = selected_contact_id,
       same_driver = TRUE
   
   IF DIFFERENT:
   - Show two driver pickers (drop-off and collection)
   - On select:
     UPDATE events SET 
       drop_off_driver_id = drop_contact_id,
       collection_driver_id = coll_contact_id,
       same_driver = FALSE
```

#### Query Contacts for Driver Picker
```sql
-- Get all potential drivers (family members + external drivers)
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.relationship,
    c.contact_type,
    CASE 
        WHEN fm.id IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END as is_family_member
FROM contacts c
LEFT JOIN family_members fm ON fm.contact_id = c.id AND fm.family_id = ?
WHERE c.family_id = ?
  AND (
    fm.id IS NOT NULL  -- Is a family member
    OR c.contact_type = 'external_driver'  -- Or is external driver
  )
ORDER BY is_family_member DESC, c.first_name;
```

---

### 5. **Categories Management**

#### Create Category
```sql
INSERT INTO event_categories (family_id, name, color)
VALUES ('family-uuid', 'School', '#FF5733');
```

#### List Categories
```sql
SELECT * FROM event_categories
WHERE family_id = ?
ORDER BY name;
```

---

### 6. **Invitation Acceptance Flow**

#### Accept Invitation Page
```
1. User receives email with link: yourapp.com/accept-invite?token={token}
2. If not logged in, prompt to sign up/login
3. After auth:

-- Find invitation
SELECT * FROM family_invitations
WHERE invitation_token = ?
  AND status = 'pending'
  AND expires_at > NOW();

-- If contact_id exists (upgrading virtual member):
UPDATE contacts
SET 
    user_id = auth.uid(),
    is_virtual = FALSE,
    invitation_accepted_at = NOW()
WHERE id = invitation.contact_id;

-- If contact_id is NULL (new person):
INSERT INTO contacts (family_id, user_id, first_name, last_name, email, is_virtual)
VALUES (invitation.family_id, auth.uid(), invitation.first_name, invitation.last_name, invitation.email, FALSE)
RETURNING id;

-- Add to family_members
INSERT INTO family_members (family_id, contact_id, role)
VALUES (invitation.family_id, contact_id, invitation.role);

-- Update invitation
UPDATE family_invitations
SET 
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = auth.uid()
WHERE id = invitation.id;
```

---

### 7. **Calendar Views to Build**

#### Month View
- Query events for entire month
- Handle recurring events by generating instances
- Show event indicators on dates
- Color-code by category

#### Week View
- Query events for week range
- Show time slots
- Display overlapping events side-by-side
- Show driver assignments

#### Day View
- Detailed timeline view
- Show full event details
- Display participants
- Show travel time blocks before events

#### Agenda/List View
- Chronological list of upcoming events
- Group by date
- Show participants and drivers
- Filter by category, participant, or driver

---

### 8. **Handling Recurring Events in UI**

When displaying recurring events, you need to generate instances:

```javascript
// Pseudo-code for generating recurring event instances
function generateRecurringInstances(event, startDate, endDate) {
    if (!event.is_recurring) {
        return [event];
    }
    
    const instances = [];
    const rules = {
        frequency: event.recurrence_frequency,
        interval: event.recurrence_interval,
        byDay: event.recurrence_days_of_week,
        byMonthDay: event.recurrence_days_of_month,
        byMonth: event.recurrence_months_of_year,
        bySetPos: event.recurrence_set_positions,
        count: event.recurrence_count,
        until: event.recurrence_end_date
    };
    
    // Use a library like rrule.js to generate instances
    // For each instance:
    //   - Check if there's an exception for this date
    //   - If exception.is_deleted, skip instance
    //   - If exception has modified fields, use those instead
    
    return instances;
}
```

---

### 9. **Key Supabase Queries Summary**

#### Initialize App (After Login)
```sql
-- Get user's contact
SELECT c.* FROM contacts c
WHERE c.user_id = auth.uid()
LIMIT 1;

-- Get user's families
SELECT f.*, fm.role FROM families f
JOIN family_members fm ON fm.family_id = f.id
WHERE fm.contact_id = ?;

-- Get family members
SELECT c.*, fm.role FROM contacts c
JOIN family_members fm ON fm.contact_id = c.id
WHERE fm.family_id = ?;

-- Get categories
SELECT * FROM event_categories WHERE family_id = ?;

-- Get events for current month
SELECT * FROM events 
WHERE family_id = ?
  AND start_time >= ?
  AND start_time < ?;
```

---

### 10. **Important Validation Rules**

#### In Your App Logic:
- Validate `recurrence_months_of_year` contains values 1-12
- Validate `recurrence_days_of_week` contains valid codes: MO, TU, WE, TH, FR, SA, SU
- Validate email format before creating contacts/invitations
- Check invitation hasn't expired before accepting
- Ensure end_time > start_time for events
- Don't allow users to set reminders for events they're not participating in
- Only allow owner/admin roles to manage family members and invitations

---

### 11. **Real-time Subscriptions (Optional)**

Use Supabase Realtime to keep calendars in sync:

```javascript
// Subscribe to event changes
supabase
  .channel('events')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'events',
      filter: `family_id=eq.${familyId}`
    }, 
    (payload) => {
      // Refresh calendar view
    }
  )
  .subscribe();
```

---

## Summary of App Screens to Build

1. **Auth Screens**
   - Sign Up
   - Login
   - Accept Invitation

2. **Family Management**
   - Family Dashboard
   - Add Family Member (Virtual/Authenticated)
   - Add External Contact
   - Send Invitation
   - View/Edit Members

3. **Calendar Views**
   - Month View
   - Week View
   - Day View
   - Agenda/List View

4. **Event Screens**
   - Create Event
   - Edit Event
   - Event Detail View
   - Set Recurrence
   - Modify Recurring Instance
   - Set Drivers
   - Add Participants
   - Set Reminders

5. **Settings**
   - Categories Management
   - Profile Settings
   - Notification Preferences

---

## Tips for Development

1. **Start Simple**: Build basic event CRUD before adding recurrence
2. **Test RLS**: Ensure users can only see their family's data
3. **Use Supabase Client Libraries**: They handle auth and RLS automatically
4. **Generate RRULE**: Use libraries like `rrule.js` to generate/parse recurrence rules
5. **Cache Contacts**: Load all family contacts once and cache for driver/participant pickers
6. **Batch Queries**: Use Supabase's query builder to fetch related data efficiently
7. **Handle Timezones**: Store all times in UTC, display in user's local timezone

---

## Database Tables Reference

### Core Tables
- `families` - Family groups
- `contacts` - All people (authenticated + virtual)
- `family_members` - Links contacts to families
- `family_invitations` - Invitation system

### Event Tables
- `events` - Main event data
- `event_categories` - Color-coded categories
- `event_participants` - Who's attending
- `event_reminders` - User notifications
- `event_exceptions` - Modified recurring instances

### Key Relationships
- A family has many contacts
- A family has many family_members (via contacts)
- A family has many events
- An event has many participants (contacts)
- An event has many reminders (for authenticated users)
- A recurring event has many exceptions

---

## Next Steps

1. Set up Supabase project and apply the schema
2. Configure Supabase authentication
3. Build authentication flows (sign up, login, accept invitation)
4. Create family management screens
5. Build basic event CRUD
6. Add calendar views
7. Implement recurring events
8. Add driver assignment features
9. Implement reminders and notifications
10. Polish UI/UX and test thoroughly

Good luck building your family calendar app!