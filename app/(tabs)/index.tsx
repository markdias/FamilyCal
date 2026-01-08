import React, { useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { CalendarMonthView } from '@/components/calendar/CalendarMonthView';
import { FamilyView } from '@/components/family/FamilyView';
import { tabToggleEmitter } from '@/components/month-tab-button';
import { useViewMode } from '@/contexts/ViewModeContext';

export default function MonthScreen() {
  const { viewMode, setViewMode } = useViewMode();
  const isFocusedRef = useRef(false);
  const lastToggleTimeRef = useRef<number>(0);

  // Listen for toggle events
  useEffect(() => {
    const unsubscribe = tabToggleEmitter.subscribe(() => {
      const now = Date.now();
      
      // Only toggle if we're currently focused (on this screen)
      if (isFocusedRef.current) {
        // Prevent rapid toggles
        if (now - lastToggleTimeRef.current > 300) {
          setViewMode((prev) => {
            // Cycle through: family -> calendar -> family
            if (prev === 'family') return 'calendar';
            if (prev === 'calendar') return 'family';
            return 'family';
          });
          lastToggleTimeRef.current = now;
        }
      }
    });

    return unsubscribe;
  }, [setViewMode]);

  // Track focus state
  useFocusEffect(
    React.useCallback(() => {
      isFocusedRef.current = true;
      return () => {
        isFocusedRef.current = false;
      };
    }, [])
  );

  if (viewMode === 'calendar') {
    return <CalendarMonthView />;
  }
  return <FamilyView />;
}
