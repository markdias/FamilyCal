import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { format } from 'date-fns';
import { CalendarEvent } from '../types/models';
import { useTheme } from '../hooks/useTheme';
import { Card } from './Card';
import { getEventColor } from '../utils/colorUtils';
import { useAppContext } from '../context/AppContext';

interface EventCardProps {
  event: CalendarEvent;
  onPress: (event: CalendarEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const { colors, typography, spacing } = useTheme();
  const { state } = useAppContext();
  const eventColor = getEventColor(event.attendeeIds, state.familyMembers);

  const timeString = event.isAllDay
    ? 'All Day'
    : `${format(new Date(event.startDate), 'h:mm a')} - ${format(new Date(event.endDate), 'h:mm a')}`;

  return (
    <TouchableOpacity onPress={() => onPress(event)} activeOpacity={0.7}>
      <Card borderColor={eventColor}>
        <View style={styles.container}>
          <Text style={[typography.footnote, { color: colors.textSecondary, marginBottom: spacing.xxs }]}>
            {timeString}
          </Text>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
            {event.title}
          </Text>
          {event.location && (
            <Text style={[typography.footnote, { color: colors.textSecondary, marginTop: spacing.xxs }]} numberOfLines={1}>
              📍 {event.location}
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
