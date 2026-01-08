import { supabase } from '@/lib/supabase';

export interface UserPreferences {
  id: string;
  user_id: string;
  upcoming_events_card_view: boolean;
  schedule_day_start: string; // TIME format like "07:00:00"
  schedule_day_end: string; // TIME format like "19:30:00"
  created_at: string;
  updated_at: string;
}

/**
 * Get user preferences from the database
 */
export async function getUserPreferences(userId: string): Promise<{
  data: UserPreferences | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no preferences exist yet, return null (not an error)
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      console.error('Error fetching user preferences:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error fetching user preferences:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Create or update user preferences in the database
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{
  data: UserPreferences | null;
  error: Error | null;
}> {
  try {
    // Use upsert to create or update
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating user preferences:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error updating user preferences:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Update the upcoming events view mode preference
 */
export async function updateUpcomingEventsViewMode(
  userId: string,
  isCardView: boolean
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const { data, error } = await updateUserPreferences(userId, {
    upcoming_events_card_view: isCardView,
  });

  return {
    success: !error && !!data,
    error,
  };
}

/**
 * Update the schedule day start and end times
 */
export async function updateScheduleTimes(
  userId: string,
  dayStart: string, // HH:MM:SS format
  dayEnd: string // HH:MM:SS format
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const { data, error } = await updateUserPreferences(userId, {
    schedule_day_start: dayStart,
    schedule_day_end: dayEnd,
  });

  return {
    success: !error && !!data,
    error,
  };
}
