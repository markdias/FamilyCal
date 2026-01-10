/**
 * LocationPicker Component
 * 
 * Provides location selection with:
 * - Address autocomplete as user types
 * - "Use Current Location" button with reverse geocoding
 * - Favorite locations (from saved places)
 * - Recent locations (auto-tracked)
 * 
 * Platform-specific:
 * - Web: Dropdown with autocomplete results
 * - Native: Centered modal
 */

import { useFamily } from '@/contexts/FamilyContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { AUTOCOMPLETE_DEBOUNCE_MS } from '@/lib/googleMapsConfig';
import {
    FavoriteLocation,
    getFavoriteLocations,
} from '@/services/favoriteLocationsService';
import {
    getCurrentLocationWithAddress,
    LocationResult,
    searchLocations,
} from '@/services/locationService';
import {
    getRecentLocations,
    RecentLocation,
} from '@/services/recentLocationsService';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface LocationPickerProps {
  value: LocationResult | null;
  onChange: (location: LocationResult | null) => void;
  placeholder?: string;
  disabled?: boolean;
  inline?: boolean;
}

export function LocationPicker({
  value,
  onChange,
  placeholder = 'Add Location',
  disabled = false,
  inline = false,
}: LocationPickerProps) {
  const { currentFamily } = useFamily();
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const borderColor = useThemeColor({ light: '#E5E5EA', dark: '#3A3A3C' }, 'border');

  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<LocationResult[]>([]);
  const [favoriteLocations, setFavoriteLocations] = useState<FavoriteLocation[]>([]);
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = useState(false);

  // Load favorite and recent locations when modal opens
  useEffect(() => {
    if (showModal && currentFamily) {
      loadFavoriteLocations();
      loadRecentLocations();
    }
  }, [showModal, currentFamily]);

  const loadFavoriteLocations = async () => {
    if (!currentFamily) return;

    const { data, error } = await getFavoriteLocations(currentFamily.id);
    if (!error && data) {
      setFavoriteLocations(data);
    }
  };

  const loadRecentLocations = async () => {
    if (!currentFamily) return;

    const { data, error } = await getRecentLocations(currentFamily.id);
    if (!error && data) {
      setRecentLocations(data);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery || searchQuery.trim() === '') {
        setAutocompleteResults([]);
        setIsSearching(false);
        return;
      }

      try {
        const results = await searchLocations(searchQuery);
        setAutocompleteResults(results);
      } catch (error) {
        console.error('[LocationPicker] Search error:', error);
        setAutocompleteResults([]);
      } finally {
        setIsSearching(false);
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS),
    []
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setIsSearching(true);
    debouncedSearch(text);
  };

  const handleSelectLocation = (location: LocationResult) => {
    onChange(location);
    setQuery('');
    setAutocompleteResults([]);
    setShowModal(false);
  };

  const handleSelectFavorite = (favorite: FavoriteLocation) => {
    const location: LocationResult = {
      address: favorite.address,
      title: favorite.name,
      latitude: favorite.latitude,
      longitude: favorite.longitude,
      placeId: favorite.place_id || undefined,
    };
    handleSelectLocation(location);
  };

  const handleSelectRecent = (recent: RecentLocation) => {
    const location: LocationResult = {
      address: recent.address,
      latitude: recent.latitude,
      longitude: recent.longitude,
      placeId: recent.place_id || undefined,
    };
    handleSelectLocation(location);
  };

  const handleUseCurrentLocation = async () => {
    setIsLoadingCurrentLocation(true);
    try {
      const location = await getCurrentLocationWithAddress();
      if (location) {
        handleSelectLocation(location);
      } else {
        if (Platform.OS === 'web') {
          window.alert('Unable to get current location. Please check your location permissions.');
        } else {
          Alert.alert(
            'Location Unavailable',
            'Unable to get current location. Please check your location permissions.'
          );
        }
      }
    } catch (error) {
      console.error('[LocationPicker] Current location error:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to get current location');
      } else {
        Alert.alert('Error', 'Failed to get current location');
      }
    } finally {
      setIsLoadingCurrentLocation(false);
    }
  };

  const handleClear = () => {
    onChange(null);
  };

  const handleOpenModal = () => {
    if (!disabled) {
      setShowModal(true);
      setQuery('');
      setAutocompleteResults([]);
    }
  };

  return (
    <>
      {/* Display selected location or button to open picker */}
      {value ? (
        <View style={[styles.selectedContainer, inline && styles.selectedContainerInline]}>
          <View style={styles.selectedContent}>
            <Ionicons name="location" size={20} color="#FF3B30" />
            <View style={styles.selectedTextContainer}>
              {value.title && (
                <Text style={[styles.selectedTitle, { color: textColor }]}>{value.title}</Text>
              )}
              <Text style={[styles.selectedAddress, { color: value.title ? mutedText : textColor }]}>
                {value.address}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClear} disabled={disabled}>
            <Ionicons name="close-circle" size={20} color={mutedText} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: surfaceColor }, inline && styles.addButtonInline]}
          onPress={handleOpenModal}
          disabled={disabled}>
          <Ionicons name="location-outline" size={20} color={mutedText} />
          <Text style={[styles.addButtonText, { color: mutedText }]}>{placeholder}</Text>
        </TouchableOpacity>
      )}

      {/* Modal for location selection */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
          <View style={styles.modalOverlay}>
            <SafeAreaView style={[styles.modalContent, { backgroundColor: cardColor }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={[styles.searchContainer, { backgroundColor: cardColor, borderColor }]}>
              <Ionicons name="search" size={20} color={mutedText} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search for a location..."
                placeholderTextColor={mutedText}
                value={query}
                onChangeText={handleQueryChange}
                autoFocus
              />
              {isSearching && <ActivityIndicator size="small" color={accent} />}
            </View>

            {/* Current location button */}
            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={handleUseCurrentLocation}
              disabled={isLoadingCurrentLocation}>
              {isLoadingCurrentLocation ? (
                <ActivityIndicator size="small" color={accent} />
              ) : (
                <Ionicons name="navigate" size={20} color={accent} />
              )}
              <Text style={[styles.currentLocationText, { color: accent }]}>
                Use Current Location
              </Text>
            </TouchableOpacity>

            {/* Results */}
            <ScrollView
              style={styles.resultsContainer}
              contentContainerStyle={styles.resultsContent}
              keyboardShouldPersistTaps="handled">
              {/* Autocomplete results */}
              {autocompleteResults.length > 0 && (
                <>
                  <Text style={[styles.sectionHeader, { color: mutedText }]}>SEARCH RESULTS</Text>
                  {autocompleteResults.map((result, index) => (
                    <TouchableOpacity
                      key={`autocomplete-${index}`}
                      style={styles.resultItem}
                      onPress={() => handleSelectLocation(result)}>
                      <Ionicons name="location-outline" size={20} color={mutedText} />
                      <Text style={[styles.resultText, { color: textColor }]} numberOfLines={2}>
                        {result.address}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Favorite locations */}
              {favoriteLocations.length > 0 && query === '' && (
                <>
                  <Text style={[styles.sectionHeader, { color: mutedText }]}>SAVED PLACES</Text>
                  {favoriteLocations.map((favorite) => (
                    <TouchableOpacity
                      key={favorite.id}
                      style={styles.resultItem}
                      onPress={() => handleSelectFavorite(favorite)}>
                      <Ionicons name="star" size={20} color="#FFD700" />
                      <View style={styles.resultTextContainer}>
                        <Text style={[styles.resultTitle, { color: textColor }]}>
                          {favorite.name}
                        </Text>
                        <Text style={[styles.resultSubtitle, { color: mutedText }]} numberOfLines={1}>
                          {favorite.address}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Recent locations */}
              {recentLocations.length > 0 && query === '' && (
                <>
                  <Text style={[styles.sectionHeader, { color: mutedText }]}>RECENT</Text>
                  {recentLocations.map((recent) => (
                    <TouchableOpacity
                      key={recent.id}
                      style={styles.resultItem}
                      onPress={() => handleSelectRecent(recent)}>
                      <Ionicons name="time-outline" size={20} color={mutedText} />
                      <Text style={[styles.resultText, { color: textColor }]} numberOfLines={2}>
                        {recent.address}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Empty state */}
              {query === '' &&
                autocompleteResults.length === 0 &&
                favoriteLocations.length === 0 &&
                recentLocations.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="location-outline" size={48} color={mutedText} />
                    <Text style={[styles.emptyText, { color: mutedText }]}>
                      Start typing to search for locations
                    </Text>
                  </View>
                )}

              {query !== '' && autocompleteResults.length === 0 && !isSearching && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color={mutedText} />
                  <Text style={[styles.emptyText, { color: mutedText }]}>No locations found</Text>
                </View>
              )}
            </ScrollView>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    flex: 1,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  selectedTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  selectedTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectedAddress: {
    fontSize: 14,
    fontWeight: '400',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '400',
    marginLeft: 8,
  },
  addButtonInline: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  selectedContainerInline: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 540,
    maxHeight: '80%',
    paddingBottom: 20,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5EA',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 8,
    marginRight: 8,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  currentLocationText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E7',
  },
  resultTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 15,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '400',
    marginTop: 12,
    textAlign: 'center',
  },
});
