# Location Features Migration

## Overview
This migration adds support for favorite and recent locations in FamilyCal.

## Tables Created

### `favorite_locations`
Stores manually saved locations that family members name and can reuse:
- `id`: Primary key
- `family_id`: Reference to the family
- `name`: Custom name (e.g., "Home", "School", "Soccer Field")
- `address`: Full formatted address
- `latitude`, `longitude`: GPS coordinates
- `place_id`: Google Place ID (optional)
- `created_by`: User who created the favorite
- `created_at`, `updated_at`: Timestamps

### `recent_locations`
Automatically tracks recently used locations:
- `id`: Primary key
- `family_id`: Reference to the family
- `address`: Full formatted address
- `latitude`, `longitude`: GPS coordinates
- `place_id`: Google Place ID (optional)
- `last_used_at`: Last time this location was used
- `use_count`: Number of times used
- `created_at`: Timestamp

## How to Apply

### Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `add_location_features.sql`
4. Paste and run the SQL

### Using Supabase CLI
```bash
supabase db push
```

## Rollback

If you need to rollback this migration:

```sql
DROP TABLE IF EXISTS recent_locations CASCADE;
DROP TABLE IF EXISTS favorite_locations CASCADE;
```

## Security

Both tables have Row Level Security (RLS) enabled:
- Users can only view/manage locations for families they belong to
- All CRUD operations are restricted to family members
