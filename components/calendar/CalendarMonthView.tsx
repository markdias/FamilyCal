import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarHeader } from './CalendarHeader';
import { DayCell } from './DayCell';
import { DayView } from './DayView';
import { ListView } from './ListView';
import { generateMockEvents, MockEvent } from '@/utils/mockEvents';
import { useFamily } from '@/contexts/FamilyContext';
import { useEventCache } from '@/contexts/EventCacheContext';
import { useAuth } from '@/contexts/AuthContext';
import { EventWithDetails } from '@/services/eventService';
import { getPersonalCalendarEventsForUser, PersonalCalendarEvent } from '@/services/personalCalendarService';
import { Contact } from '@/lib/supabase';
import { FAMILY_EVENT_COLOR, getEventColor, formatDisplayName, blendColors } from '@/utils/colorUtils';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useSelectedDate } from '@/contexts/SelectedDateContext';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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

const screenWidth = Dimensions.get('window').width;
const BUFFER_SIZE = 5; // Number of months to load on each side of center
const INITIAL_FETCH_RANGE = 2; // Only fetch current month + 2 months on each side initially

// Helper function to add months to a date
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// Helper function to get month info
function getMonthInfo(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return {
    year: y,
    month: m,
    monthName: MONTH_NAMES[m - 1],
    date: new Date(y, m - 1, 1),
  };
}

// Convert Supabase events to MockEvent format for calendar display
// Creates ONE MockEvent per event (consolidated for calendar views, with blended colors for multi-participant events)
function mapSupabaseEventsToMockEvents(
  events: EventWithDetails[],
  familyMembers: Contact[],
  familyName?: string | null,
  familyColor?: string
): MockEvent[] {
  const results: MockEvent[] = [];
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
    let personName: string | undefined;
    if (event.participants && event.participants.length > 0) {
      if (event.participants.length === 1) {
        const contact = event.participants[0]?.contact;
        if (contact) {
          personName = formatDisplayName(contact.first_name, contact.last_name, familyName);
        }
      } else if (event.participants.length > 1) {
        // Multiple participants - could show first participant or leave undefined
        const firstContact = event.participants[0]?.contact;
        if (firstContact) {
          personName = formatDisplayName(firstContact.first_name, firstContact.last_name, familyName);
        }
      }
    }
    
    results.push({
      id: event.id, // Single event ID (not per participant)
      originalEventId: event.original_event_id || event.id,
      title: event.title,
      color,
      gradientColors,
      date: new Date(event.start_time),
      startTime: new Date(event.start_time),
      endTime: new Date(event.end_time),
      location: event.location || undefined,
      isRecurring: event.is_recurring,
      person: personName,
    });
  }
  
  return results;
}

// Convert personal calendar events to MockEvent format
function mapPersonalCalendarEventsToMockEvents(
  events: PersonalCalendarEvent[]
): MockEvent[] {
  return events.map((event, index) => ({
    id: `personal-${event.calendarId}-${event.id}-${event.startDate.getTime()}-${index}`,
    originalEventId: event.id,
    title: event.title,
    color: event.calendarColor,
    gradientColors: [event.calendarColor],
    date: event.startDate,
    startTime: event.startDate,
    endTime: event.endDate,
    location: event.location,
    isRecurring: false,
  }));
}

interface MonthData {
  date: Date;
  info: ReturnType<typeof getMonthInfo>;
  events: MockEvent[];
  calendarDays: (Date | null)[];
  eventsByDay: { [key: number]: MockEvent[] };
  isLoading?: boolean;
}

