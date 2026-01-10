import React, { useState } from 'react';
import { TouchableOpacity, View, Text, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Drawer, Button, Avatar, Space, Tag, Divider } from 'antd';
import { Contact } from '@/lib/supabase';
import { updateContactColor } from '@/services/contactService';
import { useAuth } from '@/contexts/AuthContext';
import { MEMBER_COLORS, getContrastingTextColor, normalizeColorForDisplay } from '@/utils/colorUtils';
import { ColorPickerModal } from '@/components/ui/ColorPickerModal';

interface FamilyMemberItemProps {
  contact: Contact;
  role?: string | null;
  isCurrentUser?: boolean;
  onColorChange: (contactId: string, color: string) => void;
  onPress?: () => void;
}

export function FamilyMemberItemWeb({ contact, role, isCurrentUser, onColorChange }: FamilyMemberItemProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const avatarColor = contact.color || '#F3F4F6';

  const handleColorChange = async (color: string) => {
    try {
      const { error } = await updateContactColor(contact.id, color);
      if (error) {
        Alert.alert('Error', 'Failed to update color');
        return;
      }
      onColorChange(contact.id, color);
      setDrawerVisible(false);
    } catch (err) {
      console.error('Error updating color:', err);
      Alert.alert('Error', 'Failed to update color');
    }
  };

  const drawerContent = (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <Space align="center">
          <Avatar
            size={64}
            style={{
              backgroundColor: avatarColor,
              color: getContrastingTextColor(avatarColor),
              fontSize: '24px',
              fontWeight: 'bold'
            }}
          >
            {contact.first_name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>
              {contact.first_name}
              {contact.last_name ? ` ${contact.last_name}` : ''}
            </h2>
            {contact.email && (
              <p style={{ margin: '4px 0', color: '#666' }}>{contact.email}</p>
            )}
            <Space>
              {role && <Tag color="blue">{role.charAt(0).toUpperCase() + role.slice(1)}</Tag>}
              {contact.is_virtual && <Tag color="orange">Virtual</Tag>}
              {isCurrentUser && <Tag color="green">You</Tag>}
            </Space>
          </div>
        </Space>

        <Divider />

        {/* Actions */}
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            block
            icon={<Ionicons name="person-outline" size={16} />}
            onClick={() => {
              setDrawerVisible(false);
              router.push(`/account/member/${contact.id}`);
            }}
          >
            View Profile
          </Button>

          <Button
            block
            icon={<Ionicons name="color-palette-outline" size={16} />}
            onClick={() => setShowColorPicker(true)}
          >
            Change Color
          </Button>

          {!isCurrentUser && (
            <Button
              danger
              block
              icon={<Ionicons name="person-remove-outline" size={16} />}
              onClick={() => {
                Alert.alert(
                  'Remove Member',
                  `Are you sure you want to remove ${contact.first_name} from your family?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => {
                      // TODO: Implement remove member functionality
                      setDrawerVisible(false);
                    }}
                  ]
                );
              }}
            >
              Remove from Family
            </Button>
          )}
        </Space>

        <Divider />

        {/* Color Picker */}
        <div>
          <h3>Quick Colors</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px',
            marginTop: '12px'
          }}>
            {MEMBER_COLORS.map((color) => (
              <div
                key={color}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '20px',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: contact.color === color ? '3px solid #000' : '2px solid #ddd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => handleColorChange(color)}
              >
                {contact.color === color && (
                  <Ionicons name="checkmark" size={16} color={getContrastingTextColor(color)} />
                )}
              </div>
            ))}
          </div>
          <Button
            type="link"
            style={{ marginTop: '12px' }}
            onClick={() => setShowAdvanced(true)}
          >
            Open Advanced Color Picker
          </Button>
        </div>
      </Space>
    </div>
  );

  return (
    <>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderRadius: 8,
          marginBottom: 8,
          paddingHorizontal: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        }}
        onPress={() => setDrawerVisible(true)}
        activeOpacity={0.7}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: avatarColor,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: getContrastingTextColor(avatarColor)
          }}>
            {contact.first_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '400', color: '#1D1D1F' }}>
            {contact.first_name}
            {contact.last_name ? ` ${contact.last_name}` : ''}
          </Text>
          {contact.email && (
            <Text style={{ fontSize: 14, color: '#8E8E93', marginTop: 2 }}>
              {contact.email}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
            {role && (
              <Text style={{ fontSize: 13, color: '#8E8E93' }}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            )}
            {contact.is_virtual && (
              <View style={{
                backgroundColor: '#E5E5E7',
                borderRadius: 4,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#8E8E93' }}>
                  Virtual
                </Text>
              </View>
            )}
          </View>
        </View>
        {isCurrentUser && (
          <View style={{
            backgroundColor: '#F5F5F7',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginRight: 8,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1D1D1F' }}>You</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
      </TouchableOpacity>

      {/* Ant Design Drawer */}
      <Drawer
        title={`${contact.first_name}${contact.last_name ? ` ${contact.last_name}` : ''}`}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={400}
      >
        {drawerContent}
      </Drawer>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowColorPicker(false)}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          activeOpacity={1}
          onPress={() => setShowColorPicker(false)}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            width: '80%',
            maxWidth: 300,
          }}>
            <Text style={{
              fontSize: 17,
              fontWeight: '600',
              color: '#1D1D1F',
              textAlign: 'center',
              marginBottom: 16
            }}>
              Choose Color
            </Text>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 12,
            }}>
              {MEMBER_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    {
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: color,
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                    contact.color === color && {
                      borderWidth: 3,
                      borderColor: '#1D1D1F',
                    },
                  ]}
                  onPress={() => {
                    handleColorChange(color);
                    setShowColorPicker(false);
                  }}>
                  {contact.color === color && (
                    <Ionicons name="checkmark" size={20} color={getContrastingTextColor(color)} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={{
                marginTop: 16,
                backgroundColor: '#F5F5F7',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 10,
                alignItems: 'center',
              }}
              onPress={() => setShowAdvanced(true)}>
              <Text style={{
                color: '#1D1D1F',
                fontWeight: '600',
                fontSize: 15,
              }}>
                Open colour picker
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ColorPickerModal
        visible={showAdvanced}
        initialColor={contact.color || '#007AFF'}
        onClose={() => setShowAdvanced(false)}
        onSelect={(c) => {
          handleColorChange(c);
        }}
        title="Member colour"
      />
    </>
  );
}