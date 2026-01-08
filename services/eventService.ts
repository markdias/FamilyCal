import { supabase, Event, EventParticipant, EventCategory, Contact } from '@/lib/supabase';
import { getEventColor, formatDisplayName, FAMILY_EVENT_COLOR, normalizeColorForDisplay } from '@/utils/colorUtils';
import { FamilyEvent } from '@/utils/mockEvents';

export interface EventWithDetails extends Event {
  // When expanding recurrences client-side we preserve the original id here
  original_event_id?: string;
  category?: EventCategory;
  participants?: (EventParticipant & { contact: Contact })[];
  reminders?: EventReminder[];
  exceptions?: EventException[];
}

export interface EventException {
  id: string;
  event_id: string;
  exception_date: string;
  is_deleted: boolean;
  title: string | null;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

export interface EventReminder {
  id: string;
  reminder_type: 'minutes' | 'hours' | 'days' | 'weeks';
  reminder_value: number;
  notification_method: 'push' | 'email' | 'both';
  is_sent: boolean;
  sent_at: string | null;
  event_id: string;
  user_id: string;
}

export type ReminderInput = {
  type: 'minutes' | 'hours' | 'days' | 'weeks';
  value: number;
  method?: 'push' | 'email' | 'both';
};

export type RecurrenceInput = {
  isRecurring?: boolean;
  frequency?: Event['recurrence_frequency'];
  interval?: number;
  daysOfWeek?: string[];
  daysOfMonth?: number[];
  monthsOfYear?: number[];
  weeksOfYear?: number[];
  daysOfYear?: number[];
  setPositions?: number[];
  count?: number;
  endDate?: Date;
  weekStart?: string;
  rule?: string;
};

// Get events for a specific date range
export async function getEventsForDateRange(
  familyId: string,
  startDate: Date,
  endDate: Date
): Promise<{ data: EventWithDetails[] | null; error: any }> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      category:event_categories(*),
      participants:event_participants(
        *,
        contact:contacts(*)
      )
    `)
    .eq('family_id', familyId)
    .or(`is_recurring.eq.true,and(start_time.gte.${startDate.toISOString()},start_time.lt.${endDate.toISOString()})`)
    .order('start_time');

  if (error) {
    console.error(`[eventService] Error fetching events:`, error);
    return { data: null, error };
  }
  
  if (!data) {
    return { data: [], error: null };
  }

  const expanded = expandEventsForRange(data as EventWithDetails[], startDate, endDate);
  return { data: expanded, error: null };
}

// Get events for a specific month
export async function getEventsForMonth(
  familyId: string,
  year: number,
  month: number // 1-based (January = 1)
): Promise<{ data: EventWithDetails[] | null; error: any }> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  
  return getEventsForDateRange(familyId, startDate, endDate);
}

// Get upcoming events (from now), expanded for recurrences
export async function getUpcomingEvents(
  familyId: string,
  limit?: number // optional cap after expansion
): Promise<{ data: EventWithDetails[] | null; error: any }> {
  const now = new Date();
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + 6); // 6-month horizon for recurrences
  
  // Use a slightly earlier time to ensure we catch events that are very close to now
  // This helps with timing issues where events might be created just before the query runs
  const queryTime = new Date(now.getTime() - 60000); // 1 minute ago to be safe
  
  console.log(`[getUpcomingEvents] Fetching events for family ${familyId}`);
  console.log(`[getUpcomingEvents] Now (local): ${now.toLocaleString()}, Now (UTC): ${now.toISOString()}`);
  console.log(`[getUpcomingEvents] Query time (UTC): ${queryTime.toISOString()}`);
  console.log(`[getUpcomingEvents] Horizon (6 months): ${horizon.toISOString()}`);
  
  // Query for ALL events for this family
  // We'll filter client-side to get only future events and recurring events
  // This ensures we get everything without query syntax issues
  const { data: allEvents, error: fetchError } = await supabase
    .from('events')
    .select(`
      *,
      category:event_categories(*),
      participants:event_participants(
        *,
        contact:contacts(*)
      )
    `)
    .eq('family_id', familyId)
    .order('start_time');
  
  if (fetchError) {
    console.error(`[getUpcomingEvents] Error fetching all events:`, fetchError);
    return { data: null, error: fetchError };
  }
  
  if (!allEvents) {
    console.warn(`[getUpcomingEvents] No data returned (null/undefined)`);
    return { data: [], error: null };
  }
  
  console.log(`[getUpcomingEvents] Fetched ${allEvents.length} total events for family`);
  
  // Filter client-side: keep events that are recurring OR start_time >= queryTime
  const data = allEvents.filter((event: any) => {
    const isRecurring = event.is_recurring === true;
    const eventStart = new Date(event.start_time);
    const isFuture = eventStart >= queryTime;
    return isRecurring || isFuture;
  });
  
  console.log(`[getUpcomingEvents] After filtering (recurring OR future): ${data.length} events`);
  console.log(`[getUpcomingEvents] Filter criteria: is_recurring=true OR start_time >= ${queryTime.toISOString()}`);

  console.log(`[getUpcomingEvents] Got ${data.length} events from database (after filtering)`);
  
  // Log event details for debugging
  if (data.length > 0) {
    data.forEach((event: any) => {
      console.log(`[getUpcomingEvents] Event: ${event.title}, start: ${event.start_time}, participants: ${event.participants?.length || 0}`);
    });
  }

  // Expand recurring events from now to horizon
  const expanded = expandEventsForRange(data as EventWithDetails[], now, horizon);
  expanded.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  
  console.log(`[getUpcomingEvents] Expansion range: ${now.toISOString()} to ${horizon.toISOString()}`);

  // Only apply limit if explicitly requested (for performance in specific views)
  // For the main "upcoming" cache, we want ALL events
  const limited = limit ? expanded.slice(0, limit) : expanded;
  console.log(`[getUpcomingEvents] After expansion: ${expanded.length} events${limit ? `, after limit of ${limit}: ${limited.length} events` : ' (no limit applied - returning ALL events)'}`);
  
  // Log final events for debugging (limit to first 10 to avoid console spam)
  const eventsToLog = limited.slice(0, 10);
  if (eventsToLog.length > 0) {
    console.log(`[getUpcomingEvents] Final events (showing first ${eventsToLog.length} of ${limited.length}):`);
    eventsToLog.forEach((event) => {
      console.log(`[getUpcomingEvents]   - "${event.title}" at ${event.start_time}, has participants: ${!!event.participants && event.participants.length > 0}`);
    });
    if (limited.length > 10) {
      console.log(`[getUpcomingEvents]   ... and ${limited.length - 10} more events`);
    }
  } else {
    console.log(`[getUpcomingEvents] No events returned after expansion`);
  }
  
  return { data: limited, error: null };
}

// Get current/today's events
export async function getTodayEvents(
  familyId: string
): Promise<{ data: EventWithDetails[] | null; error: any }> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  console.log(`[getTodayEvents] Fetching events for family ${familyId}, startOfDay: ${startOfDay.toISOString()}, endOfDay: ${endOfDay.toISOString()}`);
  
  const result = await getEventsForDateRange(familyId, startOfDay, endOfDay);
  
  console.log(`[getTodayEvents] Got ${result.data?.length || 0} events`);
  
  return result;
}

// Get a single event by ID
export async function getEvent(eventId: string): Promise<{ 
  data: EventWithDetails | null; 
  error: any 
}> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      category:event_categories(*),
      participants:event_participants(
        *,
        contact:contacts(*)
      ),
      reminders:event_reminders(*)
    `)
    .eq('id', eventId)
    .single();

  return { data: data as any, error };
}

