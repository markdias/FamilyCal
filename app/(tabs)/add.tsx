import React, { useRef } from 'react';
import { View } from 'react-native';
import { AddEventHeader } from '@/components/event/AddEventHeader';
import { AddEventView } from '@/components/event/AddEventView';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function AddScreen() {
  const addHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const backgroundColor = useThemeColor({}, 'background');

  const handleAdd = async () => {
    if (addHandlerRef.current) {
      await addHandlerRef.current();
    } else {
      console.warn('Add handler not yet available');
    }
  };

  const setAddHandler = (handler: () => Promise<void>) => {
    addHandlerRef.current = handler;
  };

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <AddEventHeader onAdd={handleAdd} />
      <AddEventView onAddRef={setAddHandler} />
    </View>
  );
}
