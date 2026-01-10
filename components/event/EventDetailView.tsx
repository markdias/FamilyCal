import { useAppSettings } from '@/contexts/AppSettingsContext';
import { getCacheKeysForEventDate, useEventCache } from '@/contexts/EventCacheContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { createEvent, deleteEvent, EventWithDetails, getEvent, updateEvent, updateEventParticipants } from '@/services/eventService';
import { FAMILY_EVENT_COLOR, normalizeColorForDisplay } from '@/utils/colorUtils';
import { openInMaps } from '@/utils/maps';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface EventDetailViewProps {
  eventId: string;
  occurrence?: string;
}

export function EventDetailView({ eventId, occurrence }: EventDetailViewProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { currentFamily } = useFamily();
  const { settings } = useAppSettings();
  const eventCache = useEventCache();
  const backgroundColor = useThemeColor({}, 'background');
  const familyColor = normalizeColorForDisplay(settings.familyCalendarColor || FAMILY_EVENT_COLOR);
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const accentSurface = useThemeColor({ light: 'rgba(0,122,255,0.08)', dark: 'rgba(10,132,255,0.16)' }, 'background');
  const borderColor = useThemeColor({ light: '#E5E5EA', dark: '#3A3A3C' }, 'border');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchEvent() {
        setIsLoading(true);
        setError(null);
        
        // Check if this is a personal calendar event (they can't be opened in detail view)
        if (eventId && eventId.startsWith('personal-')) {
          if (!isActive) return;
          console.log('Personal calendar event - cannot show details');
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
          
          setEvent(data);
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
    }, [eventId])
  );

  const getRecurrencePayloadFromEvent = (source: EventWithDetails, endDateOverride?: Date) => ({
    isRecurring: true,
    frequency: source.recurrence_frequency || undefined,
    interval: source.recurrence_interval || 1,
    daysOfWeek: source.recurrence_days_of_week || undefined,
    daysOfMonth: source.recurrence_days_of_month || undefined,
    monthsOfYear: source.recurrence_months_of_year || undefined,
    weeksOfYear: source.recurrence_weeks_of_year || undefined,
    daysOfYear: source.recurrence_days_of_year || undefined,
    setPositions: source.recurrence_set_positions || undefined,
    count: source.recurrence_count || undefined,
    endDate: endDateOverride
      ? endDateOverride
      : source.recurrence_end_date
      ? new Date(source.recurrence_end_date)
      : undefined,
    weekStart: source.recurrence_week_start || undefined,
  });

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

  const handleOpenLocation = async () => {
    if (!event || !event.location) return;
    await openInMaps(settings.defaultMapsApp, {
      query: event.structured_location_address || event.location,
      lat: event.structured_location_latitude ?? undefined,
      lon: event.structured_location_longitude ?? undefined,
    });
  };

  const performDeleteAll = async () => {
    console.log('[EventDetailView] Starting delete for event:', eventId);
    setIsDeleting(true);
    try {
      const { error: deleteError } = await deleteEvent(eventId);
      console.log('[EventDetailView] Delete result:', { hasError: !!deleteError, error: deleteError });
      
      if (deleteError) {
        console.error('[EventDetailView] Delete error:', deleteError);
        const errorMsg = `Failed to delete event: ${deleteError.message || 'Unknown error'}`;
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
        return;
      }
      
      console.log('[EventDetailView] Delete successful, invalidating cache');
      
      // Invalidate cache for event date
      if (event) {
        const eventDate = new Date(event.start_time);
        const keysToInvalidate = getCacheKeysForEventDate(eventDate);
        console.log('[EventDetailView] Invalidating cache keys:', keysToInvalidate);
        eventCache.invalidateCache(keysToInvalidate);
        
        // Trigger refresh for today and upcoming
        setTimeout(async () => {
          console.log('[EventDetailView] Refreshing cache for today and upcoming...');
          await Promise.all([
            eventCache.refreshCache('today'),
            eventCache.refreshCache('upcoming'),
          ]);
          console.log('[EventDetailView] Cache refresh completed');
        }, 300);
      }
      
      console.log('[EventDetailView] Navigating back to main tab');
      if (Platform.OS === 'web') {
        router.push('/(tabs)/');
      } else {
        router.replace('/(tabs)/');
      }
    } catch (err: any) {
      console.error('[EventDetailView] Exception during delete:', err);
      const errorMsg = `Failed to delete event: ${err?.message || err}`;
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteFutureOccurrences = async () => {
    if (!event) return;
    const occurrenceStart = occurrence ? new Date(occurrence) : null;
    if (!occurrenceStart) {
      await performDeleteAll();
      return;
    }
    console.log('[EventDetailView] Deleting future occurrences from:', occurrenceStart.toISOString());
    setIsDeleting(true);
    try {
      const cutoff = new Date(occurrenceStart.getTime() - 1000);
      const recurrencePayload = getRecurrencePayloadFromEvent(event, cutoff);
      const { error } = await updateEvent(event.id, { recurrence: recurrencePayload });
      if (error) {
        console.error('[EventDetailView] Error deleting future occurrences:', error);
        throw error;
      }
      
      console.log('[EventDetailView] Future occurrences deleted, invalidating cache');
      
      // Invalidate cache for event date
      if (event) {
        const eventDate = new Date(event.start_time);
        const keysToInvalidate = getCacheKeysForEventDate(eventDate);
        eventCache.invalidateCache(keysToInvalidate);
        
        setTimeout(async () => {
          await Promise.all([
            eventCache.refreshCache('today'),
            eventCache.refreshCache('upcoming'),
          ]);
        }, 300);
      }
      
      if (Platform.OS === 'web') {
        router.push('/(tabs)/');
      } else {
        router.replace('/(tabs)/');
      }
    } catch (err: any) {
      console.error('[EventDetailView] Exception deleting future occurrences:', err);
      const errorMsg = `Failed to delete future occurrences: ${err?.message || err}`;
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteSingleOccurrence = async () => {
    if (!event || !currentFamily) return;
    const occurrenceStart = occurrence ? new Date(occurrence) : null;
    if (!occurrenceStart) {
      await performDeleteAll();
      return;
    }
    console.log('[EventDetailView] Deleting single occurrence:', occurrenceStart.toISOString());
    setIsDeleting(true);
    try {
      const cutoff = new Date(occurrenceStart.getTime() - 1000);
      // End current series before the occurrence
      const { error: endError } = await updateEvent(event.id, {
        recurrence: getRecurrencePayloadFromEvent(event, cutoff),
      });
      if (endError) {
        console.error('[EventDetailView] Error ending series:', endError);
        throw endError;
      }

      // Create a future series starting after this occurrence to preserve future events
      const nextStart = getNextStart(occurrenceStart, event.recurrence_frequency, event.recurrence_interval);
      const durationMs = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
      const { data: newFuture, error: futureError } = await createEvent(
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
          recurrence: getRecurrencePayloadFromEvent(event),
          dropOffDriverId: event.drop_off_driver_id || null,
          collectionDriverId: event.collection_driver_id || null,
          sameDriver: event.same_driver || false,
        },
        event.participants?.map((p) => p.contact_id) || []
      );
      if (futureError) {
        console.error('[EventDetailView] Error creating future series:', futureError);
        throw futureError;
      }

      // Ensure participants are copied (createEvent already did via argument)
      if (newFuture?.id && event.participants?.length) {
        await updateEventParticipants(newFuture.id, event.participants.map((p) => p.contact_id));
      }

      console.log('[EventDetailView] Single occurrence deleted, invalidating cache');

      // Invalidate cache for event date
      if (event) {
        const eventDate = new Date(event.start_time);
        const keysToInvalidate = getCacheKeysForEventDate(eventDate);
        eventCache.invalidateCache(keysToInvalidate);
        
        setTimeout(async () => {
          await Promise.all([
            eventCache.refreshCache('today'),
            eventCache.refreshCache('upcoming'),
          ]);
        }, 300);
      }

      if (Platform.OS === 'web') {
        router.push('/(tabs)/');
      } else {
        router.replace('/(tabs)/');
      }
    } catch (err: any) {
      console.error('[EventDetailView] Exception deleting single occurrence:', err);
      const errorMsg = `Failed to delete just this occurrence: ${err?.message || err}`;
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    if (event?.is_recurring && occurrence) {
      const perform = (choice: 'single' | 'future' | 'all') => {
        if (choice === 'single') deleteSingleOccurrence();
        else if (choice === 'future') deleteFutureOccurrences();
        else performDeleteAll();
      };

      if (Platform.OS === 'web') {
        // Button-like flow using confirms (no typing)
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
        // fallback to all
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

    // Non-recurring fallback
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this event? This action cannot be undone.');
      if (confirmed) {
        performDeleteAll();
      }
    } else {
      Alert.alert(
        'Delete Event',
        'Are you sure you want to delete this event? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: performDeleteAll,
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor },
        ]}>
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

  const occurrenceStart = occurrence ? new Date(occurrence) : null;
  const baseStart = new Date(event.start_time);
  const baseEnd = new Date(event.end_time);
  const durationMs = baseEnd.getTime() - baseStart.getTime();
  const startTime = occurrenceStart || baseStart;
  const endTime = occurrenceStart ? new Date(startTime.getTime() + durationMs) : baseEnd;
  
  // Format date
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const dateStr = startTime.toLocaleDateString('en-GB', dateOptions);
  
  // Format time range, handling midnight (next day)
  const startHours = startTime.getHours();
  const startMinutes = startTime.getMinutes();
  const endHours = endTime.getHours();
  const endMinutes = endTime.getMinutes();
  
  let timeRange: string;
  if (event.is_all_day) {
    timeRange = 'All day';
  } else if (endHours === 0 && endMinutes === 0 && endTime.getDate() !== startTime.getDate()) {
    timeRange = `${startHours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')} - 00:00`;
  } else {
    timeRange = `${startHours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')} - ${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }
  
  const participantIds = event.participants?.map((p) => p.contact_id) || [];
  const participantAvatars =
    event.participants
      ?.map((p) => {
        const contact = p.contact;
        if (!contact) return null;
        const initial = (contact.first_name || contact.last_name || '?').trim().charAt(0).toUpperCase() || '?';
        const color = contact.color || familyColor || '#6B7280';
        return { id: contact.id, initial, color };
      })
      .filter(Boolean) as { id: string; initial: string; color: string }[];
  
  // Get availability display
  const availabilityDisplay = event.availability === 'busy' ? 'Busy' : 
    event.availability === 'free' ? 'Free' : 
    event.availability === 'tentative' ? 'Tentative' : 'Busy';

  const tags = [
    event.is_all_day ? 'All day' : null,
    event.is_recurring ? 'Repeats' : null,
    availabilityDisplay,
  ].filter(Boolean) as string[];
  const titleInitial = event.title?.trim()?.charAt(0)?.toUpperCase() || 'E';
  const hasLocation = !!(event.structured_location_address || event.location);
  const heroPalette = {
    gradient: [surfaceColor, cardColor],
    stroke: borderColor,
    pillBg: surfaceColor,
    pillText: textColor,
    accent: textColor,
    accentSubtle: surfaceColor,
  };

  const renderDeleteButton = () => (
    <TouchableOpacity
      style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
      onPress={handleDelete}
      disabled={isDeleting}>
      {isDeleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteButtonText}>Delete Event</Text>}
    </TouchableOpacity>
  );

  const renderChecklist = () => (
    <View style={[styles.card, { backgroundColor: cardColor }]}>
      <Text style={[styles.cardTitle, { color: textColor }]}>Checklist</Text>
      <Text style={[styles.emptyText, { color: mutedText }]}>No checklist items yet</Text>
      <TouchableOpacity style={[styles.addButton, styles.smallGhostButton, { borderColor: textColor }]}>
        <Ionicons name="add" size={18} color={textColor} />
        <Text style={[styles.addButtonText, { color: textColor }]}>Add Item</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAttachments = (compact?: boolean) => (
    <View style={[styles.card, compact && styles.compactCard, { backgroundColor: cardColor }]}>
      <View style={styles.attachmentsHeader}>
        <Ionicons name="attach" size={20} color={textColor} />
        <Text style={[styles.cardTitle, compact && styles.compactTitle, { color: textColor }]}>Attachments</Text>
      </View>
      <Text style={[styles.storageText, { color: mutedText }]}>Zero bytes / 262.1 MB</Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { backgroundColor: surfaceColor }]}>
          <View style={[styles.progressBarFill, { backgroundColor: textColor, width: '0%' }]} />
        </View>
      </View>
      <Text style={[styles.progressText, { color: mutedText }]}>0% used</Text>
      <View style={styles.attachmentsEmpty}>
        <Ionicons name="attach" size={48} color={surfaceColor} />
        <Text style={[styles.emptyText, { color: mutedText }]}>No attachments yet</Text>
        <Text style={[styles.instructionText, { color: mutedText }]}>
          Add files to this event using the + button
        </Text>
      </View>
      <TouchableOpacity style={[styles.addAttachmentButton, { backgroundColor: textColor }]}>
        <Ionicons name="add" size={20} color={cardColor} />
      </TouchableOpacity>
    </View>
  );

  const renderHeroPrototype = () => (
    <ScrollView
      style={[styles.scrollView, { backgroundColor }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}>
      <LinearGradient
        colors={heroPalette.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroHeader, { borderColor: heroPalette.stroke }]}>
        <View style={styles.tagRow}>
          {tags.map((tag) => (
            <View
              key={tag}
              style={[styles.tagPill, { borderColor: heroPalette.stroke, backgroundColor: heroPalette.pillBg }]}>
              <Text style={[styles.tagText, { color: heroPalette.pillText }]}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.heroTitle, { color: textColor }]} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={18} color={heroPalette.accent} />
          <Text style={[styles.infoText, { color: textColor }]}>{`${dateStr} · ${timeRange}`}</Text>
        </View>
        {hasLocation && (
          <TouchableOpacity
            style={[styles.heroLocation, { backgroundColor: surfaceColor }]}
            onPress={handleOpenLocation}
            activeOpacity={0.8}>
            <Ionicons name="location" size={18} color={heroPalette.accent} />
            <View style={styles.locationTextContainer}>
              {event.structured_location_title && (
                <Text style={[styles.locationTitle, { color: heroPalette.accent }]}>{event.structured_location_title}</Text>
              )}
              <Text style={[styles.infoText, styles.linkText, { color: heroPalette.accent }]}>
                {event.structured_location_address || event.location}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={heroPalette.accent} />
          </TouchableOpacity>
        )}
        <View style={styles.heroMetaStack}>
          <View style={styles.heroMetaRow}>
            <View style={[styles.heroMetaCard, { backgroundColor: cardColor }]}>
              <View style={styles.metaHeaderRow}>
                <Ionicons name="people-outline" size={18} color={heroPalette.accent} />
                <Text style={[styles.metaLabel, { color: mutedText }]}>Participants</Text>
              </View>
              {participantAvatars.length > 0 ? (
                <View style={styles.participantAvatarRow}>
                  {participantAvatars.map((p) => (
                    <View key={p.id} style={[styles.participantAvatar, { backgroundColor: p.color }]}>
                      <Text style={[styles.participantAvatarText, { color: '#FFFFFF' }]}>{p.initial}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.metaValue, { color: mutedText }]}>None</Text>
              )}
            </View>
            <View style={[styles.heroMetaCard, styles.heroMetaCardTight, { backgroundColor: cardColor }]}>
              <View style={styles.metaHeaderRow}>
                <Ionicons name="radio-button-on-outline" size={18} color={heroPalette.accent} />
                <Text style={[styles.metaLabel, { color: mutedText }]}>Show As</Text>
              </View>
              <Text style={[styles.metaValue, { color: textColor }]}>{availabilityDisplay}</Text>
            </View>
          </View>
          <View style={[styles.heroMetaRow, styles.heroMetaRowGap]}>
            <View style={[styles.heroMetaCard, { backgroundColor: cardColor }]}>
              <View style={styles.metaHeaderRow}>
                <Ionicons name="calendar-outline" size={18} color={heroPalette.accent} />
                <Text style={[styles.metaLabel, { color: mutedText }]}>Calendar</Text>
              </View>
              <View style={styles.familyBadge}>
                <View style={[styles.greenDot, { backgroundColor: familyColor }]} />
                <Text style={[styles.familyText, { color: textColor }]} numberOfLines={1}>
                  {currentFamily?.name || 'Family'}
                </Text>
              </View>
            </View>
            <View style={[styles.heroMetaCard, styles.heroMetaCardTight, { backgroundColor: cardColor }]}>
              <View style={styles.metaHeaderRow}>
                <Ionicons name="car-outline" size={18} color={heroPalette.accent} />
                <Text style={[styles.metaLabel, { color: mutedText }]}>Travel</Text>
              </View>
              <Text style={[styles.metaValue, { color: textColor }]}>None</Text>
            </View>
          </View>
        </View>

      </LinearGradient>

      {event.notes && (
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={18} color={accent} />
            <Text style={[styles.cardTitle, styles.sectionHeaderText, { color: textColor }]}>Notes</Text>
          </View>
          <Text style={[styles.notesText, { color: textColor }]}>{event.notes}</Text>
        </View>
      )}

      {renderChecklist()}
      {renderAttachments()}

      {renderDeleteButton()}
    </ScrollView>
  );

  return renderHeroPrototype();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
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
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '400',
    marginLeft: 8,
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  linkText: {
    color: '#007AFF',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 15,
    fontWeight: '400',
    marginRight: 4,
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
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 4,
  },
  attachmentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    marginBottom: 8,
  },
  progressBarContainer: {
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E7',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    width: '0%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    marginBottom: 16,
  },
  attachmentsEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    position: 'relative',
  },
  instructionText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  addAttachmentButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#B14E3B',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notesText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
    lineHeight: 22,
  },
  heroHeader: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  tagPill: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  heroTime: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  heroLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  heroMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  heroMetaRowGap: {
    marginTop: 10,
  },
  heroMetaStack: {
    marginTop: 12,
  },
  heroMetaCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 72,
  },
  heroMetaCardFull: {
    width: '100%',
    marginRight: 0,
    marginBottom: 12,
  },
  heroMetaCardTight: {
    marginRight: 0,
    marginLeft: 0,
  },
  metaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  participantAvatarRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  smallMuted: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderText: {
    marginLeft: 8,
  },
  splitRow: {
    flexDirection: 'row',
  },
  splitColumn: {
    flex: 1,
  },
  splitColumnSpacing: {
    marginRight: 12,
  },
  compactCard: {
    padding: 14,
  },
  compactTitle: {
    marginBottom: 6,
  },
  smallGhostButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
});
