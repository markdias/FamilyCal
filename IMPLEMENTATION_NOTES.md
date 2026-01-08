# Implementation: Persistent Upcoming Events View Mode

## Summary

The upcoming events view mode toggle (compact vs. detailed/card view) in the FamilyView is now saved to the database, ensuring consistency across sessions and devices.

## Changes Made

### 1. Database Schema

**New Table: `user_preferences`**
- Stores user-specific UI preferences
- Fields:
  - `id`: UUID primary key
  - `user_id`: References auth.users (CASCADE delete)
  - `upcoming_events_card_view`: Boolean (default: false)
  - `created_at`, `updated_at`: Timestamps
- Row Level Security (RLS) enabled
- Unique constraint on `user_id`

**Files Modified:**
- `familycal.sql` - Added user_preferences table with full RLS policies
- `migrations/add_user_preferences.sql` - Standalone migration file

### 2. Service Layer

**New File: `services/userPreferencesService.ts`**
- `getUserPreferences(userId)` - Fetches user preferences from database
- `updateUserPreferences(userId, preferences)` - Upserts preferences
- `updateUpcomingEventsViewMode(userId, isCardView)` - Specific helper for view mode

### 3. TypeScript Types

**File: `lib/supabase.ts`**
- Added `UserPreferences` interface matching the database schema

### 4. Component Updates

**File: `components/family/UpcomingEventsList.tsx`**
- Added imports for `useAuth` and user preferences service
- Added `useEffect` hook to load preference on mount
- Updated `toggleView` function to save preference to database
- Added loading state management

## How to Apply

### Step 1: Run the Database Migration

Choose one of these methods:

#### Option A: Supabase Dashboard
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy contents of `migrations/add_user_preferences.sql`
5. Click **Run**

#### Option B: Run from familycal.sql
If setting up a fresh database, the user_preferences table is now included in the main schema file.

### Step 2: Test the Feature

1. Start your app
2. Navigate to the Family view
3. Toggle between compact and detailed view using the button (top right of "Upcoming Events" section)
4. Close and reopen the app
5. Verify the view mode persists
6. Test on multiple devices with the same account to verify sync

## Technical Details

### Database Security
- Row Level Security (RLS) is enabled
- Users can only access their own preferences
- Policies enforce user_id = auth.uid() for all operations

### Data Flow
1. Component mounts → Fetch preference from database
2. User toggles view → Update local state immediately (optimistic UI)
3. Simultaneously save to database
4. Next session → Load saved preference

### Edge Cases Handled
- Guest users (no auth) → Uses local state only
- No preference record → Defaults to compact view (false)
- Database errors → Graceful fallback, preference not saved but UI still works

## Future Enhancements

Consider adding more preferences to this table:
- Default calendar view (month/day/week)
- Event sorting preferences
- Notification preferences
- Theme preferences (if moving from local storage)

## Files Created/Modified

### Created:
- `services/userPreferencesService.ts`
- `migrations/add_user_preferences.sql`
- `migrations/README.md`
- `IMPLEMENTATION_NOTES.md`

### Modified:
- `components/family/UpcomingEventsList.tsx`
- `lib/supabase.ts`
- `familycal.sql`
