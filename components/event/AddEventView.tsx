import React, { useState, useCallback } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MemberPicker, SelectedMembersDisplay } from './MemberPicker';
import { WebDatePicker, WebTimePicker } from './WebDatePicker';
import { LocationPicker } from './LocationPicker';
import { useFamily } from '@/contexts/FamilyContext';
import { useEventCache , getCacheKeysForEventDate } from '@/contexts/EventCacheContext';
import { useSelectedDate } from '@/contexts/SelectedDateContext';
import { createEvent } from '@/services/eventService';
import type { ReminderInput, RecurrenceInput } from '@/services/eventService';
import { trackLocationUsage } from '@/services/recentLocationsService';
import { useThemeColor } from '@/hooks/use-theme-color';

// Only import DateTimePicker on native platforms
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export interface AddEventViewProps {
  onAddRef?: (handler: () => Promise<void>) => void;
}

export function AddEventView({ onAddRef }: AddEventViewProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentFamily, contacts } = useFamily();
  const eventCache = useEventCache();
  const { selectedDate, clearSelectedDate } = useSelectedDate();
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState<import('@/services/locationService').LocationResult | null>(null);
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isAllDay, setIsAllDay] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [travelTimeMinutes, setTravelTimeMinutes] = useState<number | null>(null);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [availability, setAvailability] = useState<'busy' | 'free'>('busy');
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [alerts, setAlerts] = useState<ReminderInput[]>([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceInput>({
    isRecurring: false,
    frequency: null as any,
    interval: 1,
    daysOfWeek: [],
    count: undefined,
    endDate: undefined,
    weekStart: 'MO',
  });
  const [recurrenceEndMode, setRecurrenceEndMode] = useState<'never' | 'onDate' | 'afterCount'>('never');
  const [showRecurrenceEndDatePicker, setShowRecurrenceEndDatePicker] = useState(false);
  
  // Date/time state - use selected date if available, otherwise default to today with 1 hour event
  const getInitialDates = () => {
    const baseDate = selectedDate || new Date();
    const defaultStart = new Date(baseDate);
    
    // If selected date is provided, set to 9 AM on that date
    if (selectedDate) {
      defaultStart.setHours(9, 0, 0, 0);
    } else {
      // Default to next hour
      defaultStart.setHours(baseDate.getHours() + 1, 0, 0, 0);
    }
    
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setHours(defaultStart.getHours() + 1);
    
    return { defaultStart, defaultEnd };
  };
  
  const { defaultStart, defaultEnd } = getInitialDates();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  
  // Date/time picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [activePicker, setActivePicker] = useState<'startDate' | 'startTime' | 'endDate' | 'endTime' | null>(null);

  // Reset form when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Reset all form fields
      setTitle('');
      setLocation(null);
      setNotes('');
      setUrl('');
      setSelectedMembers([]);
      setIsAllDay(false);
      setIsLoading(false);
      setTravelTimeMinutes(null);
      setSelectedDriverId(null);
      setAvailability('busy');
      setAlerts([]);
      setRecurrence({
        isRecurring: false,
        frequency: null as any,
        interval: 1,
        daysOfWeek: [],
        count: undefined,
        endDate: undefined,
        weekStart: 'MO',
      });
      setRecurrenceEndMode('never');
      setShowRecurrenceEndDatePicker(false);
      
      // Reset dates - use selected date if available
      const baseDate = selectedDate || new Date();
      const newStart = new Date(baseDate);
      
      if (selectedDate) {
        newStart.setHours(9, 0, 0, 0);
      } else {
        newStart.setHours(baseDate.getHours() + 1, 0, 0, 0);
      }
      
      const newEnd = new Date(newStart);
      newEnd.setHours(newStart.getHours() + 1);
      
      setStartDate(newStart);
      setEndDate(newEnd);
    }, [selectedDate])
  );

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
    });
  };

  const recurrenceLabel = () => {
    if (!recurrence.isRecurring || !recurrence.frequency) return 'None';
    const base = recurrence.frequency.charAt(0).toUpperCase() + recurrence.frequency.slice(1);
    if (recurrence.frequency === 'weekly' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
      return `${base} (${recurrence.daysOfWeek.join(',')})`;
    }
    if (recurrence.interval && recurrence.interval > 1) {
      return `${base} every ${recurrence.interval}`;
    }
    return base;
  };

  const alertsLabel = () => {
    if (!alerts.length) return 'None';
    if (alerts.length === 1) return formatAlert(alerts[0]);
    return `${alerts.length} alerts`;
  };

  const formatAlert = (alert: ReminderInput) => {
    const unit = alert.type;
    const value = alert.value;
    const mapLabel: Record<string, string> = {
      minutes: 'min',
      hours: 'hr',
      days: 'day',
      weeks: 'wk',
    };
    if (alert.type === 'minutes' && value === 0) return 'At time of event';
    return `${value} ${mapLabel[unit]} before`;
  };

  const toggleDayOfWeek = (day: string) => {
    setRecurrence((prev) => {
      const days = prev.daysOfWeek || [];
      const exists = days.includes(day);
      const nextDays = exists ? days.filter((d) => d !== day) : [...days, day];
      return { ...prev, daysOfWeek: nextDays, isRecurring: true, frequency: 'weekly' };
    });
  };

  const setFrequency = (freq: RecurrenceInput['frequency'] | null) => {
    if (!freq) {
      setRecurrence({
        isRecurring: false,
        frequency: null as any,
        interval: 1,
        daysOfWeek: [],
        count: undefined,
        endDate: undefined,
        weekStart: 'MO',
      });
      setRecurrenceEndMode('never');
      return;
    }
    setRecurrence((prev) => ({
      ...prev,
      isRecurring: true,
      frequency: freq,
      interval: prev.interval || 1,
    }));
  };

  const setEndMode = (mode: 'never' | 'onDate' | 'afterCount') => {
    setRecurrenceEndMode(mode);
    if (mode === 'never') {
      setRecurrence((prev) => ({ ...prev, count: undefined, endDate: undefined }));
    }
  };

  const addAlert = (alert: ReminderInput) => {
    setAlerts((prev) => {
      const key = `${alert.type}-${alert.value}`;
      const exists = prev.some((a) => `${a.type}-${a.value}` === key);
      if (exists) return prev;
      return [...prev, alert];
    });
  };

  const removeAlert = (index: number) => {
    setAlerts((prev) => prev.filter((_, i) => i !== index));
  };

  const getDriverName = () => {
    if (!selectedDriverId) return 'None';
    const contact = contacts.find((c) => c.id === selectedDriverId);
    return contact ? `${contact.first_name} ${contact.last_name || ''}`.trim() : 'None';
  };


  const travelOptions = [0, 5, 10, 15, 30, 45, 60];
  const alertOptions: ReminderInput[] = [
    { type: 'minutes', value: 0 },
    { type: 'minutes', value: 5 },
    { type: 'minutes', value: 10 },
    { type: 'minutes', value: 15 },
    { type: 'minutes', value: 30 },
    { type: 'minutes', value: 60 },
    { type: 'hours', value: 2 },
    { type: 'days', value: 1 },
  ];

  // Handle date/time picker changes (native)
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setActivePicker(null);
    }
    
    if (event?.type === 'dismissed') {
      setActivePicker(null);
      return;
    }
    
    if (!selectedDate) return;

    applyDateChange(selectedDate);
  };

  // Apply the date change based on active picker
  const applyDateChange = (selectedDate: Date) => {
    if (activePicker === 'startDate' || activePicker === 'startTime') {
      const newStart = new Date(startDate);
      if (activePicker === 'startDate') {
        newStart.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      } else {
        newStart.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      }
      setStartDate(newStart);
      
      // If end date is now before start date, update it
      if (endDate <= newStart) {
        const newEnd = new Date(newStart);
        newEnd.setHours(newStart.getHours() + 1);
        setEndDate(newEnd);
      }
    } else if (activePicker === 'endDate' || activePicker === 'endTime') {
      const newEnd = new Date(endDate);
      if (activePicker === 'endDate') {
        newEnd.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      } else {
        newEnd.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      }
      
      // Ensure end is after start
      if (newEnd > startDate) {
        setEndDate(newEnd);
      } else {
        Alert.alert('Invalid Time', 'End time must be after start time');
      }
    }
  };

  const openPicker = (picker: 'startDate' | 'startTime' | 'endDate' | 'endTime') => {
    setActivePicker(picker);
  };

  const closePicker = () => {
    setActivePicker(null);
  };


  const buildRecurrencePayload = (): RecurrenceInput => {
    if (!recurrence.isRecurring) return { isRecurring: false };
    const freq = recurrence.frequency || 'daily';
    const interval = recurrence.interval && recurrence.interval > 0 ? recurrence.interval : 1;
    const daysOfWeek =
      recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0
        ? recurrence.daysOfWeek
        : undefined;
    const count =
      recurrenceEndMode === 'afterCount' && recurrence.count && recurrence.count > 0
        ? recurrence.count
        : undefined;
    const endDate = recurrenceEndMode === 'onDate' ? recurrence.endDate : undefined;
    return {
      isRecurring: true,
      frequency: freq,
      interval,
      daysOfWeek,
      count,
      endDate,
      weekStart: recurrence.weekStart || 'MO',
    };
  };

  const handleAddEvent = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter an event title');
      return;
    }

    if (!currentFamily) {
      Alert.alert('No Family', 'Please create or join a family first');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Creating event with participants:', selectedMembers);
      
      const recurrencePayload = buildRecurrencePayload();

      const { data, error } = await createEvent(
        currentFamily.id,
        {
          title: title.trim(),
          url: url.trim() || undefined,
          startTime: startDate,
          endTime: endDate,
          isAllDay,
          location: location?.address || undefined,
          structuredLocationTitle: location?.title || undefined,
          structuredLocationAddress: location?.address || undefined,
          structuredLocationLatitude: location?.latitude,
          structuredLocationLongitude: location?.longitude,
          notes: notes.trim() || undefined,
          travelTimeMinutes: travelTimeMinutes ?? undefined,
          availability,
          isRecurring: recurrencePayload.isRecurring,
          recurrence: recurrencePayload,
          dropOffDriverId: selectedDriverId || undefined,
        },
        selectedMembers.length > 0 ? selectedMembers : undefined,
        alerts
      );

      console.log('[AddEventView] Event creation result:', { 
        hasData: !!data, 
        hasError: !!error,
        eventId: data?.id,
        errorMessage: error?.message 
      });

      if (error) {
        console.error('[AddEventView] Event creation error:', error);
        throw error;
      }

      if (!data) {
        console.error('[AddEventView] Event creation returned no data');
        throw new Error('Event was not created. Please try again.');
      }

      console.log('[AddEventView] Event created successfully:', data.id);
      console.log('[AddEventView] Event start time:', startDate.toISOString());
      console.log('[AddEventView] Event is in the future:', startDate > new Date());

      // Track location usage for recent locations
      if (location && !location.title) {
        // Only track if not a favorite (favorites have titles)
        await trackLocationUsage(currentFamily.id, {
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          placeId: location.placeId,
        });
      }

      // Invalidate cache for the event date and trigger refresh
      const eventDate = new Date(startDate);
      const keysToInvalidate = getCacheKeysForEventDate(eventDate);
      console.log('[AddEventView] Invalidating cache keys:', keysToInvalidate);
      eventCache.invalidateCache(keysToInvalidate);
      
      // Trigger refresh for today and upcoming (always needed for FamilyView)
      // Use a longer delay to ensure database transaction is committed
      // and realtime subscription has time to process
      setTimeout(async () => {
        console.log('[AddEventView] Refreshing cache for today and upcoming...');
        await Promise.all([
          eventCache.refreshCache('today'),
          eventCache.refreshCache('upcoming'),
        ]);
        console.log('[AddEventView] Cache refresh completed');
      }, 500);

      // Clear selected date and navigate to the main tab
      clearSelectedDate();
      router.replace('/(tabs)/');
    } catch (err: any) {
      console.error('[AddEventView] Error creating event:', err);
      let errorMessage = 'Failed to create event. Please try again.';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.details) {
        errorMessage = err.details;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      const errorCode = err?.code ? ` (Code: ${err.code})` : '';
      const errorHint = err?.hint ? `\n\nHint: ${err.hint}` : '';
      
      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMessage}${errorCode}${errorHint}`);
      } else {
        Alert.alert('Error', `${errorMessage}${errorCode}${errorHint}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    title,
    startDate,
    endDate,
    isAllDay,
    location,
    notes,
    url,
    travelTimeMinutes,
    availability,
    recurrence,
    alerts,
    selectedMembers,
    selectedDriverId,
    currentFamily,
    clearSelectedDate,
    router,
    eventCache,
  ]);

  // Expose the handler to parent component (only once, using ref to avoid loops)
  const handlerRef = React.useRef(handleAddEvent);
  handlerRef.current = handleAddEvent;
  
  React.useEffect(() => {
    if (onAddRef) {
      // Pass a stable wrapper function that always calls the latest handler
      onAddRef(() => handlerRef.current());
    }
    // Only run once when onAddRef changes, not when handleAddEvent changes
     
  }, [onAddRef]);

  const handleRemoveMember = (id: string) => {
    setSelectedMembers(prev => prev.filter(m => m !== id));
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 0), backgroundColor }]}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Event Details Card */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <View style={[styles.fieldRow, styles.titleRow]}>
            <Ionicons name="menu" size={20} color={mutedText} />
            <Text style={[styles.fieldLabel, { color: textColor }]}>Title</Text>
            <TextInput
              style={[styles.titleInput, { color: textColor, backgroundColor: surfaceColor }]}
              placeholder="Event Title"
              placeholderTextColor={mutedText}
              value={title}
              onChangeText={setTitle}
              editable={!isLoading}
            />
          </View>

          <View style={styles.fieldRow}>
            <Ionicons name="location" size={20} color="#FF3B30" />
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>Location</Text>
            </View>
          </View>
          <LocationPicker
            value={location}
            onChange={setLocation}
            placeholder="Add Location"
            disabled={isLoading}
          />

          <TouchableOpacity style={styles.fieldRow} onPress={() => setShowTravelModal(true)}>
            <Ionicons name="car" size={20} color="#FF9500" />
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>Travel Time</Text>
            </View>
            <View style={styles.fieldValue}>
              <Text style={[styles.fieldValueText, { color: textColor }]}>
                {travelTimeMinutes != null ? `${travelTimeMinutes} min` : 'Add'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={mutedText} />
            </View>
          </TouchableOpacity>

          <View style={[styles.fieldRow, styles.lastFieldRow]}>
            <Ionicons name="link" size={20} color={accent} />
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>URL</Text>
            </View>
            <TextInput
              style={[styles.locationInput, { color: textColor, backgroundColor: surfaceColor }]}
              placeholder="Add link"
              placeholderTextColor={mutedText}
              value={url}
              onChangeText={setUrl}
              editable={!isLoading}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Time and Recurrence Card */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => setIsAllDay(!isAllDay)}
            disabled={isLoading}>
            <Ionicons name="time-outline" size={20} color={accent} />
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>All-day</Text>
            </View>
            <View style={styles.fieldValue}>
              <Text style={[styles.fieldValueText, { color: textColor }, isAllDay && styles.activeValue]}>
                {isAllDay ? 'Yes' : 'No'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>Starts</Text>
            </View>
            <View style={styles.dateTimeButtons}>
              <TouchableOpacity 
                style={[styles.dateButton, { backgroundColor: surfaceColor }]}
                onPress={() => openPicker('startDate')}
                disabled={isLoading}>
                <Text style={[styles.dateButtonText, { color: textColor }]}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
              {!isAllDay && (
                <TouchableOpacity 
                  style={[styles.timeButton, { backgroundColor: surfaceColor }]}
                  onPress={() => openPicker('startTime')}
                  disabled={isLoading}>
                  <Text style={[styles.timeButtonText, { color: textColor }]}>{formatTime(startDate)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>Ends</Text>
            </View>
            <View style={styles.dateTimeButtons}>
              <TouchableOpacity 
                style={[styles.dateButton, { backgroundColor: surfaceColor }]}
                onPress={() => openPicker('endDate')}
                disabled={isLoading}>
                <Text style={[styles.dateButtonText, { color: textColor }]}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
              {!isAllDay && (
                <TouchableOpacity 
                  style={[styles.timeButton, { backgroundColor: surfaceColor }]}
                  onPress={() => openPicker('endTime')}
                  disabled={isLoading}>
                  <Text style={[styles.timeButtonText, { color: textColor }]}>{formatTime(endDate)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.fieldRow, styles.lastFieldRow]}
            onPress={() => setShowRecurrenceModal(true)}
            disabled={isLoading}>
            <Ionicons name="refresh" size={20} color={mutedText} />
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>Repeat</Text>
            </View>
            <View style={styles.fieldValue}>
              <Text style={[styles.fieldValueText, { color: textColor }]}>{recurrenceLabel()}</Text>
              <Ionicons name="chevron-forward" size={20} color={mutedText} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Date/Time Picker Modal (Web) */}
        {Platform.OS === 'web' && activePicker && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={closePicker}>
            <TouchableOpacity 
              style={styles.pickerModalOverlay}
              activeOpacity={1}
              onPress={closePicker}>
              <TouchableOpacity 
                activeOpacity={1} 
                style={[styles.pickerModalContent, { backgroundColor: cardColor }]}
                onPress={(e) => e.stopPropagation()}>
                <View style={styles.pickerHeader}>
                  <Text style={[styles.pickerTitle, { color: textColor }]}>
                    {activePicker.includes('start') ? 'Start' : 'End'} {activePicker.includes('Date') ? 'Date' : 'Time'}
                  </Text>
                  <TouchableOpacity onPress={closePicker}>
                    <Text style={[styles.pickerDoneButton, { color: accent }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                {activePicker.includes('Date') ? (
                  <WebDatePicker
                    value={activePicker.includes('start') ? startDate : endDate}
                    onChange={(date) => {
                      applyDateChange(date);
                    }}
                  />
                ) : (
                  <WebTimePicker
                    value={activePicker.includes('start') ? startDate : endDate}
                    onChange={(date) => {
                      applyDateChange(date);
                    }}
                  />
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Date/Time Picker (iOS) */}
        {Platform.OS === 'ios' && activePicker && DateTimePicker && (
          <Modal
            visible={true}
            transparent
            animationType="slide"
            onRequestClose={closePicker}>
            <TouchableOpacity 
              style={styles.iosPickerOverlay}
              activeOpacity={1}
              onPress={closePicker}>
              <TouchableOpacity 
                activeOpacity={1} 
                style={[styles.iosPickerContent, { backgroundColor: cardColor }]}
                onPress={(e) => e.stopPropagation()}>
                <View style={styles.pickerHeader}>
                  <Text style={[styles.pickerTitle, { color: textColor }]}>
                    {activePicker.includes('start') ? 'Start' : 'End'} {activePicker.includes('Date') ? 'Date' : 'Time'}
                  </Text>
                  <TouchableOpacity onPress={closePicker}>
                    <Text style={[styles.pickerDoneButton, { color: accent }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={activePicker.includes('start') ? startDate : endDate}
                  mode={activePicker.includes('Date') ? 'date' : 'time'}
                  display="spinner"
                  onChange={handleDateChange}
                  textColor={textColor}
                  themeVariant="dark"
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Date/Time Picker (Android) */}
        {Platform.OS === 'android' && activePicker && DateTimePicker && (
          <DateTimePicker
            value={activePicker.includes('start') ? startDate : endDate}
            mode={activePicker.includes('Date') ? 'date' : 'time'}
            display="default"
            onChange={handleDateChange}
          />
        )}

        {/* Invitees and Settings Card */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <MemberPicker
            selectedIds={selectedMembers}
            onSelectionChange={setSelectedMembers}
            label="Invitees"
            placeholder="None"
          />
          
          {selectedMembers.length > 0 && (
            <SelectedMembersDisplay
              selectedIds={selectedMembers}
              onRemove={handleRemoveMember}
            />
          )}

          <View style={styles.fieldRow}>
            <Ionicons name="calendar" size={20} color="#FF3B30" />
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>Calendar</Text>
            </View>
            <View style={styles.fieldValue}>
              <View style={styles.familyBadge}>
                <View style={styles.greenDot} />
                <Text style={[styles.familyText, { color: textColor }]}>
                  {currentFamily?.name || 'Select invitees first'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={mutedText} />
            </View>
          </View>

        <TouchableOpacity style={styles.fieldRow} onPress={() => setShowDriverModal(true)}>
          <Ionicons name="car" size={20} color="#34C759" />
          <View style={styles.fieldContent}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>Driver</Text>
          </View>
          <View style={styles.fieldValue}>
            <Text style={[styles.fieldValueText, { color: textColor }]}>{getDriverName()}</Text>
            <Ionicons name="chevron-forward" size={20} color={mutedText} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.fieldRow} onPress={() => setShowAlertsModal(true)}>
          <Ionicons name="notifications" size={20} color="#FF3B30" />
          <View style={styles.fieldContent}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>Alerts</Text>
          </View>
          <View style={styles.fieldValue}>
            <Text style={[styles.fieldValueText, { color: textColor }]}>{alertsLabel()}</Text>
            <Ionicons name="chevron-forward" size={20} color={mutedText} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fieldRow, styles.lastFieldRow]}
          onPress={() => setShowAvailabilityModal(true)}>
          <Ionicons name="radio-button-on" size={20} color={mutedText} />
          <View style={styles.fieldContent}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>Show As</Text>
          </View>
          <View style={styles.fieldValue}>
            <Text style={[styles.fieldValueText, { color: textColor }]}>{availability === 'busy' ? 'Busy' : 'Free'}</Text>
            <Ionicons name="chevron-forward" size={20} color={mutedText} />
          </View>
        </TouchableOpacity>
        </View>

        {/* Notes Card */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <Text style={[styles.notesLabel, { color: textColor }]}>Notes</Text>
          <TextInput
            style={[styles.notesInput, { color: textColor, backgroundColor: surfaceColor }]}
            placeholder="Add notes..."
            placeholderTextColor={mutedText}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!isLoading}
          />
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: accent }, isLoading && styles.buttonDisabled]}
          onPress={handleAddEvent}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.addButtonText}>Add Event</Text>
          )}
        </TouchableOpacity>

        {/* Travel Time Modal */}
        <Modal
          transparent
          visible={showTravelModal}
          animationType="fade"
          onRequestClose={() => setShowTravelModal(false)}>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setShowTravelModal(false)}>
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalCard, { backgroundColor: cardColor }]}
              onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Travel Time</Text>
              {travelOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionRow,
                    travelTimeMinutes === opt && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setTravelTimeMinutes(opt);
                    setShowTravelModal(false);
                  }}>
                  <Text style={[styles.optionText, { color: textColor }]}>{opt} minutes</Text>
                  {travelTimeMinutes === opt && (
                    <Ionicons name="checkmark" size={20} color={accent} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: surfaceColor }]}
                onPress={() => {
                  setTravelTimeMinutes(null);
                  setShowTravelModal(false);
                }}>
                <Text style={[styles.clearButtonText, { color: textColor }]}>Clear</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Recurrence Modal */}
        <Modal
          transparent
          visible={showRecurrenceModal}
          animationType="fade"
          onRequestClose={() => setShowRecurrenceModal(false)}>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setShowRecurrenceModal(false)}>
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalCard, { backgroundColor: cardColor }]}
              onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Repeat</Text>

              <View style={styles.rowWrap}>
                {['none', 'daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.chipButton,
                      (recurrence.frequency === freq ||
                        (freq === 'none' && !recurrence.isRecurring)) &&
                        styles.chipButtonActive,
                    ]}
                    onPress={() =>
                      setFrequency(freq === 'none' ? null : (freq as any))
                    }>
                    <Text
                      style={[
                        styles.chipButtonText,
                        (recurrence.frequency === freq ||
                          (freq === 'none' && !recurrence.isRecurring)) &&
                          styles.chipButtonTextActive,
                        { color: textColor },
                      ]}>
                      {freq === 'none'
                        ? 'None'
                        : freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {recurrence.isRecurring && (
                <>
                  <View style={styles.optionRow}>
                    <Text style={[styles.optionText, { color: textColor }]}>Interval</Text>
                    <View style={styles.intervalControls}>
                      <TouchableOpacity
                        style={[styles.intervalButton, { backgroundColor: surfaceColor }]}
                        onPress={() =>
                          setRecurrence((prev) => ({
                            ...prev,
                            interval: Math.max(1, (prev.interval || 1) - 1),
                          }))
                        }>
                        <Text style={[styles.intervalButtonText, { color: textColor }]}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.intervalValue, { color: textColor }]}>{recurrence.interval || 1}</Text>
                      <TouchableOpacity
                        style={[styles.intervalButton, { backgroundColor: surfaceColor }]}
                        onPress={() =>
                          setRecurrence((prev) => ({
                            ...prev,
                            interval: (prev.interval || 1) + 1,
                          }))
                        }>
                        <Text style={[styles.intervalButtonText, { color: textColor }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {recurrence.frequency === 'weekly' && (
                    <View style={styles.rowWrap}>
                      {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map((day) => (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.dayChip,
                            recurrence.daysOfWeek?.includes(day) && styles.dayChipActive,
                          ]}
                          onPress={() => toggleDayOfWeek(day)}>
                          <Text
                            style={[
                              styles.dayChipText,
                              recurrence.daysOfWeek?.includes(day) && styles.dayChipTextActive,
                              { color: textColor },
                            ]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={[styles.optionRow, { marginTop: 8 }]}>
                    <Text style={[styles.optionText, { color: textColor }]}>Ends</Text>
                    <View style={styles.rowWrap}>
                      {['never', 'onDate', 'afterCount'].map((mode) => (
                        <TouchableOpacity
                          key={mode}
                          style={[
                            styles.chipButton,
                            recurrenceEndMode === mode && styles.chipButtonActive,
                          ]}
                          onPress={() => setEndMode(mode as any)}>
                          <Text
                            style={[
                              styles.chipButtonText,
                              recurrenceEndMode === mode && styles.chipButtonTextActive,
                              { color: textColor },
                            ]}>
                            {mode === 'never'
                              ? 'Never'
                              : mode === 'onDate'
                              ? 'On date'
                              : 'After count'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {recurrenceEndMode === 'onDate' && (
                    <TouchableOpacity
                      style={styles.optionRow}
                      onPress={() =>
                        Platform.OS === 'web'
                          ? null
                          : setShowRecurrenceEndDatePicker(true)
                      }>
                      <Text style={[styles.optionText, { color: textColor }]}>End date</Text>
                      {Platform.OS === 'web' ? (
                        <View style={[styles.webEndDateContainer, { backgroundColor: surfaceColor }]}>
                          <WebDatePicker
                            value={recurrence.endDate || new Date()}
                            onChange={(date) =>
                              setRecurrence((prev) => ({
                                ...prev,
                                endDate: date,
                                count: undefined,
                              }))
                            }
                          />
                        </View>
                      ) : (
                        <Text style={[styles.optionText, { color: textColor }]}>
                          {recurrence.endDate
                            ? recurrence.endDate.toLocaleDateString()
                            : 'Select date'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {recurrenceEndMode === 'afterCount' && (
                    <View style={styles.optionRow}>
                      <Text style={[styles.optionText, { color: textColor }]}>Occurrences</Text>
                      <TextInput
                        style={[styles.countInput, { color: textColor, backgroundColor: surfaceColor }]}
                        keyboardType="number-pad"
                        value={recurrence.count ? String(recurrence.count) : ''}
                        onChangeText={(text) =>
                          setRecurrence((prev) => ({
                            ...prev,
                            count: text ? Number(text) : undefined,
                            endDate: undefined,
                          }))
                        }
                        placeholder="10"
                        placeholderTextColor={mutedText}
                      />
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setShowRecurrenceModal(false)}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Recurrence end date picker (native) */}
        {Platform.OS !== 'web' && showRecurrenceEndDatePicker && DateTimePicker && (
          <Modal
            transparent
            visible={showRecurrenceEndDatePicker}
            animationType="slide"
            onRequestClose={() => setShowRecurrenceEndDatePicker(false)}>
            <TouchableOpacity
              style={styles.iosPickerOverlay}
              activeOpacity={1}
              onPress={() => setShowRecurrenceEndDatePicker(false)}>
              <TouchableOpacity
                activeOpacity={1}
                style={[styles.iosPickerContent, { backgroundColor: cardColor }]}
                onPress={(e) => e.stopPropagation()}>
                <View style={styles.pickerHeader}>
                  <Text style={[styles.pickerTitle, { color: textColor }]}>End Date</Text>
                  <TouchableOpacity onPress={() => setShowRecurrenceEndDatePicker(false)}>
                    <Text style={[styles.pickerDoneButton, { color: accent }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={recurrence.endDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event: any, selected?: Date) => {
                    if (event?.type === 'dismissed') return;
                    if (selected) {
                      setRecurrence((prev) => ({
                        ...prev,
                        endDate: selected,
                        count: undefined,
                      }));
                    }
                  }}
                  textColor={textColor}
                  themeVariant="dark"
                />
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Alerts Modal */}
        <Modal
          transparent
          visible={showAlertsModal}
          animationType="fade"
          onRequestClose={() => setShowAlertsModal(false)}>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setShowAlertsModal(false)}>
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalCard, { backgroundColor: cardColor }]}
              onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Alerts</Text>
              {alerts.map((alert, index) => (
                <View key={`${alert.type}-${alert.value}-${index}`} style={styles.optionRow}>
                  <Text style={[styles.optionText, { color: textColor }]}>{formatAlert(alert)}</Text>
                  <TouchableOpacity onPress={() => removeAlert(index)}>
                    <Ionicons name="trash" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.optionRow}>
                <Text style={[styles.optionText, { color: textColor }]}>Add alert</Text>
              </View>
              <View style={styles.rowWrap}>
                {alertOptions.map((opt) => (
                  <TouchableOpacity
                    key={`${opt.type}-${opt.value}`}
                    style={[styles.chipButton, { backgroundColor: surfaceColor }]}
                    onPress={() => addAlert(opt)}>
                    <Text style={[styles.chipButtonText, { color: textColor }]}>{formatAlert(opt)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: accent }]}
                onPress={() => setShowAlertsModal(false)}>
                <Text style={[styles.primaryButtonText, { color: '#FFFFFF' }]}>Done</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Driver Modal */}
        <Modal
          transparent
          visible={showDriverModal}
          animationType="fade"
          onRequestClose={() => setShowDriverModal(false)}>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setShowDriverModal(false)}>
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalCard, { backgroundColor: cardColor }]}
              onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Driver</Text>
              {contacts.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.optionRow,
                    selectedDriverId === c.id && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setSelectedDriverId(c.id);
                    setShowDriverModal(false);
                  }}>
                  <Text style={[styles.optionText, { color: textColor }]}>{`${c.first_name} ${c.last_name || ''}`.trim()}</Text>
                  {selectedDriverId === c.id && (
                    <Ionicons name="checkmark" size={20} color={accent} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: surfaceColor }]}
                onPress={() => {
                  setSelectedDriverId(null);
                  setShowDriverModal(false);
                }}>
                <Text style={[styles.clearButtonText, { color: textColor }]}>Clear</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Availability Modal */}
        <Modal
          transparent
          visible={showAvailabilityModal}
          animationType="fade"
          onRequestClose={() => setShowAvailabilityModal(false)}>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setShowAvailabilityModal(false)}>
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalCard, { backgroundColor: cardColor }]}
              onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Show As</Text>
              {(['busy', 'free'] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.optionRow,
                    availability === value && styles.optionRowSelected,
                  ]}
                  onPress={() => {
                    setAvailability(value);
                    setShowAvailabilityModal(false);
                  }}>
                  <Text style={[styles.optionText, { color: textColor }]}>
                    {value === 'busy' ? 'Busy' : 'Free'}
                  </Text>
                  {availability === value && (
                    <Ionicons name="checkmark" size={20} color={accent} />
                  )}
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </View>
  );
}

// Export the component with a ref to access the handler
export type AddEventViewRef = {
  handleAddEvent: () => Promise<void>;
};

// Export a way to get the handler (using forwardRef would be better, but this works for now)
export { };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  titleRow: {
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  lastFieldRow: {
    borderBottomWidth: 0,
  },
  fieldContent: {
    flex: 1,
    marginLeft: 12,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
  fieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldValueText: {
    fontSize: 15,
    fontWeight: '400',
    marginRight: 4,
  },
  activeValue: {
    fontWeight: '500',
  },
  timeText: {
    color: '#1D1D1F',
  },
  titleInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'right',
    marginLeft: 12,
  },
  locationInput: {
    flex: 0,
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'right',
    minWidth: 100,
  },
  familyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 6,
  },
  familyText: {
    fontSize: 15,
    fontWeight: '400',
  },
  notesLabel: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 12,
  },
  notesInput: {
    fontSize: 15,
    fontWeight: '400',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  dateTimeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  timeButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingBottom: 20,
    maxWidth: 400,
    width: '90%',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  pickerDoneButton: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  picker: {
    height: 200,
  },
  webPickerContainer: {
    padding: 20,
  },
  iosPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  iosPickerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  optionRowSelected: {
    backgroundColor: '#F0F8FF',
  },
  optionText: {
    fontSize: 15,
    color: '#1D1D1F',
  },
  clearButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '500',
  },
  chipButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    margin: 4,
  },
  chipButtonActive: {
    backgroundColor: '#E5F0FF',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  chipButtonText: {
    fontSize: 14,
    color: '#1D1D1F',
  },
  chipButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  intervalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intervalButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalButtonText: {
    fontSize: 18,
    color: '#1D1D1F',
  },
  intervalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    minWidth: 20,
    textAlign: 'center',
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F5F5F7',
    margin: 4,
  },
  dayChipActive: {
    backgroundColor: '#007AFF',
  },
  dayChipText: {
    color: '#1D1D1F',
    fontSize: 13,
  },
  dayChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  countInput: {
    minWidth: 70,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    textAlign: 'right',
    color: '#1D1D1F',
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  webEndDateContainer: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'flex-end',
  },
});
