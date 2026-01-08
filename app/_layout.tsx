import React, { useEffect } from 'react';
// CRITICAL: Import View FIRST before any expo-router imports
// This ensures View is initialized before react-native-screens tries to use it
// Prevents "Cannot access uninitialized variable" errors on web
import { View, ActivityIndicator, StyleSheet, StatusBar as RNStatusBar, Platform } from 'react-native';

// Import reanimated before other navigation libraries
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ViewModeProvider } from '@/contexts/ViewModeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { FamilyProvider, useFamily } from '@/contexts/FamilyContext';
import { AppSettingsProvider } from '@/contexts/AppSettingsContext';
import { EventCacheProvider } from '@/contexts/EventCacheContext';
import { SelectedDateProvider } from '@/contexts/SelectedDateContext';

// Web-specific: Force View initialization before react-native-screens loads
// This must be at module level (not in a function) to run during module evaluation
if (typeof window !== 'undefined') {
  // Access View at module level to ensure it's initialized
  typeof View;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

// Component to handle navigation based on auth state
function NavigationHandler({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { hasFamily, isLoading: isFamilyLoading } = useFamily();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything while loading
    if (isAuthLoading || isFamilyLoading) return;

    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === 'login' || currentSegment === 'signup';
    const inOnboardingGroup = currentSegment === 'onboarding' || 
                              currentSegment === 'create-family' || 
                              currentSegment === 'join-family';
    const isIndex = currentSegment === 'index' || segments.length === 0;

    // Only handle redirects if not on index (let index.tsx handle initial routing)
    if (isIndex) return;

    if (!user) {
      // Not authenticated - redirect to login unless already there
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } else if (!hasFamily) {
      // Authenticated but no family - redirect to onboarding
      if (!inOnboardingGroup) {
        router.replace('/onboarding');
      }
    } else {
      // Authenticated with family - redirect to main app if in auth/onboarding
      if (inAuthGroup || inOnboardingGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [user, hasFamily, isAuthLoading, isFamilyLoading, segments, router]);

  // Always render children - let individual screens handle their own loading states
  return <>{children}</>;
}

// Inner layout with navigation handler
function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NavigationHandler>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="create-family" options={{ headerShown: false }} />
          <Stack.Screen name="join-family" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]/edit" options={{ headerShown: false }} />
          <Stack.Screen name="account" options={{ headerShown: false }} />
          <Stack.Screen name="member/[name]" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </NavigationHandler>
      {Platform.OS !== 'web' && (
        <RNStatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <FamilyProvider>
        <AppSettingsProvider>
          <EventCacheProvider>
            <ViewModeProvider>
              <SelectedDateProvider>
                <RootLayoutNav />
              </SelectedDateProvider>
            </ViewModeProvider>
          </EventCacheProvider>
        </AppSettingsProvider>
      </FamilyProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
});
