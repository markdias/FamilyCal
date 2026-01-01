import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  compareAsc
  } from 'date-fns';
  import { useTheme } from '../hooks/useTheme';
import { useAppContext } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { EventCard } from '../components/EventCard';
import { getEventColor } from '../utils/colorUtils';
import { EventDetailModal } from '../components/modals/EventDetailModal';
import { EventFormModal } from '../components/modals/EventFormModal';
import { CalendarEvent } from '../types/models';

export const MonthView = () => {
  const { colors, spacing, typography, primary } = useTheme();
  const { state, dispatch } = useAppContext();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CalendarEvent> | null>(null);

  const selectedDate = parseISO(state.selectedDate);

  const handleEventPress = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailVisible(true);
  };

  const handleAddEvent = () => {
    setEditingEvent({ startDate: state.selectedDate, attendeeIds: state.familyMembers.map(m => m.id) });
    setIsFormVisible(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setIsDetailVisible(false);
    setEditingEvent(event);
    setIsFormVisible(true);
  };

  const handleSaveEvent = (event: CalendarEvent) => {
    if (state.events.find(e => e.id === event.id)) {
      dispatch({ type: 'UPDATE_EVENT', payload: event });
    } else {
      dispatch({ type: 'ADD_EVENT', payload: event });
    }
    setIsFormVisible(false);
  };

  const handleDeleteEvent = (id: string) => {
    dispatch({ type: 'DELETE_EVENT', payload: id });
    setIsDetailVisible(false);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[typography.title2, { color: colors.text }]}>
        {format(currentMonth, 'MMMM yyyy')}
      </Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft color={primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ marginLeft: spacing.m }}>
          <ChevronRight color={primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDays = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return (
      <View style={styles.daysRow}>
        {days.map((day, i) => (
          <Text key={i} style={[typography.footnote, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>
            {day}
          </Text>
        ))}
      </View>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    const rows: any[] = [];
    let days: any[] = [];

    calendarDays.forEach((day, i) => {
      const isSelected = isSameDay(day, selectedDate);
      const isCurrentMonth = isSameMonth(day, monthStart);
      
      const dayEvents = state.events.filter(event => isSameDay(parseISO(event.startDate), day));

      days.push(
        <TouchableOpacity
          key={day.toString()}
          style={[
            styles.cell,
            isSelected && { backgroundColor: primary, borderRadius: 8 }
          ]}
          onPress={() => dispatch({ type: 'SET_SELECTED_DATE', payload: day.toISOString() })}
        >
          <Text style={[
            typography.body,
            { color: isSelected ? '#FFFFFF' : (isCurrentMonth ? colors.text : colors.textSecondary) },
            isSelected && { fontWeight: 'bold' }
          ]}>
            {format(day, 'd')}
          </Text>
          <View style={styles.dotsRow}>
            {dayEvents.slice(0, 3).map((event, idx) => (
              <View 
                key={event.id} 
                style={[
                  styles.dot, 
                  { backgroundColor: getEventColor(event.attendeeIds, state.familyMembers) }
                ]} 
              />
            ))}
          </View>
        </TouchableOpacity>
      );

      if ((i + 1) % 7 === 0) {
        rows.push(<View key={day.toString()} style={styles.daysRow}>{days}</View>);
        days = [];
      }
    });

    return <View>{rows}</View>;
  };

  const selectedDayEvents = state.events
    .filter(event => isSameDay(parseISO(event.startDate), selectedDate))
    .sort((a, b) => compareAsc(parseISO(a.startDate), parseISO(b.startDate)));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.calendarContainer, { backgroundColor: colors.card, paddingBottom: spacing.s }]}>
        {renderHeader()}
        {renderDays()}
        {renderCells()}
      </View>
      
      <ScrollView 
        style={styles.eventsList}
        contentContainerStyle={{ padding: spacing.m }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={[typography.title3, { color: colors.text, marginBottom: spacing.m }]}>
          {format(selectedDate, 'EEEE, MMMM d')}
        </Text>
        
        {selectedDayEvents.length > 0 ? (
          selectedDayEvents.map(event => (
            <EventCard key={event.id} event={event} onPress={handleEventPress} />
          ))
        ) : (
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.l }]}>
            No events scheduled for this day
          </Text>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: primary }]}
        onPress={handleAddEvent}
      >
        <Plus color="#FFFFFF" size={30} />
      </TouchableOpacity>

      <EventDetailModal
        event={selectedEvent}
        isVisible={isDetailVisible}
        onClose={() => setIsDetailVisible(false)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      <EventFormModal
        event={editingEvent}
        isVisible={isFormVisible}
        onClose={() => setIsFormVisible(false)}
        onSave={handleSaveEvent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarContainer: {
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  daysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  cell: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 2,
    height: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  eventsList: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
