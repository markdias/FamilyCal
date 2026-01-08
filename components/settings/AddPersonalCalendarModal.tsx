import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getDeviceCalendars,
  requestCalendarPermissions,
  getCalendarPermissionStatus,
  IOSCalendar,
} from '@/services/calendarImportService';
import {
  getPersonalCalendars,
  addPersonalCalendar,
} from '@/services/personalCalendarService';

interface AddPersonalCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onCalendarAdded: () => void;
}

interface GroupedCalendars {
  [sourceName: string]: IOSCalendar[];
}

export default function AddPersonalCalendarModal({
  visible,
  onClose,
  onCalendarAdded,
}: AddPersonalCalendarModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { currentFamily } = useFamily();

  const [availableCalendars, setAvailableCalendars] = useState<IOSCalendar[]>([]);
  const [addedCalendarIds, setAddedCalendarIds] = useState<Set<string>>(new Set());
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const separatorColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const accentColor = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');

  useEffect(() => {
    if (visible) {
      loadCalendars();
    } else {
      // Reset state when modal closes
      setSelectedCalendarIds(new Set());
    }
  }, [visible]);

  const loadCalendars = async () => {
    if (Platform.OS !== 'ios') {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Check permissions
    const { granted } = await getCalendarPermissionStatus();
    if (!granted) {
      const { granted: newGranted } = await requestCalendarPermissions();
      if (!newGranted) {
        Alert.alert(
          'Permission Required',
          'Calendar access is required to add personal calendars.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }
    }

    setPermissionGranted(true);

    // Load available calendars
    const { data: calendars, error } = await getDeviceCalendars();
    if (error) {
      Alert.alert('Error', error);
      setLoading(false);
      return;
    }

    if (calendars) {
      setAvailableCalendars(calendars);

      // Load already-added calendars
      if (user && currentFamily) {
        const { data: addedCalendars } = await getPersonalCalendars(user.id, currentFamily.id);
        if (addedCalendars) {
          const addedIds = new Set(addedCalendars.map((cal) => cal.calendar_id));
          setAddedCalendarIds(addedIds);
        }
      }
    }

    setLoading(false);
  };

  const toggleCalendarSelection = (calendarId: string) => {
    const newSelected = new Set(selectedCalendarIds);
    if (newSelected.has(calendarId)) {
      newSelected.delete(calendarId);
    } else {
      newSelected.add(calendarId);
    }
    setSelectedCalendarIds(newSelected);
  };

  const handleDone = async () => {
    if (!user || !currentFamily || selectedCalendarIds.size === 0) {
      return;
    }

    setSaving(true);

    try {
      const selectedCalendars = availableCalendars.filter((cal) =>
        selectedCalendarIds.has(cal.id)
      );

      // Add each selected calendar
      for (const calendar of selectedCalendars) {
        const { error } = await addPersonalCalendar(user.id, currentFamily.id, calendar);
        if (error) {
          console.error(`Error adding calendar ${calendar.title}:`, error);
        }
      }

      onCalendarAdded();
    } catch (error) {
      console.error('Error saving calendars:', error);
      Alert.alert('Error', 'Failed to add some calendars');
    } finally {
      setSaving(false);
    }
  };

  // Group calendars by source
  const groupedCalendars: GroupedCalendars = availableCalendars.reduce((acc, calendar) => {
    const sourceName = calendar.source.name || 'Other';
    if (!acc[sourceName]) {
      acc[sourceName] = [];
    }
    acc[sourceName].push(calendar);
    return acc;
  }, {} as GroupedCalendars);

  // Sort source names (put "iCloud" first, then alphabetically)
  const sortedSourceNames = Object.keys(groupedCalendars).sort((a, b) => {
    if (a === 'iCloud') return -1;
    if (b === 'iCloud') return 1;
    return a.localeCompare(b);
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: cardColor }]}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: accentColor }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Add Personal Calendar</Text>
          <TouchableOpacity
            onPress={handleDone}
            style={styles.doneButton}
            disabled={selectedCalendarIds.size === 0 || saving}>
            <Ionicons
              name="checkmark"
              size={24}
              color={selectedCalendarIds.size === 0 || saving ? subTextColor : accentColor}
            />
            <Text
              style={[
                styles.doneText,
                {
                  color: selectedCalendarIds.size === 0 || saving ? subTextColor : accentColor,
                },
              ]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={[styles.loadingText, { color: subTextColor }]}>
              Loading calendars...
            </Text>
          </View>
        ) : !permissionGranted ? (
          <View style={styles.centeredContent}>
            <Ionicons name="calendar-outline" size={64} color={subTextColor} />
            <Text style={[styles.permissionText, { color: subTextColor }]}>
              Calendar access is required
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 20 },
            ]}
            showsVerticalScrollIndicator={false}>
            {sortedSourceNames.map((sourceName) => {
              const calendars = groupedCalendars[sourceName];
              const availableCalendars = calendars.filter(
                (cal) => !addedCalendarIds.has(cal.id)
              );

              if (availableCalendars.length === 0) {
                return null;
              }

              return (
                <View key={sourceName} style={styles.sourceGroup}>
                  <Text style={[styles.sourceHeader, { color: subTextColor }]}>{sourceName}</Text>
                  <View style={[styles.calendarGroup, { backgroundColor: cardColor }]}>
                    {availableCalendars.map((calendar, index) => {
                      const isSelected = selectedCalendarIds.has(calendar.id);
                      const isLast = index === availableCalendars.length - 1;

                      return (
                        <React.Fragment key={calendar.id}>
                          <TouchableOpacity
                            style={styles.calendarItem}
                            onPress={() => toggleCalendarSelection(calendar.id)}>
                            <View
                              style={[
                                styles.colorDot,
                                { backgroundColor: calendar.color },
                              ]}
                            />
                            <Text style={[styles.calendarName, { color: textColor }]}>
                              {calendar.title}
                            </Text>
                            {isSelected ? (
                              <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                            ) : (
                              <View style={[styles.emptyCircle, { borderColor: separatorColor }]} />
                            )}
                          </TouchableOpacity>
                          {!isLast && (
                            <View style={[styles.separator, { backgroundColor: separatorColor }]} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  doneText: {
    fontSize: 17,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sourceGroup: {
    marginBottom: 24,
  },
  sourceHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  calendarGroup: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  calendarName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  separator: {
    height: 1,
    marginLeft: 28,
  },
});
