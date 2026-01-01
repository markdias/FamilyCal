import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface SegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ values, selectedIndex, onChange }) => {
  const { colors, spacing, typography, primary } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: 4, borderRadius: 8 }]}>
      {values.map((value, index) => {
        const isSelected = selectedIndex === index;
        return (
          <TouchableOpacity
            key={value}
            style={[
              styles.segment,
              isSelected && { backgroundColor: colors.card, ...styles.shadow }
            ]}
            onPress={() => onChange(index)}
            activeOpacity={0.8}
          >
            <Text style={[
              typography.footnote,
              { color: isSelected ? primary : colors.textSecondary, fontWeight: isSelected ? 'bold' : 'normal' }
            ]}>
              {value}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 36,
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  }
});
