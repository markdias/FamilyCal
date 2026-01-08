import React, { useState, useMemo, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UpcomingEventItem } from './UpcomingEventItem';
import { UpcomingEventCard } from './UpcomingEventCard';
import { FamilyEvent } from '@/utils/mockEvents';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPreferences, updateUpcomingEventsViewMode } from '@/services/userPreferencesService';

interface UpcomingEventsListProps {
  events: FamilyEvent[];
  onEventPress?: (eventId: string, originalEventId?: string, occurrenceIso?: string) => void;
}

export function UpcomingEventsList({ events, onEventPress }: UpcomingEventsListProps) {
  const [isCardView, setIsCardView] = useState(false);
  const [isLoadingPreference, setIsLoadingPreference] = useState(true);
  const { user } = useAuth();
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');

  // Group events by person
  const eventsByPerson = useMemo(() => {
    const grouped: { [person: string]: FamilyEvent[] } = {};
    events.forEach((event) => {
      if (!grouped[event.person]) {
        grouped[event.person] = [];
      }
      grouped[event.person].push(event);
    });
    return grouped;
  }, [events]);

  const people = Object.keys(eventsByPerson).sort();

  // Sort events by person and then by time for card view
  const sortedEventsByPerson = useMemo(() => {
    const sorted: { [person: string]: FamilyEvent[] } = {};
    people.forEach((person) => {
      sorted[person] = [...eventsByPerson[person]].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );
    });
    return sorted;
  }, [eventsByPerson, people]);

  // Load user preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      if (!user) {
        setIsLoadingPreference(false);
        return;
      }

      const { data, error } = await getUserPreferences(user.id);
      if (!error && data) {
        setIsCardView(data.upcoming_events_card_view);
      }
      setIsLoadingPreference(false);
    };

    loadPreference();
  }, [user]);

  const toggleView = async () => {
    const newValue = !isCardView;
    setIsCardView(newValue);

    // Save preference to database
    if (user) {
      await updateUpcomingEventsViewMode(user.id, newValue);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Upcoming Events</Text>
        <TouchableOpacity onPress={toggleView} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="list" size={20} color={textColor} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {isCardView ? (
          // Card view: events grouped by person with card-style layout
          people.map((person) => (
            <View key={person} style={styles.personSection}>
              <Text style={[styles.personName, { color: textColor }]}>{person}</Text>
              {sortedEventsByPerson[person].map((event) => (
                <UpcomingEventCard key={event.id} event={event} onPress={onEventPress} />
              ))}
            </View>
          ))
        ) : (
          // Grouped view: events grouped by person with compact layout
          people.map((person) => (
            <View key={person} style={styles.personSection}>
              <Text style={[styles.personName, { color: textColor }]}>{person}</Text>
              {eventsByPerson[person].map((event) => (
                <UpcomingEventItem key={event.id} event={event} onPress={onEventPress} />
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  personSection: {
    marginBottom: 16,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
});
