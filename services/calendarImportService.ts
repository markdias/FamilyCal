import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

// Types for iOS calendar data
export interface IOSCalendar {
  id: string;
  title: string;
  color: string;
  source: {
    name: string;
    type: string;
  };
  allowsModifications: boolean;
  type: string;
}

export interface IOSEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  notes?: string;
  recurrenceRule?: IOSRecurrenceRule;
}

export interface IOSRecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  endDate?: Date;
  occurrence?: number;
  daysOfTheWeek?: { dayOfTheWeek: number; weekNumber?: number }[];
  daysOfTheMonth?: number[];
  monthsOfTheYear?: number[];
  weeksOfTheYear?: number[];
  daysOfTheYear?: number[];
  setPositions?: number[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

// Day of week mapping: iOS uses 1-7 (Sunday-Saturday), app uses 'SU'-'SA'
const DAY_OF_WEEK_MAP: { [key: number]: string } = {
  1: 'SU',
  2: 'MO',
  3: 'TU',
  4: 'WE',
  5: 'TH',
  6: 'FR',
  7: 'SA',
};

/**
 * Check if the platform supports calendar access
 */
export function isCalendarSupported(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Request calendar permissions
 */
export async function requestCalendarPermissions(): Promise<{
  granted: boolean;
  status: string;
}> {
  if (!isCalendarSupported()) {
    return { granted: false, status: 'unsupported' };
  }

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return {
      granted: status === 'granted',
      status,
    };
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return { granted: false, status: 'error' };
  }
}

/**
 * Check current calendar permission status
 */
export async function getCalendarPermissionStatus(): Promise<{
  granted: boolean;
  status: string;
}> {
  if (!isCalendarSupported()) {
    return { granted: false, status: 'unsupported' };
  }

  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return {
      granted: status === 'granted',
      status,
    };
  } catch (error) {
    console.error('Error getting calendar permissions:', error);
    return { granted: false, status: 'error' };
  }
}

/**
 * Get all available calendars from the device
 */
export async function getDeviceCalendars(): Promise<{
  data: IOSCalendar[] | null;
  error: string | null;
}> {
  if (!isCalendarSupported()) {
    return { data: null, error: 'Calendar access is only supported on iOS' };
  }

  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    
    const mappedCalendars: IOSCalendar[] = calendars.map((cal) => ({
      id: cal.id,
      title: cal.title,
      color: cal.color || '#007AFF',
      source: {
        name: cal.source?.name || 'Unknown',
        type: cal.source?.type || 'unknown',
      },
      allowsModifications: cal.allowsModifications ?? true,
      type: cal.type || 'local',
    }));

    return { data: mappedCalendars, error: null };
  } catch (error: any) {
    console.error('Error fetching calendars:', error);
    return { data: null, error: error.message || 'Failed to fetch calendars' };
  }
}

/**
 * Get events from a specific calendar within a date range
 */
export async function getCalendarEvents(
  calendarId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  data: IOSEvent[] | null;
  error: string | null;
}> {
  if (!isCalendarSupported()) {
    return { data: null, error: 'Calendar access is only supported on iOS' };
  }

  try {
    const events = await Calendar.getEventsAsync(
      [calendarId],
      startDate,
      endDate
    );

    const mappedEvents: IOSEvent[] = events.map((event) => ({
      id: event.id,
      title: event.title || 'Untitled Event',
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      allDay: event.allDay ?? false,
      location: event.location || undefined,
      notes: event.notes || undefined,
      recurrenceRule: mapRecurrenceRule(event.recurrenceRule),
    }));

    return { data: mappedEvents, error: null };
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return { data: null, error: error.message || 'Failed to fetch events' };
  }
}

/**
 * Map iOS recurrence rule to our format
 */
