import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
import { FAMILY_EVENT_COLOR } from '@/utils/colorUtils';
import * as SecureStore from 'expo-secure-store';

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

async function loadSettings(): Promise<AppSettings> {
  try {
    if (Platform.OS === 'web') {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } else {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load app settings', e);
  }
  return DEFAULT_SETTINGS;
}

async function saveSettings(settings: AppSettings) {
  try {
    const raw = JSON.stringify(settings);
    if (Platform.OS === 'web') {
      window.localStorage.setItem(STORAGE_KEY, raw);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, raw);
    }
  } catch (e) {
    console.warn('Failed to save app settings', e);
  }
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then((loaded) => setSettings(loaded));
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const setEventsPerPerson = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, eventsPerPerson: Math.max(1, Math.min(20, value)) }));
  }, []);

  const setDefaultScreen = useCallback((value: DefaultScreen) => {
    setSettings((prev) => ({ ...prev, defaultScreen: value }));
  }, []);

  const setAutoRefreshMinutes = useCallback((value: number | null) => {
    if (value !== null && (Number.isNaN(value) || value <= 0)) {
      return;
    }
    setSettings((prev) => ({ ...prev, autoRefreshMinutes: value }));
  }, []);

  const setDefaultMapsApp = useCallback((value: MapsApp) => {
    setSettings((prev) => ({ ...prev, defaultMapsApp: value }));
  }, []);

  const setAppearance = useCallback((value: Appearance) => {
    setSettings((prev) => ({ ...prev, appearance: value }));
  }, []);

  const setFamilyCalendarColor = useCallback((value: string) => {
    setSettings((prev) => ({ ...prev, familyCalendarColor: value }));
  }, []);

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
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
