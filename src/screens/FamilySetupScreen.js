/**
 * FamilySetupScreen - Initial family setup after authentication
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { lightTheme } from '../styles/theme';
import { MemberRoles } from '../types';

const FAMILY_MEMBER_COLORS = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint Green
  '#FFEAA7', // Light Yellow
  '#DDA0DD', // Plum
  '#FF8C00', // Dark Orange
  '#6C5CE7', // Purple
  '#00B894', // Emerald
  '#E17055', // Burnt Orange
];

const FamilySetupScreen = ({ navigation }) => {
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState([
    { id: 1, name: '', color: FAMILY_MEMBER_COLORS[0], role: MemberRoles.OWNER },
  ]);

  const addMember = () => {
    if (members.length >= 2) {
      // Free tier limit
      Alert.alert(
        'Free Tier Limit',
        'Free accounts can have up to 2 family members. Upgrade to Pro for unlimited members.',
        [{ text: 'OK' }]
      );
      return;
    }

    const newMember = {
      id: Date.now(),
      name: '',
      color: FAMILY_MEMBER_COLORS[members.length % FAMILY_MEMBER_COLORS.length],
      role: MemberRoles.MEMBER,
    };
    setMembers([...members, newMember]);
  };

  const removeMember = (memberId) => {
    if (members.length === 1) {
      Alert.alert('Cannot Remove', 'You need at least one family member');
      return;
    }
    setMembers(members.filter(m => m.id !== memberId));
  };

  const updateMemberName = (memberId, name) => {
    setMembers(members.map(m => m.id === memberId ? { ...m, name } : m));
  };

  const handleComplete = async () => {
    // Validation
    if (!familyName.trim()) {
      Alert.alert('Family Name Required', 'Please enter a family name');
      return;
    }

    const invalidMember = members.find(m => !m.name.trim());
    if (invalidMember) {
      Alert.alert('Member Name Required', 'Please enter names for all family members');
      return;
    }

    // TODO: Implement actual family creation with SupabaseDataService
    Alert.alert(
      'Family Setup Complete!',
      `Family "${familyName}" created with ${members.length} member(s)`,
      [
        {
          text: 'Continue',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Family</Text>
          <Text style={styles.subtitle}>
            Add your family members to start sharing events
          </Text>
        </View>

        {/* Family Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Family Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., The Smiths"
            placeholderTextColor={lightTheme.colors.gray400}
            value={familyName}
            onChangeText={setFamilyName}
          />
        </View>

        {/* Family Members */}
        <View style={styles.membersContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Family Members</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={addMember}
              disabled={members.length >= 2}
            >
              <Text style={styles.addButtonText}>+ Add Member</Text>
            </TouchableOpacity>
          </View>

          {members.map((member, index) => (
            <View key={member.id} style={styles.memberCard}>
              {/* Color Indicator */}
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: member.color },
                ]}
              />

              {/* Name Input */}
              <TextInput
                style={styles.memberInput}
                placeholder={index === 0 ? 'Your name' : `Member ${index + 1}`}
                placeholderTextColor={lightTheme.colors.gray400}
                value={member.name}
                onChangeText={(text) => updateMemberName(member.id, text)}
              />

              {/* Remove Button */}
              {members.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeMember(member.id)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {members.length >= 2 && (
            <Text style={styles.limitText}>
              Free tier limit reached. Upgrade to Pro for unlimited members.
            </Text>
          )}
        </View>

        {/* Complete Button */}
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleComplete}
        >
          <Text style={styles.completeButtonText}>Complete Setup</Text>
        </TouchableOpacity>

        {/* Skip for Now */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          }}
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: lightTheme.typography.fontSize.title1,
    fontWeight: lightTheme.typography.fontWeight.bold,
    color: lightTheme.colors.text,
    marginBottom: 8,
    lineHeight: lightTheme.typography.lineHeight.title1,
  },
  subtitle: {
    fontSize: lightTheme.typography.fontSize.subheadline,
    color: lightTheme.colors.textSecondary,
  },
  inputContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: lightTheme.typography.fontSize.subheadline,
    fontWeight: lightTheme.typography.fontWeight.medium,
    color: lightTheme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: lightTheme.colors.card,
    borderWidth: 1,
    borderColor: lightTheme.colors.gray300,
    borderRadius: lightTheme.borderRadius.m,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: lightTheme.typography.fontSize.body,
    color: lightTheme.colors.text,
    minHeight: lightTheme.touchTarget.minimum,
  },
  membersContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: lightTheme.typography.fontSize.headline,
    fontWeight: lightTheme.typography.fontWeight.semibold,
    color: lightTheme.colors.text,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: lightTheme.borderRadius.m,
    backgroundColor: lightTheme.colors.gray100,
  },
  addButtonText: {
    fontSize: lightTheme.typography.fontSize.subheadline,
    color: lightTheme.colors.primary,
    fontWeight: lightTheme.typography.fontWeight.medium,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightTheme.colors.card,
    borderRadius: lightTheme.borderRadius.m,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: lightTheme.colors.gray200,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  memberInput: {
    flex: 1,
    fontSize: lightTheme.typography.fontSize.body,
    color: lightTheme.colors.text,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: lightTheme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 18,
    color: lightTheme.colors.gray500,
  },
  limitText: {
    fontSize: lightTheme.typography.fontSize.footnote,
    color: lightTheme.colors.warning,
    marginTop: 8,
  },
  completeButton: {
    backgroundColor: lightTheme.colors.primary,
    borderRadius: lightTheme.borderRadius.l,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: lightTheme.touchTarget.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  completeButtonText: {
    fontSize: lightTheme.typography.fontSize.body,
    fontWeight: lightTheme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: lightTheme.typography.fontSize.subheadline,
    color: lightTheme.colors.textSecondary,
  },
});

export default FamilySetupScreen;
