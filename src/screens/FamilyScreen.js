/**
 * FamilyScreen - Main family view showing upcoming events
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { lightTheme } from '../styles/theme';

const FamilyScreen = () => {
  const [events] = useState([]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Family Calendar</Text>
        </View>

        {/* Upcoming Events Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
          </View>

          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No upcoming events</Text>
              <Text style={styles.emptySubtext}>Tap + to add your first event</Text>
            </View>
          ) : (
            <View style={styles.eventList}>
              {events.map(event => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Family Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Family Members</Text>
          </View>

          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.emptyText}>No family members yet</Text>
            <Text style={styles.emptySubtext}>Complete family setup to get started</Text>
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
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: lightTheme.typography.fontSize.title1,
    fontWeight: lightTheme.typography.fontWeight.bold,
    color: lightTheme.colors.text,
    lineHeight: lightTheme.typography.lineHeight.title1,
  },
  section: {
    backgroundColor: lightTheme.colors.card,
    borderRadius: lightTheme.borderRadius.l,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: lightTheme.typography.fontSize.headline,
    fontWeight: lightTheme.typography.fontWeight.semibold,
    color: lightTheme.colors.text,
  },
  eventList: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: lightTheme.colors.gray50,
    borderRadius: lightTheme.borderRadius.m,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: lightTheme.colors.primary,
  },
  eventTitle: {
    fontSize: lightTheme.typography.fontSize.body,
    color: lightTheme.colors.text,
    fontWeight: lightTheme.typography.fontWeight.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: lightTheme.typography.fontSize.subheadline,
    fontWeight: lightTheme.typography.fontWeight.medium,
    color: lightTheme.colors.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: lightTheme.typography.fontSize.footnote,
    color: lightTheme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default FamilyScreen;
