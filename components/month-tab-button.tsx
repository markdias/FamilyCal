import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import React from 'react';

// Simple event emitter for tab toggle
class TabToggleEmitter {
  private listeners: Set<() => void> = new Set();

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit() {
    this.listeners.forEach((callback) => callback());
  }
}

export const tabToggleEmitter = new TabToggleEmitter();

export function MonthTabButton(props: BottomTabBarButtonProps) {
  const handlePress = (ev: any) => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Always emit toggle event - the screen will handle whether to toggle or not
    // based on whether it's already focused
    tabToggleEmitter.emit();
    
    // Also allow normal navigation
    props.onPress?.(ev);
  };

  return (
    <PlatformPressable
      {...props}
      onPress={handlePress}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
