import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFamily } from '@/contexts/FamilyContext';
import {
  isCalendarSupported,
  requestCalendarPermissions,
  getCalendarPermissionStatus,
  getDeviceCalendars,
  getCalendarEvents,
  importCalendarEvents,
  IOSCalendar,
  IOSEvent,
} from '@/services/calendarImportService';

type ImportTarget = 'family' | string; // 'family' or contact ID

export default function ImportCalendarsView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentFamily, familyMembers, contacts } = useFamily();

  // Permission state
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);

  // Calendars state
  const [calendars, setCalendars] = useState<IOSCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // Events state
  const [events, setEvents] = useState<IOSEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Import target
  const [importTarget, setImportTarget] = useState<ImportTarget>('family');
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  // Date range (default: today to 3 months ahead)
  const [startDate] = useState(() => new Date());
  const [endDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date;
  });

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    setCheckingPermission(true);
    const { granted } = await getCalendarPermissionStatus();
    setPermissionGranted(granted);
    setCheckingPermission(false);

    if (granted) {
      loadCalendars();
    }
  };

  const handleRequestPermissions = async () => {
    const { granted } = await requestCalendarPermissions();
    setPermissionGranted(granted);
    
    if (granted) {
      loadCalendars();
    } else {
      Alert.alert(
        'Permission Required',
        'Calendar access is required to import events. Please enable it in Settings.',
        [{ text: 'OK' }]
      );
    }
  };

  const loadCalendars = async () => {
    setLoadingCalendars(true);
    const { data, error } = await getDeviceCalendars();
    
    if (error) {
      Alert.alert('Error', error);
    } else if (data) {
      setCalendars(data);
    }
    setLoadingCalendars(false);
  };

  const handleSelectCalendar = async (calendarId: string) => {
    setSelectedCalendarId(calendarId);
    setLoadingEvents(true);

    const { data, error } = await getCalendarEvents(calendarId, startDate, endDate);
    
    if (error) {
      Alert.alert('Error', error);
      setEvents([]);
    } else if (data) {
      setEvents(data);
    }
    setLoadingEvents(false);
  };

  const getTargetLabel = (): string => {
    if (importTarget === 'family') {
      return 'All Family Members';
    }
    const contact = contacts.find(c => c.id === importTarget);
    return contact ? `${contact.first_name} ${contact.last_name || ''}`.trim() : 'Select Target';
  };

  const getParticipantIds = (): string[] => {
    if (importTarget === 'family') {
      // Return all family member contact IDs
      return familyMembers.map(m => m.contact_id);
    }
    // Return single contact ID
    return [importTarget];
  };

  const handleImport = async () => {
    if (!selectedCalendarId || !currentFamily) {
      Alert.alert('Error', 'Please select a calendar to import');
      return;
    }

    if (events.length === 0) {
      Alert.alert('No Events', 'No events found in the selected date range');
      return;
    }

    const participantIds = getParticipantIds();
    if (participantIds.length === 0) {
      Alert.alert('Error', 'No participants selected');
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: events.length });

    const result = await importCalendarEvents(
      selectedCalendarId,
      startDate,
      endDate,
      currentFamily.id,
      participantIds,
      (current, total) => {
        setImportProgress({ current, total });
      }
    );

    setImporting(false);

    if (result.success) {
      Alert.alert(
        'Import Complete',
        `Successfully imported ${result.imported} events.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        'Import Finished',
        `Imported ${result.imported} events, ${result.failed} failed.\n\n${result.errors.slice(0, 3).join('\n')}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Platform not supported
  if (!isCalendarSupported()) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={28} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Import Calendars</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centeredContent}>
          <Ionicons name="calendar-outline" size={64} color="#8E8E93" />
          <Text style={styles.unsupportedText}>
            Calendar import is only available on iOS devices.
          </Text>
        </View>
      </View>
    );
  }

  // Checking permissions
  if (checkingPermission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={28} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Import Calendars</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </View>
    );
  }

  // Permission not granted
  if (!permissionGranted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={28} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Import Calendars</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centeredContent}>
          <Ionicons name="calendar-outline" size={64} color="#007AFF" />
          <Text style={styles.permissionTitle}>Calendar Access Required</Text>
          <Text style={styles.permissionText}>
            To import events from your iOS calendar, FamilyCal needs permission to access your calendars.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const selectedCalendar = calendars.find(c => c.id === selectedCalendarId);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color="#1D1D1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Calendars</Text>
        <TouchableOpacity 
          onPress={handleImport} 
          style={styles.importButton}
          disabled={!selectedCalendarId || importing || events.length === 0}
        >
          <Text style={[
            styles.importButtonText,
            (!selectedCalendarId || importing || events.length === 0) && styles.importButtonTextDisabled
          ]}>
            Import
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Calendar Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Calendar</Text>
          {loadingCalendars ? (
            <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
          ) : (
            <View style={styles.calendarList}>
              {calendars.map((calendar) => (
                <TouchableOpacity
                  key={calendar.id}
                  style={[
                    styles.calendarItem,
                    selectedCalendarId === calendar.id && styles.calendarItemSelected
                  ]}
                  onPress={() => handleSelectCalendar(calendar.id)}
                >
                  <View style={[styles.calendarColor, { backgroundColor: calendar.color }]} />
                  <View style={styles.calendarInfo}>
                    <Text style={styles.calendarTitle}>{calendar.title}</Text>
                    <Text style={styles.calendarSource}>{calendar.source.name}</Text>
                  </View>
                  {selectedCalendarId === calendar.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Events Preview */}
        {selectedCalendarId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Events to Import {loadingEvents ? '' : `(${events.length})`}
            </Text>
            <Text style={styles.dateRange}>
              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </Text>
            {loadingEvents ? (
              <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
            ) : events.length === 0 ? (
              <Text style={styles.noEventsText}>No events found in this date range</Text>
            ) : (
              <View style={styles.eventsPreview}>
                {events.slice(0, 5).map((event, index) => (
                  <View key={`${event.id}-${index}`} style={styles.eventPreviewItem}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.eventDate}>
                      {event.startDate.toLocaleDateString()} 
                      {!event.allDay && ` ${event.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      {event.recurrenceRule && ' (Recurring)'}
                    </Text>
                  </View>
                ))}
                {events.length > 5 && (
                  <Text style={styles.moreEvents}>+{events.length - 5} more events</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Import Target */}
        {selectedCalendarId && events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Import To</Text>
            <TouchableOpacity
              style={styles.targetSelector}
              onPress={() => setShowTargetPicker(!showTargetPicker)}
            >
              <Text style={styles.targetLabel}>{getTargetLabel()}</Text>
              <Ionicons 
                name={showTargetPicker ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#8E8E93" 
              />
            </TouchableOpacity>

            {showTargetPicker && (
              <View style={styles.targetOptions}>
                <TouchableOpacity
                  style={[
                    styles.targetOption,
                    importTarget === 'family' && styles.targetOptionSelected
                  ]}
                  onPress={() => {
                    setImportTarget('family');
                    setShowTargetPicker(false);
                  }}
                >
                  <Ionicons name="people" size={20} color="#007AFF" />
                  <Text style={styles.targetOptionText}>All Family Members</Text>
                  {importTarget === 'family' && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>

                {familyMembers.map((member) => {
                  const contact = member.contact;
                  const name = `${contact.first_name} ${contact.last_name || ''}`.trim();
                  return (
                    <TouchableOpacity
                      key={member.contact_id}
                      style={[
                        styles.targetOption,
                        importTarget === member.contact_id && styles.targetOptionSelected
                      ]}
                      onPress={() => {
                        setImportTarget(member.contact_id);
                        setShowTargetPicker(false);
                      }}
                    >
                      <View style={[
                        styles.memberColorDot, 
                        { backgroundColor: contact.color || '#007AFF' }
                      ]} />
                      <Text style={styles.targetOptionText}>{name}</Text>
                      {importTarget === member.contact_id && (
                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Import Progress Overlay */}
      {importing && (
        <View style={styles.importOverlay} pointerEvents="auto">
          <View style={styles.importModal}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.progressText}>
              Importing {importProgress.current}/{importProgress.total} events...
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      importProgress.total > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (importProgress.current / importProgress.total) * 100
                            )
                          )
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  backButton: {
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
  importButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  importButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  importButtonTextDisabled: {
    color: '#C7C7CC',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  unsupportedText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  loader: {
    marginVertical: 16,
  },
  calendarList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  calendarItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  calendarColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 12,
  },
  calendarInfo: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 16,
    color: '#1D1D1F',
    fontWeight: '500',
  },
  calendarSource: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  dateRange: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  noEventsText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  eventsPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventPreviewItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  eventTitle: {
    fontSize: 16,
    color: '#1D1D1F',
    fontWeight: '500',
  },
  eventDate: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  moreEvents: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    paddingVertical: 12,
  },
  targetSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
  },
  targetLabel: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  targetOptions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  targetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  targetOptionSelected: {
    backgroundColor: '#F0F8FF',
  },
  targetOptionText: {
    fontSize: 16,
    color: '#1D1D1F',
    flex: 1,
    marginLeft: 12,
  },
  memberColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  progressBar: {
    width: '100%',
    height: 10,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  importOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  importModal: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
});
