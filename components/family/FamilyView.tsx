import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEventCache } from '@/contexts/EventCacheContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { mapEventsToFamilyEvents } from '@/services/eventService';
import { createInvitation } from '@/services/familyService';
import { FAMILY_EVENT_COLOR } from '@/utils/colorUtils';
import { FamilyEvent, generateCurrentEvents, generateUpcomingEvents } from '@/utils/mockEvents';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CurrentEventsGrid } from './CurrentEventsGrid';
import { UpcomingEventsList } from './UpcomingEventsList';

export function FamilyView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentFamily, contacts, familyMembers, userRole, isLoading: isFamilyLoading, refreshMembers, refreshContacts } = useFamily();

  // Debug logging for family state
  useEffect(() => {
    console.log('[FamilyView] Family state:', {
      currentFamily: currentFamily?.id || null,
      isFamilyLoading,
      familyMembersCount: familyMembers?.length || 0,
      contactsCount: contacts?.length || 0,
    });
  }, [currentFamily, isFamilyLoading, familyMembers, contacts]);
  const { settings } = useAppSettings();
  const eventCache = useEventCache();
  const { user, userContact } = useAuth();
  const backgroundColor = useThemeColor({ light: '#E8E8ED', dark: '#2C2C2E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const emptyContainerBgColor = useThemeColor({ light: '#F5F5F7', dark: '#1C1C1E' }, 'background');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invitation state
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  // Menu state (for Web/Android fallback)
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [menuOptions, setMenuOptions] = useState<string[]>([]);
  const [currentPerson, setCurrentPerson] = useState('');


  // Ensure events are fetched (only once on mount/family change)
  useEffect(() => {
    if (!isFamilyLoading && currentFamily) {
      console.log('[FamilyView] Ensuring events are fetched for today and upcoming');
      eventCache.ensureEventsFetched('today', false);
      eventCache.ensureEventsFetched('upcoming', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFamily?.id, isFamilyLoading]);

  // Get events from cache (read-only)
  const todayEvents = eventCache.getEvents('today');
  const upcomingEvents = eventCache.getEvents('upcoming');
  const isLoadingToday = eventCache.isLoading('today');
  const isLoadingUpcoming = eventCache.isLoading('upcoming');
  const isLoading = isLoadingToday || isLoadingUpcoming;

  // Debug logging
  useEffect(() => {
    console.log('[FamilyView] Events from cache:', {
      todayCount: todayEvents.length,
      upcomingCount: upcomingEvents.length,
      isLoadingToday,
      isLoadingUpcoming,
      todayEvents: todayEvents.map(e => ({ id: e.id, title: e.title, start: e.start_time, participants: e.participants?.length || 0 })),
      upcomingEvents: upcomingEvents.map(e => ({ id: e.id, title: e.title, start: e.start_time, participants: e.participants?.length || 0 })),
    });
  }, [todayEvents.length, upcomingEvents.length, isLoadingToday, isLoadingUpcoming]);

  // Check if cache entries exist (even if empty)
  // If a cache entry exists, it means we've fetched before (or are currently fetching)
  // Only show spinner if we have no cache entries at all
  const todayCacheEntry = eventCache.getCacheEntry('today');
  const upcomingCacheEntry = eventCache.getCacheEntry('upcoming');
  const hasCacheEntries = !!todayCacheEntry || !!upcomingCacheEntry;

  // Process events into FamilyEvent format
  const { currentEvents, processedUpcomingEvents } = useMemo(() => {
    const familyColor = settings.familyCalendarColor || FAMILY_EVENT_COLOR;

    // Only use mock data in development when explicitly no family is loaded
    // In production, show empty arrays if no events are available
    if (!currentFamily && __DEV__) {
      console.warn('[FamilyView] Using mock data - no family loaded');
      return {
        currentEvents: generateCurrentEvents(),
        processedUpcomingEvents: generateUpcomingEvents(),
      };
    }

    // If no family is loaded in production, return empty arrays
    if (!currentFamily) {
      return {
        currentEvents: [],
        processedUpcomingEvents: [],
      };
    }

    // Combine all events (regular + personal calendar) and sort by start time
    // Note: Personal calendar events are already included in today/upcoming caches
    let allEvents = [
      ...(todayEvents.length > 0 ? mapEventsToFamilyEvents(todayEvents, familyMembers.map(m => m.contact), currentFamily.name, familyColor) : []),
      ...(upcomingEvents.length > 0 ? mapEventsToFamilyEvents(upcomingEvents, familyMembers.map(m => m.contact), currentFamily.name, familyColor) : []),
    ].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Filter out events that have already ended
    const now = new Date();
    allEvents = allEvents.filter(event => event.endTime > now);

    // Remove duplicates (events might appear in both today and upcoming)
    const seenIds = new Set<string>();
    const uniqueEvents = allEvents.filter((event) => {
      if (seenIds.has(event.id)) return false;
      seenIds.add(event.id);
      return true;
    });

    // Next event per person (one per person) plus limited upcoming per person
    const perPersonLimit = Math.max(1, settings.eventsPerPerson || 1);
    const nextEventPerPerson = new Map<string, FamilyEvent>();
    const upcomingByPersonCount = new Map<string, number>();
    const remainingEvents: FamilyEvent[] = [];

    for (const event of uniqueEvents) {
      const personKey = event.person || 'Family';
      if (!nextEventPerPerson.has(personKey)) {
        nextEventPerPerson.set(personKey, event);
        continue;
      }
      const used = upcomingByPersonCount.get(personKey) || 0;
      if (used < perPersonLimit) {
        remainingEvents.push(event);
        upcomingByPersonCount.set(personKey, used + 1);
      }
      // else drop extras beyond limit
    }

    return {
      currentEvents: Array.from(nextEventPerPerson.values()),
      processedUpcomingEvents: remainingEvents,
    };
  }, [todayEvents, upcomingEvents, currentFamily, familyMembers, settings.eventsPerPerson, settings.familyCalendarColor]);

  // Refresh events when screen comes into focus (e.g., after adding an event)
  useFocusEffect(
    useCallback(() => {
      if (!isFamilyLoading && currentFamily) {
        console.log('FamilyView focused - refreshing events');
        eventCache.refreshCache('today');
        eventCache.refreshCache('upcoming');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentFamily?.id, isFamilyLoading])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await Promise.all([
        eventCache.refreshCache('today'),
        eventCache.refreshCache('upcoming'),
      ]);
    } catch (err) {
      console.error('Error refreshing events:', err);
      setError('Failed to refresh events. Please try again.');
    } finally {
      setIsRefreshing(false);
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
  const handleOptionExecute = async (option: string) => {
    if (!selectedContact || !currentPerson) return;

    switch (option) {
      case 'View Profile':
        router.push({
          pathname: '/member/[name]',
          params: { name: currentPerson },
        });
        break;
      case 'Invite Member':
        setIsInviteModalVisible(true);
        break;
      case 'Change Colour':
        Alert.alert('Change Colour', 'Color customization coming soon!');
        break;
      case 'Remove from family':
        if (!currentFamily) {
          Alert.alert('Error', 'Family data not loaded.');
          break;
        }
        Alert.alert(
          'Remove from family',
          `Are you sure you want to remove ${currentPerson} from the family?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: async () => {
                try {
                  const { removeFamilyMember } = await import('@/services/familyService');
                  const { error } = await removeFamilyMember(currentFamily.id, selectedContact.id);
                  if (error) throw error;

                  Alert.alert('Success', `${currentPerson} has been removed.`);
                  refreshMembers();
                  refreshContacts();
                } catch (err: any) {
                  Alert.alert('Error', err.message || 'Failed to remove member.');
                }
              }
            }
          ]
        );
        break;
    }
    setIsMenuVisible(false);
  };

  const handleMemberPress = (person: string) => {
    const searchName = person.trim().toLowerCase();
    const contact = contacts.find(c => {
      const firstName = c.first_name.toLowerCase();
      const lastName = (c.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();

      return fullName === searchName ||
        firstName === searchName ||
        searchName.includes(firstName) ||
        (lastName && searchName.includes(lastName));
    });

    if (!contact) {
      console.log('[FamilyView] No contact found for:', person);
      router.push({
        pathname: '/member/[name]',
        params: { name: person },
      });
      return;
    }

    const options = ['View Profile'];
    // Show "Invite Member" if they have no user_id (meaning they haven't joined yet)
    // AND the current user is an admin/owner
    const isInviteable = !contact.user_id;
    const hasAdminPermissions = userRole === 'owner' || userRole === 'admin';

    console.log('[FamilyView] handleMemberPress debug:', {
      person,
      contactId: contact.id,
      isInviteable,
      userRole,
      hasAdminPermissions,
      platform: Platform.OS
    });

    if (isInviteable && hasAdminPermissions) {
      options.push('Invite Member');
    }

    options.push('Change Colour');

    if (userRole === 'owner' || userRole === 'admin') {
      options.push('Remove from family');
    }

    options.push('Cancel');

    console.log('[FamilyView] Generated options:', options);

    // Set state for both platforms
    setCurrentPerson(person);
    setSelectedContact(contact);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: options.indexOf('Remove from family'),
          cancelButtonIndex: options.indexOf('Cancel'),
          title: person,
        },
        (index) => {
          if (index !== -1 && index !== options.indexOf('Cancel')) {
            handleOptionExecute(options[index]);
          }
        }
      );
    } else {
      // Use custom Modal-based Action Sheet for Web/Android
      setCurrentPerson(person);
      setMenuOptions(options);
      // Ensure we set the contact so the modal can use it
      setSelectedContact(contact);
      setIsMenuVisible(true);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!currentFamily || !selectedContact) return;

    setIsSendingInvite(true);
    try {
      const { error } = await createInvitation(
        currentFamily.id,
        inviteEmail.trim(),
        selectedContact.first_name,
        selectedContact.last_name || undefined,
        'member',
        `Join our family calendar on FamilyCal!`
      );

      if (error) throw error;

      Alert.alert('Invitation Sent', `An invitation has been sent to ${inviteEmail}.`);
      setIsInviteModalVisible(false);
      setInviteEmail('');
      setSelectedContact(null);
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      Alert.alert('Error', err.message || 'Failed to send invitation.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Show loading state...
  // Once we have cache entries (even if empty), show the view and let it update
  if (isLoading && !isRefreshing && !hasCacheEntries) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { paddingTop: Math.max(insets.top, 0), backgroundColor },
        ]}>
        <ActivityIndicator size="large" color={textColor} />
        <Text style={[styles.loadingText, { color: subTextColor }]}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 0), backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={textColor}
          />
        }>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: '#FF3B30' }]}>{error}</Text>
          </View>
        )}

        {currentEvents.length === 0 && processedUpcomingEvents.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: emptyContainerBgColor }]}>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No Events Yet</Text>
            <Text style={[styles.emptyText, { color: subTextColor }]}>
              Create your first event by tapping the + button below
            </Text>
          </View>
        ) : (
          <>
            <CurrentEventsGrid events={currentEvents} onEventPress={handleEventPress} onMemberPress={handleMemberPress} />
            <UpcomingEventsList events={processedUpcomingEvents} onEventPress={handleEventPress} onMemberPress={handleMemberPress} />
          </>
        )}
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={isInviteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsInviteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite to Family</Text>
            <Text style={styles.modalSubtitle}>
              Invite {selectedContact?.first_name} to join the family calendar as an authenticated user.
            </Text>

            <TextInput
              style={styles.emailInput}
              placeholder="Enter email address"
              placeholderTextColor="#8E8E93"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              editable={!isSendingInvite}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsInviteModalVisible(false);
                  setSelectedContact(null);
                  setInviteEmail('');
                }}
                disabled={isSendingInvite}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={handleSendInvite}
                disabled={isSendingInvite}>
                {isSendingInvite ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>Send Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Options Menu Modal (Web/Android Fallback) */}
      <Modal
        visible={isMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMenuVisible(false)}>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setIsMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle}>{currentPerson}</Text>
            {menuOptions.map((option, index) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.menuOption,
                  option === 'Remove from family' && styles.destructiveOption,
                  option === 'Cancel' && styles.cancelOption
                ]}
                onPress={() => {
                  handleOptionExecute(option);
                }}>
                <Text style={[
                  styles.menuOptionText,
                  option === 'Remove from family' && styles.destructiveOptionText,
                  option === 'Cancel' && styles.cancelOptionText
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8ED',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFEBEB',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 20,
  },
  emailInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1D1D1F',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F7',
  },
  sendButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  menuHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E8E8ED',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 20,
  },
  menuOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
    alignItems: 'center',
  },
  menuOptionText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '500',
  },
  destructiveOptionText: {
    color: '#FF3B30',
  },
  destructiveOption: {
    borderBottomWidth: 1,
    borderBottomColor: '#FFEBEB',
  },
  cancelOption: {
    marginTop: 10,
    borderBottomWidth: 0,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
  },
  cancelOptionText: {
    color: '#1D1D1F',
    fontWeight: '600',
  },
});
