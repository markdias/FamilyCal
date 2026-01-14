import { useAuth } from '@/contexts/AuthContext';
import { supabase, UserPreferences } from '@/lib/supabase';
import { FAMILY_EVENT_COLOR } from '@/utils/colorUtils';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

type DefaultScreen = 'family' | 'calendar';
type MapsApp = 'apple' | 'google' | 'waze';
type Appearance = 'light' | 'dark' | 'system';

type AppSettings = {
  eventsPerPerson: number;
  defaultScreen: DefaultScreen;
  autoRefreshMinutes: number | null;
  defaultMapsApp: MapsApp;
  appearance: Appearance;
  familyCalendarColor: string;
};

type AppSettingsContextType = {
  settings: AppSettings;
  isLoading: boolean;
  setEventsPerPerson: (value: number) => void;
  setDefaultScreen: (value: DefaultScreen) => void;
  setAutoRefreshMinutes: (value: number | null) => void;
  setDefaultMapsApp: (value: MapsApp) => void;
  setAppearance: (value: Appearance) => void;
  setFamilyCalendarColor: (value: string) => void;
};

const DEFAULT_SETTINGS: AppSettings = {
  eventsPerPerson: 3,
  defaultScreen: 'family',
  autoRefreshMinutes: 60,
  defaultMapsApp: Platform.OS === 'android' ? 'google' : 'apple',
  appearance: 'system',
  familyCalendarColor: FAMILY_EVENT_COLOR,
};

const STORAGE_KEY = 'familycal_app_settings_v1';

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from Supabase or local storage
  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        setIsLoading(true);
        if (user) {
          // Try fetching from Supabase
          const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (data && !error) {
            const prefs = data as UserPreferences;
            if (mounted) {
              setSettings({
                eventsPerPerson: prefs.events_per_person ?? DEFAULT_SETTINGS.eventsPerPerson,
                defaultScreen: (prefs.default_screen as DefaultScreen) ?? DEFAULT_SETTINGS.defaultScreen,
                autoRefreshMinutes: prefs.auto_refresh_minutes ?? DEFAULT_SETTINGS.autoRefreshMinutes,
                defaultMapsApp: (prefs.default_maps_app as MapsApp) ?? DEFAULT_SETTINGS.defaultMapsApp,
                appearance: (prefs.appearance as Appearance) ?? DEFAULT_SETTINGS.appearance,
                familyCalendarColor: prefs.family_calendar_color ?? DEFAULT_SETTINGS.familyCalendarColor,
              });
            }
            return;
          } else if (error && error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
            console.warn('Error fetching settings from Supabase:', error);
          }
        }

        // Fallback to local storage if not logged in or Supabase failed/empty
        if (Platform.OS === 'web') {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw && mounted) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        } else {
          const raw = await SecureStore.getItemAsync(STORAGE_KEY);
          if (raw && mounted) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        }
      } catch (e) {
        console.warn('Failed to load app settings', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Save settings to Supabase and local storage
  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    try {
      // 1. Save to Local Storage (always as backup/offline)
      const raw = JSON.stringify(newSettings);
      if (Platform.OS === 'web') {
        window.localStorage.setItem(STORAGE_KEY, raw);
      } else {
        await SecureStore.setItemAsync(STORAGE_KEY, raw);
      }

      // 2. Sync to Supabase if logged in
      if (user) {
        const updates: Partial<UserPreferences> = {
          user_id: user.id,
          events_per_person: newSettings.eventsPerPerson,
          default_screen: newSettings.defaultScreen,
          auto_refresh_minutes: newSettings.autoRefreshMinutes,
          default_maps_app: newSettings.defaultMapsApp,
          appearance: newSettings.appearance,
          family_calendar_color: newSettings.familyCalendarColor,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('user_preferences')
          .upsert(updates, { onConflict: 'user_id' });

        if (error) {
          console.warn('Failed to sync settings to Supabase:', error);
        }
      }
    } catch (e) {
      console.warn('Failed to save app settings', e);
    }
  }, [user]);

  // Update state and trigger save
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      // Fire and forget save
      saveSettings(next);
      return next;
    });
  }, [saveSettings]);

  const setEventsPerPerson = useCallback((value: number) => {
    updateSettings({ eventsPerPerson: Math.max(1, Math.min(20, value)) });
  }, [updateSettings]);

  const setDefaultScreen = useCallback((value: DefaultScreen) => {
    updateSettings({ defaultScreen: value });
  }, [updateSettings]);

  const setAutoRefreshMinutes = useCallback((value: number | null) => {
    if (value !== null && (Number.isNaN(value) || value <= 0)) {
      return;
    }
    updateSettings({ autoRefreshMinutes: value });
  }, [updateSettings]);

  const setDefaultMapsApp = useCallback((value: MapsApp) => {
    updateSettings({ defaultMapsApp: value });
  }, [updateSettings]);

  const setAppearance = useCallback((value: Appearance) => {
    updateSettings({ appearance: value });
  }, [updateSettings]);

  const setFamilyCalendarColor = useCallback((value: string) => {
    updateSettings({ familyCalendarColor: value });
  }, [updateSettings]);

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        isLoading,
        setEventsPerPerson,
        setDefaultScreen,
        setAutoRefreshMinutes,
        setDefaultMapsApp,
        setAppearance,
        setFamilyCalendarColor,
      }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
