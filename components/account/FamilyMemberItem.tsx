import { ColorPickerModal } from '@/components/ui/ColorPickerModal';
import { Contact } from '@/lib/supabase';
import { MEMBER_COLORS, getContrastingTextColor } from '@/utils/colorUtils';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface FamilyMemberItemProps {
  contact: Contact;
  role?: string | null;
  isCurrentUser?: boolean;
  onColorChange: (contactId: string, color: string) => void;
  onPress?: () => void;
}

export function FamilyMemberItem({ contact, role, isCurrentUser, onColorChange, onPress }: FamilyMemberItemProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const avatarColor = contact.color || '#F3F4F6';

  return (
    <>
      <TouchableOpacity style={styles.memberCard} onPress={onPress} activeOpacity={0.85}>
        <TouchableOpacity
          style={[styles.memberAvatar, { backgroundColor: avatarColor }]}
          onPress={() => setShowColorPicker(true)}>
          <Text style={[styles.memberInitial, { color: getContrastingTextColor(avatarColor) }]}>
            {contact.first_name.charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {contact.first_name}
            {contact.last_name ? ` ${contact.last_name}` : ''}
          </Text>
          {contact.email && <Text style={styles.memberEmail}>{contact.email}</Text>}
          <View style={styles.memberMeta}>
            {role && <Text style={styles.memberRole}>{role}</Text>}
            {contact.is_virtual && (
              <View style={styles.virtualBadge}>
                <Text style={styles.virtualText}>Virtual</Text>
              </View>
            )}
          </View>
        </View>
        {isCurrentUser && (
          <View style={styles.currentUserBadge}>
            <Text style={styles.currentUserText}>You</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
      </TouchableOpacity>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowColorPicker(false)}>
        <TouchableOpacity
          style={styles.colorPickerOverlay}
          activeOpacity={1}
          onPress={() => setShowColorPicker(false)}>
          <View style={styles.colorPickerContainer}>
            <Text style={styles.colorPickerTitle}>Choose Color</Text>
            <View style={styles.colorsGrid}>
              {MEMBER_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    contact.color === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => {
                    onColorChange(contact.id, color);
                    setShowColorPicker(false);
                  }}>
                  {contact.color === color && (
                    <Ionicons name="checkmark" size={20} color={getContrastingTextColor(color)} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.advancedButton} onPress={() => setShowAdvanced(true)}>
              <Text style={styles.advancedButtonText}>Open colour picker</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <ColorPickerModal
        visible={showAdvanced}
        initialColor={contact.color || '#007AFF'}
        onClose={() => setShowAdvanced(false)}
        onSelect={(c) => {
          onColorChange(contact.id, c);
        }}
        title="Member colour"
      />
    </>
  );
}

const styles = StyleSheet.create({
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    marginBottom: 2,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberRole: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
  },
  virtualBadge: {
    backgroundColor: '#E5E5E7',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  virtualText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
  },
  currentUserBadge: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  currentUserText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  colorPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  colorPickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 16,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#1D1D1F',
  },
  advancedButton: {
    marginTop: 16,
    backgroundColor: '#F5F5F7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  advancedButtonText: {
    color: '#1D1D1F',
    fontWeight: '600',
    fontSize: 15,
  },
});