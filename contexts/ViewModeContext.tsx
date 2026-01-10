import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const STORAGE_KEY = 'familycal_view_mode';

type ViewMode = 'calendar' | 'family';

interface ViewModeContextType {
  viewMode: ViewMode | null;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode | null>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'calendar' || stored === 'family') {
          return stored as ViewMode;
        }
      } catch (e) {
        console.warn('Failed to load view mode from storage', e);
      }
    }
    return null; // Return null if nothing persisted
  });

  // Remove redundant loading useEffect

  // Persist view mode changes
  useEffect(() => {
    if (Platform.OS === 'web' && viewMode) {
      try {
        window.localStorage.setItem(STORAGE_KEY, viewMode);
      } catch (e) {
        console.warn('Failed to save view mode', e);
      }
    }
  }, [viewMode]);

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
