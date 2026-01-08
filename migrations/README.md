# Database Migrations

This folder contains SQL migration files for the FamilyCal database.

## How to Apply Migrations

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** section
3. Click **New Query**
4. Copy and paste the contents of the migration file
5. Click **Run** to execute the migration

### Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

Or run a specific migration file:

```bash
psql -h <your-db-host> -U postgres -d postgres -f migrations/add_user_preferences.sql
```

## Migration: add_user_preferences.sql

This migration adds a `user_preferences` table to store user-specific UI preferences.

**Features:**
- Stores the upcoming events view mode preference (compact vs. detailed/card view)
- Linked to auth.users table with CASCADE delete
- Row Level Security (RLS) enabled
- Users can only access their own preferences

**To Apply:**
Run the `add_user_preferences.sql` migration file in your Supabase SQL editor.
