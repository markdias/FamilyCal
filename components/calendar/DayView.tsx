import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { getMonthCacheKey, useEventCache } from '@/contexts/EventCacheContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Contact } from '@/lib/supabase';
import { EventWithDetails, updateEvent } from '@/services/eventService';
import { getPersonalCalendarEventsForUser, PersonalCalendarEvent } from '@/services/personalCalendarService';
import { FAMILY_EVENT_COLOR, formatDisplayName, getEventColor } from '@/utils/colorUtils';
import { FamilyEvent } from '@/utils/mockEvents';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarHeader } from './CalendarHeader';
import { DraggableEvent } from './DraggableEvent';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const screenWidth = Dimensions.get('window').width;
const BUFFER_SIZE = 5; // Number of days to load on each side of center

interface DayViewProps {
  onTodayPress?: () => void;
  onMonthPress?: () => void;
  onDailyPress?: () => void;
  onListPress?: () => void;
  currentView?: 'month' | 'daily' | 'list';
}

// Convert Supabase events to FamilyEvent format for calendar display
// Creates ONE FamilyEvent per event (consolidated for calendar views, with blended colors for multi-participant events)
function mapSupabaseEventsToFamilyEventsForCalendar(
  events: EventWithDetails[],
  familyMembers: Contact[],
  familyName?: string | null,
  familyColor?: string
): FamilyEvent[] {
  const results: FamilyEvent[] = [];
  const baseFamilyColor = familyColor || FAMILY_EVENT_COLOR;

  for (const event of events) {
    // Get participant colors for determining event color
    const participantColors = event.participants?.map(
      (p) => p.contact?.color
    ) || [];
    const validColors = participantColors.filter((c): c is string => c !== null);

    const allFamilyCount = familyMembers?.length || 0;
    const participantCount = event.participants?.length || 0;
    const isAllFamilyEvent = allFamilyCount > 0 && participantCount === allFamilyCount;

    // Determine event color and gradient colors:
    // - If all family members: use family color (single color, no gradient)
    // - If multiple participants (but not all): use gradient with all participant colors
    // - If single participant: use their color (single color, no gradient)
    // - If no participants: use default color
    let color: string;
    let gradientColors: string[] | undefined;

    if (isAllFamilyEvent) {
      color = baseFamilyColor;
      // No gradient for all-family events
    } else if (validColors.length > 1) {
      // Multiple participants - create gradient from all participant colors
      color = validColors[0]; // Fallback for backward compatibility
      gradientColors = validColors;
    } else if (validColors.length === 1) {
      // Single participant - use their color
      color = validColors[0];
    } else {
      // No participants - use default
      color = getEventColor(
        validColors,
        event.category?.color,
        baseFamilyColor
      );
    }

    // Create ONE event per Supabase event (not per participant)
    // For person display, show all participants if multiple, or single participant name
    let personName: string;
    let participantNames: string[] | undefined;

    let participantNameToColor: { [name: string]: string } | undefined;

    if (event.participants && event.participants.length > 0) {
      // Extract all participant names for filtering and map them to their colors
      participantNames = event.participants
        .map(p => {
          if (!p.contact) return null;
          return formatDisplayName(p.contact.first_name, p.contact.last_name, familyName);
        })
        .filter((name): name is string => name !== null);

      // Create mapping of participant name to their color
      participantNameToColor = {};
      event.participants.forEach((p, index) => {
        if (p.contact) {
          const name = formatDisplayName(p.contact.first_name, p.contact.last_name, familyName);
          const participantColor = p.contact.color || validColors[index] || color;
          participantNameToColor![name] = participantColor;
        }
      });

      if (event.participants.length === 1) {
        personName = participantNames[0] || 'Family';
      } else if (event.participants.length > 1) {
        // Multiple participants - show all names joined, or first name as fallback
        personName = participantNames.join(', ') || 'Family';
      } else {
        personName = 'Family';
      }
    } else {
      personName = 'Family';
    }

    results.push({
      id: event.id, // Single event ID (not per participant)
      originalEventId: event.original_event_id || event.id,
      person: personName,
      title: event.title,
      startTime: new Date(event.start_time),
      endTime: new Date(event.end_time),
      location: event.location || undefined,
      color,
      gradientColors,
      participantNames, // Store all participant names for filter extraction
      participantNameToColor, // Map of participant name to their color
      isRecurring: event.is_recurring,
      isAllDay: event.is_all_day,
    });
  }

  return results;
}