// Create a new event
export async function createEvent(
  familyId: string,
  eventData: {
    title: string;
    description?: string;
    notes?: string;
    location?: string;
    structuredLocationTitle?: string;
    structuredLocationAddress?: string;
    structuredLocationLatitude?: number;
    structuredLocationLongitude?: number;
    url?: string;
    startTime: Date;
    endTime: Date;
    isAllDay?: boolean;
    categoryId?: string;
    availability?: Event['availability'];
    travelTimeMinutes?: number;
    startLocationTitle?: string;
    startLocationAddress?: string;
    startLocationLatitude?: number;
    startLocationLongitude?: number;
    isRecurring?: boolean;
    recurrence?: RecurrenceInput;
    dropOffDriverId?: string;
    collectionDriverId?: string;
    sameDriver?: boolean;
  },
  participantContactIds?: string[],
  reminders?: ReminderInput[]
): Promise<{ data: Event | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const recurrence = eventData.recurrence || {};
  const normalizedRecurrence = {
    ...recurrence,
    isRecurring: recurrence.isRecurring ?? false,
    frequency: recurrence.frequency || (recurrence.isRecurring ? 'daily' : null),
    interval:
      recurrence.interval ??
      (recurrence.isRecurring || recurrence.frequency ? 1 : null),
  };

  // Prepare event data
  const eventInsertData: any = {
    family_id: familyId,
    created_by: user.id,
    title: eventData.title,
    description: eventData.description || null,
    notes: eventData.notes || null,
    location: eventData.location || null,
    structured_location_title: eventData.structuredLocationTitle || null,
    structured_location_address: eventData.structuredLocationAddress || null,
    structured_location_latitude: eventData.structuredLocationLatitude ?? null,
    structured_location_longitude: eventData.structuredLocationLongitude ?? null,
    url: eventData.url || null,
    start_time: eventData.startTime.toISOString(),
    end_time: eventData.endTime.toISOString(),
    is_all_day: eventData.isAllDay ?? false,
    category_id: eventData.categoryId || null,
    availability: eventData.availability || 'busy',
    travel_time: eventData.travelTimeMinutes ?? null,
    start_location_title: eventData.startLocationTitle || null,
    start_location_address: eventData.startLocationAddress || null,
    start_location_latitude: eventData.startLocationLatitude ?? null,
    start_location_longitude: eventData.startLocationLongitude ?? null,
    is_recurring: normalizedRecurrence.isRecurring,
    recurrence_rule: normalizedRecurrence.rule || null,
    recurrence_frequency: normalizedRecurrence.frequency || null,
    recurrence_days_of_week:
      normalizedRecurrence.daysOfWeek && normalizedRecurrence.daysOfWeek.length
        ? normalizedRecurrence.daysOfWeek
        : null,
    recurrence_days_of_month:
      normalizedRecurrence.daysOfMonth && normalizedRecurrence.daysOfMonth.length
        ? normalizedRecurrence.daysOfMonth
        : null,
    recurrence_months_of_year:
      normalizedRecurrence.monthsOfYear && normalizedRecurrence.monthsOfYear.length
        ? normalizedRecurrence.monthsOfYear
        : null,
    recurrence_weeks_of_year:
      normalizedRecurrence.weeksOfYear && normalizedRecurrence.weeksOfYear.length
        ? normalizedRecurrence.weeksOfYear
        : null,
    recurrence_days_of_year:
      normalizedRecurrence.daysOfYear && normalizedRecurrence.daysOfYear.length
        ? normalizedRecurrence.daysOfYear
        : null,
    recurrence_set_positions:
      normalizedRecurrence.setPositions && normalizedRecurrence.setPositions.length
        ? normalizedRecurrence.setPositions
        : null,
    recurrence_count: normalizedRecurrence.count || null,
    recurrence_end_date: normalizedRecurrence.endDate
      ? normalizedRecurrence.endDate.toISOString()
      : null,
    recurrence_week_start: normalizedRecurrence.weekStart || null,
    drop_off_driver_id: eventData.dropOffDriverId || null,
    collection_driver_id: eventData.collectionDriverId || null,
    same_driver: eventData.sameDriver ?? false,
  };

  // Only set recurrence_interval if it's not null (let DB default handle null case)
  if (normalizedRecurrence.interval !== null && normalizedRecurrence.interval !== undefined) {
    eventInsertData.recurrence_interval = normalizedRecurrence.interval;
  }

  console.log('[createEvent] Creating event with data:', {
    family_id: eventInsertData.family_id,
    title: eventInsertData.title,
    start_time: eventInsertData.start_time,
    end_time: eventInsertData.end_time,
    is_recurring: eventInsertData.is_recurring,
    participant_count: participantContactIds?.length || 0,
    user_id: user.id,
  });

  // Verify user has access to this family before attempting insert
  // Check if user has a contact record linked to this family
  const { data: userContact, error: contactError } = await supabase
    .from('contacts')
    .select('id, family_id')
    .eq('user_id', user.id)
    .eq('family_id', familyId)
    .limit(1);
  
  console.log('[createEvent] User contact check:', { 
    hasContact: !!userContact && userContact.length > 0, 
    error: contactError,
    contact: userContact 
  });

  // Check if user is a family member
  const { data: familyMember, error: memberError } = await supabase
    .from('family_members')
    .select('id, role')
    .eq('family_id', familyId)
    .limit(1);
  
  console.log('[createEvent] Family membership check:', { 
    hasMember: !!familyMember && familyMember.length > 0, 
    error: memberError,
    member: familyMember 
  });

  if (contactError || memberError) {
    console.warn('[createEvent] Warning: Could not verify family membership, proceeding anyway');
  }

  // Create the event - try with select first
  let event: Event | null = null;
  let eventError: any = null;
  
  const { data: insertedEvents, error: insertError } = await supabase
    .from('events')
    .insert(eventInsertData)
    .select();

  if (insertError) {
    console.error('[createEvent] Insert error:', insertError);
    console.error('[createEvent] Insert error details:', {
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      code: insertError.code,
    });
    eventError = insertError;
  } else if (insertedEvents && insertedEvents.length > 0) {
    event = insertedEvents[0] as Event;
    console.log('[createEvent] Event created successfully via insert with select:', event.id);
  } else {
    // Insert might have succeeded but select failed - try to fetch the event manually
    console.warn('[createEvent] Insert returned no data, attempting to fetch event manually');
    
    // Wait a bit for the insert to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try to fetch the most recent event for this family
    const { data: fetchedEvents, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('family_id', familyId)
      .eq('created_by', user.id)
      .eq('title', eventInsertData.title)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (fetchError) {
      console.error('[createEvent] Error fetching event after insert:', fetchError);
      eventError = fetchError;
    } else if (fetchedEvents && fetchedEvents.length > 0) {
      event = fetchedEvents[0] as Event;
      console.log('[createEvent] Event found via manual fetch:', event.id);
    } else {
      console.error('[createEvent] Event not found after insert - insert may have failed silently');
      eventError = new Error('Event creation failed: insert succeeded but event not found');
    }
  }

  if (eventError) {
    // Log detailed error information
    const errorDetails = {
      message: eventError.message,
      code: eventError.code,
      details: eventError.details,
      hint: eventError.hint,
      familyId,
      userId: user.id,
      title: eventInsertData.title,
    };
    console.error('[createEvent] Event creation failed:', errorDetails);
    
    // Provide a more helpful error message
    let userMessage = eventError.message || 'Failed to create event';
    if (eventError.code === '42501') {
      userMessage = 'Permission denied: You may not have access to create events in this family. Please ensure you are a member of the family.';
    } else if (eventError.code === '23503') {
      userMessage = 'Invalid reference: The family or user reference is invalid.';
    } else if (eventError.code === '23514') {
      userMessage = 'Validation error: The event data does not meet the required constraints.';
    }
    
    return { 
      data: null, 
      error: {
        ...eventError,
        message: userMessage,
        originalMessage: eventError.message,
      }
    };
  }

  if (!event) {
    console.error('[createEvent] Event creation returned no data and no error');
    console.error('[createEvent] This may indicate an RLS policy issue or silent failure');
    return { 
      data: null, 
      error: new Error('Event creation failed: no data returned. This may be due to insufficient permissions or a database constraint violation.') 
    };
  }

  console.log('[createEvent] Event created successfully:', event.id);

  // Get user's contact for this family (already fetched earlier, but ensure we have it)
  let finalUserContact = userContact && userContact.length > 0 ? userContact[0] : null;
  if (!finalUserContact) {
    // Try to fetch it again if we don't have it
    const { data: fetchedContact } = await supabase
      .from('contacts')
      .select('id, family_id')
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .limit(1)
      .single();
    finalUserContact = fetchedContact;
  }

  // Prepare participants list - always include the creator if they have a contact
  let participantsToAdd: string[] = [];
  
  if (participantContactIds && participantContactIds.length > 0) {
    // Use provided participants
    participantsToAdd = [...new Set(participantContactIds)];
  }
  
  // If no participants provided OR creator is not in the list, add creator
  if (finalUserContact) {
    if (participantsToAdd.length === 0 || !participantsToAdd.includes(finalUserContact.id)) {
      // Add creator as the first participant (organizer)
      participantsToAdd = [finalUserContact.id, ...participantsToAdd.filter(id => id !== finalUserContact.id)];
    }
  }

  // Add participants
  if (participantsToAdd.length > 0) {
    const participants = participantsToAdd.map((contactId, index) => ({
      event_id: event.id,
      contact_id: contactId,
      status: 'accepted' as const,
      is_organizer: index === 0, // First participant (creator) is organizer
    }));

    console.log('Adding participants to event:', event.id, 'Count:', participants.length, 'Creator included:', finalUserContact ? participantsToAdd[0] === finalUserContact.id : false);

    const { error: participantError } = await supabase
      .from('event_participants')
      .insert(participants);

    if (participantError) {
      console.error('Error adding participants:', participantError);
      // Cleanup: delete the event
      await supabase.from('events').delete().eq('id', event.id);
      return { data: null, error: participantError };
    }

    console.log('Successfully added', participants.length, 'participants');
    
    // Wait a moment for the database to commit the participant inserts
    // This ensures the realtime subscription picks up the changes
    await new Promise(resolve => setTimeout(resolve, 200));
  } else {
    console.warn('[createEvent] No participants to add - user contact not found for family');
  }

  // Add reminders for current user
  if (reminders && reminders.length > 0) {
    const reminderPayload = reminders.map((r) => ({
      event_id: event.id,
      user_id: user.id,
      reminder_type: r.type,
      reminder_value: r.value,
      notification_method: r.method || 'push',
    }));

    // Fire-and-forget to avoid blocking event creation
    supabase
      .from('event_reminders')
      .insert(reminderPayload)
      .then(({ error }) => {
        if (error) {
          console.error('Error adding reminders:', error);
        }
      })
      .catch((err) => console.error('Error adding reminders:', err));
  }

  return { data: event, error: null };
}

// Update an event
export async function updateEvent(
  eventId: string,
  updates: Partial<{
    title: string;
    description: string;
    notes: string;
    location: string;
    structuredLocationTitle: string | null;
    structuredLocationAddress: string | null;
    structuredLocationLatitude: number | null;
    structuredLocationLongitude: number | null;
    url: string | null;
    startTime: Date;
    endTime: Date;
    isAllDay: boolean;
    categoryId: string;
    availability: Event['availability'];
    status: Event['status'];
    travelTimeMinutes: number | null;
    startLocationTitle: string | null;
    startLocationAddress: string | null;
    startLocationLatitude: number | null;
    startLocationLongitude: number | null;
    recurrence: RecurrenceInput;
    dropOffDriverId: string | null;
    collectionDriverId: string | null;
    sameDriver: boolean;
  }>
): Promise<{ data: Event | null; error: any }> {
  const updateData: any = {};
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.structuredLocationTitle !== undefined) updateData.structured_location_title = updates.structuredLocationTitle;
  if (updates.structuredLocationAddress !== undefined) updateData.structured_location_address = updates.structuredLocationAddress;
  if (updates.structuredLocationLatitude !== undefined) updateData.structured_location_latitude = updates.structuredLocationLatitude;
  if (updates.structuredLocationLongitude !== undefined) updateData.structured_location_longitude = updates.structuredLocationLongitude;
  if (updates.url !== undefined) updateData.url = updates.url;
  if (updates.startTime !== undefined) updateData.start_time = updates.startTime.toISOString();
  if (updates.endTime !== undefined) updateData.end_time = updates.endTime.toISOString();
  if (updates.isAllDay !== undefined) updateData.is_all_day = updates.isAllDay;
  if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
  if (updates.availability !== undefined) updateData.availability = updates.availability;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.travelTimeMinutes !== undefined) updateData.travel_time = updates.travelTimeMinutes;
  if (updates.startLocationTitle !== undefined) updateData.start_location_title = updates.startLocationTitle;
  if (updates.startLocationAddress !== undefined) updateData.start_location_address = updates.startLocationAddress;
  if (updates.startLocationLatitude !== undefined) updateData.start_location_latitude = updates.startLocationLatitude;
  if (updates.startLocationLongitude !== undefined) updateData.start_location_longitude = updates.startLocationLongitude;
  if (updates.recurrence !== undefined) {
    const r = updates.recurrence || {};
    const normalizedRecurrence = {
      ...r,
      isRecurring: r.isRecurring ?? false,
      frequency: r.frequency || (r.isRecurring ? 'daily' : null),
      interval: r.interval ?? (r.isRecurring || r.frequency ? 1 : null),
    };

    updateData.is_recurring = normalizedRecurrence.isRecurring;
    updateData.recurrence_rule = normalizedRecurrence.rule || null;
    updateData.recurrence_frequency = normalizedRecurrence.frequency || null;
    updateData.recurrence_interval = normalizedRecurrence.interval;
    updateData.recurrence_days_of_week =
      normalizedRecurrence.daysOfWeek && normalizedRecurrence.daysOfWeek.length
        ? normalizedRecurrence.daysOfWeek
        : null;
    updateData.recurrence_days_of_month =
      normalizedRecurrence.daysOfMonth && normalizedRecurrence.daysOfMonth.length
        ? normalizedRecurrence.daysOfMonth
        : null;
    updateData.recurrence_months_of_year =
      normalizedRecurrence.monthsOfYear && normalizedRecurrence.monthsOfYear.length
        ? normalizedRecurrence.monthsOfYear
        : null;
    updateData.recurrence_weeks_of_year =
      normalizedRecurrence.weeksOfYear && normalizedRecurrence.weeksOfYear.length
        ? normalizedRecurrence.weeksOfYear
        : null;
    updateData.recurrence_days_of_year =
      normalizedRecurrence.daysOfYear && normalizedRecurrence.daysOfYear.length
        ? normalizedRecurrence.daysOfYear
        : null;
    updateData.recurrence_set_positions =
      normalizedRecurrence.setPositions && normalizedRecurrence.setPositions.length
        ? normalizedRecurrence.setPositions
        : null;
    updateData.recurrence_count = normalizedRecurrence.count || null;
    updateData.recurrence_end_date = normalizedRecurrence.endDate
      ? normalizedRecurrence.endDate.toISOString()
      : null;
    updateData.recurrence_week_start = normalizedRecurrence.weekStart || null;
  }
  if (updates.dropOffDriverId !== undefined) updateData.drop_off_driver_id = updates.dropOffDriverId;
  if (updates.collectionDriverId !== undefined) updateData.collection_driver_id = updates.collectionDriverId;
  if (updates.sameDriver !== undefined) updateData.same_driver = updates.sameDriver;

  const { data, error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId)
    .select()
    .single();

  return { data, error };
}

