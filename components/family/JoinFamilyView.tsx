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
import { supabase } from '@/lib/supabase';
import { getNextAvailableColor } from '@/utils/colorUtils';

export function JoinFamilyView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUserContact } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoBack = () => {
    router.back();
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invitation code');
      return;
    }

    if (!user) {
      setError('You must be signed in to join a family');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Find the invitation by token
      const { data: invitation, error: inviteError } = await supabase
        .from('family_invitations')
        .select('*, families(*)')
        .eq('invitation_token', inviteCode.trim())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !invitation) {
        setError('Invalid or expired invitation code. Please check and try again.');
        return;
      }

      // 2. Get existing colors in the family to assign a unique one
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('color')
        .eq('family_id', invitation.family_id);

      const usedColors = existingContacts?.map((c) => c.color) || [];
      const newColor = getNextAvailableColor(usedColors);

      // 3. Check if there's an existing contact to update or create new one
      let contactId: string;

      if (invitation.contact_id) {
        // Update existing virtual contact
        const { error: updateError } = await supabase
          .from('contacts')
          .update({
            user_id: user.id,
            is_virtual: false,
            email: user.email,
            invitation_accepted_at: new Date().toISOString(),
            color: newColor,
          })
          .eq('id', invitation.contact_id);

        if (updateError) {
          throw updateError;
        }
        contactId = invitation.contact_id;
      } else {
        // Create new contact
        const firstName = invitation.first_name || user.user_metadata?.first_name || 'User';
        const lastName = invitation.last_name || user.user_metadata?.last_name || '';

        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            family_id: invitation.family_id,
            user_id: user.id,
            first_name: firstName,
            last_name: lastName,
            email: user.email,
            contact_type: 'family_member',
            is_virtual: false,
            color: newColor,
            invitation_accepted_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (contactError) {
          throw contactError;
        }
        contactId = newContact.id;
      }

      // 4. Add as family member
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: invitation.family_id,
          contact_id: contactId,
          role: invitation.role || 'member',
          added_by: invitation.invited_by,
        });

      if (memberError) {
        throw memberError;
      }

      // 5. Update invitation status
      await supabase
        .from('family_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq('id', invitation.id);

      // Refresh user contact data
      await refreshUserContact();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Error joining family:', err);
      setError(err.message || 'Failed to join family. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <Text style={styles.title}>Join a Family</Text>
            <Text style={styles.subtitle}>
              Enter the invitation code you received from a family member to join their calendar.
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
            {/* Invite Code Input */}
            <Text style={styles.inputLabel}>Invitation Code</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter invitation code"
                placeholderTextColor="#8E8E93"
                value={inviteCode}
                onChangeText={(text) => {
                  setInviteCode(text);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Join Button */}
            <TouchableOpacity
              style={[styles.joinButton, isLoading && styles.buttonDisabled]}
              onPress={handleJoinFamily}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="enter-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.joinButtonText}>Join Family</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Help Section */}
          <View style={styles.helpContainer}>
            <View style={styles.helpHeader}>
              <Ionicons name="help-circle-outline" size={20} color="#8E8E93" />
              <Text style={styles.helpTitle}>Where do I find my code?</Text>
            </View>
            <Text style={styles.helpText}>
              Ask the family calendar owner or admin to send you an invitation. They can find this option in Settings → My Family → Add Family Member.
            </Text>
          </View>

          {/* Alternative */}
          <View style={styles.alternativeContainer}>
            <Text style={styles.alternativeText}>Don't have a code?</Text>
            <TouchableOpacity onPress={() => router.push('/create-family')}>
              <Text style={styles.alternativeLink}>Create your own family instead</Text>
            </TouchableOpacity>
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
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1D1D1F',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  helpContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  alternativeContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  alternativeText: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 4,
  },
  alternativeLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
});
