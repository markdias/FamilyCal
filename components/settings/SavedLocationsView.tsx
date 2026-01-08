/**
 * SavedLocationsView Component
 * 
 * Manages saved/favorite locations for the family.
 * Users can add, edit, delete, and search through saved locations.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useFamily } from '@/contexts/FamilyContext';
import {
  getFavoriteLocations,
  createFavoriteLocation,
  updateFavoriteLocation,
  deleteFavoriteLocation,
  searchFavoriteLocations,
  FavoriteLocation,
} from '@/services/favoriteLocationsService';
import { LocationPicker } from '@/components/event/LocationPicker';
import { LocationResult } from '@/services/locationService';

export function SavedLocationsView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentFamily } = useFamily();
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedText = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');
  const borderColor = useThemeColor({ light: '#E5E5E7', dark: '#3A3A3C' }, 'background');

  const [locations, setLocations] = useState<FavoriteLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<FavoriteLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<FavoriteLocation | null>(null);

  // Form state for add/edit
  const [locationName, setLocationName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadLocations();
  }, [currentFamily]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter(
        (loc) =>
          loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          loc.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLocations(filtered);
    }
  }, [searchQuery, locations]);

  const loadLocations = async () => {
    if (!currentFamily) return;

    setIsLoading(true);
    try {
      const { data, error } = await getFavoriteLocations(currentFamily.id);
      if (error) {
        console.error('[SavedLocationsView] Error loading locations:', error);
      } else if (data) {
        setLocations(data);
        setFilteredLocations(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setLocationName('');
    setSelectedLocation(null);
    setShowAddModal(true);
  };

  const handleEdit = (location: FavoriteLocation) => {
    setEditingLocation(location);
    setLocationName(location.name);
    setSelectedLocation({
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      placeId: location.place_id || undefined,
    });
    setShowEditModal(true);
  };

  const handleDelete = (location: FavoriteLocation) => {
    const confirm = () => {
      performDelete(location);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${location.name}"?`)) {
        confirm();
      }
    } else {
      Alert.alert(
        'Delete Location',
        `Are you sure you want to delete "${location.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirm },
        ]
      );
    }
  };

  const performDelete = async (location: FavoriteLocation) => {
    const { error } = await deleteFavoriteLocation(location.id);
    if (error) {
      const msg = 'Failed to delete location';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } else {
      loadLocations();
    }
  };

  const handleSaveAdd = async () => {
    if (!locationName.trim()) {
      const msg = 'Please enter a name for this location';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Name Required', msg);
      }
      return;
    }

    if (!selectedLocation) {
      const msg = 'Please select a location';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Location Required', msg);
      }
      return;
    }

    if (!currentFamily) return;

    setIsSaving(true);
    try {
      const { error } = await createFavoriteLocation(currentFamily.id, {
        name: locationName.trim(),
        address: selectedLocation.address,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        placeId: selectedLocation.placeId,
      });

      if (error) {
        const msg = 'Failed to save location';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      } else {
        setShowAddModal(false);
        loadLocations();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!locationName.trim()) {
      const msg = 'Please enter a name for this location';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Name Required', msg);
      }
      return;
    }

    if (!selectedLocation || !editingLocation) return;

    setIsSaving(true);
    try {
      const { error } = await updateFavoriteLocation(editingLocation.id, {
        name: locationName.trim(),
        address: selectedLocation.address,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        placeId: selectedLocation.placeId,
      });

      if (error) {
        const msg = 'Failed to update location';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      } else {
        setShowEditModal(false);
        loadLocations();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardColor }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: surfaceColor }]}
          onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Saved Places</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: surfaceColor }]}
          onPress={handleAdd}>
          <Ionicons name="add" size={24} color={accent} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: surfaceColor, borderColor }]}>
        <Ionicons name="search" size={20} color={mutedText} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search saved places..."
          placeholderTextColor={mutedText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={mutedText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Locations list */}
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : filteredLocations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={64} color={mutedText} />
          <Text style={[styles.emptyText, { color: mutedText }]}>
            {searchQuery ? 'No locations found' : 'No saved places yet'}
          </Text>
          {!searchQuery && (
            <Text style={[styles.emptySubtext, { color: mutedText }]}>
              Tap the + button to add your first location
            </Text>
          )}
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {filteredLocations.map((location) => (
            <View key={location.id} style={[styles.locationCard, { backgroundColor: cardColor }]}>
              <View style={styles.locationContent}>
                <Ionicons name="star" size={20} color="#FFD700" />
                <View style={styles.locationText}>
                  <Text style={[styles.locationName, { color: textColor }]}>{location.name}</Text>
                  <Text style={[styles.locationAddress, { color: mutedText }]} numberOfLines={2}>
                    {location.address}
                  </Text>
                </View>
              </View>
              <View style={styles.locationActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(location)}>
                  <Ionicons name="pencil" size={20} color={accent} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(location)}>
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Add Saved Place</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: textColor }]}>Name</Text>
              <TextInput
                style={[styles.textInput, { color: textColor, backgroundColor: surfaceColor, borderColor }]}
                placeholder="e.g., Home, School, Work"
                placeholderTextColor={mutedText}
                value={locationName}
                onChangeText={setLocationName}
                autoFocus
              />

              <Text style={[styles.fieldLabel, { color: textColor, marginTop: 16 }]}>Location</Text>
              <LocationPicker
                value={selectedLocation}
                onChange={setSelectedLocation}
                placeholder="Select location"
                disabled={isSaving}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: surfaceColor }]}
                onPress={() => setShowAddModal(false)}
                disabled={isSaving}>
                <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: accent }]}
                onPress={handleSaveAdd}
                disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Edit Saved Place</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: textColor }]}>Name</Text>
              <TextInput
                style={[styles.textInput, { color: textColor, backgroundColor: surfaceColor, borderColor }]}
                placeholder="e.g., Home, School, Work"
                placeholderTextColor={mutedText}
                value={locationName}
                onChangeText={setLocationName}
              />

              <Text style={[styles.fieldLabel, { color: textColor, marginTop: 16 }]}>Location</Text>
              <LocationPicker
                value={selectedLocation}
                onChange={setSelectedLocation}
                placeholder="Select location"
                disabled={isSaving}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: surfaceColor }]}
                onPress={() => setShowEditModal(false)}
                disabled={isSaving}>
                <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: accent }]}
                onPress={handleSaveEdit}
                disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 8,
    marginRight: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    fontWeight: '400',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  locationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  locationText: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '400',
  },
  locationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
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
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
