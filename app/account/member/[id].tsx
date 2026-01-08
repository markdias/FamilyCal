import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MemberEditView } from '@/components/account/MemberEditView';

export default function MemberEditScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const contactId = params.id || '';

  return <MemberEditView contactId={contactId} />;
}
