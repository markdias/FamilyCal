import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { Redirect } from 'expo-router';
import React from 'react';

export default function IndexScreen() {
  const { settings } = useAppSettings();
  const { viewMode } = useViewMode();

  // Decide initial route based on persisted viewMode or app settings
  const initialRoute = viewMode === 'calendar' ? '/calendar' :
    viewMode === 'family' ? '/family' :
      settings.defaultScreen === 'calendar' ? '/calendar' : '/family';

  return <Redirect href={initialRoute as any} />;
}