// Delete an event
export async function deleteEvent(eventId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  return { error };
}

// Update event participants
export async function updateEventParticipants(
  eventId: string,
  contactIds: string[]
): Promise<{ error: any }> {
  // Remove all existing participants
  const { error: deleteError } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId);

  if (deleteError) {
    return { error: deleteError };
  }

  // Add new participants
  if (contactIds.length > 0) {
    const participants = contactIds.map((contactId, index) => ({
      event_id: eventId,
      contact_id: contactId,
      status: 'accepted' as const,
      is_organizer: index === 0,
    }));

    const { error: insertError } = await supabase
      .from('event_participants')
      .insert(participants);

    return { error: insertError };
  }

  return { error: null };
}

// Get reminders for current user for an event
export async function getEventRemindersForUser(
  eventId: string
): Promise<{ data: EventReminder[] | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('event_reminders')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', user.id);

  return { data: data as EventReminder[] | null, error };
}

// Replace reminders for current user on an event
export async function upsertEventReminders(
  eventId: string,
  reminders: ReminderInput[]
): Promise<{ error: any }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error('Not authenticated') };
  }

  // Remove existing reminders for this user/event
  const { error: deleteError } = await supabase
    .from('event_reminders')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id);

  if (deleteError) {
    return { error: deleteError };
  }

  if (!reminders || reminders.length === 0) {
    return { error: null };
  }

  const payload = reminders.map((r) => ({
    event_id: eventId,
    user_id: user.id,
    reminder_type: r.type,
    reminder_value: r.value,
    notification_method: r.method || 'push',
  }));

  const { error: insertError } = await supabase
    .from('event_reminders')
    .insert(payload);

  return { error: insertError };
}

