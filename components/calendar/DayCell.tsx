import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EventLabel } from './EventLabel';
import { MockEvent } from '@/utils/mockEvents';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DayCellProps {
  date: Date | null;
  events: MockEvent[];
  isToday?: boolean;
  isSelected?: boolean;
  isCurrentMonth?: boolean;
  maxVisibleEvents?: number;
  onEventPress?: (eventId: string, originalEventId?: string, occurrenceIso?: string) => void;
  onDatePress?: (date: Date) => void;
  cellHeight?: number;
}

export function DayCell({
  date,
  events,
  isToday = false,
  isSelected = false,
  isCurrentMonth = true,
  maxVisibleEvents = 5,
  onEventPress,
  onDatePress,
  cellHeight,
}: DayCellProps) {
  const insets = useSafeAreaInsets();
  const borderColor = useThemeColor({ light: '#E5E5E7', dark: '#2C2C2E' }, 'background');
  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1A1A1A' }, 'background');
  const todayBackgroundColor = useThemeColor({ light: '#F0F0F5', dark: '#2C2C2E' }, 'background');
  const selectedBackgroundColor = useThemeColor({ light: '#E8F4FD', dark: '#1C3A52' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const todayTextColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const selectedTextColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const selectedGrayBackgroundColor = useThemeColor({ light: '#E5E5E7', dark: '#2C2C2E' }, 'background');
  const selectedGrayBorderColor = useThemeColor({ light: '#8E8E93', dark: '#636366' }, 'text');
  const selectedGrayTextColor = useThemeColor({ light: '#636366', dark: '#8E8E93' }, 'text');
  const todayTopBorderColor = useThemeColor({ light: '#636366', dark: '#8E8E93' }, 'text');
  const cellWidth = useMemo(() => Dimensions.get('window').width / 7, []);

  // Calculate dynamic cell height if not provided
  const screenHeight = Dimensions.get('window').height;
  const headerHeight = Math.max(insets.top, 12) + 46; // Header with month/year and Today button
  const weekDaysHeight = 41; // Week day labels height
  const tabBarHeight = 84; // Bottom tab bar
  const availableHeight = screenHeight - headerHeight - weekDaysHeight - tabBarHeight;
  const calculatedCellHeight = cellHeight || Math.floor(availableHeight / 6); // 6 rows max

  const dayNumber = date ? date.getDate() : null;

  // Dynamically calculate how many events can fit in the cell
  const dayNumberHeight = 19; // Approximate height of day number
  const eventHeight = 19; // Min height of event + margin (18 + 1)
  const overflowTextHeight = 15; // Height of "+n" text
  const cellPadding = 8; // Top and bottom padding combined
  const availableEventSpace = calculatedCellHeight - dayNumberHeight - cellPadding;

  // Calculate max events that can fit
  let calculatedMaxEvents = Math.floor(availableEventSpace / eventHeight);

  // If we have more events than can fit, reserve space for "+n" text
  if (events.length > calculatedMaxEvents) {
    const spaceWithOverflow = availableEventSpace - overflowTextHeight;
    calculatedMaxEvents = Math.max(1, Math.floor(spaceWithOverflow / eventHeight));
  }

  // Use the calculated max or the provided maxVisibleEvents, whichever is smaller
  const finalMaxEvents = Math.min(calculatedMaxEvents, maxVisibleEvents);
  const visibleEvents = events.slice(0, finalMaxEvents);
  const overflowCount = events.length - finalMaxEvents;

  const handleDatePress = () => {
    if (date && onDatePress) {
      onDatePress(date);
    }
  };

  // Determine background and border colors based on state
  let cellBackgroundColor = backgroundColor;
  let cellBorderColor = borderColor;
  let cellBorderWidth = 1;
  let cellBorderStyle = 'solid' as 'solid' | 'dotted' | 'dashed';
  let cellTopBorderColor = borderColor;
  let cellTopBorderWidth = 0;
  let dateTextColor = textColor;
  let isBold = false;
  let textDecorationLine = 'none' as 'none' | 'underline';

  if (isSelected) {
    cellBackgroundColor = selectedGrayBackgroundColor; // Light gray background
    cellBorderColor = selectedGrayBorderColor; // Gray border
    cellBorderWidth = 2;
    dateTextColor = selectedGrayTextColor; // Dark gray text
    isBold = true;
  } else if (isToday) {
    cellBackgroundColor = backgroundColor; // Keep normal background
    cellBorderColor = borderColor; // Keep normal border color
    cellBorderWidth = 1; // Keep normal border width
    cellBorderStyle = 'solid';
    cellTopBorderColor = todayTopBorderColor; // Even darker gray color
    cellTopBorderWidth = 4; // Even thicker top border
    dateTextColor = textColor; // Use normal text color
    isBold = false; // Remove bold
    textDecorationLine = 'none';
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          width: cellWidth,
          height: calculatedCellHeight,
          backgroundColor: cellBackgroundColor,
          borderColor: cellBorderColor,
          borderBottomWidth: cellBorderWidth,
          borderRightWidth: cellBorderWidth,
          borderTopWidth: cellTopBorderWidth,
          borderTopColor: cellTopBorderColor,
          borderStyle: cellBorderStyle,
        }
      ]}
      onPress={handleDatePress}
      disabled={!date}
      activeOpacity={0.7}>
      {dayNumber !== null && (
        <>
          <Text
            style={[
              styles.dayNumber,
              { color: dateTextColor, textDecorationLine },
              isBold && styles.dayNumberToday,
              !isCurrentMonth && { color: mutedText, opacity: 0.5 },
            ]}>
            {dayNumber}
          </Text>
          <View style={styles.eventsContainer}>
            {visibleEvents.map((event) => (
              <EventLabel
                key={event.id}
                title={event.title}
                color={event.color}
                gradientColors={event.gradientColors}
                eventId={event.id}
                originalEventId={event.originalEventId}
                startTimeIso={event.startTime?.toISOString?.()}
                startTime={event.startTime}
                endTime={event.endTime}
                location={event.location}
                person={event.person}
                isRecurring={event.isRecurring}
                onPress={onEventPress}
              />
            ))}
            {overflowCount > 0 && (
              <Text style={[styles.overflowText, { color: mutedText }]}>+{overflowCount}</Text>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E5E7',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 2,
  },
  dayNumberToday: {
    fontWeight: '700',
  },
  eventsContainer: {
    overflow: 'hidden',
  },
  overflowText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '400',
  },
});