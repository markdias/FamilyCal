import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Home, Calendar, Settings as SettingsIcon, Users } from 'lucide-react-native';

import { FamilyView } from '../screens/FamilyView';
import { CalendarScreen } from '../screens/CalendarScreen';
import { SettingsView } from '../screens/SettingsView';
import { useTheme } from '../hooks/useTheme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const FamilyStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: true }}>
    <Stack.Screen name="FamilyMain" component={FamilyView} options={{ title: 'Family' }} />
  </Stack.Navigator>
);

const CalendarStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CalendarMain" component={CalendarScreen} />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: true }}>
    <Stack.Screen name="SettingsMain" component={SettingsView} options={{ title: 'Settings' }} />
  </Stack.Navigator>
);

export const RootNavigator = () => {
  const { colors, primary, isDark } = useTheme();

  return (
    <NavigationContainer theme={{
      dark: isDark,
      colors: {
        primary: primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        notification: primary,
      }
    }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: 80,
            paddingBottom: 20,
          },
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Family') return <Users size={size} color={color} />;
            if (route.name === 'Calendar') return <Calendar size={size} color={color} />;
            if (route.name === 'Settings') return <SettingsIcon size={size} color={color} />;
            return null;
          },
        })}
      >
        <Tab.Screen name="Family" component={FamilyStack} />
        <Tab.Screen name="Calendar" component={CalendarStack} />
        <Tab.Screen name="Settings" component={SettingsStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