// Get event categories for a family
export async function getEventCategories(familyId: string): Promise<{
  data: EventCategory[] | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('event_categories')
    .select('*')
    .eq('family_id', familyId)
    .order('name');

  return { data, error };
}

// Helper: Convert Supabase event to FamilyEvent format for UI
// This returns one FamilyEvent per participant, so events with multiple participants
// appear under each person's section in the UI
export function mapEventToFamilyEvents(
  event: EventWithDetails,
  familyMembers: Contact[],
  familyName?: string | null,
  familyColor?: string
): FamilyEvent[] {
  const results: FamilyEvent[] = [];
  const baseFamilyColor = familyColor || FAMILY_EVENT_COLOR;
  
  // Get participant colors for determining event color
  const participantColors = event.participants?.map(
    (p) => p.contact?.color
  ) || [];

  const validColors = participantColors.filter((c): c is string => c !== null);

  const allFamilyCount = familyMembers?.length || 0;
  const participantCount = event.participants?.length || 0;
  const isAllFamilyEvent = allFamilyCount > 0 && participantCount === allFamilyCount;
  
  // Determine the base event color (used for events with no participants)
  const color = isAllFamilyEvent
    ? normalizeColorForDisplay(baseFamilyColor)
    : normalizeColorForDisplay(
        getEventColor(
          validColors,
          event.category?.color,
          baseFamilyColor
        )
      );

  // If there are participants, create a FamilyEvent for each one
  if (event.participants && event.participants.length > 0) {
    for (const participant of event.participants) {
      const contact = participant.contact;
      if (!contact) continue;
      
      // Format name - only show last name if different from family name
      const personName = formatDisplayName(contact.first_name, contact.last_name, familyName);
      // Use family color if all members are on the event; otherwise use each participant's own color
      const participantColor = isAllFamilyEvent
        ? normalizeColorForDisplay(baseFamilyColor)
        : normalizeColorForDisplay(contact.color || color);
      
      results.push({
        id: `${event.id}-${contact.id}`, // Unique ID per event-participant combo (id already unique per occurrence)
        title: event.title,
        person: personName,
        startTime: new Date(event.start_time),
        endTime: new Date(event.end_time),
        location: event.location || undefined,
        color: participantColor,
        isRecurring: event.is_recurring,
        originalEventId: event.original_event_id || event.id, // Keep reference to original event for navigation
      });
    }
  } else {
    // No participants - show as "Family" event
    results.push({
      id: event.id,
      title: event.title,
      person: 'Family',
      startTime: new Date(event.start_time),
      endTime: new Date(event.end_time),
      location: event.location || undefined,
      color,
      isRecurring: event.is_recurring,
      originalEventId: event.original_event_id || event.id,
    });
  }

  return results;
}

