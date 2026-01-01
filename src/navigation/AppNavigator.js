/**
 * AppNavigator - Main navigation structure
 * Handles authentication flow and tab navigation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../styles/theme';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import FamilySetupScreen from '../screens/FamilySetupScreen';
import FamilyScreen from '../screens/FamilyScreen';
import MonthScreen from '../screens/MonthScreen';
import DayScreen from '../screens/DayScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Family') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Month') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Day') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: lightTheme.colors.primary,
        tabBarInactiveTintColor: lightTheme.colors.gray400,
        tabBarStyle: {
          height: 68,
          paddingBottom: 24, // Safe area padding
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: lightTheme.colors.gray200,
        },
        tabBarLabelStyle: {
          fontSize: lightTheme.typography.fontSize.caption1,
          fontWeight: lightTheme.typography.fontWeight.medium,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Family"
        component={FamilyScreen}
        options={{ title: 'Family' }}
      />
      <Tab.Screen
        name="Month"
        component={MonthScreen}
        options={{ title: 'Month' }}
      />
      <Tab.Screen
        name="Day"
        component={DayScreen}
        options={{ title: 'Day' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

// Root Stack Navigator
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Onboarding Flow */}
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ gestureEnabled: false }}
        />

        {/* Authentication Flow */}
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ gestureEnabled: false }}
        />

        {/* Family Setup */}
        <Stack.Screen
          name="FamilySetup"
          component={FamilySetupScreen}
          options={{ gestureEnabled: false }}
        />

        {/* Main App (Tab Navigator) */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
