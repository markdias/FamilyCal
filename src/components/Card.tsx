import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  borderColor?: string;
}

export const Card: React.FC<CardProps> = ({ children, style, borderColor }) => {
  const { colors, spacing, shadows } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          padding: spacing.s,
          marginBottom: spacing.m,
        },
        shadows,
        borderColor ? { borderLeftWidth: 4, borderLeftColor: borderColor } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
  },
});
