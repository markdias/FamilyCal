import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FamilyEvent, formatTimeRange, getCountdownText } from '@/utils/mockEvents';
import { useThemeColor } from '@/hooks/use-theme-color';

interface UpcomingEventCardProps {
  event: FamilyEvent;
  onPress?: (eventId: string, originalEventId?: string, occurrenceIso?: string) => void;
}

export function UpcomingEventCard({ event, onPress }: UpcomingEventCardProps) {
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const dayAbbr = event.startTime.toLocaleDateString('en-GB', { weekday: 'short' });
  const day = event.startTime.getDate();
  const month = event.startTime.toLocaleDateString('en-GB', { month: 'short' });
  const timeRange = formatTimeRange(event.startTime, event.endTime);
  const countdown = getCountdownText(event.startTime);

  // Format date display
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let dateDisplay = '';
  if (event.startTime.toDateString() === today.toDateString()) {
    dateDisplay = 'Today';
  } else if (event.startTime.toDateString() === tomorrow.toDateString()) {
    dateDisplay = 'Tomorrow';
  } else {
    dateDisplay = `${dayAbbr}, ${day} ${month}`;
  }

  const handlePress = () => {
    onPress?.(event.id, event.originalEventId, event.startTime.toISOString());
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: cardColor }]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <View style={[styles.dateBlock, { backgroundColor: event.color }]}>
        <Text style={styles.dateAbbr}>{dayAbbr}</Text>
        <Text style={styles.dateNumber}>{day}</Text>
        <Text style={styles.dateMonth}>{month}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
              <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
              {event.title}
            </Text>
            {event.isRecurring && (
                <Ionicons name="refresh" size={14} color={mutedText} style={styles.recurringIcon} />
            )}
          </View>
        </View>
        <Text style={[styles.timeRange, { color: textColor }]}>{timeRange}</Text>
        <Text style={[styles.dateDisplay, { color: mutedText }]}>{dateDisplay}</Text>
        {event.location && (
          <View style={styles.locationRow}>
            <Ionicons name="paper-plane" size={12} color={mutedText} />
            <Text style={[styles.location, { color: mutedText }]} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}
        <Text style={[styles.countdown, { color: accent }]}>{countdown}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    minHeight: 100,
  },
  dateBlock: {
    width: 60,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateAbbr: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginRight: 4,
  },
  recurringIcon: {
    marginLeft: 4,
  },
  timeRange: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  dateDisplay: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    marginLeft: 4,
    flex: 1,
  },
  countdown: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
    marginTop: 4,
  },
});