function mapRecurrenceRule(rule: any): IOSRecurrenceRule | undefined {
  if (!rule) return undefined;

  const mapped: IOSRecurrenceRule = {
    frequency: rule.frequency?.toLowerCase() as IOSRecurrenceRule['frequency'],
  };

  if (rule.interval) mapped.interval = rule.interval;
  if (rule.endDate) mapped.endDate = new Date(rule.endDate);
  if (rule.occurrence) mapped.occurrence = rule.occurrence;
  if (rule.daysOfTheWeek) mapped.daysOfTheWeek = rule.daysOfTheWeek;
  if (rule.daysOfTheMonth) mapped.daysOfTheMonth = rule.daysOfTheMonth;
  if (rule.monthsOfTheYear) mapped.monthsOfTheYear = rule.monthsOfTheYear;
  if (rule.weeksOfTheYear) mapped.weeksOfTheYear = rule.weeksOfTheYear;
  if (rule.daysOfTheYear) mapped.daysOfTheYear = rule.daysOfTheYear;
  if (rule.setPositions) mapped.setPositions = rule.setPositions;

  return mapped;
}

/**
 * Convert iOS days of week to app format
 */
function convertDaysOfWeek(daysOfTheWeek?: { dayOfTheWeek: number; weekNumber?: number }[]): string[] | undefined {
  if (!daysOfTheWeek || daysOfTheWeek.length === 0) return undefined;
  
  return daysOfTheWeek
    .map((d) => DAY_OF_WEEK_MAP[d.dayOfTheWeek])
    .filter((d): d is string => d !== undefined);
}

/**
 * Import events from iOS calendar to the app
 */
export async function importCalendarEvents(
  calendarId: string,
  startDate: Date,
  endDate: Date,
  familyId: string,
  participantIds: string[], // Contact IDs to assign to events
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    failed: 0,
    errors: [],
  };

  // Fetch events from iOS calendar
  const { data: events, error } = await getCalendarEvents(calendarId, startDate, endDate);

  if (error || !events) {
    result.errors.push(error || 'Failed to fetch events');
    return result;
  }

  const total = events.length;

  // Dynamically import createEvent to avoid circular dependency
  const { createEvent } = await import('./eventService');

  for (let i = 0; i < events.length; i++) {
    const iosEvent = events[i];
    
    try {
      // Map iOS event to app event format
      const eventData = mapIOSEventToAppEvent(iosEvent);
      
      // Create event in Supabase
      const { error: createError } = await createEvent(
        familyId,
        eventData,
        participantIds.length > 0 ? participantIds : undefined
      );

      if (createError) {
        result.failed++;
        result.errors.push(`Failed to import "${iosEvent.title}": ${createError.message || 'Unknown error'}`);
      } else {
        result.imported++;
      }
    } catch (err: any) {
      result.failed++;
      result.errors.push(`Error importing "${iosEvent.title}": ${err.message || 'Unknown error'}`);
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  result.success = result.failed === 0;
  return result;
}

/**
 * Map iOS event to app event format
 */
function mapIOSEventToAppEvent(iosEvent: IOSEvent): {
  title: string;
  notes?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurrenceFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceInterval?: number;
  recurrenceDaysOfWeek?: string[];
  recurrenceEndDate?: Date;
} {
  const eventData: ReturnType<typeof mapIOSEventToAppEvent> = {
    title: iosEvent.title,
    startTime: iosEvent.startDate,
    endTime: iosEvent.endDate,
    isAllDay: iosEvent.allDay,
  };

  if (iosEvent.notes) eventData.notes = iosEvent.notes;
  if (iosEvent.location) eventData.location = iosEvent.location;

  // Map recurrence rule
  if (iosEvent.recurrenceRule) {
    const rule = iosEvent.recurrenceRule;
    eventData.isRecurring = true;
    
    if (rule.frequency) {
      eventData.recurrenceFrequency = rule.frequency;
    }
    
    if (rule.interval) {
      eventData.recurrenceInterval = rule.interval;
    }
    
    if (rule.daysOfTheWeek) {
      eventData.recurrenceDaysOfWeek = convertDaysOfWeek(rule.daysOfTheWeek);
    }
    
    if (rule.endDate) {
      eventData.recurrenceEndDate = rule.endDate;
    }
  }

  return eventData;
}
