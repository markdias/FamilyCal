import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WebDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  markedDates?: Set<string>; // Set of date strings in YYYY-MM-DD format
  dotColor?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function WebDatePicker({ value, onChange, markedDates, dotColor }: WebDatePickerProps) {
  const [viewDate, setViewDate] = useState(new Date(value));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Generate calendar days
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(value);
    newDate.setFullYear(year, month, day);
    onChange(newDate);
  };

  const isSelected = (day: number) => {
    return (
      value.getDate() === day &&
      value.getMonth() === month &&
      value.getFullYear() === year
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const isMarked = (day: number) => {
    if (!markedDates) return false;
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return markedDates.has(dateStr);
  };

  return (
    <View style={styles.container}>
      {/* Month/Year Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.monthYear}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={styles.daysHeader}>
        {DAYS.map((day) => (
          <Text key={day} style={styles.dayHeader}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          const selected = day ? isSelected(day) : false;
          const today = day ? isToday(day) : false;
          const marked = day ? isMarked(day) : false;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                day && selected ? styles.selectedDay : null,
                day && today && !selected ? styles.todayDay : null,
              ]}
              onPress={() => day && handleSelectDay(day)}
              disabled={!day}>
              <View style={styles.dayContent}>
                <Text
                  style={[
                    styles.dayText,
                    day && selected ? styles.selectedDayText : null,
                    day && today && !selected ? styles.todayDayText : null,
                    !day ? styles.emptyDay : null,
                  ]}>
                  {day || ''}
                </Text>
                {day && marked && (
                  <View style={[
                    styles.markedIndicator,
                    { backgroundColor: dotColor || '#34C759' },
                    selected ? styles.markedIndicatorSelected : null
                  ]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface WebTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function WebTimePicker({ value, onChange }: WebTimePickerProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Change to 5-minute intervals
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const selectedHour = value.getHours();
  // Round to nearest 5 for highlighting purposes
  const selectedMinute = Math.round(value.getMinutes() / 5) * 5;

  const handleHourChange = (hour: number) => {
    const newDate = new Date(value);
    newDate.setHours(hour);
    onChange(newDate);
  };

  const handleMinuteChange = (minute: number) => {
    const newDate = new Date(value);
    newDate.setMinutes(minute);
    onChange(newDate);
  };

  return (
    <View style={styles.timeContainer}>
      {/* Hour Wheel */}
      <View style={styles.wheelContainer}>
        <Text style={styles.wheelLabel}>Hour</Text>
        <ScrollView
          style={styles.wheel}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.wheelContent}>
          {hours.map((hour) => (
            <TouchableOpacity
              key={hour}
              style={[
                styles.wheelItem,
                selectedHour === hour && styles.wheelItemSelected,
              ]}
              onPress={() => handleHourChange(hour)}>
              <Text
                style={[
                  styles.wheelItemText,
                  selectedHour === hour && styles.wheelItemTextSelected,
                ]}>
                {String(hour).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.timeSeparator}>:</Text>

      {/* Minute Wheel */}
      <View style={styles.wheelContainer}>
        <Text style={styles.wheelLabel}>Min</Text>
        <ScrollView
          style={styles.wheel}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.wheelContent}>
          {minutes.map((minute) => {
            const isSelected = selectedMinute === minute || (selectedMinute === 60 && minute === 0);
            return (
              <TouchableOpacity
                key={minute}
                style={[
                  styles.wheelItem,
                  isSelected && styles.wheelItemSelected,
                ]}
                onPress={() => handleMinuteChange(minute)}>
                <Text
                  style={[
                    styles.wheelItemText,
                    isSelected && styles.wheelItemTextSelected,
                  ]}>
                  {String(minute).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
  },
  dayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    width: '100%',
    height: '100%',
  },
  dayText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  emptyDay: {
    color: 'transparent',
  },
  selectedDay: {
    backgroundColor: '#007AFF',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  todayDay: {
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  todayDayText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  markedIndicator: {
    width: Platform.OS === 'web' ? 6 : 4,
    height: Platform.OS === 'web' ? 6 : 4,
    borderRadius: Platform.OS === 'web' ? 3 : 2,
    backgroundColor: '#34C759',
    marginTop: 2,
    position: 'absolute',
    bottom: 6,
  },
  markedIndicatorSelected: {
    backgroundColor: '#FFFFFF',
  },
  // Time picker styles
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  wheelContainer: {
    alignItems: 'center',
  },
  wheelLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  wheel: {
    height: 200,
    width: 80,
  },
  wheelContent: {
    paddingVertical: 80,
  },
  wheelItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  wheelItemSelected: {
    backgroundColor: '#007AFF',
  },
  wheelItemText: {
    fontSize: 20,
    color: '#1D1D1F',
  },
  wheelItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1D1D1F',
    marginHorizontal: 16,
    marginTop: 24,
  },
});
