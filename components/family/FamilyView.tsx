import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEventCache } from '@/contexts/EventCacheContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { mapEventsToFamilyEvents } from '@/services/eventService';
import { FAMILY_EVENT_COLOR } from '@/utils/colorUtils';
import { FamilyEvent, generateCurrentEvents, generateUpcomingEvents } from '@/utils/mockEvents';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CurrentEventsGrid } from './CurrentEventsGrid';
import { UpcomingEventsList } from './UpcomingEventsList';

export function FamilyView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentFamily, contacts, familyMembers, isLoading: isFamilyLoading } = useFamily();

  // Debug logging for family state
  useEffect(() => {
    console.log('[FamilyView] Family state:', {
      currentFamily: currentFamily?.id || null,
      isFamilyLoading,
      familyMembersCount: familyMembers?.length || 0,
      contactsCount: contacts?.length || 0,
    });
  }, [currentFamily, isFamilyLoading, familyMembers, contacts]);
  const { settings } = useAppSettings();
  const eventCache = useEventCache();
  const { user, userContact } = useAuth();
  const backgroundColor = useThemeColor({ light: '#E8E8ED', dark: '#2C2C2E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const emptyContainerBgColor = useThemeColor({ light: '#F5F5F7', dark: '#1C1C1E' }, 'background');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Ensure events are fetched (only once on mount/family change)
  useEffect(() => {
    if (!isFamilyLoading && currentFamily) {
      console.log('[FamilyView] Ensuring events are fetched for today and upcoming');
      eventCache.ensureEventsFetched('today', false);
      eventCache.ensureEventsFetched('upcoming', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFamily?.id, isFamilyLoading]);

  // Get events from cache (read-only)
  const todayEvents = eventCache.getEvents('today');
  const upcomingEvents = eventCache.getEvents('upcoming');
  const isLoadingToday = eventCache.isLoading('today');
  const isLoadingUpcoming = eventCache.isLoading('upcoming');
  const isLoading = isLoadingToday || isLoadingUpcoming;

  // Debug logging
  useEffect(() => {
    console.log('[FamilyView] Events from cache:', {
      todayCount: todayEvents.length,
      upcomingCount: upcomingEvents.length,
      isLoadingToday,
      isLoadingUpcoming,
      todayEvents: todayEvents.map(e => ({ id: e.id, title: e.title, start: e.start_time, participants: e.participants?.length || 0 })),
      upcomingEvents: upcomingEvents.map(e => ({ id: e.id, title: e.title, start: e.start_time, participants: e.participants?.length || 0 })),
    });
  }, [todayEvents.length, upcomingEvents.length, isLoadingToday, isLoadingUpcoming]);

  // Check if cache entries exist (even if empty)
  // If a cache entry exists, it means we've fetched before (or are currently fetching)
  // Only show spinner if we have no cache entries at all
  const todayCacheEntry = eventCache.getCacheEntry('today');
  const upcomingCacheEntry = eventCache.getCacheEntry('upcoming');
  const hasCacheEntries = !!todayCacheEntry || !!upcomingCacheEntry;

  // Process events into FamilyEvent format
  const { currentEvents, processedUpcomingEvents } = useMemo(() => {
    const familyColor = settings.familyCalendarColor || FAMILY_EVENT_COLOR;

    // Only use mock data in development when explicitly no family is loaded
    // In production, show empty arrays if no events are available
    if (!currentFamily && __DEV__) {
      console.warn('[FamilyView] Using mock data - no family loaded');
      return {
        currentEvents: generateCurrentEvents(),
        processedUpcomingEvents: generateUpcomingEvents(),
      };
    }

    // If no family is loaded in production, return empty arrays
    if (!currentFamily) {
      return {
        currentEvents: [],
        processedUpcomingEvents: [],
      };
    }

    // Combine all events (regular + personal calendar) and sort by start time
    // Note: Personal calendar events are already included in today/upcoming caches
    let allEvents = [
      ...(todayEvents.length > 0 ? mapEventsToFamilyEvents(todayEvents, familyMembers, currentFamily.name, familyColor) : []),
      ...(upcomingEvents.length > 0 ? mapEventsToFamilyEvents(upcomingEvents, familyMembers, currentFamily.name, familyColor) : []),
    ].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Filter out events that have already ended
    const now = new Date();
    allEvents = allEvents.filter(event => event.endTime > now);

    // Remove duplicates (events might appear in both today and upcoming)
    const seenIds = new Set<string>();
    const uniqueEvents = allEvents.filter((event) => {
      if (seenIds.has(event.id)) return false;
      seenIds.add(event.id);
      return true;
    });

    // Next event per person (one per person) plus limited upcoming per person
    const perPersonLimit = Math.max(1, settings.eventsPerPerson || 1);
    const nextEventPerPerson = new Map<string, FamilyEvent>();
    const upcomingByPersonCount = new Map<string, number>();
    const remainingEvents: FamilyEvent[] = [];

    for (const event of uniqueEvents) {
      const personKey = event.person || 'Family';
      if (!nextEventPerPerson.has(personKey)) {
        nextEventPerPerson.set(personKey, event);
        continue;
      }
      const used = upcomingByPersonCount.get(personKey) || 0;
      if (used < perPersonLimit) {
        remainingEvents.push(event);
        upcomingByPersonCount.set(personKey, used + 1);
      }
      // else drop extras beyond limit
    }

    return {
      currentEvents: Array.from(nextEventPerPerson.values()),
      processedUpcomingEvents: remainingEvents,
    };
  }, [todayEvents, upcomingEvents, currentFamily, familyMembers, settings.eventsPerPerson, settings.familyCalendarColor]);

  // Refresh events when screen comes into focus (e.g., after adding an event)
  useFocusEffect(
    useCallback(() => {
      if (!isFamilyLoading && currentFamily) {
        console.log('FamilyView focused - refreshing events');
        eventCache.refreshCache('today');
        eventCache.refreshCache('upcoming');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFamily?.id, isFamilyLoading])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await Promise.all([
        eventCache.refreshCache('today'),
        eventCache.refreshCache('upcoming'),
      ]);
    } catch (err) {
      console.error('Error refreshing events:', err);
      setError('Failed to refresh events. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEventPress = (eventId: string, originalEventId?: string, occurrenceIso?: string) => {
    // Check if this is a personal calendar event (they can't be opened in detail view)
    // Check eventId first (it has the "personal-" prefix), not originalEventId (which is just the iOS event ID)
    if (eventId && eventId.startsWith('personal-')) {
      // Personal calendar events are read-only from iOS, so we can't show details
      return;
    }

    // Use originalEventId if available (for expanded recurrences) and strip occurrence suffix
    const actualEventId = (originalEventId || eventId || '').split('::')[0];
    const params: any = { id: actualEventId };
    if (occurrenceIso) {
      params.occurrence = occurrenceIso;
    }

    router.push({
      pathname: '/event/[id]',
      params,
    });
  };

  const handleMemberPress = (person: string) => {
    router.push({
      pathname: '/member/[name]',
      params: { name: person },
    });
  };

  // Show loading state only if we have no cache entries at all and we're loading
  // Once we have cache entries (even if empty), show the view and let it update
  if (isLoading && !isRefreshing && !hasCacheEntries) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { paddingTop: Math.max(insets.top, 0), backgroundColor },
        ]}>
        <ActivityIndicator size="large" color={textColor} />
        <Text style={[styles.loadingText, { color: subTextColor }]}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 0), backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={textColor}
          />
        }>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: '#FF3B30' }]}>{error}</Text>
          </View>
        )}

        {currentEvents.length === 0 && processedUpcomingEvents.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: emptyContainerBgColor }]}>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No Events Yet</Text>
            <Text style={[styles.emptyText, { color: subTextColor }]}>
              Create your first event by tapping the + button below
            </Text>
          </View>
        ) : (
          <>
            <CurrentEventsGrid events={currentEvents} onEventPress={handleEventPress} onMemberPress={handleMemberPress} />
            <UpcomingEventsList events={processedUpcomingEvents} onEventPress={handleEventPress} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8ED',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFEBEB',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});
