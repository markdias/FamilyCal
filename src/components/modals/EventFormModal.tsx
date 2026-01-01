import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Switch,
  Alert
} from 'react-native';
import { CalendarEvent, FamilyMember } from '../../types/models';
import { useTheme } from '../../hooks/useTheme';
import { format, parseISO, addHours, startOfHour } from 'date-fns';
import { X, Check } from 'lucide-react-native';
import { getEventColor } from '../../utils/colorUtils';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../Button';

interface EventFormModalProps {
  event: Partial<CalendarEvent> | null;
  isVisible: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  event,
  isVisible,
  onClose,
  onSave,
}) => {
  const { colors, spacing, typography, primary } = useTheme();
  const { state } = useAppContext();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addHours(new Date(), 1));
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setLocation(event.location || '');
      setNotes(event.notes || '');
      setStartDate(event.startDate ? parseISO(event.startDate) : startOfHour(addHours(new Date(), 1)));
      setEndDate(event.endDate ? parseISO(event.endDate) : startOfHour(addHours(new Date(), 2)));
      setIsAllDay(event.isAllDay || false);
      setSelectedAttendees(event.attendeeIds || state.familyMembers.map(m => m.id));
    }
  }, [event, isVisible]);

  const toggleAttendee = (id: string) => {
    if (selectedAttendees.includes(id)) {
      setSelectedAttendees(selectedAttendees.filter(a => a !== id));
    } else {
      setSelectedAttendees([...selectedAttendees, id]);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    const newEvent: CalendarEvent = {
      id: event?.id || Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      location: location.trim(),
      notes: notes.trim(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isAllDay,
      attendeeIds: selectedAttendees,
    };

    onSave(newEvent);
    onClose();
  };

  const previewColor = getEventColor(selectedAttendees, state.familyMembers);

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
            <Text style={[typography.title3, { color: colors.text }]}>
              {event?.id ? 'Edit Event' : 'New Event'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Check color={primary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.titleInput, typography.title2, { color: colors.text }]}
                placeholder="Event Title"
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                autoFocus={!event?.id}
              />
              <View style={[styles.colorLine, { backgroundColor: previewColor }]} />
            </View>

            <View style={styles.section}>
              <View style={styles.row}>
                <Text style={[typography.body, { color: colors.text }]}>All-day</Text>
                <Switch
                  value={isAllDay}
                  onValueChange={setIsAllDay}
                  trackColor={{ false: colors.border, true: primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            <View style={[styles.section, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <TouchableOpacity style={styles.row}>
                <Text style={[typography.body, { color: colors.text }]}>Starts</Text>
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  {format(startDate, isAllDay ? 'EEE, MMM d' : 'EEE, MMM d, h:mm a')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.row, { marginTop: spacing.m }]}>
                <Text style={[typography.body, { color: colors.text }]}>Ends</Text>
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  {format(endDate, isAllDay ? 'EEE, MMM d' : 'EEE, MMM d, h:mm a')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.section, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.input, typography.body, { color: colors.text }]}
                placeholder="Location"
                placeholderTextColor={colors.textSecondary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={[styles.section, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={[typography.body, { color: colors.text, marginBottom: spacing.m }]}>Attendees</Text>
              <View style={styles.attendeesContainer}>
                {state.familyMembers.map(member => {
                  const isSelected = selectedAttendees.includes(member.id);
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[
                        styles.attendeeItem,
                        { borderColor: member.color, backgroundColor: isSelected ? member.color : 'transparent' }
                      ]}
                      onPress={() => toggleAttendee(member.id)}
                    >
                      <Text style={[
                        typography.footnote,
                        { color: isSelected ? '#FFFFFF' : member.color, fontWeight: 'bold' }
                      ]}>
                        {member.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.section, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.input, typography.body, { color: colors.text, height: 100, textAlignVertical: 'top' }]}
                placeholder="Notes"
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline={true}
              />
            </View>

            <Button
              title="Save Event"
              onPress={handleSave}
              style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}
            />
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
    height: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  body: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  titleInput: {
    paddingVertical: 8,
    fontWeight: 'bold',
  },
  colorLine: {
    height: 4,
    width: 60,
    borderRadius: 2,
    marginTop: 4,
  },
  section: {
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    paddingVertical: 8,
  },
  attendeesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  attendeeItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
});
