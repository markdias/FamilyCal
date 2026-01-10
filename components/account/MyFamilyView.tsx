import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Contact, FamilyInvitation } from '@/lib/supabase';
import { updateContactColor, addVirtualFamilyMember } from '@/services/contactService';
import { createInvitation, getFamilyInvitations, cancelInvitation } from '@/services/familyService';
import { normalizeColorForDisplay } from '@/utils/colorUtils';
import { ColorPickerModal } from '@/components/ui/ColorPickerModal';

// Conditionally import web-specific component
let FamilyMemberItem;
if (Platform.OS === 'web') {
  FamilyMemberItem = require('./FamilyMemberItem.web').FamilyMemberItemWeb;
} else {
  // Import the existing component for mobile
  FamilyMemberItem = require('./FamilyMemberItem').FamilyMemberItem;
}

type AddMemberType = 'choose' | 'virtual' | 'invite';



interface InvitationItemProps {
  invitation: FamilyInvitation;
  onCancel: (id: string) => void;
}

function InvitationItem({ invitation, onCancel }: InvitationItemProps) {
  return (
    <View style={styles.invitationCard}>
      <View style={styles.invitationIcon}>
        <Ionicons name="mail-outline" size={20} color="#8E8E93" />
      </View>
      <View style={styles.invitationInfo}>
        <Text style={styles.invitationEmail}>{invitation.email}</Text>
        <Text style={styles.invitationStatus}>
          Pending · Expires {new Date(invitation.expires_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => onCancel(invitation.id)}>
        <Ionicons name="close-circle" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
}

export function MyFamilyView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { familyMembers, currentFamily, refreshMembers, isLoadingMembers } = useFamily();
  
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberType, setAddMemberType] = useState<AddMemberType>('choose');
  
  // Invite by email state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  
  // Virtual member state
  const [virtualFirstName, setVirtualFirstName] = useState('');
  const [virtualLastName, setVirtualLastName] = useState('');
  const [virtualRelationship, setVirtualRelationship] = useState('');
  const [isAddingVirtual, setIsAddingVirtual] = useState(false);

  // Load invitations
  const loadInvitations = useCallback(async () => {
    if (!currentFamily) return;
    
    setIsLoadingInvitations(true);
    try {
      const { data, error } = await getFamilyInvitations(currentFamily.id);
      if (!error && data) {
        setInvitations(data);
      }
    } catch (err) {
      console.error('Error loading invitations:', err);
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [currentFamily]);

  React.useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleColorChange = async (contactId: string, color: string) => {
    try {
      const { error } = await updateContactColor(contactId, color);
      if (error) {
        Alert.alert('Error', 'Failed to update color');
        return;
      }
      refreshMembers();
    } catch (err) {
      console.error('Error updating color:', err);
      Alert.alert('Error', 'Failed to update color');
    }
  };

  const resetModalState = () => {
    setAddMemberType('choose');
    setInviteEmail('');
    setInviteFirstName('');
    setInviteLastName('');
    setVirtualFirstName('');
    setVirtualLastName('');
    setVirtualRelationship('');
  };

  const handleCloseModal = () => {
    setShowAddMemberModal(false);
    resetModalState();
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Missing Email', 'Please enter an email address');
      return;
    }

    if (!currentFamily) return;

    setIsSendingInvite(true);
    try {
      const { error } = await createInvitation(
        currentFamily.id,
        inviteEmail.trim(),
        inviteFirstName.trim() || undefined,
        inviteLastName.trim() || undefined
      );

      if (error) {
        throw error;
      }

      Alert.alert('Invitation Sent', `An invitation has been sent to ${inviteEmail}`);
      handleCloseModal();
      loadInvitations();
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      Alert.alert('Error', err.message || 'Failed to send invitation');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleAddVirtualMember = async () => {
    if (!virtualFirstName.trim()) {
      Alert.alert('Missing Name', 'Please enter a first name');
      return;
    }

    if (!currentFamily) return;

    setIsAddingVirtual(true);
    try {
      const { error } = await addVirtualFamilyMember(currentFamily.id, {
        firstName: virtualFirstName.trim(),
        lastName: virtualLastName.trim() || undefined,
        relationship: virtualRelationship.trim() || undefined,
      });

      if (error) {
        throw error;
      }

      Alert.alert('Member Added', `${virtualFirstName} has been added to your family`);
      handleCloseModal();
      refreshMembers();
    } catch (err: any) {
      console.error('Error adding virtual member:', err);
      Alert.alert('Error', err.message || 'Failed to add family member');
    } finally {
      setIsAddingVirtual(false);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    Alert.alert(
      'Cancel Invitation',
      'Are you sure you want to cancel this invitation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await cancelInvitation(invitationId);
              if (error) throw error;
              loadInvitations();
            } catch (err) {
              console.error('Error cancelling invitation:', err);
              Alert.alert('Error', 'Failed to cancel invitation');
            }
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>My Family</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Add Member Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddMemberModal(true)}>
          <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Family Member</Text>
        </TouchableOpacity>

        {/* Family Members List */}
        <Text style={styles.sectionHeader}>Family Members</Text>
        <View style={styles.card}>
          {isLoadingMembers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#8E8E93" />
            </View>
          ) : familyMembers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={32} color="#8E8E93" />
              <Text style={styles.emptyStateText}>No family members yet</Text>
            </View>
          ) : (
            familyMembers.map((member, index) => (
              <View key={member.id}>
                <FamilyMemberItem
                  contact={member.contact}
                  role={member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : undefined}
                  isCurrentUser={member.contact.user_id === user?.id}
                  onColorChange={handleColorChange}
                  onPress={() => router.push(`/account/member/${member.contact.id}`)}
                />
                {index < familyMembers.length - 1 && <View style={styles.separator} />}
              </View>
            ))
          )}
        </View>

        {/* Invitations Section */}
        <Text style={styles.sectionHeader}>Pending Invitations</Text>
        <View style={styles.card}>
          {isLoadingInvitations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#8E8E93" />
            </View>
          ) : invitations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="mail-outline" size={32} color="#8E8E93" />
              <Text style={styles.emptyStateText}>No pending invitations</Text>
            </View>
          ) : (
            invitations.map((invitation, index) => (
              <View key={invitation.id}>
                <InvitationItem
                  invitation={invitation}
                  onCancel={handleCancelInvite}
                />
                {index < invitations.length - 1 && <View style={styles.separator} />}
              </View>
            ))
          )}
        </View>

        {/* Color Legend */}
        <Text style={styles.sectionHeader}>Color Guide</Text>
        <View style={styles.colorGuideCard}>
          <Text style={styles.colorGuideText}>
            Tap a member's avatar to change their calendar color. Each color helps identify who an event is for at a glance.
          </Text>
        </View>
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}>
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={addMemberType === 'choose' ? handleCloseModal : () => setAddMemberType('choose')}>
              <Text style={styles.modalCancelButton}>
                {addMemberType === 'choose' ? 'Cancel' : 'Back'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {addMemberType === 'choose' && 'Add Member'}
              {addMemberType === 'virtual' && 'Add Virtual Member'}
              {addMemberType === 'invite' && 'Invite by Email'}
            </Text>
            {addMemberType === 'virtual' ? (
              <TouchableOpacity onPress={handleAddVirtualMember} disabled={isAddingVirtual}>
                {isAddingVirtual ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text style={styles.modalSendButton}>Add</Text>
                )}
              </TouchableOpacity>
            ) : addMemberType === 'invite' ? (
              <TouchableOpacity onPress={handleSendInvite} disabled={isSendingInvite}>
                {isSendingInvite ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text style={styles.modalSendButton}>Send</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ width: 50 }} />
            )}
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Choose Type Screen */}
            {addMemberType === 'choose' && (
              <View style={styles.chooseTypeContainer}>
                <Text style={styles.chooseTypeTitle}>What type of member?</Text>
                
                <TouchableOpacity
                  style={styles.typeOption}
                  onPress={() => setAddMemberType('virtual')}>
                  <View style={[styles.typeIconContainer, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="person-outline" size={28} color="#4CAF50" />
                  </View>
                  <View style={styles.typeOptionContent}>
                    <Text style={styles.typeOptionTitle}>Virtual Member</Text>
                    <Text style={styles.typeOptionDescription}>
                      For children or family members who don't need to log in. They'll appear on the calendar but won't have their own account.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.typeOption}
                  onPress={() => setAddMemberType('invite')}>
                  <View style={[styles.typeIconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="mail-outline" size={28} color="#2196F3" />
                  </View>
                  <View style={styles.typeOptionContent}>
                    <Text style={styles.typeOptionTitle}>Invite by Email</Text>
                    <Text style={styles.typeOptionDescription}>
                      Send an invitation to someone who can create their own account and log in to view and manage events.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            )}

            {/* Virtual Member Form */}
            {addMemberType === 'virtual' && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Emma"
                    placeholderTextColor="#8E8E93"
                    value={virtualFirstName}
                    onChangeText={setVirtualFirstName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Optional"
                    placeholderTextColor="#8E8E93"
                    value={virtualLastName}
                    onChangeText={setVirtualLastName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Relationship</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Daughter, Son, Child"
                    placeholderTextColor="#8E8E93"
                    value={virtualRelationship}
                    onChangeText={setVirtualRelationship}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inviteInfo}>
                  <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
                  <Text style={styles.inviteInfoText}>
                    Virtual members appear on your family calendar but don't have their own login. Perfect for young children.
                  </Text>
                </View>
              </View>
            )}

            {/* Invite by Email Form */}
            {addMemberType === 'invite' && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    placeholderTextColor="#8E8E93"
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Their first name"
                    placeholderTextColor="#8E8E93"
                    value={inviteFirstName}
                    onChangeText={setInviteFirstName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Their last name"
                    placeholderTextColor="#8E8E93"
                    value={inviteLastName}
                    onChangeText={setInviteLastName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inviteInfo}>
                  <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
                  <Text style={styles.inviteInfoText}>
                    They'll receive an email with a link to join your family calendar. The invitation expires in 7 days.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  addButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#F5F5F7',
    marginLeft: 56,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 8,
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  invitationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invitationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  invitationEmail: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
  },
  invitationStatus: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 2,
  },
  cancelButton: {
    padding: 4,
  },
  colorGuideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  colorGuideText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  modalCancelButton: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  modalSendButton: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1D1D1F',
  },
  inviteInfo: {
    flexDirection: 'row',
    backgroundColor: '#E5E5E7',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  inviteInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    lineHeight: 20,
  },
  chooseTypeContainer: {
    paddingTop: 8,
  },
  chooseTypeTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 16,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  typeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeOptionContent: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  typeOptionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  typeOptionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});
