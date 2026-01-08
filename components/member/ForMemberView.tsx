import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ForMemberViewProps {
  memberName: string;
}

export function ForMemberView({ memberName }: ForMemberViewProps) {
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState('');

  const handleSend = () => {
    // TODO: Implement send note functionality
    setNote('');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 20 },
      ]}
      showsVerticalScrollIndicator={false}>
      {/* Notes Section */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <View style={styles.notesInputContainer}>
          <TextInput
            style={styles.notesInput}
            placeholder="Write a quick note..."
            placeholderTextColor="#8E8E93"
            value={note}
            onChangeText={setNote}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!note.trim()}>
            <Ionicons
              name="paper-plane"
              size={20}
              color={note.trim() ? '#007AFF' : '#8E8E93'}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.emptyStateText}>
          No notes yet. Add something for {memberName}.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  content: {
    padding: 16,
  },
  notesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  notesInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  notesInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: '#1D1D1F',
    minHeight: 40,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
});
