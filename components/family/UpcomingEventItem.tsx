import { useThemeColor } from '@/hooks/use-theme-color';
import { FamilyEvent } from '@/utils/mockEvents';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface UpcomingEventItemProps {
  event: FamilyEvent;
  onPress?: (eventId: string, originalEventId?: string, occurrenceIso?: string) => void;
}

const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function UpcomingEventItem({ event, onPress }: UpcomingEventItemProps) {
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const dayAbbr = DAY_ABBREVIATIONS[event.startTime.getDay()];
  const dayNumber = event.startTime.getDate();
  const hours = event.startTime.getHours();
  const minutes = event.startTime.getMinutes();
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  const handlePress = () => {
    onPress?.(event.id, event.originalEventId, event.startTime.toISOString());
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: cardColor }]}
      onPress={handlePress}
      activeOpacity={0.7}>
      <View style={[styles.colorBar, { backgroundColor: event.color }]} />
      <View style={styles.content}>
        <Text style={[styles.dayDate, { color: textColor }]}>
          {dayAbbr} {dayNumber} {timeStr}
        </Text>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: textColor }]}>
            {event.title}
          </Text>
          {event.isRecurring && (
            <Ionicons name="refresh" size={14} color={mutedText} style={styles.recurringIcon} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    minHeight: 50,
    // 3D shadow effects
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  colorBar: {
    width: 6,
  },
  content: {
    flex: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1D1D1F',
    marginRight: 12,
    minWidth: 80,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1D1D1F',
    flex: 1,
  },
  recurringIcon: {
    marginLeft: 4,
  },
});
