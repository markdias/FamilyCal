import { CalendarMonthView } from '@/components/calendar/CalendarMonthView';
import { tabToggleEmitter } from '@/components/month-tab-button';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';

export default function CalendarScreen() {
    const { setViewMode } = useViewMode();
    const router = useRouter();
    const isFocusedRef = useRef(false);
    const lastToggleTimeRef = useRef<number>(0);

    // Sync viewMode state when this screen is focused
    useFocusEffect(
        React.useCallback(() => {
            setViewMode('calendar');
            isFocusedRef.current = true;
            return () => {
                isFocusedRef.current = false;
            };
        }, [setViewMode])
    );

    // Listen for toggle events
    useEffect(() => {
        const unsubscribe = tabToggleEmitter.subscribe(() => {
            const now = Date.now();

            // Only toggle if we're currently focused
            if (isFocusedRef.current) {
                // Prevent rapid toggles
                if (now - lastToggleTimeRef.current > 300) {
                    router.replace('/family');
                    lastToggleTimeRef.current = now;
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [router]);

    return <CalendarMonthView />;
}
