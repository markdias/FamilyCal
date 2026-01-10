import React, { useEffect, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FamilyEvent, formatTimeRange } from '@/utils/mockEvents';
import { useFamily } from '@/contexts/FamilyContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useEventCache } from '@/contexts/EventCacheContext';
import { EventWithDetails } from '@/services/eventService';
import { FAMILY_EVENT_COLOR, getEventColor, formatDisplayName } from '@/utils/colorUtils';

interface AllEventsViewProps {
  memberName: string;
}

// Convert Supabase event to FamilyEvent format, filtering by member
function mapSupabaseEventToFamilyEvent(
  event: EventWithDetails,
  memberName: string,
  familyName?: string | null,
  familyColor?: string
): FamilyEvent | null {
  // Check if this member is a participant (compare using formatted display name)
  const isParticipant = event.participants?.some(
    (p) => {
      if (!p.contact) return false;
      const displayName = formatDisplayName(p.contact.first_name, p.contact.last_name, familyName);
      return displayName === memberName;
    }
  );

  if (!isParticipant) return null;

  const participantColors = event.participants?.map(p => p.contact?.color).filter(Boolean) as string[] || [];
  const color = getEventColor(participantColors, event.category?.color, familyColor);

  return {
    id: event.id,
    originalEventId: event.original_event_id || event.id,
    person: memberName,
    title: event.title,
    startTime: new Date(event.start_time),
    endTime: new Date(event.end_time),
    location: event.location || undefined,
    color,
    isRecurring: event.is_recurring,
  };
}

export function AllEventsView({ memberName }: AllEventsViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentFamily } = useFamily();
  const { settings } = useAppSettings();
  const eventCache = useEventCache();

  // Ensure upcoming events are fetched
  useEffect(() => {
    if (currentFamily) {
      eventCache.ensureEventsFetched('upcoming', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFamily?.id]);

  // Get upcoming events from cache
  const rawEvents = eventCache.getEvents('upcoming');
  const isLoading = eventCache.isLoading('upcoming');
  const upcomingCacheEntry = eventCache.getCacheEntry('upcoming');
  const hasCacheEntry = !!upcomingCacheEntry;

  // Filter and map events for this member
  const events = useMemo(() => {
    if (!currentFamily || rawEvents.length === 0) {
      return [];
    }

    const familyColor = settings.familyCalendarColor || FAMILY_EVENT_COLOR;
    const memberEvents = rawEvents
      .map(event => mapSupabaseEventToFamilyEvent(event, memberName, currentFamily?.name, familyColor))
      .filter((e): e is FamilyEvent => e !== null)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return memberEvents;
  }, [rawEvents, currentFamily, memberName, settings.familyCalendarColor]);

  const formatEventDate = (date: Date) => {
    const dayAbbr = date.toLocaleDateString('en-GB', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    return { dayAbbr, day, month };
  };

  const groupEventsByDate = () => {
    const grouped: { [key: string]: FamilyEvent[] } = {};
    events.forEach((event) => {
      const dateKey = event.startTime.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  };

  const groupedEvents = groupEventsByDate();
  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const handleEventPress = (eventId: string, originalEventId?: string, occurrenceIso?: string) => {
    // Check if this is a personal calendar event (they can't be opened in detail view)
    // Check eventId first (it has the "personal-" prefix), not originalEventId (which is just the iOS event ID)
    if (eventId && eventId.startsWith('personal-')) {
      // Personal calendar events are read-only from iOS, so we can't show details
      return;
    }

    const actualId = (originalEventId || eventId || '').split('::')[0];

    const params: any = { id: actualId };
    if (occurrenceIso) {
      params.occurrence = occurrenceIso;
    }

    router.push({
      pathname: '/event/[id]',
      params,
    });
  };

  // Only show full-screen loading if we have no cache entry at all
  // Once cache entry exists, show the view and let it update
  if (isLoading && !hasCacheEntry) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}>
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#E5E5E7" />
            <Text style={styles.emptyTitle}>No Upcoming Events</Text>
            <Text style={styles.emptyText}>
              No events scheduled for {memberName}
            </Text>
          </View>
        ) : (
          sortedDates.map((dateKey) => {
            const dateEvents = groupedEvents[dateKey];
            const firstEvent = dateEvents[0];
            const { dayAbbr, day, month } = formatEventDate(firstEvent.startTime);

            return (
              <View key={dateKey} style={styles.dateSection}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dayAbbr}>{dayAbbr}</Text>
                  <Text style={styles.dayNumber}>{day}</Text>
                  <Text style={styles.monthText}>{month}</Text>
                </View>
                <View style={styles.eventsContainer}>
                  {dateEvents.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.eventCard}
                      onPress={() => handleEventPress(event.id, event.originalEventId, event.startTime.toISOString())}
                      activeOpacity={0.7}>
                      <View
                        style={[
                          styles.eventColorBar,
                          { backgroundColor: event.color },
                        ]}
                      />
                      <View style={styles.eventContent}>
                        <View style={styles.eventHeader}>
                          <Text style={styles.eventTitle} numberOfLines={1}>
                            {event.title}
                          </Text>
                          {event.isRecurring && (
                            <Ionicons
                              name="refresh"
                              size={14}
                              color="#8E8E93"
                            />
                          )}
                        </View>
                        <Text style={styles.eventTime}>
                          {formatTimeRange(event.startTime, event.endTime)}
                        </Text>
                        {event.location && (
                          <View style={styles.locationRow}>
                            <Ionicons
                              name="location-outline"
                              size={12}
                              color="#8E8E93"
                            />
                            <Text style={styles.locationText} numberOfLines={1}>
                              {event.location}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  dayAbbr: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
    marginRight: 8,
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginRight: 4,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
  },
  eventsContainer: {
    gap: 8,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 70,
  },
  eventColorBar: {
    width: 6,
  },
  eventContent: {
    flex: 1,
    padding: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    flex: 1,
    marginRight: 8,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    marginLeft: 4,
    flex: 1,
  },
});
