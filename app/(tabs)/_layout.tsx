import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { MonthTabButton } from '@/components/month-tab-button';
import { Colors } from '@/constants/theme';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { viewMode } = useViewMode();
  const { settings } = useAppSettings();

  const effectiveViewMode = viewMode || settings.defaultScreen;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      {/* Internal routes hidden at the top */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />

      {/* 
        Dynamic Slot 1: 
        We render the current active route's tab in the first visible position, 
        but we style it to look like the TARGET of the toggle.
      */}
      {effectiveViewMode === 'family' ? (
        <Tabs.Screen
          name="family"
          options={{
            title: 'Family',
            tabBarIcon: ({ color }) => (
              <Ionicons name="people" size={24} color={color} />
            ),
            tabBarButton: MonthTabButton,
          }}
        />
      ) : (
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar" size={24} color={color} />
            ),
            tabBarButton: MonthTabButton,
          }}
        />
      )}

      {/* Standard Tabs */}
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <Ionicons name="add" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'Lists',
          tabBarIcon: ({ color }) => <Ionicons name="checkmark-circle" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Routines',
          tabBarIcon: ({ color }) => <Ionicons name="repeat" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      />

      {/* Explicitly hide the inactive main route to prevent it moving to the end */}
      <Tabs.Screen
        name={effectiveViewMode === 'family' ? "calendar" : "family"}
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
