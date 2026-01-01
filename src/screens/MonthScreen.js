/**
 * MonthScreen - Monthly calendar view
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { lightTheme } from '../styles/theme';
import { format } from 'date-fns';

const MonthScreen = () => {
  const currentDate = new Date();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {format(currentDate, 'MMMM yyyy')}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📆</Text>
          <Text style={styles.placeholderText}>Month View</Text>
          <Text style={styles.placeholderSubtext}>
            Calendar grid will be displayed here
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: lightTheme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.gray200,
  },
  title: {
    fontSize: lightTheme.typography.fontSize.title3,
    fontWeight: lightTheme.typography.fontWeight.semibold,
    color: lightTheme.colors.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: lightTheme.typography.fontSize.headline,
    fontWeight: lightTheme.typography.fontWeight.semibold,
    color: lightTheme.colors.text,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: lightTheme.typography.fontSize.subheadline,
    color: lightTheme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default MonthScreen;
