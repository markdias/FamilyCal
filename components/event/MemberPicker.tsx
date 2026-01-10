import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamily } from '@/contexts/FamilyContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { Contact } from '@/lib/supabase';
import { FAMILY_EVENT_COLOR, getContrastingTextColor, normalizeColorForDisplay } from '@/utils/colorUtils';

interface MemberPickerProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function MemberPicker({
  selectedIds,
  onSelectionChange,
  label = 'Invitees',
  placeholder = 'Select family members',
}: MemberPickerProps) {
  const { familyMembers } = useFamily();
  const { settings } = useAppSettings();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const familyColor = settings.familyCalendarColor || FAMILY_EVENT_COLOR;

  // Get member contacts (family members only, for event participants)
  const memberContacts = useMemo(() => {
    return familyMembers
      .map((m) => m.contact)
      .filter((c): c is Contact => c !== undefined)
      .sort((a, b) => a.first_name.localeCompare(b.first_name));
  }, [familyMembers]);

  // Get selected contacts
  const selectedContacts = useMemo(() => {
    return memberContacts.filter((c) => selectedIds.includes(c.id));
  }, [memberContacts, selectedIds]);

  // Check if all members are selected
  const allSelected = useMemo(() => {
    return memberContacts.length > 0 && selectedIds.length === memberContacts.length;
  }, [memberContacts.length, selectedIds.length]);

  const handleToggleMember = (contactId: string) => {
    if (selectedIds.includes(contactId)) {
      onSelectionChange(selectedIds.filter((id) => id !== contactId));
    } else {
      onSelectionChange([...selectedIds, contactId]);
    }
  };

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(memberContacts.map((c) => c.id));
    }
  };

  const getDisplayText = () => {
    if (selectedContacts.length === 0) {
      return placeholder;
    }
    if (allSelected) {
      return 'All Family Members';
    }
    if (selectedContacts.length === 1) {
      return selectedContacts[0].first_name;
    }
    return `${selectedContacts.length} members selected`;
  };

  return (
    <>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setIsModalVisible(true)}>
        <Ionicons name="people" size={20} color="#007AFF" />
        <View style={styles.pickerContent}>
          <Text style={styles.pickerLabel}>{label}</Text>
        </View>
        <View style={styles.pickerValue}>
          {selectedContacts.length > 0 ? (
            <View style={styles.selectedPreview}>
              {selectedContacts.slice(0, 3).map((contact, index) => {
                const dotColor = contact.color || '#6B7280';
                return (
                  <View
                    key={contact.id}
                    style={[
                      styles.colorDot,
                      { backgroundColor: dotColor, marginLeft: index > 0 ? -4 : 0 },
                    ]}
                  />
                );
              })}
              {selectedContacts.length > 3 && (
                <Text style={styles.moreText}>+{selectedContacts.length - 3}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.pickerValueText}>{getDisplayText()}</Text>
          )}
          <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}>
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Members</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {/* Select All Option */}
            <TouchableOpacity
              style={styles.memberRow}
              onPress={handleSelectAll}>
              <View style={[styles.allMembersIcon, { backgroundColor: familyColor }]}>
                <Ionicons name="people" size={20} color={getContrastingTextColor(familyColor)} />
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>All Family Members</Text>
                <Text style={styles.memberSubtext}>
                  {memberContacts.length} member{memberContacts.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={[styles.checkbox, allSelected && styles.checkboxSelected]}>
                {allSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>

            <View style={styles.separator} />

            {/* Individual Members */}
            {memberContacts.map((contact, index) => {
              const isSelected = selectedIds.includes(contact.id);
              return (
                <TouchableOpacity
                  key={contact.id}
                  style={[
                    styles.memberRow,
                    index === memberContacts.length - 1 && styles.lastRow,
                  ]}
                  onPress={() => handleToggleMember(contact.id)}>
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: contact.color || '#6B7280' },
                    ]}>
                    <Text style={[styles.memberInitial, { color: getContrastingTextColor(contact.color || '#6B7280') }]}>
                      {contact.first_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {contact.first_name}
                      {contact.last_name ? ` ${contact.last_name}` : ''}
                    </Text>
                    {contact.relationship && (
                      <Text style={styles.memberSubtext}>{contact.relationship}</Text>
                    )}
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}

            {memberContacts.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#8E8E93" />
                <Text style={styles.emptyTitle}>No Family Members</Text>
                <Text style={styles.emptyText}>
                  Add family members in Settings to assign them to events
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// Compact display of selected members (for showing in forms)
export function SelectedMembersDisplay({
  selectedIds,
  onRemove,
}: {
  selectedIds: string[];
  onRemove?: (id: string) => void;
}) {
  const { familyMembers } = useFamily();

  const selectedContacts = useMemo(() => {
    return familyMembers
      .map((m) => m.contact)
      .filter((c): c is Contact => c !== undefined && selectedIds.includes(c.id));
  }, [familyMembers, selectedIds]);

  if (selectedContacts.length === 0) return null;

  return (
    <View style={styles.chipsContainer}>
      {selectedContacts.map((contact) => (
        <View
          key={contact.id}
          style={[styles.chip, { backgroundColor: contact.color || '#F3F4F6' }]}>
          <Text style={[styles.chipText, { color: getContrastingTextColor(contact.color || '#F3F4F6') }]}>
            {contact.first_name}
          </Text>
          {onRemove && (
            <TouchableOpacity
              onPress={() => onRemove(contact.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#1D1D1F" />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  pickerContent: {
    flex: 1,
    marginLeft: 12,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
  },
  pickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerValueText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    marginRight: 4,
  },
  selectedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 4,
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
  cancelButton: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  doneButton: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  allMembersIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D1D1F',
  },
  memberSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  separator: {
    height: 16,
    backgroundColor: '#F5F5F7',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 16,
    gap: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
  },
});
