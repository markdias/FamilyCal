/**
 * OnboardingScreen - First-time user welcome and setup
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { lightTheme } from '../styles/theme';

const OnboardingScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📅</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Welcome to FamilyCal</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Keep your family organized and connected with a shared calendar that everyone can use.
        </Text>

        {/* Features list */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.featureText}>Share events with family members</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🔔</Text>
            <Text style={styles.featureText}>Get smart notifications</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📋</Text>
            <Text style={styles.featureText}>Manage checklists and to-dos</Text>
          </View>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: lightTheme.typography.fontSize.title1,
    fontWeight: lightTheme.typography.fontWeight.bold,
    color: lightTheme.colors.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: lightTheme.typography.lineHeight.title1,
  },
  subtitle: {
    fontSize: lightTheme.typography.fontSize.body,
    fontWeight: lightTheme.typography.fontWeight.regular,
    color: lightTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: lightTheme.typography.lineHeight.body,
  },
  features: {
    marginBottom: 48,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: lightTheme.typography.fontSize.body,
    color: lightTheme.colors.text,
    flex: 1,
  },
  button: {
    backgroundColor: lightTheme.colors.primary,
    borderRadius: lightTheme.borderRadius.l,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: lightTheme.touchTarget.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: lightTheme.typography.fontSize.body,
    fontWeight: lightTheme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
});

export default OnboardingScreen;
