import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFamily } from '@/contexts/FamilyContext';
import { Contact } from '@/lib/supabase';
import { updateContact } from '@/services/contactService';
import { MEMBER_COLORS, getContrastingTextColor, normalizeColorForDisplay } from '@/utils/colorUtils';
import { ColorPickerModal } from '@/components/ui/ColorPickerModal';

interface MemberEditViewProps {
  contactId: string;
}

export function MemberEditView({ contactId }: MemberEditViewProps) {
  const { familyMembers, refreshMembers } = useFamily();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const contact = useMemo<Contact | undefined>(() => {
    return familyMembers.find((m) => m.contact.id === contactId)?.contact;
  }, [familyMembers, contactId]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(MEMBER_COLORS[0]);
  const [canDrive, setCanDrive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!contact) return;
    setFirstName(contact.first_name || '');
    setLastName(contact.last_name || '');
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setRelationship(contact.relationship || '');
    setSelectedColor(contact.color || MEMBER_COLORS[0]);
    setCanDrive(contact.contact_type === 'external_driver');
  }, [contact]);

  const handleSave = async () => {
    if (!contact) return;
    if (!firstName.trim()) {
      Alert.alert('Missing name', 'First name is required.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await updateContact(contact.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        relationship: relationship.trim() || null,
        contact_type: canDrive ? 'external_driver' : 'family_member',
        color: selectedColor,
      });

      if (error) {
        throw error;
      }

      await refreshMembers();
      Alert.alert('Saved', 'Member details updated.');
      router.back();
    } catch (err: any) {
      console.error('Error saving member', err);
      Alert.alert('Error', err.message || 'Could not save member details');
    } finally {
      setIsSaving(false);
    }
  };

  if (!contact) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member not found</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.missingContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={styles.missingText}>We couldn't find this member.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Member</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor="#8E8E93"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor="#8E8E93"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#8E8E93"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone"
            placeholderTextColor="#8E8E93"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Relationship</Text>
          <TextInput
            style={styles.input}
            value={relationship}
            onChangeText={setRelationship}
            placeholder="e.g., Daughter"
            placeholderTextColor="#8E8E93"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.driverInfo}>
              <Text style={styles.label}>Can be a driver</Text>
              <Text style={styles.helperText}>Allows assigning as drop-off or collection driver.</Text>
            </View>
            <Switch
              value={canDrive}
              onValueChange={setCanDrive}
              trackColor={{ false: '#E5E5E7', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Calendar colour</Text>
          <Text style={styles.helperText}>Tap to pick a darker, high-contrast colour.</Text>
          <View style={styles.colorGrid}>
            {MEMBER_COLORS.map((color) => {
              const isSelected = selectedColor === color;
              return (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    isSelected && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={getContrastingTextColor(color)} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.advancedButton} onPress={() => setShowPicker(true)}>
            <Text style={styles.advancedButtonText}>Open colour picker</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <ColorPickerModal
        visible={showPicker}
        initialColor={selectedColor}
        onClose={() => setShowPicker(false)}
        onSelect={(c) => setSelectedColor(c)}
        title="Member colour"
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
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1D1D1F',
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  helperText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  driverInfo: {
    flex: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
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
  advancedButton: {
    marginTop: 12,
    backgroundColor: '#F5F5F7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  advancedButtonText: {
    fontWeight: '600',
    color: '#1D1D1F',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  missingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  missingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
