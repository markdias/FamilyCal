import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { updateFamily } from '@/services/familyService';
import { FAMILY_EVENT_COLOR, MEMBER_COLORS, getContrastingTextColor, normalizeColorForDisplay } from '@/utils/colorUtils';
import { ColorPickerModal } from '@/components/ui/ColorPickerModal';

export function AccountView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userContact, signOut } = useAuth();
  const { currentFamily, familyMembers, refreshFamilies } = useFamily();
  const { settings, setFamilyCalendarColor } = useAppSettings();
  
  const [familyName, setFamilyName] = useState(currentFamily?.family_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showFamilyPicker, setShowFamilyPicker] = useState(false);

  // Find current user's member record
  const currentMember = familyMembers.find(m => m.contact.user_id === user?.id);

  const handleSaveFamilyName = useCallback(async () => {
    if (!currentFamily || !familyName.trim()) return;
    
    if (familyName.trim() === currentFamily.family_name) return;

    setIsSaving(true);
    try {
      const { error } = await updateFamily(currentFamily.id, {
        family_name: familyName.trim(),
        name: `${familyName.trim()} Family`,
      });

      if (error) {
        Alert.alert('Error', 'Failed to update family name');
        setFamilyName(currentFamily.family_name);
      } else {
        await refreshFamilies();
      }
    } catch (err) {
      console.error('Error updating family name:', err);
      Alert.alert('Error', 'Failed to update family name');
      setFamilyName(currentFamily.family_name);
    } finally {
      setIsSaving(false);
    }
  }, [currentFamily, familyName, refreshFamilies]);

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (!confirmed) return;
      
      setIsSigningOut(true);
      try {
        await signOut();
        // NavigationHandler will automatically redirect to /login
      } catch (err) {
        console.error('Error signing out:', err);
        window.alert('Failed to sign out');
      } finally {
        setIsSigningOut(false);
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              setIsSigningOut(true);
              try {
                await signOut();
                // NavigationHandler will automatically redirect to /login
              } catch (err) {
                console.error('Error signing out:', err);
                Alert.alert('Error', 'Failed to sign out');
              } finally {
                setIsSigningOut(false);
              }
            },
          },
        ]
      );
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert('Coming Soon', 'Account deletion will be available in a future update.');
          },
        },
      ]
    );
  };

  const userEmail = user?.email || 'Not signed in';
  const userName = userContact 
    ? `${userContact.first_name}${userContact.last_name ? ' ' + userContact.last_name : ''}`
    : user?.user_metadata?.first_name || 'User';
  const userColor = userContact?.color || '#F3F4F6';
  const familyCalendarColor = settings.familyCalendarColor || FAMILY_EVENT_COLOR;

  const handleSelectFamilyColor = (color: string) => {
    setFamilyCalendarColor(color);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* User Profile */}
        <View style={styles.profileSection}>
          <View style={[styles.avatarContainer, { backgroundColor: userColor }]}>
            <Text style={[styles.avatarText, { color: getContrastingTextColor(userColor) }]}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.nameText}>{userName}</Text>
          <Text style={styles.emailText}>{userEmail}</Text>
        </View>

        {/* Family Section */}
        {currentFamily && (
          <>
            <Text style={styles.sectionHeader}>Family</Text>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Family Name</Text>
              <TextInput
                style={styles.inputField}
                value={familyName}
                onChangeText={setFamilyName}
                onBlur={handleSaveFamilyName}
                placeholder="Family Name"
                placeholderTextColor="#8E8E93"
                editable={currentMember?.role === 'owner' || currentMember?.role === 'admin'}
              />
              {isSaving && <ActivityIndicator size="small" color="#007AFF" />}
            </View>

            <Text style={styles.sectionHeader}>Which family member are you?</Text>
            <View style={styles.inputCard}>
              <View style={[styles.memberColorDot, { backgroundColor: userColor }]} />
              <Text style={styles.memberNameText}>{userName}</Text>
              {currentMember?.role && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>
                    {currentMember.role.charAt(0).toUpperCase() + currentMember.role.slice(1)}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionHeader}>Shared calendar</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.sharedRow} onPress={() => setShowFamilyPicker(true)}>
                <View
                  style={[
                    styles.sharedSwatch,
                    { backgroundColor: normalizeColorForDisplay(familyCalendarColor) },
                  ]}
                />
                <Text style={styles.sharedLabel}>Dias Family Calendar</Text>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </TouchableOpacity>
              <Text style={styles.familyColorDescription}>
                Tap the colour to open the picker. Applies to shared/multi-member events.
              </Text>
            </View>

            {/* Family Management Section */}
            <Text style={styles.sectionHeader}>Family Management</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/account/my-family')}>
              <View style={styles.cardContent}>
                <Ionicons name="people" size={20} color="#1D1D1F" />
                <Text style={styles.cardText}>My Family</Text>
                <Text style={styles.memberCount}>{familyMembers.length} members</Text>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </View>
            </TouchableOpacity>
          </>
        )}

        {!currentFamily && (
          <View style={styles.noFamilyCard}>
            <Ionicons name="people-outline" size={48} color="#8E8E93" />
            <Text style={styles.noFamilyTitle}>No Family Yet</Text>
            <Text style={styles.noFamilyText}>
              Create a family or join one to start sharing calendars
            </Text>
            <TouchableOpacity
              style={styles.createFamilyButton}
              onPress={() => router.push('/onboarding')}>
              <Text style={styles.createFamilyButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleSignOut}
            disabled={isSigningOut}>
            {isSigningOut ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            )}
            <Text style={styles.actionButtonText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={styles.actionButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ColorPickerModal
        visible={showFamilyPicker}
        initialColor={familyCalendarColor}
        onClose={() => setShowFamilyPicker(false)}
        onSelect={handleSelectFamilyColor}
        title="Shared calendar colour"
      />
    </View>
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
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
  },
  nameText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D1D1F',
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    color: '#1D1D1F',
    textAlign: 'right',
  },
  memberColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  memberNameText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    color: '#1D1D1F',
  },
  roleBadge: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '400',
    color: '#1D1D1F',
    marginLeft: 12,
  },
  memberCount: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    marginRight: 8,
  },
  noFamilyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginTop: 24,
  },
  noFamilyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 16,
    marginBottom: 8,
  },
  noFamilyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  createFamilyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createFamilyButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionSection: {
    marginTop: 32,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#FF3B30',
    marginLeft: 12,
  },
  familyColorDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: '#1D1D1F',
  },
  sharedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  sharedSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sharedLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
});
