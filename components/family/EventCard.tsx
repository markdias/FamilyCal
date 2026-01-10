import { useThemeColor } from '@/hooks/use-theme-color';
import { FamilyEvent, formatTimeRange, getCountdownText } from '@/utils/mockEvents';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EventCardProps {
  event: FamilyEvent;
  onPress?: (eventId?: string, originalEventId?: string, occurrenceIso?: string) => void;
  disableNavigation?: boolean;
  isSelected?: boolean;
  accentColor?: string;
}

export function EventCard({ event, onPress, disableNavigation = false, isSelected = false, accentColor }: EventCardProps) {
  const router = useRouter();
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const today = new Date();
  const isToday = event.startTime.toDateString() === today.toDateString();
  const countdown = getCountdownText(event.startTime);
  const timeRange = formatTimeRange(event.startTime, event.endTime);

  const handlePress = () => {
    // Navigate to member detail view instead of event detail
    router.push(`/member/${encodeURIComponent(event.person)}`);
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress(event.id, event.originalEventId, event.startTime.toISOString());
    } else if (!disableNavigation) {
      handlePress();
    }
  };

  const CardContent = () => (
    <>
      <View style={[styles.colorBar, { backgroundColor: event.color }]} />
      <View style={styles.content}>
        <Text style={[styles.personName, { color: textColor }]}>{event.person}</Text>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {event.title}
          </Text>
          {event.isRecurring && (
            <Ionicons name="refresh" size={14} color={mutedText} style={styles.recurringIcon} />
          )}
        </View>
        <Text style={[styles.time, { color: textColor }]}>{timeRange}</Text>
        {isToday && <Text style={[styles.date, { color: textColor }]}>Today</Text>}
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
    </>
  );

  // If navigation is disabled and no custom onPress is provided, render as a View
  // (This is common when the card is wrapped in a TouchableOpacity by the parent, e.g. in SearchScreen)
  if (disableNavigation && !onPress) {
    return (
      <View style={[
        styles.container,
        { backgroundColor: cardColor },
        styles.searchContainer,
        isSelected && { borderColor: accentColor || '#007AFF', borderWidth: 2 }
      ]}>
        <CardContent />
        {isSelected && (
          <View style={[styles.selectionIndicator, { backgroundColor: accentColor || '#007AFF' }]}>
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
        )}
      </View>
    );
  }

  // Otherwise, make it touchable for navigation
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: cardColor }]}
      onPress={handleCardPress}
      activeOpacity={0.7}>
      <CardContent />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    minHeight: 140,
  },
  searchContainer: {
    overflow: 'visible', // Allow selection indicators to show
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorBar: {
    width: 6,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  time: {
    fontSize: 13,
    fontWeight: '400',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    fontWeight: '400',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
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
