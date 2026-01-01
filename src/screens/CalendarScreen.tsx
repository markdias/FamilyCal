import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { SegmentedControl } from '../components/SegmentedControl';
import { MonthView } from './MonthView';
import { DayView } from './DayView';

export const CalendarScreen = () => {
  const [viewMode, setViewMode] = useState(0); // 0 for Month, 1 for Day
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView />
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <SegmentedControl 
          values={['Month', 'Day']} 
          selectedIndex={viewMode} 
          onChange={setViewMode} 
        />
      </View>
      <View style={styles.content}>
        {viewMode === 0 ? <MonthView /> : <DayView />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    flex: 1,
  },
});
