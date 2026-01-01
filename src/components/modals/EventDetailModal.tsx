import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { CalendarEvent } from '../../types/models';
import { useTheme } from '../../hooks/useTheme';
import { format, parseISO } from 'date-fns';
import { X, MapPin, AlignLeft, Users, Clock, Edit2, Trash2 } from 'lucide-react-native';
import { getEventColor } from '../../utils/colorUtils';
import { useAppContext } from '../../context/AppContext';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  isVisible: boolean;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isVisible,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { colors, spacing, typography, primary } = useTheme();
  const { state } = useAppContext();

  if (!event) return null;

  const eventColor = getEventColor(event.attendeeIds, state.familyMembers);
  const attendees = state.familyMembers.filter(m => event.attendeeIds.includes(m.id));

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => onEdit(event)} style={{ marginRight: spacing.m }}>
                <Edit2 color={primary} size={22} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(event.id)}>
                <Trash2 color={colors.error} size={22} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.body}>
            <View style={[styles.titleContainer, { borderLeftColor: eventColor }]}>
              <Text style={[typography.title2, { color: colors.text }]}>{event.title}</Text>
            </View>

            <View style={styles.infoRow}>
              <Clock size={20} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={[typography.body, { color: colors.text }]}>
                  {format(parseISO(event.startDate), 'EEEE, MMMM d, yyyy')}
                </Text>
                <Text style={[typography.subheadline, { color: colors.textSecondary }]}>
                  {event.isAllDay 
                    ? 'All Day' 
                    : `${format(parseISO(event.startDate), 'h:mm a')} - ${format(parseISO(event.endDate), 'h:mm a')}`}
                </Text>
              </View>
            </View>

            {event.location && (
              <View style={styles.infoRow}>
                <MapPin size={20} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[typography.body, { color: colors.text }]}>{event.location}</Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <Users size={20} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={[typography.body, { color: colors.text, marginBottom: spacing.xs }]}>Attendees</Text>
                <View style={styles.attendeesList}>
                  {attendees.map(member => (
                    <View key={member.id} style={[styles.attendeeBadge, { backgroundColor: member.color + '20' }]}>
                      <View style={[styles.dot, { backgroundColor: member.color }]} />
                      <Text style={[typography.footnote, { color: member.color, fontWeight: 'bold' }]}>{member.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {event.notes && (
              <View style={styles.infoRow}>
                <AlignLeft size={20} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[typography.body, { color: colors.text }]}>{event.notes}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerActions: {
    flexDirection: 'row',
  },
  body: {
    padding: 24,
  },
  titleContainer: {
    borderLeftWidth: 4,
    paddingLeft: 16,
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  attendeesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  attendeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
