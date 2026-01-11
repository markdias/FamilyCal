import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useFamily } from '@/contexts/FamilyContext';
import { createInvitation } from '@/services/familyService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AllEventsView } from './AllEventsView';
import { FilofaxTab, FilofaxView } from './FilofaxTabs';
import { ForMemberView } from './ForMemberView';
import { ScheduleView } from './ScheduleView';

interface MemberDetailViewProps {
  memberName: string;
}

const TAB_WIDTH = 48;

const TAB_COLORS = {
  schedule: '#007AFF',
  'for-member': '#34C759',
  'all-events': '#FF9500',
};

export function MemberDetailView({ memberName }: MemberDetailViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { contacts, familyMembers, currentFamily, userRole } = useFamily();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Find the contact for this member
  const memberContact = useMemo(() => {
    const searchName = memberName.trim().toLowerCase();
    const found = contacts.find(c => {
      const firstName = c.first_name.toLowerCase();
      const lastName = (c.last_name || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();

      return fullName === searchName ||
        firstName === searchName ||
        searchName.includes(firstName) ||
        (lastName && searchName.includes(lastName));
    });
    console.log('[MemberDetailView] memberName:', memberName);
    console.log('[MemberDetailView] contacts available:', contacts.length);
    if (found) {
      console.log('[MemberDetailView] memberContact found:', found.first_name, 'is_virtual:', found.is_virtual, 'id:', found.id);
    } else {
      console.log('[MemberDetailView] memberContact NOT found for name:', memberName);
    }
    return found;
  }, [contacts, memberName]);

  const canInvite = useMemo(() => {
    const isVirtual = memberContact?.is_virtual === true;
    const hasPermission = userRole === 'owner' || userRole === 'admin';
    console.log('[MemberDetailView] canInvite details:', { isVirtual, userRole, hasPermission });
    return isVirtual && hasPermission;
  }, [memberContact, userRole]);

  // Handle auto-invite from navigation params
  React.useEffect(() => {
    if (params.autoInvite === 'true' && canInvite) {
      setIsInviteModalVisible(true);
      // Clean up the param so it doesn't reopen if the user navigates away and back
      router.setParams({ autoInvite: undefined });
    }
  }, [params.autoInvite, canInvite]);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!currentFamily || !memberContact) return;

    setIsSendingInvite(true);
    try {
      const { error } = await createInvitation(
        currentFamily.id,
        inviteEmail.trim(),
        memberContact.first_name,
        memberContact.last_name || undefined,
        'member',
        `Join our family calendar!`
      );

      if (error) throw error;

      Alert.alert('Invitation Sent', `An invitation has been sent to ${inviteEmail}.`);
      setIsInviteModalVisible(false);
      setInviteEmail('');
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      Alert.alert('Error', err.message || 'Failed to send invitation.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const tabs: FilofaxTab[] = useMemo(() => [
    { id: 'schedule', label: 'Schedule', color: TAB_COLORS.schedule },
    { id: 'all-events', label: 'All Events', color: TAB_COLORS['all-events'] },
    { id: 'for-member', label: `For ${memberName}`, color: TAB_COLORS['for-member'] },
  ], [memberName]);

  const isWeb = Platform.OS === 'web';
  const content = [
    <ScheduleView key="schedule" memberName={memberName} />,
    <AllEventsView key="all-events" memberName={memberName} />,
    <ForMemberView key="for-member" memberName={memberName} />,
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with rounded top corners */}
      <View style={[styles.roundedHeader, { backgroundColor: '#E8E8ED', marginBottom: isWeb ? 0 : 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#1D1D1F" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{memberName}</Text>

        <View style={styles.headerSpacer}>
          {canInvite && (
            <TouchableOpacity
              onPress={() => setIsInviteModalVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="person-add-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

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
              Invite {memberName} to join the family calendar as an authenticated user.
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
                onPress={() => setIsInviteModalVisible(false)}
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

      {isWeb ? (
        /* Filofax content for Web */
        <FilofaxView
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={setActiveIndex}>
          {content}
        </FilofaxView>
      ) : (
        /* Segmented Control for Mobile */
        <View style={styles.mobileContainer}>
          <View style={styles.segmentedControlWrapper}>
            <SegmentedControl
              options={tabs.map(t => t.label)}
              selectedOption={tabs[activeIndex].label}
              onOptionPress={(label) => {
                const index = tabs.findIndex(t => t.label === label);
                if (index !== -1) setActiveIndex(index);
              }}
            />
          </View>
          <View style={styles.mobileContent}>
            {content[activeIndex]}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8ED',
  },
  roundedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#E8E8ED', // Grey background to match container
    marginHorizontal: Platform.OS === 'web' ? TAB_WIDTH : 0, // No margins on mobile
    borderTopLeftRadius: 8, // Rounded top corners
    borderTopRightRadius: 8,
    borderBottomWidth: 0, // No bottom border
    borderBottomColor: 'transparent', // No border color
    shadowOpacity: 0, // No shadow
    shadowRadius: 0, // No shadow
    shadowOffset: { width: 0, height: 0 }, // No shadow offset
    elevation: 0, // No elevation
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
    alignItems: 'flex-end',
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
  mobileContainer: {
    flex: 1,
  },
  segmentedControlWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  mobileContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    // Shadow for the content card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
});
