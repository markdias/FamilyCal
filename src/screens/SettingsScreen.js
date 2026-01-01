/**
 * SettingsScreen - App settings and configuration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { lightTheme } from '../styles/theme';
import AppSettingsService from '../services/AppSettingsService';
import SupabaseAuthService from '../services/SupabaseAuthService';

const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState(AppSettingsService.getSettings());
  const [isPro, setIsPro] = useState(AppSettingsService.isProUser);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const loadedSettings = await AppSettingsService.initialize();
    setSettings(loadedSettings);
    setIsPro(AppSettingsService.isProUser);
  };

  const handleToggleSetting = async (key, value) => {
    await AppSettingsService.setSetting(key, value);
    setSettings(AppSettingsService.getSettings());
  };

  const handleSignOut = async () => {
    const authService = SupabaseAuthService;
    const result = await authService.signOut();
    if (result.success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Pro Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pro Features</Text>
            {isPro ? (
              <Text style={[styles.proBadge, styles.proActive]}>✓ Pro</Text>
            ) : (
              <TouchableOpacity
                style={[styles.proBadge, styles.proInactive]}
                onPress={() => {/* TODO: Navigate to upgrade screen */}}
              >
                <Text style={styles.proUpgradeText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isPro && (
            <Text style={styles.proDescription}>
              Upgrade to Pro to unlock unlimited family members, widgets, saved places, and more!
            </Text>
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive event reminders and updates
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) => handleToggleSetting('notificationsEnabled', value)}
              trackColor={{ false: lightTheme.colors.gray300, true: lightTheme.colors.primary }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Morning Brief</Text>
              <Text style={styles.settingDescription}>
                Daily summary at {settings.morningBriefTime}
              </Text>
            </View>
            <Switch
              value={settings.morningBriefEnabled}
              onValueChange={(value) => handleToggleSetting('morningBriefEnabled', value)}
              trackColor={{ false: lightTheme.colors.gray300, true: lightTheme.colors.primary }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Weekdays Only</Text>
              <Text style={styles.settingDescription}>
                Skip morning brief on weekends
              </Text>
            </View>
            <Switch
              value={settings.morningBriefWeekdaysOnly}
              onValueChange={(value) => handleToggleSetting('morningBriefWeekdaysOnly', value)}
              trackColor={{ false: lightTheme.colors.gray300, true: lightTheme.colors.primary }}
            />
          </View>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Appearance</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Theme</Text>
              <Text style={styles.settingDescription}>
                {settings.theme === 'auto' ? 'Auto (System)' : settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Family Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Calendar Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>External Calendars</Text>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Support</Text>
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Help & FAQ</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Privacy Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>FamilyCal v1.0.0</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: lightTheme.typography.fontSize.headline,
    fontWeight: lightTheme.typography.fontWeight.semibold,
    color: lightTheme.colors.text,
  },
  proBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: lightTheme.borderRadius.m,
  },
  proActive: {
    backgroundColor: lightTheme.colors.success,
  },
  proInactive: {
    backgroundColor: lightTheme.colors.primary,
  },
  proUpgradeText: {
    fontSize: lightTheme.typography.fontSize.subheadline,
    fontWeight: lightTheme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  proDescription: {
    fontSize: lightTheme.typography.fontSize.footnote,
    color: lightTheme.colors.textSecondary,
    lineHeight: lightTheme.typography.lineHeight.footnote,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.gray100,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: lightTheme.typography.fontSize.body,
    fontWeight: lightTheme.typography.fontWeight.medium,
    color: lightTheme.colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: lightTheme.typography.fontSize.footnote,
    color: lightTheme.colors.textSecondary,
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.gray100,
  },
  menuItemText: {
    fontSize: lightTheme.typography.fontSize.body,
    color: lightTheme.colors.text,
  },
  signOutButton: {
    backgroundColor: lightTheme.colors.card,
    borderWidth: 1,
    borderColor: lightTheme.colors.error,
    borderRadius: lightTheme.borderRadius.l,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  signOutText: {
    fontSize: lightTheme.typography.fontSize.body,
    fontWeight: lightTheme.typography.fontWeight.semibold,
    color: lightTheme.colors.error,
  },
  version: {
    fontSize: lightTheme.typography.fontSize.caption1,
    color: lightTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
});

export default SettingsScreen;
