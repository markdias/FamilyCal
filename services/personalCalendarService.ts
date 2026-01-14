import { supabase } from '@/lib/supabase';
import { getCalendarEvents, IOSCalendar } from './calendarImportService';

export interface PersonalCalendar {
  id: string;
  user_id: string;
  family_id: string;
  calendar_id: string;
  calendar_title: string;
  calendar_color: string;
  calendar_source_name: string | null;
  calendar_source_type: string | null;
  show_in_family_view: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonalCalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  notes?: string;
  calendarId: string;
  calendarTitle: string;
  calendarColor: string;
  isPersonalCalendar: true;
}

/**
 * Get all personal calendars for a user in a family
 */
export async function getPersonalCalendars(
  userId: string,
  familyId: string
): Promise<{ data: PersonalCalendar[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('personal_calendars')
      .select('*')
      .eq('user_id', userId)
      .eq('family_id', familyId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching personal calendars:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in getPersonalCalendars:', error);
    return { data: null, error };
  }
}

/**
 * Add a personal calendar
 */
export async function addPersonalCalendar(
  userId: string,
  familyId: string,
  calendar: IOSCalendar
): Promise<{ data: PersonalCalendar | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('personal_calendars')
      .insert({
        user_id: userId,
        family_id: familyId,
        calendar_id: calendar.id,
        calendar_title: calendar.title,
        calendar_color: calendar.color,
        calendar_source_name: calendar.source.name,
        calendar_source_type: calendar.source.type,
        show_in_family_view: false, // Default to false
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding personal calendar:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in addPersonalCalendar:', error);
    return { data: null, error };
  }
}

/**
 * Update a personal calendar (e.g., toggle family view)
 */
export async function updatePersonalCalendar(
  id: string,
  updates: Partial<Pick<PersonalCalendar, 'show_in_family_view' | 'calendar_title' | 'calendar_color'>>
): Promise<{ data: PersonalCalendar | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('personal_calendars')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating personal calendar:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in updatePersonalCalendar:', error);
    return { data: null, error };
  }
}

/**
 * Delete a personal calendar
 */
export async function deletePersonalCalendar(
  id: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('personal_calendars')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting personal calendar:', error);
      return { error };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error in deletePersonalCalendar:', error);
    return { error };
  }
}

/**
 * Get events from multiple personal calendars within a date range
 */
export async function getPersonalCalendarEvents(
  calendars: PersonalCalendar[],
  startDate: Date,
  endDate: Date
): Promise<{ data: PersonalCalendarEvent[] | null; error: string | null }> {
  if (calendars.length === 0) {
    return { data: [], error: null };
  }

  try {
    const allEvents: PersonalCalendarEvent[] = [];

    // Fetch events from each calendar
    for (const calendar of calendars) {
      const { data: events, error } = await getCalendarEvents(
        calendar.calendar_id,
        startDate,
        endDate
      );

      if (error) {
        // Check for permission errors and suppress them or handle them gracefully
        const errorMessage = typeof error === 'string' ? error : ((error as any).message || '');
        if (errorMessage.includes('permission is required')) {
          console.log(`[PersonalCalendar] Permission missing for calendar ${calendar.calendar_title}, skipping silently.`);
        } else {
          console.error(`Error fetching events from calendar ${calendar.calendar_title}:`, error);
        }
        continue; // Skip this calendar but continue with others
      }

      if (events) {
        const mappedEvents: PersonalCalendarEvent[] = events.map((event) => ({
          id: event.id,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          allDay: event.allDay,
          location: event.location,
          notes: event.notes,
          calendarId: calendar.calendar_id,
          calendarTitle: calendar.calendar_title,
          calendarColor: calendar.calendar_color,
          isPersonalCalendar: true,
        }));

        allEvents.push(...mappedEvents);
      }
    }

    // Sort by start date
    allEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return { data: allEvents, error: null };
  } catch (error: any) {
    console.error('Error in getPersonalCalendarEvents:', error);
    return { data: null, error: error.message || 'Failed to fetch personal calendar events' };
  }
}

/**
 * Get personal calendar events for a specific user (filtered by family view setting)
 */
export async function getPersonalCalendarEventsForUser(
  userId: string,
  familyId: string,
  startDate: Date,
  endDate: Date,
  includeOnlyFamilyView: boolean = false
): Promise<{ data: PersonalCalendarEvent[] | null; error: string | null }> {
  try {
    // Get user's personal calendars
    const { data: calendars, error: calendarsError } = await getPersonalCalendars(userId, familyId);

    if (calendarsError || !calendars) {
      return { data: null, error: calendarsError?.message || 'Failed to fetch calendars' };
    }

    // Filter by family view setting if needed
    const calendarsToFetch = includeOnlyFamilyView
      ? calendars.filter((cal) => cal.show_in_family_view)
      : calendars;

    return getPersonalCalendarEvents(calendarsToFetch, startDate, endDate);
  } catch (error: any) {
    console.error('Error in getPersonalCalendarEventsForUser:', error);
    return { data: null, error: error.message || 'Failed to fetch personal calendar events' };
  }
}
