import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { format, parseISO, startOfDay, addHours, isSameDay } from 'date-fns';
import { useTheme } from '../hooks/useTheme';
import { useAppContext } from '../context/AppContext';
import { getEventColor } from '../utils/colorUtils';
import { EventDetailModal } from '../components/modals/EventDetailModal';
import { EventFormModal } from '../components/modals/EventFormModal';
import { CalendarEvent } from '../types/models';

export const DayView = () => {
  const { colors, spacing, typography, primary } = useTheme();
  const { state, dispatch } = useAppContext();
  const [refreshing, setRefreshing] = React.useState(false);

  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [isDetailVisible, setIsDetailVisible] = React.useState(false);
  const [isFormVisible, setIsFormVisible] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<Partial<CalendarEvent> | null>(null);

  const selectedDate = parseISO(state.selectedDate);
  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM

  const handleEventPress = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailVisible(true);
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

  const dayEvents = state.events
    .filter(event => !event.isAllDay && isSameDay(parseISO(event.startDate), selectedDate));

  const allDayEvents = state.events
    .filter(event => event.isAllDay && isSameDay(parseISO(event.startDate), selectedDate));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[typography.title3, { color: colors.text }]}>
          {format(selectedDate, 'EEEE, MMMM d')}
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {allDayEvents.length > 0 && (
          <View style={[styles.allDayContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[typography.footnote, { color: colors.textSecondary, width: 60 }]}>All Day</Text>
            <View style={{ flex: 1 }}>
              {allDayEvents.map(event => (
                <TouchableOpacity 
                  key={event.id} 
                  style={[
                    styles.allDayEvent, 
                    { backgroundColor: getEventColor(event.attendeeIds, state.familyMembers) + '20', borderColor: getEventColor(event.attendeeIds, state.familyMembers) }
                  ]}
                  onPress={() => handleEventPress(event)}
                >
                  <Text style={[typography.subheadline, { color: colors.text, fontWeight: '600' }]}>{event.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.timeline}>
          {hours.map(hour => {
            const timeDate = addHours(startOfDay(selectedDate), hour);
            const hourEvents = dayEvents.filter(event => {
              const start = parseISO(event.startDate);
              return start.getHours() === hour;
            });

            return (
              <View key={hour} style={styles.hourRow}>
                <View style={styles.timeColumn}>
                  <Text style={[typography.footnote, { color: colors.textSecondary }]}>
                    {format(timeDate, 'h a')}
                  </Text>
                </View>
                <View style={[styles.eventColumn, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  {hourEvents.map(event => {
                    const start = parseISO(event.startDate);
                    const end = parseISO(event.endDate);
                    const durationInHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    const eventColor = getEventColor(event.attendeeIds, state.familyMembers);

                    return (
                      <TouchableOpacity
                        key={event.id}
                        style={[
                          styles.eventBlock,
                          {
                            backgroundColor: eventColor + '20',
                            borderColor: eventColor,
                            height: Math.max(40, durationInHours * 60),
                            top: (start.getMinutes() / 60) * 60,
                          }
                        ]}
                        onPress={() => handleEventPress(event)}
                      >
                        <Text style={[typography.footnote, { color: colors.text, fontWeight: 'bold' }]} numberOfLines={1}>
                          {event.title}
                        </Text>
                        {durationInHours > 0.5 && (
                          <Text style={[typography.footnote, { color: colors.textSecondary }]} numberOfLines={1}>
                            {event.location}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

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
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  allDayContainer: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
  },
  allDayEvent: {
    padding: 6,
    borderRadius: 4,
    borderLeftWidth: 4,
    marginBottom: 4,
  },
  timeline: {
    paddingRight: 16,
  },
  hourRow: {
    flexDirection: 'row',
    height: 60,
  },
  timeColumn: {
    width: 60,
    alignItems: 'center',
    paddingTop: 8,
  },
  eventColumn: {
    flex: 1,
    position: 'relative',
  },
  eventBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 4,
    borderLeftWidth: 4,
    padding: 4,
    zIndex: 1,
  },
});
