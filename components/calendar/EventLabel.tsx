import DiagonalColorSplit from '@/components/ui/DiagonalColorSplit';
import { getContrastingTextColor, normalizeColorForDisplay } from '@/utils/colorUtils';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EventLabelProps {
  title: string;
  color: string;
  gradientColors?: string[];
  eventId: string;
  originalEventId?: string;
  startTimeIso?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  person?: string;
  isRecurring?: boolean;
  onPress?: (eventId: string, originalEventId?: string, occurrenceIso?: string) => void;
}

export function EventLabel({
  title,
  color,
  gradientColors,
  eventId,
  originalEventId,
  startTimeIso,
  startTime,
  endTime,
  location,
  person,
  isRecurring,
  onPress
}: EventLabelProps) {
  const handlePress = () => {
    onPress?.(eventId, originalEventId, startTimeIso);
  };
  const displayColor = color;

  // Use gradient if multiple colors provided, otherwise use solid color
  const hasGradient = gradientColors && gradientColors.length > 1;
  const gradientColorsNormalized = gradientColors || [];

  // For multi-color events, use white text for better contrast across all colors
  // For single-color events, use contrasting color
  const textColor = hasGradient ? '#ffffff' : getContrastingTextColor(displayColor);

  const content = (
    <View style={styles.titleRow}>
      <Text style={[styles.text, { color: textColor, fontWeight: '500', textShadowColor: hasGradient ? 'rgba(0,0,0,0.5)' : 'transparent', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      {isRecurring && <Ionicons name="repeat-outline" size={9} style={[styles.recurringIcon, { color: textColor }]} />}
    </View>
  );

  // Always use DiagonalColorSplit for consistent rendering (padding, border radius, etc.)
  // If gradientColors is not provided or empty, we use [displayColor]
  const colorsToUse = (hasGradient && gradientColorsNormalized.length > 0)
    ? gradientColorsNormalized
    : [displayColor];

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.touchable}>
      <DiagonalColorSplit
        colors={colorsToUse}
        angle={45} // Angle is ignored in SVG implementation but kept for API match
        height={Platform.OS === 'web' ? 22 : 18}
        style={styles.container}>
        {content}
      </DiagonalColorSplit>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    marginBottom: 1,
    width: '100%',
  },
  container: {
    borderRadius: 6,
    minHeight: Platform.OS === 'web' ? 22 : 18,
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  recurringIcon: {
    fontSize: 9,
    marginLeft: 4,
    flexShrink: 0,
  },
  text: {
    fontSize: 11,
    fontWeight: '400',
    flex: 1,
    flexShrink: 1,
  },
});
