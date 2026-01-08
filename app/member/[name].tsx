import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MemberDetailView } from '@/components/member/MemberDetailView';

export default function MemberDetailScreen() {
  const params = useLocalSearchParams();
  const memberName = (params.name as string) || 'Member';

  return <MemberDetailView memberName={memberName} />;
}