// Helper: Map multiple events - expands events with multiple participants
export function mapEventsToFamilyEvents(
  events: EventWithDetails[],
  familyMembers: Contact[],
  familyName?: string | null,
  familyColor?: string
): FamilyEvent[] {
  const allFamilyEvents: FamilyEvent[] = [];
  
  for (const event of events) {
    const familyEvents = mapEventToFamilyEvents(event, familyMembers, familyName, familyColor);
    allFamilyEvents.push(...familyEvents);
  }
  
  return allFamilyEvents;
}

// Expand recurring events within a date range (client-side)
function expandEventsForRange(
  events: EventWithDetails[],
  rangeStart: Date,
  rangeEnd: Date
): EventWithDetails[] {
  const expanded: EventWithDetails[] = [];
  for (const event of events) {
    if (!event.is_recurring || !event.recurrence_frequency) {
      expanded.push(event);
      continue;
    }
    const occurrences = expandRecurringEvent(event, rangeStart, rangeEnd);
    expanded.push(...occurrences);
  }
  // Sort by start time
  expanded.sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  return expanded;
}

function expandRecurringEvent(
  event: EventWithDetails,
  rangeStart: Date,
  rangeEnd: Date,
  maxOccurrences: number = 500
): EventWithDetails[] {
  const occurrences: EventWithDetails[] = [];

  const freq = event.recurrence_frequency;
  const interval = event.recurrence_interval || 1;
  const daysOfWeek = event.recurrence_days_of_week || [];
  const count = event.recurrence_count || undefined;
  const until = event.recurrence_end_date ? new Date(event.recurrence_end_date) : undefined;

  const eventStart = new Date(event.start_time);
  const eventEnd = new Date(event.end_time);
  const durationMs = eventEnd.getTime() - eventStart.getTime();

  // If recurrence frequency unsupported, return single
  if (!freq) {
    return [event];
  }

  let totalOccurrencesFound = 0;

  const addOccurrence = (start: Date) => {
    if (occurrences.length >= maxOccurrences) return;
    const end = new Date(start.getTime() + durationMs);
    occurrences.push({
      ...event,
      id: `${event.id}::${start.toISOString()}`,
      original_event_id: event.original_event_id || event.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      is_recurring: true,
    });
  };

  let current = new Date(eventStart);

  if (freq === 'daily') {
    // Optimization: skip ahead to just before rangeStart
    if (current.getTime() + durationMs < rangeStart.getTime()) {
      const msDiff = rangeStart.getTime() - current.getTime();
      const daysDiff = Math.floor(msDiff / (24 * 3600 * 1000));
      const intervalsToSkip = Math.floor(daysDiff / interval);
      if (intervalsToSkip > 0) {
        current.setDate(current.getDate() + intervalsToSkip * interval);
        totalOccurrencesFound += intervalsToSkip;
      }
    }

    while (current < rangeEnd && (!until || current <= until) && occurrences.length < maxOccurrences) {
      if (count && totalOccurrencesFound >= count) break;
      
      if (current.getTime() + durationMs >= rangeStart.getTime()) {
        addOccurrence(new Date(current));
      }
      
      totalOccurrencesFound++;
      current.setDate(current.getDate() + interval);
    }
  } else if (freq === 'weekly') {
    const targetDays = (daysOfWeek.length ? daysOfWeek : [dayToCode(eventStart.getDay())]).map((d) => d.toUpperCase());
    const weekStartInitial = startOfWeek(eventStart);

    // Optimization: skip ahead to just before rangeStart
    if (current.getTime() + durationMs < rangeStart.getTime()) {
      const msDiff = rangeStart.getTime() - current.getTime();
      const weeksDiff = Math.floor(msDiff / (7 * 24 * 3600 * 1000));
      const intervalsToSkip = Math.floor(weeksDiff / interval);
      if (intervalsToSkip > 0) {
        current.setDate(current.getDate() + intervalsToSkip * interval * 7);
        // This is a rough estimate for totalOccurrencesFound, but count check happens in loop
        // To be accurate with count we'd need more logic, but for weekly skipping it's okay
      }
    }

    while (current < rangeEnd && (!until || current <= until) && occurrences.length < maxOccurrences) {
      if (count && totalOccurrencesFound >= count) break;

      const weeksFromStart = Math.floor((startOfWeek(current).getTime() - weekStartInitial.getTime()) / (7 * 24 * 3600 * 1000));
      
      if (weeksFromStart % interval === 0) {
        const code = dayToCode(current.getDay());
        if (targetDays.includes(code)) {
          if (current.getTime() + durationMs >= rangeStart.getTime()) {
            addOccurrence(new Date(current));
          }
          totalOccurrencesFound++;
        }
      }
      
      current.setDate(current.getDate() + 1);
    }
  } else if (freq === 'monthly') {
    while (current < rangeEnd && (!until || current <= until) && occurrences.length < maxOccurrences) {
      if (count && totalOccurrencesFound >= count) break;
      if (current.getTime() + durationMs >= rangeStart.getTime()) {
        addOccurrence(new Date(current));
      }
      totalOccurrencesFound++;
      current.setMonth(current.getMonth() + interval);
    }
  } else if (freq === 'yearly') {
    while (current < rangeEnd && (!until || current <= until) && occurrences.length < maxOccurrences) {
      if (count && totalOccurrencesFound >= count) break;
      if (current.getTime() + durationMs >= rangeStart.getTime()) {
        addOccurrence(new Date(current));
      }
      totalOccurrencesFound++;
      current.setFullYear(current.getFullYear() + interval);
    }
  } else {
    // Fallback: just include the original instance if it overlaps with range
    if (eventStart.getTime() + durationMs >= rangeStart.getTime() && eventStart < rangeEnd) {
      addOccurrence(eventStart);
    }
  }

  return occurrences;
}

