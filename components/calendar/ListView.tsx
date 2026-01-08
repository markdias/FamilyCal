import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { MockEvent } from '@/utils/mockEvents';
import { useThemeColor } from '@/hooks/use-theme-color';

interface ListViewProps {
  events: MockEvent[];
  onEventPress: (eventId: string, originalEventId?: string, occurrenceIso?: string) => void;
}

export function ListView({ events, onEventPress }: ListViewProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const backgroundColor = useThemeColor({ light: '#F2F2F7', dark: '#2C2C2E' }, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');

  // Sort events by start time
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      // First sort by date
      const dateCompare = a.startTime.getTime() - b.startTime.getTime();
      if (dateCompare !== 0) return dateCompare;

      // Then by start time
      return a.startTime.getTime() - b.startTime.getTime();
    });
  }, [events]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const groups: { [key: string]: MockEvent[] } = {};

    sortedEvents.forEach(event => {
      const dateKey = event.startTime.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });

    return groups;
  }, [sortedEvents]);

  // Scroll to today's section on mount (position today at the top)
  useEffect(() => {
    if (Object.keys(eventsByDate).length > 0) {
      const today = new Date();
      const todayKey = today.toDateString();

      // Find the index of today's date in the sorted date keys
      const dateKeys = Object.keys(eventsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const todayIndex = dateKeys.findIndex(key => key === todayKey);

      if (todayIndex !== -1) {
        // Scroll to today's section at the very top
        const yOffset = todayIndex * 200; // Rough estimate of section height (date header + events)

        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: yOffset, animated: false });
        }, 100);
      }
    }
  }, [eventsByDate]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  return (
    <ScrollView ref={scrollViewRef} style={[styles.container, { backgroundColor }]}>
      {Object.entries(eventsByDate).map(([dateKey, dateEvents]) => (
        <View key={dateKey} style={styles.dateGroup}>
          <Text style={[styles.dateHeader, { color: textColor }]}>
            {formatDate(new Date(dateKey))}
          </Text>
          {dateEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={[styles.eventItem, { backgroundColor: cardColor }]}
              onPress={() => onEventPress(event.id, event.originalEventId)}
            >
              <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />
              <View style={styles.eventContent}>
                <Text style={[styles.eventTitle, { color: textColor }]}>
                  {event.title}
                </Text>
                <Text style={[styles.eventTime, { color: mutedText }]}>
                  {formatTime(event.startTime)}
                  {event.endTime && ` - ${formatTime(event.endTime)}`}
                </Text>
                {event.location && (
                  <Text style={[styles.eventLocation, { color: mutedText }]}>
                    📍 {event.location}
                  </Text>
                )}
                {event.person && (
                  <Text style={[styles.eventPerson, { color: accent }]}>
                    👤 {event.person}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      {sortedEvents.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: mutedText }]}>
            No events to display
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 16,
    marginTop: 8,
  },
  eventItem: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventColorBar: {
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  eventContent: {
    flex: 1,
    padding: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 14,
    marginBottom: 2,
  },
  eventPerson: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    textAlign: 'center',
  },
});