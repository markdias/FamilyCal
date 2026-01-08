import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getContrastingTextColor, normalizeColorForDisplay } from '@/utils/colorUtils';

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
  const displayColor = normalizeColorForDisplay(color);
  const textColor = getContrastingTextColor(displayColor);
  
  // Use gradient if multiple colors provided, otherwise use solid color
  const hasGradient = gradientColors && gradientColors.length > 1;
  const gradientColorsNormalized = gradientColors?.map(c => normalizeColorForDisplay(c)) || [];

  const content = (
    <View style={styles.titleRow}>
      {isRecurring && <Text style={[styles.recurringIcon, { color: textColor }]}>🔄 </Text>}
      <Text style={[styles.text, { color: textColor }]} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
    </View>
  );

  if (hasGradient && gradientColorsNormalized.length > 1) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={styles.touchable}>
        <LinearGradient
          colors={gradientColorsNormalized}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.container}>
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.touchable, styles.container, { backgroundColor: displayColor }]}
      onPress={handlePress}
      activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    marginBottom: 1,
    width: '100%',
  },
  container: {
    borderRadius: 3,
    minHeight: 18,
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  recurringIcon: {
    fontSize: 9,
    marginRight: 2,
    flexShrink: 0,
  },
  text: {
    fontSize: 11,
    color: '#1D1D1F',
    fontWeight: '400',
    flex: 1,
    flexShrink: 1,
  },
});