function dayToCode(day: number): string {
  // JS: 0 Sunday ... 6 Saturday
  return ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][day] || 'MO';
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0-6
  const diff = day; // assuming week starts Sunday to align with JS getDay for simplicity
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Personal Calendar Integration
import { 
  getPersonalCalendarEventsForUser,
  PersonalCalendarEvent 
} from './personalCalendarService';

/**
 * Convert PersonalCalendarEvent to FamilyEvent format
 */
function convertPersonalCalendarEventToFamilyEvent(
  event: PersonalCalendarEvent,
  personName: string,
  index: number = 0
): FamilyEvent {
  return {
    id: `personal-${event.calendarId}-${event.id}-${event.startDate.getTime()}-${index}`,
    person: personName,
    title: event.title,
    startTime: event.startDate,
    endTime: event.endDate,
    location: event.location,
    color: event.calendarColor,
    gradientColors: [event.calendarColor],
    isRecurring: false,
    originalEventId: event.id,
  };
}

/**
 * Get events for date range including personal calendar events
 */
export async function getEventsForDateRangeWithPersonalCalendars(
  familyId: string,
  startDate: Date,
  endDate: Date,
  userId?: string,
  includePersonalCalendars: boolean = true,
  includeOnlyFamilyView: boolean = false
): Promise<{ data: EventWithDetails[] | null; error: any; personalCalendarEvents: FamilyEvent[] }> {
  // Get regular events
  const { data: regularEvents, error } = await getEventsForDateRange(familyId, startDate, endDate);
  
  let personalCalendarEvents: FamilyEvent[] = [];
  
  // Get personal calendar events if requested
  if (includePersonalCalendars && userId) {
    const { data: personalEvents, error: personalError } = await getPersonalCalendarEventsForUser(
      userId,
      familyId,
      startDate,
      endDate,
      includeOnlyFamilyView
    );
    
    if (!personalError && personalEvents) {
      // Get user's contact to get their display name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .eq('family_id', familyId)
          .limit(1)
          .single();
        
        if (contacts) {
          const personName = formatDisplayName(contacts.first_name, contacts.last_name);
          personalCalendarEvents = personalEvents.map((event, index) =>
            convertPersonalCalendarEventToFamilyEvent(event, personName, index)
          );
        }
      }
    }
  }
  
  return { 
    data: regularEvents, 
    error,
    personalCalendarEvents 
  };
}

