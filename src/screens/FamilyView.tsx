import React from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAppContext } from '../context/AppContext';
import { MemberCard } from '../components/MemberCard';
import { Button } from '../components/Button';
import { Plus } from 'lucide-react-native';
import { EventDetailModal } from '../components/modals/EventDetailModal';
import { EventFormModal } from '../components/modals/EventFormModal';
import { CalendarEvent } from '../types/models';

export const FamilyView = () => {
  const { colors, spacing, typography, primary } = useTheme();
  const { state, dispatch } = useAppContext();
  const [refreshing, setRefreshing] = React.useState(false);

  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [isDetailVisible, setIsDetailVisible] = React.useState(false);
  const [isFormVisible, setIsFormVisible] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<Partial<CalendarEvent> | null>(null);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.m }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={[typography.title1, { color: colors.text, marginBottom: spacing.l }]}>
          Our Family
        </Text>
        
        {state.familyMembers.map(member => (
          <MemberCard 
            key={member.id} 
            member={member} 
            onEventPress={handleEventPress}
          />
        ))}
        
        <Button
          title="Add Family Member"
          onPress={() => {}}
          variant="secondary"
          style={{ marginTop: spacing.m }}
          textStyle={{ fontSize: 16 }}
        />
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
});
