import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { EventWithDetails, getUpcomingEvents, deleteEvent, mapEventsToFamilyEvents } from '@/services/eventService';
import { FamilyEvent } from '@/utils/mockEvents';
import { EventCard } from '@/components/family/EventCard';
import { useThemeColor } from '@/hooks/use-theme-color';

interface SearchableEvent extends FamilyEvent {
  originalEvent: EventWithDetails;
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchableEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [allEvents, setAllEvents] = useState<EventWithDetails[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const { currentFamily, familyMembers, contacts } = useFamily();
  const { user } = useAuth();
  const backgroundColor = useThemeColor({ light: '#F5F5F7', dark: '#0F0F0F' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');

  // Load all upcoming events when family changes
  useEffect(() => {
    if (currentFamily) {
      loadAllEvents();
    } else {
      setAllEvents([]);
      setSearchResults([]);
    }
  }, [currentFamily]);

  const loadAllEvents = async () => {
    if (!currentFamily) return;

    setIsLoading(true);
    try {
      const { data, error } = await getUpcomingEvents(currentFamily.id);
      if (error) {
        console.error('Error loading events:', error);
        setAllEvents([]);
      } else {
        setAllEvents(data || []);
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setAllEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Perform search when query changes
  useEffect(() => {
    if (!currentFamily || searchQuery.trim().length === 0) {
      setSearchResults([]);
      setSelectedEvents(new Set());
      setIsSelectionMode(false);
      return;
    }

    performSearch(searchQuery);
    setIsSelectionMode(false); // Reset selection mode when searching
  }, [searchQuery, allEvents, contacts, currentFamily]);

  const performSearch = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase().trim();
    const results: SearchableEvent[] = [];

    for (const event of allEvents) {
      // Check if event title matches
      const titleMatches = event.title.toLowerCase().includes(lowercaseQuery);

      // Check if any participant name matches
      const participantMatches = event.participants?.some(participant => {
        const contact = participant.contact;
        if (!contact) return false;

        const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
        const firstName = contact.first_name?.toLowerCase() || '';
        const lastName = contact.last_name?.toLowerCase() || '';

        return fullName.includes(lowercaseQuery) ||
               firstName.includes(lowercaseQuery) ||
               lastName.includes(lowercaseQuery);
      }) || false;

      if (titleMatches || participantMatches) {
        // Convert to FamilyEvent format for display
        const familyEvents = mapEventsToFamilyEvents([event], contacts);
        for (const familyEvent of familyEvents) {
          results.push({
            ...familyEvent,
            originalEvent: event,
          });
        }
      }
    }

    setSearchResults(results);
    setSelectedEvents(new Set());
  }, [allEvents, contacts]);

  const toggleEventSelection = (eventId: string) => {
    console.log('toggleEventSelection called for:', eventId);
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      console.log('Removing from selection:', eventId);
      newSelected.delete(eventId);
    } else {
      console.log('Adding to selection:', eventId);
      newSelected.add(eventId);
    }
    console.log('New selection size:', newSelected.size);
    setSelectedEvents(newSelected);
  };

  const clearSelection = () => {
    setSelectedEvents(new Set());
  };

  const deleteSelectedEvents = async () => {
    console.log('deleteSelectedEvents called, selectedEvents.size:', selectedEvents.size);
    console.log('selectedEvents:', Array.from(selectedEvents));

    if (selectedEvents.size === 0) {
      console.log('No events selected, returning');
      return;
    }

    Alert.alert(
      'Delete Events',
      `Are you sure you want to delete ${selectedEvents.size} event${selectedEvents.size > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Get the original event IDs from selected search results
              const eventIdsToDelete = Array.from(selectedEvents).map(selectedId => {
                const searchResult = searchResults.find(result => result.id === selectedId);
                return searchResult?.originalEvent.id;
              }).filter(id => id != null);

              const deletePromises = eventIdsToDelete.map(eventId => deleteEvent(eventId));

              const results = await Promise.all(deletePromises);
              const failedDeletes = results.filter(result => result.error);

              if (failedDeletes.length > 0) {
                Alert.alert(
                  'Partial Success',
                  `${selectedEvents.size - failedDeletes.length} events deleted, but ${failedDeletes.length} failed.`
                );
              } else {
                Alert.alert('Success', `${selectedEvents.size} event${selectedEvents.size > 1 ? 's' : ''} deleted.`);
              }

              // Refresh events and clear selection
              await loadAllEvents();
              setSelectedEvents(new Set());

            } catch (error) {
              console.error('Error deleting events:', error);
              Alert.alert('Error', 'Failed to delete events. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const renderEventCard = ({ item }: { item: SearchableEvent }) => {
    const isSelected = selectedEvents.has(item.id);

    const handleEventPress = () => {
      console.log('Event pressed:', item.id, 'isSelectionMode:', isSelectionMode);
      if (isSelectionMode) {
        console.log('Toggling selection for:', item.id);
        toggleEventSelection(item.id);
      }
      // If not in selection mode, do nothing (no navigation since disableNavigation is true)
    };

    return (
      <TouchableOpacity
        onPress={handleEventPress}
        activeOpacity={isSelectionMode ? 0.7 : 1}
        style={styles.eventCardContainer}
      >
        <EventCard
          event={item}
          disableNavigation
          isSelected={isSelected}
          accentColor={accent}
        />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    // Show message when no family is selected
    if (!currentFamily) {
      return (
        <View style={styles.centerContent}>
          <Ionicons name="people" size={48} color={textColor} style={{ opacity: 0.5 }} />
          <Text style={[styles.emptyText, { color: textColor }]}>
            Select a family to search events
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[styles.emptyText, { color: textColor }]}>Loading events...</Text>
        </View>
      );
    }

    if (searchQuery.trim().length === 0) {
      return (
        <View style={styles.centerContent}>
          <Ionicons name="search" size={48} color={textColor} style={{ opacity: 0.5 }} />
          <Text style={[styles.emptyText, { color: textColor }]}>
            Search for events by title or family member name
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.centerContent}>
        <Ionicons name="search" size={48} color={textColor} style={{ opacity: 0.5 }} />
        <Text style={[styles.emptyText, { color: textColor }]}>
          No events found matching "{searchQuery}"
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Search Header */}
      <View style={styles.searchHeader}>

        <View style={[
          styles.searchInputContainer,
          { backgroundColor: inputBg },
          !currentFamily && { opacity: 0.5 }
        ]}>
          <Ionicons name="search" size={20} color={textColor} style={{ opacity: 0.6 }} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder={currentFamily ? "Search events or people..." : "Select a family first"}
            placeholderTextColor={textColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!!currentFamily}
          />
          {searchQuery.length > 0 && currentFamily && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={textColor} style={{ opacity: 0.6 }} />
            </TouchableOpacity>
          )}
        </View>

        {/* Select Button - Show when there are results but not in selection mode */}
        {searchResults.length > 0 && !isSelectionMode && (
          <View style={styles.selectButtonContainer}>
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: 'rgba(142, 142, 147, 0.8)' }]}
              onPress={() => {
                console.log('Select button pressed, entering selection mode');
                setIsSelectionMode(true);
              }}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="white"
              />
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selection Actions */}
        {isSelectionMode && (
          <View style={styles.selectionActionsContainer}>
            <View style={styles.selectionButtonsRow}>
              {selectedEvents.size > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearSelection}
                >
                  <Text style={[styles.clearButtonText, { color: accent }]}>Clear</Text>
                </TouchableOpacity>
              )}
              {selectedEvents.size > 0 && (
                <TouchableOpacity
                  style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
                  onPress={deleteSelectedEvents}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="trash" size={16} color="white" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: accent }]}
                onPress={() => {
                  setIsSelectionMode(false);
                  setSelectedEvents(new Set());
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="white"
                />
                <Text style={styles.doneButtonText}>
                  Done{selectedEvents.size > 0 ? ` (${selectedEvents.size})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Results */}
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={renderEventCard}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={searchResults.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60, // Account for status bar
  },
  selectButtonContainer: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    marginRight: 8,
  },
  selectionActionsContainer: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  selectionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  eventCardContainer: {
    position: 'relative',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
});