// Convert personal calendar events to FamilyEvent format
function mapPersonalCalendarEventsToFamilyEvents(
  events: PersonalCalendarEvent[],
  userDisplayName: string
): FamilyEvent[] {
  return events.map((event, index) => ({
    id: `personal-${event.calendarId}-${event.id}-${event.startDate.getTime()}-${index}`,
    person: userDisplayName,
    title: event.title,
    startTime: event.startDate,
    endTime: event.endDate,
    location: event.location,
    color: event.calendarColor,
    gradientColors: [event.calendarColor],
    isRecurring: false,
    isAllDay: event.allDay,
    originalEventId: event.id,
  }));
}

export function DayView({ onTodayPress, onMonthPress, onDailyPress, onListPress, currentView = 'daily' }: DayViewProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentFamily, familyMembers } = useFamily();
  const { settings } = useAppSettings();
  const eventCache = useEventCache();
  const { user } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const [baseDate, setBaseDate] = useState(new Date());
  const [displayedDayOffset, setDisplayedDayOffset] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);
  const selectedDate = useMemo(() => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + displayedDayOffset);
    return date;
  }, [baseDate, displayedDayOffset]);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [eventPositions, setEventPositions] = useState<{ [eventId: string]: number }>({});
  const [personalCalendarEvents, setPersonalCalendarEvents] = useState<PersonalCalendarEvent[]>([]);

  // Generate days array (BUFFER_SIZE on each side of center)
  // Must be defined before useEffect that uses it
  const daysData = useMemo(() => {
    const days: { date: Date; offset: number }[] = [];
    for (let i = -BUFFER_SIZE; i <= BUFFER_SIZE; i++) {
      const dayDate = new Date(baseDate);
      dayDate.setDate(dayDate.getDate() + i);
      days.push({ date: dayDate, offset: i });
    }
    return days;
  }, [baseDate]);

  const getMonthCacheKeyStandard = (date: Date): string => {
    return getMonthCacheKey(date.getFullYear(), date.getMonth() + 1);
  };

  // Get unique months that need to be fetched for visible days
  const visibleMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    daysData.forEach(dayData => {
      monthsSet.add(getMonthCacheKeyStandard(dayData.date));
    });
    return Array.from(monthsSet);
  }, [daysData]);

  // Fetch personal calendar events for visible date range
  useEffect(() => {
    if (!user || !currentFamily || Platform.OS !== 'ios') {
      setPersonalCalendarEvents([]);
      return;
    }

    // Calculate date range for visible days
    const startDate = new Date(daysData[0].date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(daysData[daysData.length - 1].date);
    endDate.setHours(23, 59, 59, 999);

    getPersonalCalendarEventsForUser(
      user.id,
      currentFamily.id,
      startDate,
      endDate,
      false // Include all personal calendars (not just family view)
    ).then(({ data, error }) => {
      if (!error && data) {
        setPersonalCalendarEvents(data);
      } else {
        setPersonalCalendarEvents([]);
      }
    });
  }, [user, currentFamily, daysData]);

  // Fetch events for visible months (more efficient than per-day fetching)
  useEffect(() => {
    if (!currentFamily?.id) {
      return;
    }

    // Fetch all unique months that are visible - this is much more efficient
    // than fetching individual days (1-2 API calls instead of 11+)
    visibleMonths.forEach(monthKey => {
      console.log(`[DayView] Ensuring events fetched for month: ${monthKey}`);
      eventCache.ensureEventsFetched(monthKey, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMonths, currentFamily?.id]);

  // Get all events for all visible days (regular + personal calendar)
  const allDayEvents = useMemo(() => {
    const familyColor = settings.familyCalendarColor || FAMILY_EVENT_COLOR;
    const familyContacts = familyMembers.map(fm => fm.contact).filter((c): c is Contact => c !== undefined);

    // Collect all regular events from cache for visible months
    // Using month-based caching is more efficient than day-based
    const allRegularEvents: EventWithDetails[] = [];
    const seenEventIds = new Set<string>();

    visibleMonths.forEach(monthKey => {
      const events = eventCache.getEvents(monthKey);
      // Dedupe events (in case same event appears in multiple months)
      events.forEach(event => {
        if (!seenEventIds.has(event.id)) {
          seenEventIds.add(event.id);
          allRegularEvents.push(event);
        }
      });
    });

    // Filter to only events within visible date range
    const visibleStart = new Date(daysData[0].date);
    visibleStart.setHours(0, 0, 0, 0);
    const visibleEnd = new Date(daysData[daysData.length - 1].date);
    visibleEnd.setHours(23, 59, 59, 999);

    const filteredEvents = allRegularEvents.filter(event => {
      const eventStart = new Date(event.start_time);
      return eventStart >= visibleStart && eventStart <= visibleEnd;
    });

    // Debug logging
    const today = new Date();
    console.log(`[DayView] Loaded ${filteredEvents.length} events for visible range (${visibleMonths.join(', ')})`);

    // Map regular events to FamilyEvent format
    let mapped: FamilyEvent[] = [];
    if (currentFamily && filteredEvents.length > 0) {
      mapped = mapSupabaseEventsToFamilyEventsForCalendar(filteredEvents, familyContacts, currentFamily?.name, familyColor);
    }

    // Add all personal calendar events (they're already filtered to visible date range)
    if (personalCalendarEvents.length > 0) {
      // Find the user's display name from family members if they're a family member
      let userDisplayName: string | undefined;
      if (user && familyMembers) {
        const userFamilyMember = familyMembers.find(member => member.contact?.id === user.id);
        if (userFamilyMember?.contact) {
          userDisplayName = formatDisplayName(
            userFamilyMember.contact.first_name,
            userFamilyMember.contact.last_name,
            currentFamily?.name
          );
        }
      }

      // Only proceed if we have a valid display name from family membership
      if (userDisplayName) {
        const personalFamilyEvents = mapPersonalCalendarEventsToFamilyEvents(personalCalendarEvents, userDisplayName);
        mapped = [...mapped, ...personalFamilyEvents];
      }
    }

    return mapped;
  }, [daysData, visibleMonths, personalCalendarEvents, currentFamily, familyMembers, settings.familyCalendarColor, eventCache, user]);

  // Get events for the selected day only (for filters, drag/resize operations)
  const dayEvents = useMemo(() => {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    return allDayEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });
  }, [allDayEvents, selectedDate]);

  const isLoading = useMemo(() => {
    // Check if any visible month is loading
    return visibleMonths.some(monthKey => eventCache.isLoading(monthKey));
  }, [visibleMonths, eventCache]);

  // Filter events based on selected filters
  // For multi-participant events, show event if ANY participant matches the filter
  const filteredEvents = useMemo(() => {
    if (selectedFilters.size === 0) return dayEvents;
    return dayEvents.filter((event) => {
      // Check if any participant name matches the selected filters
      if (event.participantNames && event.participantNames.length > 0) {
        return event.participantNames.some(name => selectedFilters.has(name));
      }
      // Fallback to person field for backward compatibility
      return selectedFilters.has(event.person);
    });
  }, [dayEvents, selectedFilters]);

  // Get unique people for filters
  // For multi-participant events, extract all participant names
  // Aggregate from current day's events
  const people = useMemo(() => {
    const peopleSet = new Set<string>();
    // Extract from current day's events
    dayEvents.forEach((event) => {
      // If event has participantNames, add all of them
      if (event.participantNames && event.participantNames.length > 0) {
        event.participantNames.forEach(name => peopleSet.add(name));
      } else {
        // Fallback to person field
        peopleSet.add(event.person);
      }
    });
    return Array.from(peopleSet).sort();
  }, [dayEvents]);

  // Get person colors for filter pills
  // Use participantNameToColor map if available, otherwise fall back to event color
  // Aggregate from current day's events
  const personColors: { [key: string]: string } = useMemo(() => {
    const colors: { [key: string]: string } = {};
    // Extract from current day's events
    dayEvents.forEach((event) => {
      // If event has participantNameToColor, use that for accurate color mapping
      if (event.participantNameToColor) {
        Object.entries(event.participantNameToColor).forEach(([name, color]) => {
          if (!colors[name]) {
            colors[name] = color;
          }
        });
      } else {
        // Fallback to event color for backward compatibility
        if (!colors[event.person]) {
          colors[event.person] = event.color;
        }
      }
    });
    return colors;
  }, [dayEvents]);

  const handleTodayPress = () => {
    if (onTodayPress) {
      onTodayPress();
    } else {
      const today = new Date();
      setBaseDate(today);
      setDisplayedDayOffset(0);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: screenWidth * BUFFER_SIZE, animated: true });
      }, 100);
    }
  };

  const handleScroll = (event: any) => {
    if (isScrollingRef.current) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / screenWidth);
    const newOffset = pageIndex - BUFFER_SIZE;

    // Update displayed day
    if (newOffset !== displayedDayOffset) {
      setDisplayedDayOffset(newOffset);
    }
  };

  const handleScrollEnd = (event: any) => {
    isScrollingRef.current = false;
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / screenWidth);
    const newOffset = pageIndex - BUFFER_SIZE;

    // If we're near the edges, shift the base date to keep buffer centered
    if (pageIndex <= 2) {
      const shiftAmount = BUFFER_SIZE - 2;
      const currentDisplayedDay = new Date(baseDate);
      currentDisplayedDay.setDate(currentDisplayedDay.getDate() + displayedDayOffset);
      const newBaseDate = new Date(baseDate);
      newBaseDate.setDate(newBaseDate.getDate() - shiftAmount);
      setBaseDate(newBaseDate);
      const daysDiff = Math.floor((currentDisplayedDay.getTime() - newBaseDate.getTime()) / (24 * 3600 * 1000));
      setDisplayedDayOffset(daysDiff);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: screenWidth * BUFFER_SIZE, animated: false });
      }, 0);
    } else if (pageIndex >= (BUFFER_SIZE * 2 + 1) - 3) {
      const shiftAmount = BUFFER_SIZE - 2;
      const currentDisplayedDay = new Date(baseDate);
      currentDisplayedDay.setDate(currentDisplayedDay.getDate() + displayedDayOffset);
      const newBaseDate = new Date(baseDate);
      newBaseDate.setDate(newBaseDate.getDate() + shiftAmount);
      setBaseDate(newBaseDate);
      const daysDiff = Math.floor((currentDisplayedDay.getTime() - newBaseDate.getTime()) / (24 * 3600 * 1000));
      setDisplayedDayOffset(daysDiff);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: screenWidth * BUFFER_SIZE, animated: false });
      }, 0);
    } else {
      setDisplayedDayOffset(newOffset);
    }
  };

  const handleScrollBeginDrag = () => {
    isScrollingRef.current = true;
  };

  // Initialize scroll position
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: screenWidth * BUFFER_SIZE, animated: false });
    }, 0);
  }, []);

  const toggleFilter = (person: string) => {
    const newFilters = new Set(selectedFilters);
    if (newFilters.has(person)) {
      newFilters.delete(person);
    } else {
      newFilters.add(person);
    }
    setSelectedFilters(newFilters);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    return date.toLocaleDateString('en-GB', options);
  };

  const monthName = MONTH_NAMES[selectedDate.getMonth()];
  const year = selectedDate.getFullYear();

  // Calculate event positions for a specific date
  const getEventPosition = (event: FamilyEvent, date: Date) => {
    // Use saved position if available, otherwise calculate from time
    const savedTop = eventPositions[event.id];
    if (savedTop !== undefined) {
      const startHour = event.startTime.getHours();
      const startMinute = event.startTime.getMinutes();
      const endHour = event.endTime.getHours();
      const endMinute = event.endTime.getMinutes();
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      const duration = endMinutes - startMinutes;
      const height = (duration / 60) * 60;
      return { top: savedTop, height };
    }

    const startHour = event.startTime.getHours();
    const startMinute = event.startTime.getMinutes();
    const endHour = event.endTime.getHours();
    const endMinute = event.endTime.getMinutes();

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const duration = endMinutes - startMinutes;

    // Each hour is 60px, so position based on minutes
    const top = (startMinutes / 60) * 60;
    const height = (duration / 60) * 60;

    return { top, height };
  };

  const handleDragEnd = async (eventId: string, newTop: number, newHeight?: number) => {
    // Don't allow editing personal calendar events (they're read-only from iOS)
    if (eventId.startsWith('personal-')) {
      console.log('Cannot edit personal calendar event - read-only');
      return;
    }

    // Convert pixel position back to time (60px = 60 minutes, so 1px = 1 minute)
    const startMinutes = Math.round(newTop);
    const hours = Math.floor(startMinutes / 60);
    const mins = startMinutes % 60;

    // Find the event and update its time
    const eventIndex = dayEvents.findIndex((e) => e.id === eventId);
    if (eventIndex !== -1) {
      const event = dayEvents[eventIndex];
      const newStartTime = new Date(selectedDate);
      newStartTime.setHours(hours, mins, 0, 0);

      // Keep the same duration unless resizing
      let duration: number;
      if (newHeight) {
        const heightMinutes = Math.round(newHeight);
        duration = heightMinutes * 60 * 1000;
      } else {
        duration = event.endTime.getTime() - event.startTime.getTime();
      }
      const newEndTime = new Date(newStartTime.getTime() + duration);

      // Save the position
      setEventPositions((prev) => ({
        ...prev,
        [eventId]: newTop,
      }));

      // Save to Supabase
      const originalId = (dayEvents.find((e) => e.id === eventId)?.originalEventId || eventId).split('::')[0];
      try {
        await updateEvent(originalId, {
          startTime: newStartTime,
          endTime: newEndTime,
        });
        // Refresh cache after successful update
        eventCache.refreshCache(getMonthCacheKeyStandard(selectedDate));
      } catch (err) {
        console.error('Error updating event time:', err);
        // Revert on error - refresh cache
        eventCache.refreshCache(getMonthCacheKeyStandard(selectedDate));
      }
    }
  };

  const handleResizeEnd = async (eventId: string, newTop: number, newHeight: number, eventDate?: Date) => {
    // Don't allow editing personal calendar events (they're read-only from iOS)
    if (eventId.startsWith('personal-')) {
      console.log('Cannot resize personal calendar event - read-only');
      return;
    }

    // Convert positions to times (60px = 60 minutes, so 1px = 1 minute)
    const startMinutes = Math.round(newTop);
    const endMinutes = Math.round(newTop + newHeight);

    const startHours = Math.floor(startMinutes / 60);
    const startMins = startMinutes % 60;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;

    const targetDate = eventDate || selectedDate;
    const monthKey = getMonthCacheKeyStandard(targetDate);
    const rawEvents = eventCache.getEvents(monthKey);

    // Map to FamilyEvent format for processing
    let eventsForDay: FamilyEvent[] = [];
    if (rawEvents.length > 0 && currentFamily) {
      const familyColor = settings.familyCalendarColor || FAMILY_EVENT_COLOR;
      const familyContacts = familyMembers.map(fm => fm.contact).filter((c): c is Contact => c !== undefined);
      eventsForDay = mapSupabaseEventsToFamilyEventsForCalendar(rawEvents, familyContacts, currentFamily?.name, familyColor);
    }

    const newStartTime = new Date(targetDate);
    newStartTime.setHours(startHours, startMins, 0, 0);

    const newEndTime = new Date(targetDate);
    newEndTime.setHours(endHours, endMins, 0, 0);

    // Save the position
    setEventPositions((prev) => ({
      ...prev,
      [eventId]: newTop,
    }));

    // Save to Supabase
    const event = eventsForDay.find((e) => e.id === eventId);
    const originalId = (event?.originalEventId || eventId).split('::')[0];
    try {
      await updateEvent(originalId, {
        startTime: newStartTime,
        endTime: newEndTime,
      });
      // Invalidate cache to refresh
      eventCache.invalidateCache([monthKey]);
    } catch (err) {
      console.error('Error updating event time:', err);
      // Revert on error - refresh cache for this month
      eventCache.refreshCache(monthKey);
    }
  };

  const handleEventPress = (eventId: string, originalEventId?: string, occurrenceIso?: string) => {
    // Check if this is a personal calendar event (they can't be opened in detail view)
    // Check eventId first (it has the "personal-" prefix), not originalEventId (which is just the iOS event ID)
    if (eventId && eventId.startsWith('personal-')) {
      // Personal calendar events are read-only from iOS, so we can't show details
      console.log('Personal calendar event clicked - cannot show details');
      return;
    }

    const actualId = (originalEventId || eventId || '').split('::')[0];
    router.push({
      pathname: `/event/${actualId}` as any,
      params: occurrenceIso ? { occurrence: occurrenceIso } : undefined,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <CalendarHeader
        month={monthName}
        year={year}
        onTodayPress={handleTodayPress}
        onMonthPress={onMonthPress}
        onDailyPress={onDailyPress}
        onListPress={onListPress}
        currentView={currentView}
        backgroundOverride={cardColor}
      />

      {/* Date Display */}
      <View style={styles.dateContainer}>
        <Text style={[styles.dateText, { color: textColor }]}>{formatDate(selectedDate)}</Text>
      </View>

      {/* Name Filters */}
      {people.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}>
          {people.map((person) => {
            const isSelected = selectedFilters.size === 0 || selectedFilters.has(person);
            const personColor = personColors[person] || surfaceColor;
            return (
              <TouchableOpacity
                key={person}
                style={[
                  styles.filterPill,
                  !isSelected && styles.filterPillInactive,
                  isSelected && { borderLeftWidth: 3, borderLeftColor: personColor },
                ]}
                onPress={() => toggleFilter(person)}>
                <Text
                  style={[
                    styles.filterText,
                    !isSelected && styles.filterTextInactive,
                  ]}>
                  {person}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Horizontal ScrollView for days */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        style={styles.daysScrollView}
        contentContainerStyle={styles.daysScrollContent}>
        {daysData.map((dayData, index) => {
          const dayDate = dayData.date;
          const isTodayDay = (() => {
            const now = new Date();
            return (
              dayDate.getDate() === now.getDate() &&
              dayDate.getMonth() === now.getMonth() &&
              dayDate.getFullYear() === now.getFullYear()
            );
          })();

          // Declare variables that need to be accessed in multiple scopes
          let allDayEventsForDay: FamilyEvent[] = [];

          return (
            <ScrollView
              key={`day-${index}-${dayDate.getTime()}`}
              style={[styles.timelineContainer, { backgroundColor: cardColor, width: screenWidth }]}
              contentContainerStyle={[
                styles.timelineContent,
                { paddingBottom: insets.bottom + 20 },
              ]}
              showsVerticalScrollIndicator={false}>
              <View style={styles.timeline}>
                {/* Time markers */}
                <View style={styles.timeMarkers}>
                  {HOURS.map((hour) => (
                    <View key={hour} style={styles.timeMarker}>
                      <Text style={[styles.timeText, { color: mutedText }]}>
                        {hour === 0
                          ? '12 am'
                          : hour < 12
                            ? `${hour} am`
                            : hour === 12
                              ? '12 pm'
                              : `${hour - 12} pm`}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Events area */}
                <View style={styles.eventsArea}>
                  {/* Current time indicator */}
                  {isTodayDay && (() => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const currentTop = (currentHour * 60 + currentMinute) / 60 * 60;
                    return (
                      <View style={[styles.currentTimeLine, { top: currentTop }]}>
                        <View style={styles.currentTimeDot} />
                        <View style={styles.currentTimeLineBar} />
                      </View>
                    );
                  })()}
                  {(() => {
                    const monthKey = getMonthCacheKeyStandard(dayDate);
                    const isLoadingMonth = eventCache.isLoading(monthKey);
                    const monthCacheEntry = eventCache.getCacheEntry(monthKey);
                    const hasMonthCacheEntry = !!monthCacheEntry;

                    // Get events for this specific day from the merged allDayEvents
                    const dayStart = new Date(dayDate);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(dayDate);
                    dayEnd.setHours(23, 59, 59, 999);

                    const eventsForDay = allDayEvents.filter(event => {
                      const eventDate = new Date(event.startTime);
                      return eventDate >= dayStart && eventDate <= dayEnd;
                    });

                    // Filter events based on selected filters
                    const filteredEventsForDay = selectedFilters.size === 0
                      ? eventsForDay
                      : eventsForDay.filter((event) => {
                        if (event.participantNames && event.participantNames.length > 0) {
                          return event.participantNames.some(name => selectedFilters.has(name));
                        }
                        return selectedFilters.has(event.person);
                      });

                    // Separate all-day events from regular events
                    allDayEventsForDay = filteredEventsForDay.filter(event => event.isAllDay);
                    const regularEventsForDay = filteredEventsForDay.filter(event => !event.isAllDay);

                    // Only show loading indicator if we have no cache entry at all
                    // Once cache entry exists, show the events area (even if empty)
                    if (isLoadingMonth && !hasMonthCacheEntry) {
                      return (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color={accent} />
                        </View>
                      );
                    }

                    return (
                      <>
                        {/* All-day events at the top */}
                        {allDayEventsForDay.length > 0 && (
                          <View style={styles.allDayEventsContainer}>
                            {allDayEventsForDay.map((event, index) => (
                              <TouchableOpacity
                                key={event.id}
                                style={[
                                  styles.allDayEventBar,
                                  { backgroundColor: event.color }
                                ]}
                                onPress={() => handleEventPress(event.id, event.originalEventId)}
                              >
                                <Text style={styles.allDayEventText} numberOfLines={1}>
                                  {event.title}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {/* Regular events on timeline */}
                        {regularEventsForDay.length > 0 && regularEventsForDay.map((event) => {
                          const { top, height } = getEventPosition(event, dayDate);
                          return (
                            <DraggableEvent
                              key={event.id}
                              event={event}
                              initialTop={top}
                              height={Math.max(height, 40)}
                              selectedDate={dayDate}
                              onDragEnd={handleDragEnd}
                              onResizeEnd={handleResizeEnd}
                              onPress={handleEventPress}
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </View>
              </View>
            </ScrollView>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  daysScrollView: {
    flex: 1,
  },
  daysScrollContent: {
    flexDirection: 'row',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  todayButton: {
    backgroundColor: '#E5E5E7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  todayButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  dateContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  filtersContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: '#ffffff',
    boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
  },
  filterPillInactive: {
    opacity: 0.5,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000d9',
  },
  filterTextInactive: {
    color: '#8E8E93',
  },
  timelineContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  timelineContent: {
    paddingBottom: 24 * 60, // Space for all hours
  },
  timeline: {
    flexDirection: 'row',
    flex: 1,
  },
  timeMarkers: {
    width: 60,
    paddingRight: 8,
  },
  timeMarker: {
    height: 60,
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E93',
  },
  eventsArea: {
    flex: 1,
    position: 'relative',
    minHeight: 24 * 60, // 24 hours * 60px per hour
  },
  eventBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  eventPerson: {
    fontSize: 11,
    fontWeight: '400',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  currentTimeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginLeft: -6,
  },
  currentTimeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#FF3B30',
    marginRight: 4,
  },
  loadingContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  allDayEventsContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  allDayEventBar: {
    height: 28,
    marginBottom: 4,
    borderRadius: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    boxShadow: '0px 2px 3px rgba(0,0,0,0.15)',
  },
  allDayEventText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
