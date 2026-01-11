import { SignupView } from '@/components/auth/SignupView';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function SignupScreen() {
  const { invitationToken } = useLocalSearchParams<{ invitationToken: string }>();
  return <SignupView invitationToken={invitationToken} />;
}
