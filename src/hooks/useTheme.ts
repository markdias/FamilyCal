import { useColorScheme } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { COLORS } from '../styles/theme';

export const useTheme = () => {
  const { state } = useAppContext();
  const systemColorScheme = useColorScheme();
  
  const mode = state.theme === 'auto' ? (systemColorScheme || 'light') : state.theme;
  const isDark = mode === 'dark';
  
  const themeColors = isDark ? COLORS.dark : COLORS.light;
  
  return {
    isDark,
    colors: themeColors,
    spacing: require('../styles/theme').SPACING,
    typography: require('../styles/theme').TYPOGRAPHY,
    shadows: isDark ? require('../styles/theme').SHADOWS.dark : require('../styles/theme').SHADOWS.light,
    primary: COLORS.primary,
    memberColors: COLORS.members,
  };
};
