import React, { useState, useEffect, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFamily } from '@/contexts/FamilyContext';
import { useEventCache } from '@/contexts/EventCacheContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPreferences, updateScheduleTimes } from '@/services/userPreferencesService';
import { EventWithDetails } from '@/services/eventService';
import { formatDisplayName } from '@/utils/colorUtils';
import { ScheduleSettingsModal } from '@/components/ui/ScheduleSettingsModal';
import { WebDatePicker } from '@/components/event/WebDatePicker';
// Only import DateTimePicker on native platforms
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface ScheduleViewProps {
  memberName: string;
}

interface ScheduleStats {
  freeTime: number; // in minutes
  busyTime: number; // in minutes
  travelTime: number; // in minutes
  longestGap: number; // in minutes
  freeBlocks: number; // count
  dayStart: Date;
  dayEnd: Date;
}

interface TimelineEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color: string;
  isFreeTime?: boolean;
  duration?: number; // in minutes
  originalEventId?: string;
  isRecurring?: boolean;
}

export function ScheduleView({ memberName }: ScheduleViewProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentFamily } = useFamily();
  const { user } = useAuth();
  const eventCache = useEventCache();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [dayStart, setDayStart] = useState('07:00:00');
  const [dayEnd, setDayEnd] = useState('19:30:00');
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [hoveredTimelineId, setHoveredTimelineId] = useState<string | null>(null);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Get display mode for the selected date
  const getDateDisplayMode = (): 'today' | 'tomorrow' | 'custom' => {
    if (isSameDay(selectedDate, today)) return 'today';
    if (isSameDay(selectedDate, tomorrow)) return 'tomorrow';
    return 'custom';
  };

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const { data } = await getUserPreferences(user.id);
        if (data) {
          setDayStart(data.schedule_day_start);
          setDayEnd(data.schedule_day_end);
        }
      } catch (error) {
        console.error('Failed to load schedule preferences:', error);
      } finally {
        setPreferencesLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Fetch events for selected day
  useEffect(() => {
    if (currentFamily) {
      const dayKey = `day:${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
      eventCache.ensureEventsFetched(dayKey, false);
    }
  }, [currentFamily, selectedDate]);

  // Get events for selected day
  const dayEvents = useMemo(() => {
    if (!currentFamily) return [];

    const dayKey = `day:${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
    const rawEvents = eventCache.getEvents(dayKey);

    // Filter events for this member
    return rawEvents.filter(event => {
      return event.participants?.some(participant => {
        if (!participant.contact) return false;
        const displayName = formatDisplayName(
          participant.contact.first_name,
          participant.contact.last_name,
          currentFamily.name
        );
        return displayName === memberName;
      });
    });
  }, [eventCache, selectedDate, currentFamily, memberName]);

  // Calculate schedule statistics
  const scheduleStats: ScheduleStats = useMemo(() => {
    const [startHour, startMinute] = dayStart.split(':').map(Number);
    const [endHour, endMinute] = dayEnd.split(':').map(Number);

    const dayStartDate = new Date(selectedDate);
    dayStartDate.setHours(startHour, startMinute, 0, 0);

    const dayEndDate = new Date(selectedDate);
    dayEndDate.setHours(endHour, endMinute, 0, 0);

    const totalDayMinutes = (dayEndDate.getTime() - dayStartDate.getTime()) / (1000 * 60);

    // Sort events by start time
    const sortedEvents = dayEvents
      .map(event => ({
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        isBusy: event.availability !== 'free', // Events marked as 'free' are not busy
        isFreeEvent: event.availability === 'free'
      }))
      .filter(event => event.start >= dayStartDate && event.end <= dayEndDate)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    let busyTime = 0;
    let travelTime = 0; // We'll implement travel time later
    let longestGap = 0;
    let freeBlocks = 0;

    // Calculate busy time and find gaps
    let currentTime = dayStartDate;

    for (const event of sortedEvents) {
      if (event.isBusy) {
        busyTime += (event.end.getTime() - event.start.getTime()) / (1000 * 60);
      }

      // Calculate gap before this event
      const gapStart = currentTime;
      const gapEnd = event.start;
      if (gapEnd > gapStart) {
        const gapMinutes = (gapEnd.getTime() - gapStart.getTime()) / (1000 * 60);
        if (gapMinutes > 0) {
          longestGap = Math.max(longestGap, gapMinutes);
          freeBlocks++;
        }
      }

      currentTime = new Date(Math.max(currentTime.getTime(), event.end.getTime()));
    }

    // Calculate final gap to end of day
    if (currentTime < dayEndDate) {
      const finalGap = (dayEndDate.getTime() - currentTime.getTime()) / (1000 * 60);
      longestGap = Math.max(longestGap, finalGap);
      freeBlocks++;
    }

    const freeTime = totalDayMinutes - busyTime - travelTime;

    return {
      freeTime: Math.max(0, freeTime),
      busyTime,
      travelTime,
      longestGap,
      freeBlocks,
      dayStart: dayStartDate,
      dayEnd: dayEndDate,
    };
  }, [dayEvents, dayStart, dayEnd, selectedDate]);

  // Create timeline events
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Add all events (both busy and free)
    const filteredEvents = dayEvents.filter(event => {
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time);
      return startTime >= scheduleStats.dayStart && endTime <= scheduleStats.dayEnd;
    });

    filteredEvents.forEach(event => {
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time);

      const participant = event.participants?.find(p => {
        if (!p.contact) return false;
        const displayName = formatDisplayName(
          p.contact.first_name,
          p.contact.last_name,
          currentFamily?.name
        );
        return displayName === memberName;
      });

      const isFreeEvent = event.availability === 'free';

      events.push({
        id: event.id,
        title: isFreeEvent ? `${event.title} (Free Time)` : event.title,
        startTime,
        endTime,
        color: isFreeEvent ? '#34C759' : (participant?.contact?.color || '#007AFF'),
        duration: (endTime.getTime() - startTime.getTime()) / (1000 * 60),
        isFreeTime: isFreeEvent,
        originalEventId: event.original_event_id || event.id,
        isRecurring: event.is_recurring,
      });
    });

    // Sort all events chronologically
    events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Separate busy and free events
    const busyEvents = events.filter(event => !event.isFreeTime);
    const freeEvents = events.filter(event => event.isFreeTime);

    // Insert free time blocks between busy events only
    const allEvents: TimelineEvent[] = [];
    let currentTime = scheduleStats.dayStart;

    for (const busyEvent of busyEvents) {
      // Add free time block before this busy event if there's a gap
      if (busyEvent.startTime > currentTime) {
        const freeDuration = (busyEvent.startTime.getTime() - currentTime.getTime()) / (1000 * 60);
        if (freeDuration > 0) {
          allEvents.push({
            id: `free-${currentTime.getTime()}`,
            title: 'Free Time',
            startTime: new Date(currentTime),
            endTime: new Date(busyEvent.startTime),
            color: '#34C759',
            isFreeTime: true,
            duration: freeDuration,
          });
        }
      }

      // Add the busy event
      allEvents.push(busyEvent);

      // Update current time to after this busy event
      currentTime = new Date(busyEvent.endTime);
    }

    // Add all free events (they don't create gaps)
    allEvents.push(...freeEvents);

    // Add final free time block if there's time left in the day (after the last busy event)
    if (currentTime < scheduleStats.dayEnd) {
      const finalFreeDuration = (scheduleStats.dayEnd.getTime() - currentTime.getTime()) / (1000 * 60);
      if (finalFreeDuration > 0) {
        allEvents.push({
          id: `free-${currentTime.getTime()}`,
          title: 'Free Time',
          startTime: new Date(currentTime),
          endTime: new Date(scheduleStats.dayEnd),
          color: '#34C759',
          isFreeTime: true,
          duration: finalFreeDuration,
        });
      }
    }

    // Sort all events chronologically
    allEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // If no events at all, add one big free time block
    if (allEvents.length === 0) {
      allEvents.push({
        id: 'free-all-day',
        title: 'Free Time',
        startTime: scheduleStats.dayStart,
        endTime: scheduleStats.dayEnd,
        color: '#34C759',
        isFreeTime: true,
        duration: (scheduleStats.dayEnd.getTime() - scheduleStats.dayStart.getTime()) / (1000 * 60),
      });
    }

    return allEvents;
  }, [dayEvents, scheduleStats, memberName, currentFamily]);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    };
    return date.toLocaleDateString('en-GB', options);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  };

  const handleSaveScheduleSettings = async (newStart: string, newEnd: string) => {
    if (!user) return;

    try {
      await updateScheduleTimes(user.id, newStart, newEnd);
      setDayStart(newStart);
      setDayEnd(newEnd);
    } catch (error) {
      console.error('Failed to save schedule settings:', error);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCalendarModalVisible(false);
  };

  const handleQuickDateSelect = (dateType: 'today' | 'tomorrow') => {
    switch (dateType) {
      case 'today':
        setSelectedDate(today);
        break;
      case 'tomorrow':
        setSelectedDate(tomorrow);
        break;
    }
  };

  const handleEventPress = (eventId: string, originalEventId?: string, occurrenceIso?: string) => {
    // Check if this is a personal calendar event (they can't be opened in detail view)
    // Check eventId first (it has the "personal-" prefix), not originalEventId (which is just the iOS event ID)
    if (eventId && eventId.startsWith('personal-')) {
      // Personal calendar events are read-only from iOS, so we can't show details
      return;
    }

    // Use originalEventId if available (for expanded recurrences) and strip occurrence suffix
    const actualEventId = (originalEventId || eventId || '').split('::')[0];

    const params: any = { id: actualEventId };
    if (occurrenceIso) {
      params.occurrence = occurrenceIso;
    }

    router.push({
      pathname: '/event/[id]',
      params,
    });
  };

  if (preferencesLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Date Selection and Adjust Schedule */}
        <View style={styles.dateSection}>
          <View style={styles.dateButtonsRow}>
            <View style={styles.dateButtons}>
              <TouchableOpacity
              style={[
                styles.dateButton,
                getDateDisplayMode() === 'today' && styles.dateButtonActive,
              ]}
              onPress={() => handleQuickDateSelect('today')}>
              <Text
                style={[
                  styles.dateButtonText,
                  getDateDisplayMode() === 'today' && styles.dateButtonTextActive,
                ]}>
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dateButton,
                getDateDisplayMode() === 'tomorrow' && styles.dateButtonActive,
              ]}
              onPress={() => handleQuickDateSelect('tomorrow')}>
              <Text
                style={[
                  styles.dateButtonText,
                  getDateDisplayMode() === 'tomorrow' && styles.dateButtonTextActive,
                ]}>
                Tomorrow
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dateButton,
                getDateDisplayMode() === 'custom' && styles.dateButtonActive,
              ]}
              onPress={() => setCalendarModalVisible(true)}>
              <Text
                style={[
                  styles.dateButtonText,
                  getDateDisplayMode() === 'custom' && styles.dateButtonTextActive,
                ]}>
                Select Day
              </Text>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={getDateDisplayMode() === 'custom' ? '#FFFFFF' : '#1D1D1F'}
                style={styles.calendarIcon}
              />
            </TouchableOpacity>
            </View>

            {/* Adjust Schedule Button */}
            <TouchableOpacity
              style={[styles.dateButton, styles.adjustButtonSmall]}
              onPress={() => setScheduleModalVisible(true)}>
              <Ionicons
                name="time-outline"
                size={16}
                color="#007AFF"
                style={styles.adjustIcon}
              />
              <Text style={styles.adjustButtonTextSmall}>Adjust</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        </View>


        {/* Summary Grid */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, styles.summaryValueGreen]}>
              {formatDuration(scheduleStats.freeTime)}
            </Text>
            <Text style={styles.summaryLabel}>Free Time</Text>
            <Text style={styles.summarySubtext}>
              {Math.round((scheduleStats.freeTime / ((scheduleStats.dayEnd.getTime() - scheduleStats.dayStart.getTime()) / (1000 * 60))) * 100)}% of day
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, styles.summaryValueOrange]}>
              {formatDuration(scheduleStats.busyTime)}
            </Text>
            <Text style={styles.summaryLabel}>Busy Time</Text>
            <Text style={styles.summarySubtext}>
              {Math.round((scheduleStats.busyTime / ((scheduleStats.dayEnd.getTime() - scheduleStats.dayStart.getTime()) / (1000 * 60))) * 100)}% of day
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, styles.summaryValueOrange]}>
              {formatDuration(scheduleStats.travelTime)}
            </Text>
            <Text style={styles.summaryLabel}>Travel Time</Text>
            <Text style={styles.summarySubtext}>
              {scheduleStats.travelTime === 0 ? 'No travel today' : `${Math.round((scheduleStats.travelTime / ((scheduleStats.dayEnd.getTime() - scheduleStats.dayStart.getTime()) / (1000 * 60))) * 100)}% of day`}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, styles.summaryValueBlue]}>
              {formatDuration(scheduleStats.longestGap)}
            </Text>
            <Text style={styles.summaryLabel}>Longest Gap</Text>
            <Text style={styles.summarySubtext}>
              {scheduleStats.longestGap > 0
                ? `${scheduleStats.dayStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${scheduleStats.dayEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                : 'No gaps'
              }
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, styles.summaryValuePurple]}>
              {scheduleStats.freeBlocks}
            </Text>
            <Text style={styles.summaryLabel}>Free Blocks</Text>
            <Text style={styles.summarySubtext}>
              {scheduleStats.freeBlocks === 1 ? 'gap' : 'gaps'}
            </Text>
          </View>
        </View>

        {/* Schedule Timeline */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle}>Day Overview</Text>
            <Text style={styles.timelineSubtitle}>Visual timeline</Text>
          </View>
        <View style={styles.timelineBar}>
          <Text style={styles.timelineTime}>
            {scheduleStats.dayStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={styles.timelineLine}>
            {timelineEvents.map(event => {
              const totalDuration = scheduleStats.dayEnd.getTime() - scheduleStats.dayStart.getTime();
              const eventDuration = event.endTime.getTime() - event.startTime.getTime();
              const eventStart = event.startTime.getTime() - scheduleStats.dayStart.getTime();

              const left = (eventStart / totalDuration) * 100;
              const width = (eventDuration / totalDuration) * 100;

              return (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.timelineEvent,
                    {
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: event.color,
                      opacity: (hoveredEventId || hoveredTimelineId)
                        ? ((hoveredEventId === event.id || hoveredTimelineId === event.id) ? 1 : 0.3) // Highlight hovered item, fade others
                        : (event.isFreeTime ? 0.7 : 1), // Default opacity when no hover
                    },
                  ]}
                  onMouseEnter={() => {
                    setHoveredTimelineId(event.id);
                    setHoveredEventId(null); // Clear event hover
                  }}
                  onMouseLeave={() => setHoveredTimelineId(null)}
                  activeOpacity={1} // Prevent opacity changes on press
                />
              );
            })}
          </View>
          <Text style={styles.timelineTime}>
            {scheduleStats.dayEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        </View>

        {/* Schedule Timeline */}
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>Schedule Timeline</Text>
          {timelineEvents.map(event => {
            // Only make actual events clickable, not free time blocks
            const isClickableEvent = !event.id.startsWith('free-');

            if (isClickableEvent) {
              return (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.eventCard,
                    {
                      opacity: hoveredTimelineId
                        ? (hoveredTimelineId === event.id ? 1 : 0.3) // Highlight matching event, fade others
                        : 1, // Normal opacity when no timeline hover
                    },
                  ]}
                  onPress={() => handleEventPress(event.id, event.originalEventId, event.startTime.toISOString())}
                  onMouseEnter={() => {
                    setHoveredEventId(event.id);
                    setHoveredTimelineId(null); // Clear timeline hover
                  }}
                  onMouseLeave={() => setHoveredEventId(null)}
                >
                  <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTimeLabel}>
                        {event.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.eventDuration}>
                        {event.duration ? formatDuration(event.duration) : formatDuration((event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60))}
                      </Text>
                    </View>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventTimeRange}>
                      {event.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - {event.endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            } else {
              // Non-clickable free time blocks
              return (
                <View
                  key={event.id}
                  style={[
                    styles.eventCard,
                    {
                      opacity: hoveredTimelineId
                        ? (hoveredTimelineId === event.id ? 1 : 0.3) // Highlight matching event, fade others
                        : 1, // Normal opacity when no timeline hover
                    },
                  ]}
                >
                  <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTimeLabel}>
                        {event.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={styles.eventDuration}>
                        {event.duration ? formatDuration(event.duration) : formatDuration((event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60))}
                      </Text>
                    </View>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventTimeRange}>
                      {event.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - {event.endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }
          })}
        </View>
      </ScrollView>

      <ScheduleSettingsModal
        visible={scheduleModalVisible}
        dayStart={dayStart}
        dayEnd={dayEnd}
        onClose={() => setScheduleModalVisible(false)}
        onSave={handleSaveScheduleSettings}
      />

      {/* iOS Calendar Picker Modal */}
      {Platform.OS === 'ios' && calendarModalVisible && DateTimePicker && (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setCalendarModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.iosPickerOverlay}
            activeOpacity={1}
            onPress={() => setCalendarModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.calendarModalContentCentered}
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping the modal content
            >
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (event.type === 'set' && selectedDate) {
                    handleDateSelect(selectedDate);
                  } else if (event.type === 'dismissed') {
                    setCalendarModalVisible(false);
                  }
                }}
                textColor="#1D1D1F"
                themeVariant="light"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Android Calendar Picker - Native Overlay */}
      {Platform.OS === 'android' && calendarModalVisible && DateTimePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setCalendarModalVisible(false); // Always close modal after selection
            if (event.type === 'set' && selectedDate) {
              handleDateSelect(selectedDate);
            }
          }}
          minimumDate={new Date()}
        />
      )}

      {/* Web Calendar Picker - HTML Date Input */}
      {Platform.OS === 'web' && calendarModalVisible && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setCalendarModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlayCentered}
            activeOpacity={1}
            onPress={() => setCalendarModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.calendarModalContentCentered}
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping the modal content
            >
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setCalendarModalVisible(false)}>
                  <Text style={styles.pickerDoneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <WebDatePicker
                value={selectedDate}
                onChange={(date) => {
                  handleDateSelect(date);
                  setCalendarModalVisible(false);
                }}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  content: {
    padding: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  dateSection: {
    marginBottom: 16,
  },
  dateButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  dateButtonActive: {
    backgroundColor: '#007AFF',
  },
  dateButtonText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#1D1D1F',
  },
  dateButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  calendarIcon: {
    marginLeft: 4,
  },
  adjustButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustIcon: {
    marginRight: 4,
  },
  adjustButtonTextSmall: {
    fontSize: 13,
    fontWeight: '400',
    color: '#007AFF',
  },
  dateText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D1D1F',
    marginTop: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  summaryCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValueGreen: {
    color: '#34C759',
  },
  summaryValueOrange: {
    color: '#FF9500',
  },
  summaryValueBlue: {
    color: '#007AFF',
  },
  summaryValuePurple: {
    color: '#AF52DE',
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  summarySubtext: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
  },
  timelineSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timelineTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  timelineSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
  },
  timelineBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineLine: {
    flex: 1,
    height: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  timelineTime: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
  },
  timelineEvent: {
    position: 'absolute',
    height: 8,
    borderRadius: 4,
    top: 0,
  },
  eventsSection: {
    marginBottom: 16,
  },
  eventsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  noEventsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  noEventsText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  eventColorBar: {
    width: 6,
    backgroundColor: '#007AFF',
  },
  eventContent: {
    flex: 1,
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTimeLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
  },
  eventDuration: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  eventTimeRange: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
  },
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
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
  calendarModalContentCentered: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    minWidth: 300,
    minHeight: 300,
  },
});