/**
 * Get upcoming events including personal calendar events
 */
export async function getUpcomingEventsWithPersonalCalendars(
  familyId: string,
  userId?: string,
  includePersonalCalendars: boolean = true,
  includeOnlyFamilyView: boolean = false,
  limit?: number
): Promise<{ data: EventWithDetails[] | null; error: any; personalCalendarEvents: FamilyEvent[] }> {
  const now = new Date();
  const horizon = new Date();
  horizon.setMonth(horizon.getMonth() + 6);
  
  // Get regular events
  const { data: regularEvents, error } = await getUpcomingEvents(familyId, limit);
  
  let personalCalendarEvents: FamilyEvent[] = [];
  
  // Get personal calendar events if requested
  if (includePersonalCalendars && userId) {
    const { data: personalEvents, error: personalError } = await getPersonalCalendarEventsForUser(
      userId,
      familyId,
      now,
      horizon,
      includeOnlyFamilyView
    );
    
    if (!personalError && personalEvents) {
      // Get user's contact to get their display name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .eq('family_id', familyId)
          .limit(1)
          .single();
        
        if (contacts) {
          const personName = formatDisplayName(contacts.first_name, contacts.last_name);
          personalCalendarEvents = personalEvents
            .filter((event) => event.startDate >= now) // Only future events
            .map((event, index) => convertPersonalCalendarEventToFamilyEvent(event, personName, index))
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
          
          if (limit) {
            personalCalendarEvents = personalCalendarEvents.slice(0, limit);
          }
        }
      }
    }
  }
  
  return { 
    data: regularEvents, 
    error,
    personalCalendarEvents 
  };
}

/**
 * Get today's events including personal calendar events
 */
export async function getTodayEventsWithPersonalCalendars(
  familyId: string,
  userId?: string,
  includePersonalCalendars: boolean = true
): Promise<{ data: EventWithDetails[] | null; error: any; personalCalendarEvents: FamilyEvent[] }> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  return getEventsForDateRangeWithPersonalCalendars(
    familyId,
    startOfDay,
    endOfDay,
    userId,
    includePersonalCalendars,
    false // Include all personal calendars for today view
  );
}
