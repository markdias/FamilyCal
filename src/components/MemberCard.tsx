import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FamilyMember, CalendarEvent } from '../types/models';
import { useTheme } from '../hooks/useTheme';
import { useAppContext } from '../context/AppContext';
import { Card } from './Card';
import { EventCard } from './EventCard';
import { isSameDay, parseISO, compareAsc } from 'date-fns';

interface MemberCardProps {
  member: FamilyMember;
  onEventPress: (event: CalendarEvent) => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, onEventPress }) => {
  const { colors, typography, spacing } = useTheme();
  const { state } = useAppContext();

  // Get next 3 events for this member
  const memberEvents = state.events
    .filter(event => event.attendeeIds.includes(member.id))
    .filter(event => new Date(event.startDate) >= new Date())
    .sort((a, b) => compareAsc(parseISO(a.startDate), parseISO(b.startDate)))
    .slice(0, 3);

  return (
    <TouchableOpacity 
      style={{ marginBottom: spacing.l }}
      onLongPress={() => {}} // Placeholder for drag reorder
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: member.color }]}>
          <Text style={[typography.body, { color: '#FFFFFF', fontWeight: 'bold' }]}>
            {member.avatarInitials}
          </Text>
        </View>
        <Text style={[typography.title3, { color: colors.text, marginLeft: spacing.s }]}>
          {member.name}
        </Text>
      </View>
      
      {memberEvents.length > 0 ? (
        memberEvents.map(event => (
          <EventCard key={event.id} event={event} onPress={onEventPress} />
        ))
      ) : (
        <Card>
          <Text style={[typography.footnote, { color: colors.textSecondary, textAlign: 'center' }]}>
            No more events today
          </Text>
        </Card>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