export function CalendarMonthView() {
  const router = useRouter();
  const { currentFamily, familyMembers, contacts } = useFamily();
  const { settings } = useAppSettings();
  const eventCache = useEventCache();
  const { user } = useAuth();
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const [baseDate, setBaseDate] = useState(new Date());
  const scrollViewRef = useRef<ScrollView>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [displayedMonthOffset, setDisplayedMonthOffset] = useState(0);
  const isScrollingRef = useRef(false);
  const [personalCalendarEvents, setPersonalCalendarEvents] = useState<PersonalCalendarEvent[]>([]);
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'daily' | 'list'>('month');

  const handleEventPress = (eventId: string, originalEventId?: string, occurrenceIso?: string) => {
    // Check if this is a personal calendar event (they can't be opened in detail view)
    if (eventId.startsWith('personal-') || (originalEventId && originalEventId.startsWith('personal-'))) {
      // Personal calendar events are read-only from iOS, so we can't show details
      console.log('Personal calendar event clicked - cannot show details');
      return;
    }
    
    const actualId = originalEventId || eventId;
    const canonicalId = actualId.split('::')[0];
    router.push({
      pathname: `/event/${canonicalId}`,
      params: occurrenceIso ? { occurrence: occurrenceIso } : undefined,
    });
  };

  // Fetch personal calendar events for visible date range
  useEffect(() => {
    if (!user || !currentFamily || Platform.OS !== 'ios') {
      setPersonalCalendarEvents([]);
      return;
    }

    // Calculate date range for visible months
    const startMonth = addMonths(baseDate, monthOffset - BUFFER_SIZE);
    const endMonth = addMonths(baseDate, monthOffset + BUFFER_SIZE);
    const startDate = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);
    const endDate = new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0, 23, 59, 59);

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
  }, [user, currentFamily, baseDate, monthOffset]);

  // Fetch events for visible months (trigger cache fetch)
  // Only fetch a limited range to avoid excessive API calls
  useEffect(() => {
    if (!currentFamily) {
      return;
    }
    
    // Only fetch months within the initial fetch range (not all buffer months)
    const fetchRange = Math.min(INITIAL_FETCH_RANGE, BUFFER_SIZE);
    for (let i = -fetchRange; i <= fetchRange; i++) {
      const monthDate = addMonths(baseDate, monthOffset + i);
      const info = getMonthInfo(monthDate);
      const cacheKey = `month:${info.year}-${info.month}`;
      // Trigger fetch if not already cached
      eventCache.ensureEventsFetched(cacheKey, false);
    }

    // Pre-fetch adjacent months for better performance when switching to daily view
    // This ensures daily view has data ready without additional loading
    setTimeout(() => {
      const currentMonthDate = addMonths(baseDate, monthOffset);
      const currentInfo = getMonthInfo(currentMonthDate);

      // Pre-fetch previous and next months
      const prevMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
      const nextMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);

      const prevKey = `month:${prevMonth.getFullYear()}-${prevMonth.getMonth() + 1}`;
      const nextKey = `month:${nextMonth.getFullYear()}-${nextMonth.getMonth() + 1}`;

      eventCache.ensureEventsFetched(prevKey, false);
      eventCache.ensureEventsFetched(nextKey, false);
    }, 1000); // Delay to prioritize current month loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDate, monthOffset, currentFamily?.id]);

  // Generate months array (BUFFER_SIZE on each side of center)
  const monthsData = useMemo(() => {
    const months: MonthData[] = [];
    
    for (let i = -BUFFER_SIZE; i <= BUFFER_SIZE; i++) {
      const monthDate = addMonths(baseDate, monthOffset + i);
      const info = getMonthInfo(monthDate);
      const cacheKey = `month:${info.year}-${info.month}`;
      const rawEvents = eventCache.getEvents(cacheKey);
      const isLoading = eventCache.isLoading(cacheKey);
      
      // Map raw events to MockEvent format
      let events: MockEvent[] = [];
      if (rawEvents.length > 0 && currentFamily) {
        const familyColor = settings.familyCalendarColor || FAMILY_EVENT_COLOR;
        const familyContacts = familyMembers.map(fm => fm.contact).filter((c): c is Contact => c !== undefined);
        events = mapSupabaseEventsToMockEvents(rawEvents, familyContacts, currentFamily?.name, familyColor);
      } else if (!currentFamily && __DEV__) {
        // Only use mock data in development when no family is loaded
        console.warn('[CalendarMonthView] Using mock data for month', info.year, info.month, '- no family loaded');
        events = generateMockEvents(info.year, info.month);
      } else if (!currentFamily) {
        // In production, return empty array if no family
        events = [];
      }
      
      // Add personal calendar events for this month
      const monthStart = new Date(info.year, info.month - 1, 1);
      const monthEnd = new Date(info.year, info.month, 0, 23, 59, 59);
      const monthPersonalEvents = personalCalendarEvents.filter(
        (event) => event.startDate >= monthStart && event.startDate <= monthEnd
      );
      if (monthPersonalEvents.length > 0) {
        const personalMockEvents = mapPersonalCalendarEventsToMockEvents(monthPersonalEvents);
        events = [...events, ...personalMockEvents];
      }
      
      // Calculate calendar days
      const firstDay = new Date(info.year, info.month - 1, 1);
      const lastDay = new Date(info.year, info.month, 0);
      const daysInMonth = lastDay.getDate();
      const startDayOfWeek = (firstDay.getDay() + 6) % 7;
      
      const calendarDays: (Date | null)[] = [];
      for (let j = 0; j < startDayOfWeek; j++) {
        calendarDays.push(null);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(new Date(info.year, info.month - 1, day));
      }
      while (calendarDays.length < 42) {
        calendarDays.push(null);
      }
      
      // Group events by day
      const eventsByDay: { [key: number]: MockEvent[] } = {};
      events.forEach((event) => {
        const day = event.date.getDate();
        if (!eventsByDay[day]) {
          eventsByDay[day] = [];
        }
        eventsByDay[day].push(event);
      });
      
      months.push({ date: monthDate, info, events, calendarDays, eventsByDay, isLoading });
    }
    
    return months;
  }, [baseDate, monthOffset, eventCache, currentFamily, familyMembers, settings.familyCalendarColor]);


  const handleTodayPress = () => {
    const today = new Date();
    setBaseDate(today);
    setMonthOffset(0);
    setDisplayedMonthOffset(0);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: screenWidth * BUFFER_SIZE, animated: true });
    }, 100);
  };

  const handleDailyPress = () => {
    setCalendarViewMode('daily');
  };

  const handleListPress = () => {
    setCalendarViewMode('list');
  };

  const handleMonthPress = () => {
    setCalendarViewMode('month');
  };

  const handleScroll = (event: any) => {
    if (isScrollingRef.current) return;
    
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / screenWidth);
    const newOffset = pageIndex - BUFFER_SIZE;
    
    // Update displayed month
    if (newOffset !== displayedMonthOffset) {
      setDisplayedMonthOffset(newOffset);
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
      const currentDisplayedMonth = addMonths(baseDate, displayedMonthOffset);
      const newBaseDate = addMonths(baseDate, -shiftAmount);
      setBaseDate(newBaseDate);
      setMonthOffset(0);
      const yearDiff = currentDisplayedMonth.getFullYear() - newBaseDate.getFullYear();
      const monthDiff = currentDisplayedMonth.getMonth() - newBaseDate.getMonth();
      const newDisplayedOffset = yearDiff * 12 + monthDiff;
      setDisplayedMonthOffset(newDisplayedOffset);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: screenWidth * BUFFER_SIZE, animated: false });
      }, 0);
    } else if (pageIndex >= monthsData.length - 3) {
      const shiftAmount = BUFFER_SIZE - 2;
      const currentDisplayedMonth = addMonths(baseDate, displayedMonthOffset);
      const newBaseDate = addMonths(baseDate, shiftAmount);
      setBaseDate(newBaseDate);
      setMonthOffset(0);
      const yearDiff = currentDisplayedMonth.getFullYear() - newBaseDate.getFullYear();
      const monthDiff = currentDisplayedMonth.getMonth() - newBaseDate.getMonth();
      const newDisplayedOffset = yearDiff * 12 + monthDiff;
      setDisplayedMonthOffset(newDisplayedOffset);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: screenWidth * BUFFER_SIZE, animated: false });
      }, 0);
    } else {
      if (newOffset !== monthOffset) {
        setMonthOffset(newOffset);
      }
      setDisplayedMonthOffset(newOffset);
    }
  };

  const handleScrollBeginDrag = () => {
    isScrollingRef.current = true;
  };

  // Get displayed month info
  const displayedMonthDate = useMemo(() => {
    return addMonths(baseDate, displayedMonthOffset);
  }, [baseDate, displayedMonthOffset]);

  const displayedMonthInfo = getMonthInfo(displayedMonthDate);

  // Initialize scroll position
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: screenWidth * BUFFER_SIZE, animated: false });
    }, 0);
  }, []);

  const today = new Date();
  const isToday = (date: Date | null) => {
    if (!date) return false;
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date | null, month: number, year: number) => {
    if (!date) return false;
    return date.getMonth() === month - 1 && date.getFullYear() === year;
  };

  const handleDatePress = (date: Date) => {
    // Toggle selection - if clicking the same date, deselect it
    if (selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  const renderMonth = (
    monthData: MonthData,
    key: string
  ) => {
    // Check if we have a cache entry for this month
    const monthCacheEntry = eventCache.getCacheEntry(`month:${monthData.info.year}-${monthData.info.month}`);
    const hasMonthCacheEntry = !!monthCacheEntry;
    
    return (
      <View key={key} style={styles.monthContainer}>
        {/* Only show loading overlay if we have no cache entry at all */}
        {monthData.isLoading && !hasMonthCacheEntry && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={accent} />
          </View>
        )}
        <View style={[styles.grid, { backgroundColor: cardColor }]}>
          {monthData.calendarDays.map((date, index) => (
            <DayCell
              key={index}
              date={date}
              events={date ? monthData.eventsByDay[date.getDate()] || [] : []}
              isToday={isToday(date)}
              isSelected={isSelected(date)}
              isCurrentMonth={isCurrentMonth(date, monthData.info.month, monthData.info.year)}
              onEventPress={handleEventPress}
              onDatePress={handleDatePress}
            />
          ))}
        </View>
      </View>
    );
  };

  // Collect all events for list view
  const allEvents = useMemo(() => {
    const events: MockEvent[] = [];
    monthsData.forEach(monthData => {
      events.push(...monthData.events);
    });
    return events;
  }, [monthsData]);

  if (calendarViewMode === 'list') {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <CalendarHeader
          month={displayedMonthInfo.monthName}
          year={displayedMonthInfo.year}
          onTodayPress={handleTodayPress}
          onMonthPress={handleMonthPress}
          onDailyPress={handleDailyPress}
          onListPress={handleListPress}
          currentView="list"
          backgroundOverride={cardColor}
        />
        <ListView events={allEvents} onEventPress={handleEventPress} />
      </View>
    );
  }

  if (calendarViewMode === 'daily') {
    return (
      <DayView
        onTodayPress={handleTodayPress}
        onMonthPress={handleMonthPress}
        onDailyPress={handleDailyPress}
        onListPress={handleListPress}
        currentView="daily"
      />
    );
  }

  // Default month view
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <CalendarHeader
        month={displayedMonthInfo.monthName}
        year={displayedMonthInfo.year}
        onTodayPress={handleTodayPress}
        onMonthPress={handleMonthPress}
        onDailyPress={handleDailyPress}
        onListPress={handleListPress}
        currentView="month"
        backgroundOverride={cardColor}
      />
      <View style={[styles.weekDaysHeader, { backgroundColor: surfaceColor, borderColor: surfaceColor }]}>
        {DAYS_OF_WEEK.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={[styles.weekDayText, { color: mutedText }]}>{day}</Text>
          </View>
        ))}
      </View>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        style={styles.calendarGrid}
        contentContainerStyle={styles.calendarGridContent}>
        {monthsData.map((monthData, index) =>
          renderMonth(
            monthData,
            `month-${index}-${monthData.info.year}-${monthData.info.month}`
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F7',
    borderBottomWidth: 0,
    borderColor: '#E5E5E7',
  },
  weekDayCell: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flex: 1,
  },
  calendarGridContent: {
    flexDirection: 'row',
  },
  monthContainer: {
    width: screenWidth,
    flex: 1,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'transparent',
    width: '100%',
    flex: 1,
  },
});
