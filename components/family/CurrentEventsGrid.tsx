import { FamilyEvent } from '@/utils/mockEvents';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EventCard } from './EventCard';

interface CurrentEventsGridProps {
  events: FamilyEvent[];
  onEventPress?: (eventId: string, originalEventId?: string) => void;
  onMemberPress?: (person: string) => void;
}

export function CurrentEventsGrid({ events, onEventPress, onMemberPress }: CurrentEventsGridProps) {
  // Limit to 4 events for 2x2 grid
  const displayEvents = events.slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {displayEvents.map((event) => {
          // Create specific handler for this event
          const handlePress = () => {
            if (onMemberPress) {
              onMemberPress(event.person);
            } else if (onEventPress) {
              onEventPress(event.id, event.originalEventId);
            }
          };

          return (
            <View key={event.id} style={styles.gridItem}>
              <EventCard
                event={event}
                onPress={onMemberPress || onEventPress ? handlePress : undefined}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 6,
  },
});
