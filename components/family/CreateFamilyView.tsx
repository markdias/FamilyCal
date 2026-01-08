import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { supabase } from '@/lib/supabase';
import { getNextAvailableColor } from '@/utils/colorUtils';

export function CreateFamilyView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUserContact } = useAuth();
  const { refreshFamilies } = useFamily();
  const [familyName, setFamilyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoBack = () => {
    router.back();
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      setError('Please enter a family name');
      return;
    }

    if (!user) {
      setError('You must be signed in to create a family');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Create the family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({
          family_name: familyName.trim(),
          name: `${familyName.trim()} Family`,
        })
        .select()
        .single();

      if (familyError) {
        throw familyError;
      }

      // 2. Create contact for the user
      const firstName = user.user_metadata?.first_name || 'User';
      const lastName = user.user_metadata?.last_name || '';
      const initialColor = getNextAvailableColor([]);

      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          family_id: family.id,
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          contact_type: 'family_member',
          is_virtual: false,
          color: initialColor,
        })
        .select()
        .single();

      if (contactError) {
        // Cleanup: delete the family if contact creation fails
        await supabase.from('families').delete().eq('id', family.id);
        throw contactError;
      }

      // 3. Add as family member with owner role
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: family.id,
          contact_id: contact.id,
          role: 'owner',
          added_by: user.id,
        });

      if (memberError) {
        // Cleanup
        await supabase.from('contacts').delete().eq('id', contact.id);
        await supabase.from('families').delete().eq('id', family.id);
        throw memberError;
      }

      // 4. Create default event categories
      const defaultCategories = [
        { name: 'School', color: '#E5CCFF' },
        { name: 'Sports', color: '#CCFFE5' },
        { name: 'Work', color: '#FFE5CC' },
        { name: 'Medical', color: '#CCE5FF' },
        { name: 'Family', color: '#FFF5CC' },
      ];

      await supabase.from('event_categories').insert(
        defaultCategories.map((cat) => ({
          family_id: family.id,
          name: cat.name,
          color: cat.color,
        }))
      );

      // Refresh user contact and family data
      await refreshUserContact();
      await refreshFamilies();

      // Small delay to ensure state is updated before navigation
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    } catch (err: any) {
      console.error('Error creating family:', err);
      // Show detailed error for debugging
      const errorMessage = err?.message || err?.details || 'Failed to create family. Please try again.';
      const errorCode = err?.code ? ` (${err.code})` : '';
      setError(`${errorMessage}${errorCode}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate preview display name
  const displayName = familyName.trim() ? `${familyName.trim()} Family` : 'Your Family';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color="#1D1D1F" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Create Your Family</Text>
            <Text style={styles.subtitle}>
              Choose a name for your family calendar. You can always change it later.
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Family Name Input */}
            <Text style={styles.inputLabel}>Family Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="people-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Smith, Johnson"
                placeholderTextColor="#8E8E93"
                value={familyName}
                onChangeText={(text) => {
                  setFamilyName(text);
                  setError(null);
                }}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Preview */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Your calendar will be called:</Text>
              <View style={styles.previewBadge}>
                <View style={styles.previewDot} />
                <Text style={styles.previewText}>{displayName}</Text>
              </View>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createButton, isLoading && styles.buttonDisabled]}
              onPress={handleCreateFamily}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Create Family</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.infoText}>You'll be the owner of this family</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.infoText}>Invite family members anytime</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.infoText}>Each member gets their own color</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 8,
  },
  formContainer: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
  },
  previewContainer: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    marginRight: 8,
  },
  previewText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#1D1D1F',
    marginLeft: 12,
  },
});
