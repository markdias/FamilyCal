import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getPersonalCalendars,
  updatePersonalCalendar,
  deletePersonalCalendar,
  PersonalCalendar,
} from '@/services/personalCalendarService';
import AddPersonalCalendarModal from './AddPersonalCalendarModal';

export default function PersonalCalendarsView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { currentFamily } = useFamily();

  const [calendars, setCalendars] = useState<PersonalCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [updatingCalendarId, setUpdatingCalendarId] = useState<string | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const separatorColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');

  const loadCalendars = useCallback(async () => {
    if (!user || !currentFamily) {
      setCalendars([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await getPersonalCalendars(user.id, currentFamily.id);

    if (error) {
      console.error('Error loading calendars:', error);
      Alert.alert('Error', 'Failed to load personal calendars');
    } else {
      setCalendars(data || []);
    }
    setLoading(false);
  }, [user, currentFamily]);

  useEffect(() => {
    loadCalendars();
  }, [loadCalendars]);

  const handleToggleFamilyView = async (calendar: PersonalCalendar) => {
    if (!user) return;

    setUpdatingCalendarId(calendar.id);
    const { error } = await updatePersonalCalendar(calendar.id, {
      show_in_family_view: !calendar.show_in_family_view,
    });

    if (error) {
      Alert.alert('Error', 'Failed to update calendar setting');
      setUpdatingCalendarId(null);
    } else {
      // Reload calendars to get updated state
      await loadCalendars();
      setUpdatingCalendarId(null);
    }
  };

  const handleDelete = async (calendar: PersonalCalendar) => {
    Alert.alert(
      'Delete Calendar',
      `Are you sure you want to remove "${calendar.calendar_title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deletePersonalCalendar(calendar.id);
            if (error) {
              Alert.alert('Error', 'Failed to delete calendar');
            } else {
              await loadCalendars();
            }
          },
        },
      ]
    );
  };

  const handleCalendarAdded = () => {
    setShowAddModal(false);
    loadCalendars();
  };

  // Platform not supported
  if (Platform.OS !== 'ios') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor }]}>
        <View style={[styles.header, { backgroundColor: cardColor }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Personal Calendars</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centeredContent}>
          <Ionicons name="calendar-outline" size={64} color={subTextColor} />
          <Text style={[styles.unsupportedText, { color: subTextColor }]}>
            Personal calendars are only available on iOS devices.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Personal Calendars</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: surfaceColor }]}>
          <Ionicons name="information-circle" size={20} color={subTextColor} />
          <Text style={[styles.infoText, { color: subTextColor }]}>
            All personal calendars are visible in Calendar view
          </Text>
        </View>

        {/* Calendars List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={textColor} />
          </View>
        ) : calendars.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: cardColor }]}>
            <Ionicons name="calendar-outline" size={48} color={subTextColor} />
            <Text style={[styles.emptyText, { color: subTextColor }]}>
              No personal calendars added
            </Text>
            <Text style={[styles.emptySubtext, { color: subTextColor }]}>
              Add calendars to see their events in your family calendar
            </Text>
          </View>
        ) : (
          <View style={[styles.calendarList, { backgroundColor: cardColor }]}>
            {calendars.map((calendar, index) => (
              <React.Fragment key={calendar.id}>
                <View style={styles.calendarItem}>
                  {/* Color Bar */}
                  <View
                    style={[
                      styles.colorBar,
                      { backgroundColor: calendar.calendar_color },
                    ]}
                  />

                  {/* Calendar Info */}
                  <View style={styles.calendarInfo}>
                    <Text style={[styles.calendarTitle, { color: textColor }]}>
                      {calendar.calendar_title}
                    </Text>
                    <Text style={[styles.familyViewStatus, { color: subTextColor }]}>
                      Family view {calendar.show_in_family_view ? 'on' : 'off'}
                    </Text>
                  </View>

                  {/* Toggle Switch */}
                  <Switch
                    value={calendar.show_in_family_view}
                    onValueChange={() => handleToggleFamilyView(calendar)}
                    disabled={updatingCalendarId === calendar.id}
                    trackColor={{ false: separatorColor, true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    style={styles.toggle}
                  />

                  {/* Delete Button */}
                  <TouchableOpacity
                    onPress={() => handleDelete(calendar)}
                    style={styles.deleteButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={20} color={subTextColor} />
                  </TouchableOpacity>
                </View>
                {index < calendars.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: separatorColor }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Add Calendar Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: cardColor, borderColor: separatorColor }]}
          onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={20} color={subTextColor} />
          <Text style={[styles.addButtonText, { color: subTextColor }]}>
            Add Personal Calendar
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Calendar Modal */}
      <AddPersonalCalendarModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCalendarAdded={handleCalendarAdded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
  },
  calendarList: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  colorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  calendarInfo: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 17,
    fontWeight: '400',
    marginBottom: 2,
  },
  familyViewStatus: {
    fontSize: 15,
    fontWeight: '400',
  },
  toggle: {
    marginHorizontal: 12,
  },
  deleteButton: {
    padding: 8,
  },
  separator: {
    height: 1,
    marginLeft: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '400',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  unsupportedText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});
