import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppSettings } from '@/contexts/AppSettingsContext';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { settings } = useAppSettings();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (settings.appearance === 'light') return 'light';
  if (settings.appearance === 'dark') return 'dark';

  if (hasHydrated) return colorScheme;

  return 'light';
}
