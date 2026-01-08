import { getCacheKeysForEventDate, useEventCache } from '@/contexts/EventCacheContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
    createEvent,
    deleteEvent,
    EventWithDetails,
    getEvent,
    getEventRemindersForUser,
    RecurrenceInput,
    ReminderInput,
    updateEvent,
    updateEventParticipants,
    upsertEventReminders,
} from '@/services/eventService';
import { trackLocationUsage } from '@/services/recentLocationsService';
import { formatDisplayName } from '@/utils/colorUtils';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationPicker } from './LocationPicker';
import { MemberPicker, SelectedMembersDisplay } from './MemberPicker';
import { WebDatePicker, WebTimePicker } from './WebDatePicker';

interface EditEventViewProps {
  eventId: string;
  occurrence?: string;
  onRegisterSave?: (handler: () => Promise<void> | void) => void;
}

export function EditEventView({ eventId, occurrence, onRegisterSave }: EditEventViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentFamily, contacts } = useFamily();
  const eventCache = useEventCache();
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const borderColor = useThemeColor({ light: '#E5E5EA', dark: '#3A3A3C' }, 'border');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');

  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState<import('@/services/locationService').LocationResult | null>(null);
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [availability, setAvailability] = useState<'busy' | 'free'>('busy');
  const [travelTimeMinutes, setTravelTimeMinutes] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<ReminderInput[]>([]);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
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

  // Picker state (mirror AddEvent "Done" UX)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentPickerField, setCurrentPickerField] = useState<'start' | 'end'>('start');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchEvent() {
        setIsLoading(true);
        setError(null);

        // Personal calendar events cannot be edited; bail early but keep UI responsive
        if (eventId && eventId.startsWith('personal-')) {
          if (!isActive) return;
          setError('Personal calendar events cannot be viewed in detail. They are read-only from your iOS calendar.');
          setIsLoading(false);
          return;
        }

        try {
          const { data, error: fetchError } = await getEvent(eventId);

          if (!isActive) return;

          if (fetchError) {
            console.error('Error fetching event:', fetchError);
            setError('Failed to load event');
            return;
          }

          if (data) {
            setEvent(data);
            setTitle(data.title);
            // Reconstruct location object from structured fields
            if (data.structured_location_address || data.location) {
              setLocation({
                address: data.structured_location_address || data.location || '',
                title: data.structured_location_title || undefined,
                latitude: data.structured_location_latitude || 0,
                longitude: data.structured_location_longitude || 0,
                placeId: undefined,
              });
            } else {
              setLocation(null);
            }
            setNotes(data.notes || '');
            setUrl(data.url || '');
            setIsAllDay(data.is_all_day);
            
            // Use occurrence if provided, otherwise the event's base start/end
            const baseStart = new Date(data.start_time);
            const baseEnd = new Date(data.end_time);
            const durationMs = baseEnd.getTime() - baseStart.getTime();
            
            if (occurrence) {
              const occStart = new Date(occurrence);
              setStartDate(occStart);
              setEndDate(new Date(occStart.getTime() + durationMs));
            } else {
              setStartDate(baseStart);
              setEndDate(baseEnd);
            }

            setAvailability((data.availability as any) === 'free' ? 'free' : 'busy');
            setTravelTimeMinutes(data.travel_time ?? null);
            setSelectedDriverId(data.drop_off_driver_id || null);
            setRecurrence({
              isRecurring: data.is_recurring,
              frequency: (data.recurrence_frequency as any) || null,
              interval: data.recurrence_interval || 1,
              daysOfWeek: data.recurrence_days_of_week || [],
              daysOfMonth: data.recurrence_days_of_month || [],
              monthsOfYear: data.recurrence_months_of_year || [],
              weeksOfYear: data.recurrence_weeks_of_year || [],
              daysOfYear: data.recurrence_days_of_year || [],
              setPositions: data.recurrence_set_positions || [],
              count: data.recurrence_count || undefined,
              endDate: data.recurrence_end_date ? new Date(data.recurrence_end_date) : undefined,
              weekStart: data.recurrence_week_start || 'MO',
              rule: data.recurrence_rule || undefined,
            });
            if (data.recurrence_end_date) setRecurrenceEndMode('onDate');
            if (data.recurrence_count) setRecurrenceEndMode('afterCount');
            
            // Set selected members from participants
            const participantIds = data.participants?.map(p => p.contact_id) || [];
            setSelectedMembers(participantIds);

            // Load reminders for current user
            const { data: reminderData } = await getEventRemindersForUser(data.id);
            if (reminderData) {
              const mapped = reminderData.map((r) => ({
                type: r.reminder_type,
                value: r.reminder_value,
                method: r.notification_method,
              })) as ReminderInput[];
              setAlerts(mapped);
            }
          }
        } catch (err) {
          if (!isActive) return;
          console.error('Error fetching event:', err);
          setError('Failed to load event');
        } finally {
          if (isActive) setIsLoading(false);
        }
      }

      fetchEvent();

      return () => {
        isActive = false;
      };
    }, [eventId, occurrence])
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

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

  const formatAlert = (alert: ReminderInput) => {
    if (alert.type === 'minutes' && alert.value === 0) return 'At time of event';
    const mapLabel: Record<string, string> = {
      minutes: 'min',
      hours: 'hr',
      days: 'day',
      weeks: 'wk',
    };
    return `${alert.value} ${mapLabel[alert.type]} before`;
  };

  const alertsLabel = () => {
    if (!alerts.length) return 'None';
    if (alerts.length === 1) return formatAlert(alerts[0]);
    return `${alerts.length} alerts`;
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

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (!selectedDate) return;
    if (currentPickerField === 'start') {
      const newStartDate = new Date(selectedDate);
      newStartDate.setHours(startDate.getHours(), startDate.getMinutes());
      setStartDate(newStartDate);
      if (newStartDate.getTime() >= endDate.getTime()) {
        const newEndDate = new Date(newStartDate);
        newEndDate.setHours(newStartDate.getHours() + 1);
        setEndDate(newEndDate);
      }
    } else {
      const newEndDate = new Date(selectedDate);
      newEndDate.setHours(endDate.getHours(), endDate.getMinutes());
      setEndDate(newEndDate);
    }
  };

  const handleTimeChange = (_event: any, selectedTime?: Date) => {
    if (!selectedTime) return;
    if (currentPickerField === 'start') {
      const newStartDate = new Date(startDate);
      newStartDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setStartDate(newStartDate);
      if (newStartDate.getTime() >= endDate.getTime()) {
        const newEndDate = new Date(newStartDate);
        newEndDate.setHours(newStartDate.getHours() + 1);
        setEndDate(newEndDate);
      }
    } else {
      const newEndDate = new Date(endDate);
      newEndDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setEndDate(newEndDate);
    }
  };

  const showPicker = (mode: 'date' | 'time', field: 'start' | 'end') => {
    setCurrentPickerField(field);
    if (mode === 'date') {
      setShowDatePicker(true);
      setShowTimePicker(false);
    } else {
      setShowTimePicker(true);
      setShowDatePicker(false);
    }
  };

  const showError = (message: string) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('Error', message);
    }
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

  const buildRecurrenceFromExisting = (endDateOverride?: Date): RecurrenceInput => {
    if (!event?.is_recurring) return { isRecurring: false };
    return {
      isRecurring: true,
      frequency: (event.recurrence_frequency as any) || 'daily',
      interval: event.recurrence_interval || 1,
      daysOfWeek: event.recurrence_days_of_week || undefined,
      daysOfMonth: event.recurrence_days_of_month || undefined,
      monthsOfYear: event.recurrence_months_of_year || undefined,
      weeksOfYear: event.recurrence_weeks_of_year || undefined,
      daysOfYear: event.recurrence_days_of_year || undefined,
      setPositions: event.recurrence_set_positions || undefined,
      count: event.recurrence_count || undefined,
      endDate: endDateOverride
        ? endDateOverride
        : event.recurrence_end_date
        ? new Date(event.recurrence_end_date)
        : undefined,
      weekStart: event.recurrence_week_start || 'MO',
    };
  };

  const getNextStart = (start: Date, freq?: string | null, interval?: number) => {
    const intv = interval && interval > 0 ? interval : 1;
    const next = new Date(start);
    switch (freq) {
      case 'weekly':
        next.setDate(next.getDate() + 7 * intv);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + intv);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + intv);
        break;
      case 'daily':
      default:
        next.setDate(next.getDate() + intv);
    }
    return next;
  };

  const saveAllOccurrences = async () => {
    const recurrencePayload = buildRecurrencePayload();
    const { error: updateError } = await updateEvent(eventId, {
      title: title.trim(),
      location: location?.address || undefined,
      structuredLocationTitle: location?.title || undefined,
      structuredLocationAddress: location?.address || undefined,
      structuredLocationLatitude: location?.latitude,
      structuredLocationLongitude: location?.longitude,
      notes: notes.trim() || undefined,
      url: url.trim() || null,
      startTime: startDate,
      endTime: endDate,
      isAllDay,
      availability,
      travelTimeMinutes,
      dropOffDriverId: selectedDriverId,
      recurrence: recurrencePayload,
    });
    if (updateError) throw updateError;

    // Track location usage for recent locations
    if (location && !location.title && currentFamily) {
      await trackLocationUsage(currentFamily.id, {
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        placeId: location.placeId,
      });
    }

    const { error: participantError } = await updateEventParticipants(eventId, selectedMembers);
    if (participantError) console.error('Error updating participants:', participantError);

    const { error: reminderError } = await upsertEventReminders(eventId, alerts);
    if (reminderError) console.error('Error updating reminders:', reminderError);

    // Invalidate cache for old and new event dates
    if (event) {
      const oldDate = new Date(event.start_time);
      const keysToInvalidate = [
        ...getCacheKeysForEventDate(oldDate),
        ...getCacheKeysForEventDate(startDate),
      ];
      eventCache.invalidateCache(keysToInvalidate);
    }

    router.back();
  };

  const saveFutureOccurrences = async () => {
    if (!event || !currentFamily) throw new Error('Missing event or family');
    const occurrenceStart = occurrence ? new Date(occurrence) : startDate;
    const cutoff = new Date(occurrenceStart.getTime() - 1000);

    // End original series before occurrence
    await updateEvent(event.id, {
      recurrence: buildRecurrenceFromExisting(cutoff),
    });

    // Create new recurring event for future occurrences with updated data
    const recurrencePayload = buildRecurrencePayload();
    const { data: newEvent, error: createError } = await createEvent(
      currentFamily.id,
      {
        title: title.trim(),
        description: event.description || undefined,
        notes: notes.trim() || undefined,
        location: location.trim() || undefined,
        url: url.trim() || undefined,
        startTime: occurrenceStart,
        endTime: endDate,
        isAllDay,
        categoryId: event.category_id || undefined,
        availability,
        travelTimeMinutes,
        isRecurring: recurrencePayload.isRecurring,
        recurrence: recurrencePayload,
        dropOffDriverId: selectedDriverId,
        collectionDriverId: event.collection_driver_id || null,
        sameDriver: event.same_driver || false,
      },
      selectedMembers
    );
    if (createError || !newEvent) throw createError || new Error('Failed to create future event');

    const { error: reminderError } = await upsertEventReminders(newEvent.id, alerts);
    if (reminderError) console.error('Error updating reminders:', reminderError);

    // Invalidate cache for old and new event dates
    if (event) {
      const oldDate = new Date(event.start_time);
      const keysToInvalidate = [
        ...getCacheKeysForEventDate(oldDate),
        ...getCacheKeysForEventDate(occurrenceStart),
      ];
      eventCache.invalidateCache(keysToInvalidate);
    }

    router.replace(`/event/${newEvent.id}`);
  };

  const saveSingleOccurrence = async () => {
    if (!event || !currentFamily) throw new Error('Missing event or family');
    const occurrenceStart = occurrence ? new Date(occurrence) : startDate;
    const cutoff = new Date(occurrenceStart.getTime() - 1000);
    const durationMs = endDate.getTime() - startDate.getTime();

    // End original series before this occurrence
    await updateEvent(event.id, {
      recurrence: buildRecurrenceFromExisting(cutoff),
    });

    // Create future series to preserve occurrences after this one
    const nextStart = getNextStart(occurrenceStart, event.recurrence_frequency as any, event.recurrence_interval);
    const { data: futureEvent, error: futureError } = await createEvent(
      currentFamily.id,
      {
        title: event.title,
        description: event.description || undefined,
        notes: event.notes || undefined,
        location: event.structured_location_address || event.location || undefined,
        structuredLocationTitle: event.structured_location_title || undefined,
        structuredLocationAddress: event.structured_location_address || undefined,
        structuredLocationLatitude: event.structured_location_latitude,
        structuredLocationLongitude: event.structured_location_longitude,
        url: event.url || undefined,
        startTime: nextStart,
        endTime: new Date(nextStart.getTime() + (new Date(event.end_time).getTime() - new Date(event.start_time).getTime())),
        isAllDay: event.is_all_day,
        categoryId: event.category_id || undefined,
        availability: event.availability,
        travelTimeMinutes: event.travel_time || null,
        isRecurring: true,
        recurrence: buildRecurrenceFromExisting(),
        dropOffDriverId: event.drop_off_driver_id || null,
        collectionDriverId: event.collection_driver_id || null,
        sameDriver: event.same_driver || false,
      },
      event.participants?.map((p) => p.contact_id) || []
    );
    if (futureError) throw futureError;

    // Create standalone edited occurrence
    const { data: singleEvent, error: createError } = await createEvent(
      currentFamily.id,
      {
        title: title.trim(),
        description: event.description || undefined,
        notes: notes.trim() || undefined,
        location: location?.address || undefined,
        structuredLocationTitle: location?.title || undefined,
        structuredLocationAddress: location?.address || undefined,
        structuredLocationLatitude: location?.latitude,
        structuredLocationLongitude: location?.longitude,
        url: url.trim() || undefined,
        startTime: occurrenceStart,
        endTime: new Date(occurrenceStart.getTime() + durationMs),
        isAllDay,
        categoryId: event.category_id || undefined,
        availability,
        travelTimeMinutes,
        isRecurring: false,
        recurrence: { isRecurring: false },
        dropOffDriverId: selectedDriverId,
        collectionDriverId: event.collection_driver_id || null,
        sameDriver: event.same_driver || false,
      },
      selectedMembers
    );
    if (createError || !singleEvent) throw createError || new Error('Failed to create edited occurrence');

    // Track location usage for recent locations
    if (location && !location.title && currentFamily) {
      await trackLocationUsage(currentFamily.id, {
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        placeId: location.placeId,
      });
    }

    const { error: reminderError } = await upsertEventReminders(singleEvent.id, alerts);
    if (reminderError) console.error('Error updating reminders:', reminderError);

    // Invalidate cache for old and new event dates
    if (event) {
      const oldDate = new Date(event.start_time);
      const keysToInvalidate = [
        ...getCacheKeysForEventDate(oldDate),
        ...getCacheKeysForEventDate(occurrenceStart),
      ];
      eventCache.invalidateCache(keysToInvalidate);
    }

    router.replace(`/event/${singleEvent.id}`);
  };

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      showError('Please enter an event title');
      return;
    }

    setIsSaving(true);

    try {
      // If recurring with a specific occurrence context, ask user which scope to edit
      if (event?.is_recurring && occurrence) {
        const doSave = async (scope: 'single' | 'future' | 'all') => {
          if (scope === 'single') await saveSingleOccurrence();
          else if (scope === 'future') await saveFutureOccurrences();
          else await saveAllOccurrences();
        };

        if (Platform.OS === 'web') {
          // Button-like flow using confirms (no typing)
          const single = window.confirm('Apply changes to this occurrence only?');
          if (single) {
            await doSave('single');
            return;
          }
          const future = window.confirm('Apply to this and future occurrences? (Cancel = All occurrences)');
          if (future) {
            await doSave('future');
            return;
          }
          await doSave('all');
          return;
        }

        let selected: 'single' | 'future' | 'all' | null = null;
        await new Promise<void>((resolve) => {
          Alert.alert(
            'Edit recurring event',
            'Apply changes to this occurrence or this and future occurrences?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
              {
                text: 'This occurrence only',
                onPress: async () => {
                  selected = 'single';
                  resolve();
                },
              },
              {
                text: 'This and future',
                onPress: async () => {
                  selected = 'future';
                  resolve();
                },
              },
              {
                text: 'All occurrences',
                onPress: async () => {
                  selected = 'all';
                  resolve();
                },
              },
            ]
          );
        });
        if (!selected) return;
        await doSave(selected);
        return;
      }

      // Non-recurring or no occurrence context: update all
      await saveAllOccurrences();
    } catch (err: any) {
      console.error('Error updating event:', err);
      showError(err.message || 'Failed to update event');
    } finally {
      setIsSaving(false);
    }
  }, [
    title,
    event,
    occurrence,
    startDate,
    endDate,
    isAllDay,
    availability,
    travelTimeMinutes,
    recurrence,
    alerts,
    selectedMembers,
    selectedDriverId,
    router,
  ]);

  // Expose save handler to parent so header button can trigger it
  React.useEffect(() => {
    if (onRegisterSave) {
      onRegisterSave(handleSave);
    }
  }, [handleSave, onRegisterSave]);

  const deleteAllOccurrences = async () => {
    setIsDeleting(true);
    try {
      const { error: deleteError } = await deleteEvent(eventId);
      if (deleteError) {
        showError('Failed to delete event');
        return;
      }
      
      // Invalidate cache for event date
      if (event) {
        const eventDate = new Date(event.start_time);
        const keysToInvalidate = getCacheKeysForEventDate(eventDate);
        eventCache.invalidateCache(keysToInvalidate);
      }
      
      router.replace('/(tabs)/');
    } catch (err) {
      showError('Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteFutureOccurrences = async () => {
    if (!event) return;
    const occurrenceStart = occurrence ? new Date(occurrence) : startDate;
    setIsDeleting(true);
    try {
      const cutoff = new Date(occurrenceStart.getTime() - 1000);
      const { error } = await updateEvent(event.id, {
        recurrence: buildRecurrenceFromExisting(cutoff),
      });
      if (error) throw error;
      
      // Invalidate cache for event date
      if (event) {
        const eventDate = new Date(event.start_time);
        const keysToInvalidate = getCacheKeysForEventDate(eventDate);
        eventCache.invalidateCache(keysToInvalidate);
      }
      
      router.replace('/(tabs)/');
    } catch (err) {
      showError('Failed to delete future occurrences');
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteSingleOccurrence = async () => {
    if (!event || !currentFamily) return;
    const occurrenceStart = occurrence ? new Date(occurrence) : startDate;
    setIsDeleting(true);
    try {
      const cutoff = new Date(occurrenceStart.getTime() - 1000);
      // End original before occurrence
      const { error: endError } = await updateEvent(event.id, {
        recurrence: buildRecurrenceFromExisting(cutoff),
      });
      if (endError) throw endError;

      // Create future series to preserve later occurrences
      const nextStart = getNextStart(occurrenceStart, event.recurrence_frequency as any, event.recurrence_interval);
      const durationMs =
        new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
      const { error: futureError } = await createEvent(
        currentFamily.id,
        {
          title: event.title,
          description: event.description || undefined,
          notes: event.notes || undefined,
          location: event.location || undefined,
          url: event.url || undefined,
          startTime: nextStart,
          endTime: new Date(nextStart.getTime() + durationMs),
          isAllDay: event.is_all_day,
          categoryId: event.category_id || undefined,
          availability: event.availability,
          travelTimeMinutes: event.travel_time || null,
          isRecurring: true,
          recurrence: buildRecurrenceFromExisting(),
          dropOffDriverId: event.drop_off_driver_id || null,
          collectionDriverId: event.collection_driver_id || null,
          sameDriver: event.same_driver || false,
        },
        event.participants?.map((p) => p.contact_id) || []
      );
      if (futureError) throw futureError;

      // Invalidate cache for event date
      if (event) {
        const eventDate = new Date(event.start_time);
        const keysToInvalidate = getCacheKeysForEventDate(eventDate);
        eventCache.invalidateCache(keysToInvalidate);
      }

      router.replace('/(tabs)/');
    } catch (err) {
      showError('Failed to delete this occurrence');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    if (event?.is_recurring && occurrence) {
      const perform = (scope: 'single' | 'future' | 'all') => {
        if (scope === 'single') deleteSingleOccurrence();
        else if (scope === 'future') deleteFutureOccurrences();
        else deleteAllOccurrences();
      };

      if (Platform.OS === 'web') {
        const single = window.confirm('Delete this occurrence only?');
        if (single) {
          perform('single');
          return;
        }
        const future = window.confirm('Delete this and future occurrences? (Cancel = All occurrences)');
        if (future) {
          perform('future');
          return;
        }
        perform('all');
        return;
      }

      Alert.alert(
        'Delete recurring event',
        'Do you want to delete just this occurrence or this and future occurrences?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'This occurrence only', onPress: () => perform('single') },
          { text: 'This and future', style: 'destructive', onPress: () => perform('future') },
          { text: 'All occurrences', style: 'destructive', onPress: () => perform('all') },
        ]
      );
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this event? This action cannot be undone.');
      if (confirmed) {
        deleteAllOccurrences();
      }
    } else {
      Alert.alert(
        'Delete Event',
        'Are you sure you want to delete this event? This action cannot be undone?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: deleteAllOccurrences,
          },
        ]
      );
    }
  };

  const handleRemoveMember = (id: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m !== id));
  };

  // Get participant names for display
  const getParticipantNames = () => {
    if (selectedMembers.length === 0) return 'None';
    
    const names = selectedMembers.map(id => {
      const contact = contacts.find(c => c.id === id);
      return contact ? formatDisplayName(contact.first_name, contact.last_name, currentFamily?.name) : '';
    }).filter(Boolean);
    
    return names.join(', ') || 'None';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor }]}>
        <ActivityIndicator size="large" color={textColor} />
        <Text style={[styles.loadingText, { color: mutedText }]}>Loading event...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor }]}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={[styles.errorText, { color: mutedText }]}>{error || 'Event not found'}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: accent }]} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={[styles.scrollView, { backgroundColor }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Event Details Card */}
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <View style={[styles.fieldRow, styles.titleRow]}>
            <Ionicons name="menu" size={20} color={mutedText} />
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>Title</Text>
            </View>
          </View>
          <TextInput
            style={[
              styles.fullInput,
              { color: textColor, backgroundColor: '#FFFFFF', borderColor },
            ]}
            placeholder="Event Title"
            placeholderTextColor={mutedText}
            value={title}
            onChangeText={setTitle}
          />

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
            disabled={isSaving}
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
          </View>
          <TextInput
            style={[
              styles.fullInput,
              { color: textColor, backgroundColor: '#FFFFFF', borderColor },
            ]}
            placeholder="Add link"
            placeholderTextColor={mutedText}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Time and Recurrence Card */}
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => setIsAllDay(!isAllDay)}>
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

          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => showPicker('date', 'start')}>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>Starts</Text>
            </View>
            <View style={styles.fieldValue}>
              <Text style={[styles.fieldValueText, styles.interactiveText, { color: textColor }]}>
                {formatDate(startDate)}
              </Text>
              {!isAllDay && (
                <TouchableOpacity onPress={() => showPicker('time', 'start')}>
                  <Text style={[styles.fieldValueText, styles.timeText, styles.interactiveText, { color: textColor }]}>
                    {' '}{formatTime(startDate)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fieldRow}
            onPress={() => showPicker('date', 'end')}>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>Ends</Text>
            </View>
            <View style={styles.fieldValue}>
              <Text style={[styles.fieldValueText, styles.interactiveText, { color: textColor }]}>
                {formatDate(endDate)}
              </Text>
              {!isAllDay && (
                <TouchableOpacity onPress={() => showPicker('time', 'end')}>
                  <Text style={[styles.fieldValueText, styles.timeText, styles.interactiveText, { color: textColor }]}>
                    {' '}{formatTime(endDate)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fieldRow, styles.lastFieldRow]}
            onPress={() => setShowRecurrenceModal(true)}>
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

        {/* Invitees and Settings Card */}
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
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
                  {currentFamily?.name || 'Family'}
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
              <Text style={[styles.fieldValueText, { color: textColor }]}>
                {availability === 'busy' ? 'Busy' : 'Free'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={mutedText} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Notes Card */}
        <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
          <View style={styles.notesHeader}>
            <Ionicons name="document-text" size={20} color="#FFD60A" />
            <Text style={[styles.notesLabel, { color: textColor }]}>Notes</Text>
          </View>
          <TextInput
            style={[
              styles.notesInput,
              { color: textColor, backgroundColor: '#FFFFFF', borderColor },
            ]}
            placeholder="Add notes"
            placeholderTextColor={mutedText}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Delete Event Button */}
        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
          onPress={handleDelete}
          disabled={isDeleting}>
          {isDeleting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete Event</Text>
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
                style={[styles.primaryButton, { backgroundColor: accent }]}
                onPress={() => setShowRecurrenceModal(false)}>
                <Text style={[styles.primaryButtonText, { color: '#FFFFFF' }]}>Done</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Recurrence end date picker (native) */}
        {Platform.OS !== 'web' && showRecurrenceEndDatePicker && (
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
                style={styles.iosPickerContent}
                onPress={(e) => e.stopPropagation()}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>End Date</Text>
                  <TouchableOpacity onPress={() => setShowRecurrenceEndDatePicker(false)}>
                    <Text style={styles.pickerDoneButton}>Done</Text>
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
                  textColor="#1D1D1F"
                  themeVariant="light"
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
                  <Text style={[styles.optionText, { color: textColor }]}>
                    {`${c.first_name} ${c.last_name || ''}`.trim()}
                  </Text>
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

      {/* Date/Time Picker Modals */}
      {Platform.OS === 'web' ? (
        <Modal
          transparent={true}
          visible={showDatePicker || showTimePicker}
          onRequestClose={() => {
            setShowDatePicker(false);
            setShowTimePicker(false);
          }}>
          <TouchableOpacity
            style={styles.webPickerOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowDatePicker(false);
              setShowTimePicker(false);
            }}>
            <View style={styles.webPickerContainer}>
              {showDatePicker && (
                <WebDatePicker
                  value={currentPickerField === 'start' ? startDate : endDate}
                  onChange={(newDate) => {
                    if (currentPickerField === 'start') {
                      const updated = new Date(newDate);
                      updated.setHours(startDate.getHours(), startDate.getMinutes());
                      setStartDate(updated);
                      if (updated.getTime() >= endDate.getTime()) {
                        const newEnd = new Date(updated);
                        newEnd.setHours(updated.getHours() + 1);
                        setEndDate(newEnd);
                      }
                    } else {
                      const updated = new Date(newDate);
                      updated.setHours(endDate.getHours(), endDate.getMinutes());
                      setEndDate(updated);
                    }
                    setShowDatePicker(false);
                  }}
                />
              )}
              {showTimePicker && (
                <WebTimePicker
                  value={currentPickerField === 'start' ? startDate : endDate}
                  onChange={(newTime) => {
                    if (currentPickerField === 'start') {
                      const updated = new Date(startDate);
                      updated.setHours(newTime.getHours(), newTime.getMinutes());
                      setStartDate(updated);
                      if (updated.getTime() >= endDate.getTime()) {
                        const newEnd = new Date(updated);
                        newEnd.setHours(updated.getHours() + 1);
                        setEndDate(newEnd);
                      }
                    } else {
                      const updated = new Date(endDate);
                      updated.setHours(newTime.getHours(), newTime.getMinutes());
                      setEndDate(updated);
                    }
                  }}
                />
              )}
              {(showDatePicker || showTimePicker) && (
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}>
                  <Text style={styles.modalCloseButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      ) : (
        <>
          {(showDatePicker || showTimePicker) && (
            <Modal
              transparent
              visible={showDatePicker || showTimePicker}
              animationType="slide"
              onRequestClose={() => {
                setShowDatePicker(false);
                setShowTimePicker(false);
              }}>
              <TouchableOpacity
                style={styles.iosPickerOverlay}
                activeOpacity={1}
                onPress={() => {
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}>
                <TouchableOpacity
                  activeOpacity={1}
                  style={styles.iosPickerContent}
                  onPress={(e) => e.stopPropagation()}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>
                      {currentPickerField === 'start' ? 'Start' : 'End'}{' '}
                      {showDatePicker ? 'Date' : 'Time'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowDatePicker(false);
                        setShowTimePicker(false);
                      }}>
                      <Text style={styles.pickerDoneButton}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={currentPickerField === 'start' ? startDate : endDate}
                    mode={showDatePicker ? 'date' : 'time'}
                    display="spinner"
                    onChange={showDatePicker ? handleDateChange : handleTimeChange}
                    textColor="#1D1D1F"
                    themeVariant="light"
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
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
    color: '#1D1D1F',
  },
  fieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldValueText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    marginRight: 4,
  },
  interactiveText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  activeValue: {
    color: '#007AFF',
    fontWeight: '500',
  },
  timeText: {
    color: '#1D1D1F',
  },
  titleInput: {
  },
  fullInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
    marginTop: 8,
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
    color: '#1D1D1F',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
    marginLeft: 12,
  },
  notesInput: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
    minHeight: 140,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  webPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: Platform.OS === 'web' ? 320 : '80%',
    maxWidth: Platform.OS === 'web' ? 320 : 300,
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
