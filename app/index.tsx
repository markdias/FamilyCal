import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useViewMode } from '@/contexts/ViewModeContext';

export default function Index() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { hasFamily, isLoading: isFamilyLoading } = useFamily();
  const { settings } = useAppSettings();
  const { setViewMode } = useViewMode();

  React.useEffect(() => {
    if (!isAuthLoading && !isFamilyLoading && user && hasFamily) {
      setViewMode(settings.defaultScreen);
    }
  }, [isAuthLoading, isFamilyLoading, user, hasFamily, settings.defaultScreen, setViewMode]);

  // Show loading while checking auth state
  if (isAuthLoading || isFamilyLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D1D1F" />
      </View>
    );
  }

  // Redirect based on auth state
  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!hasFamily) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
});
