import React, { useRef } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EditEventHeader } from '@/components/event/EditEventHeader';
import { EditEventView } from '@/components/event/EditEventView';

export default function EditEventScreen() {
  const params = useLocalSearchParams();
  const paramId = params.id as string;
  const eventId = paramId?.includes('::') ? paramId.split('::')[0] : paramId;
  const occurrence = params.occurrence as string | undefined;

  const saveRef = useRef<(() => Promise<void> | void) | null>(null);

  const handleSave = async () => {
    if (saveRef.current) {
      await saveRef.current();
    } else {
      Alert.alert('Save unavailable', 'Please wait for the form to finish loading.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <EditEventHeader onSave={handleSave} />
      <EditEventView
        eventId={eventId}
        occurrence={occurrence}
        onRegisterSave={(fn) => {
          saveRef.current = fn;
        }}
      />
    </View>
  );
}
