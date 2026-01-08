import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppSettings } from '@/contexts/AppSettingsContext';

export function useColorScheme() {
  const { settings } = useAppSettings();
  const systemScheme = useRNColorScheme();

  if (settings.appearance === 'light') return 'light';
  if (settings.appearance === 'dark') return 'dark';
  return systemScheme;
}
