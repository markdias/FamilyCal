import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';

interface AddEventHeaderProps {
  onAdd?: () => Promise<void> | void;
}

export function AddEventHeader({ onAdd }: AddEventHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({ light: '#F5F5F7', dark: '#1E1E1E' }, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#2C2C2E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const accent = useThemeColor({ light: '#007AFF', dark: '#0A84FF' }, 'tint');

  const handleCancel = () => {
    router.back();
  };

  const handleAdd = async () => {
    if (onAdd) {
      await onAdd();
      // Don't navigate here - let the handler manage navigation
      // router.back();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 0), backgroundColor }]}>
      <TouchableOpacity style={[styles.button, { backgroundColor: cardColor }]} onPress={handleCancel}>
        <Text style={[styles.buttonText, { color: textColor }]}>Cancel</Text>
      </TouchableOpacity>
      <Text style={[styles.title, { color: textColor }]}>New Event</Text>
      <TouchableOpacity style={[styles.button, { backgroundColor: cardColor }]} onPress={handleAdd}>
        <Text style={[styles.buttonText, { color: accent }]}>Add</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
});
