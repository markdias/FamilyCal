/**
 * DayScreen - Daily calendar view with timeline
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { lightTheme } from '../styles/theme';
import { format } from 'date-fns';

const DayScreen = () => {
  const currentDate = new Date();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {format(currentDate, 'EEEE, MMMM d')}
          </Text>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🕐</Text>
            <Text style={styles.placeholderText}>Day View</Text>
            <Text style={styles.placeholderSubtext}>
              Daily timeline will be displayed here
            </Text>
          </View>
        </View>
      </ScrollView>
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
  timeline: {
    padding: 16,
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: 64,
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

export default DayScreen;
