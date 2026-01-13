import { useThemeColor } from '@/hooks/use-theme-color';
import { getCalendarPermissionStatus, requestCalendarPermissions } from '@/services/calendarImportService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Try to import LinearGradient, fallback to View if not available
let LinearGradient: any;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (e) {
  // Fallback: create a simple gradient-like component
  LinearGradient = ({ children, colors, style, ...props }: any) => (
    <View style={[{ backgroundColor: colors[0] }, style]} {...props}>
      {children}
    </View>
  );
}

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
}

function SettingsItem({ icon, iconColor = '#1D1D1F', label, description, value, onPress }: SettingsItemProps) {
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  // Special handling for Shared Calendars icon (calendar with plus)
  const isSharedCalendars = label === 'Shared Calendars';
  const isSavedPlaces = label === 'Saved Places';

  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      {isSharedCalendars ? (
        <View style={styles.iconContainer}>
          <Ionicons name="calendar-outline" size={20} color={iconColor} />
          <Ionicons name="add" size={12} color={iconColor} style={styles.overlayIcon} />
        </View>
      ) : isSavedPlaces ? (
        <View style={styles.iconContainer}>
          <Ionicons name="location-outline" size={20} color={iconColor} />
          <Text style={styles.questionMark}>?</Text>
        </View>
      ) : (
        <Ionicons name={icon} size={20} color={iconColor || textColor} />
      )}
      <View style={styles.settingsItemTextContainer}>
        <Text style={[styles.settingsItemText, { color: textColor }]}>{label}</Text>
        {description && (
          <Text style={[styles.settingsItemDescription, { color: mutedColor }]}>{description}</Text>
        )}
      </View>
      {value && (
        <Text style={[styles.settingsItemValue, { color: mutedColor }]}>{value}</Text>
      )}
      <Ionicons name="create-outline" size={20} color={mutedColor} />
    </TouchableOpacity>
  );
}

export function SettingsView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userContact } = useAuth();
  const { hasFamily } = useFamily();
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const subTextColor = useThemeColor({ light: '#8E8E93', dark: '#9EA0A6' }, 'text');
  const separatorColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');
  const surfaceColor = useThemeColor({ light: '#F5F5F7', dark: '#2C2C2E' }, 'background');

  const userEmail = user?.email || 'Not signed in';
  const userName = userContact 
    ? `${userContact.first_name}${userContact.last_name ? ' ' + userContact.last_name : ''}`
    : user?.user_metadata?.first_name || 'User';

  const [calendarPermissionStatus, setCalendarPermissionStatus] = useState<string>('loading');

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (Platform.OS === 'ios') {
      const { status } = await getCalendarPermissionStatus();
      setCalendarPermissionStatus(status);
    } else {
      setCalendarPermissionStatus('unsupported');
    }
  };

  const handleCalendarPermissionPress = async () => {
    if (Platform.OS !== 'ios') return;

    if (calendarPermissionStatus === 'granted') {
      Alert.alert('Calendar Access', 'You have granted access to your iOS calendar.');
    } else if (calendarPermissionStatus === 'denied' || calendarPermissionStatus === 'blocked') {
      Alert.alert(
        'Permission Denied',
        'To enable calendar access, please go to Settings and allow access.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      const { status } = await requestCalendarPermissions();
      setCalendarPermissionStatus(status);
      if (status === 'granted') {
        Alert.alert('Success', 'Calendar access granted!');
      }
    }
  };

  const getPermissionLabel = () => {
    switch (calendarPermissionStatus) {
      case 'granted': return 'Authorized';
      case 'denied': return 'Denied';
      case 'undetermined': return 'Not Determined';
      case 'loading': return 'Checking...';
      default: return '';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic">
        {/* Pro Active Banner */}
        <LinearGradient
          colors={['#34C759', '#30D158']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.proBanner}>
          <View style={styles.proBannerContent}>
            <View style={styles.proBannerLeft}>
              <View style={styles.proCheckCircle}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.proBannerText}>Pro Active</Text>
            </View>
            <TouchableOpacity style={styles.manageButton}>
              <Text style={styles.manageButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Account Section */}
        <Text style={[styles.sectionHeader, { color: subTextColor }]}>Account</Text>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: cardColor }]}
          onPress={() => router.push('/account')}>
          <View style={styles.accountContent}>
            <Ionicons name="person" size={24} color={textColor} />
            <View style={styles.accountTextContainer}>
              <Text style={[styles.accountSubtext, { color: subTextColor }]}>Signed in as</Text>
              <Text style={[styles.accountName, { color: textColor }]}>{userName}</Text>
              <Text style={[styles.accountEmail, { color: subTextColor }]}>{userEmail}</Text>
            </View>
            <Ionicons name="create-outline" size={20} color={subTextColor} />
          </View>
        </TouchableOpacity>

        {/* Settings Section */}
        <Text style={[styles.sectionHeader, { color: subTextColor }]}>Settings</Text>
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <SettingsItem icon="notifications-outline" label="Notifications" iconColor={textColor} />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingsItem
            icon="settings-outline"
            label="App Settings"
            onPress={() => router.push('/settings/app-settings')}
            iconColor={textColor}
          />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingsItem
            icon="calendar-outline"
            label="Personal Calendars"
            onPress={() => router.push('/settings/personal-calendars')}
            iconColor={textColor}
          />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingsItem
            icon="calendar-outline"
            label="Shared Calendars"
            onPress={() => router.push('/settings/shared-calendars')}
            iconColor={textColor}
          />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingsItem icon="color-palette-outline" label="Themes" iconColor={textColor} />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingsItem
            icon="location-outline"
            label="Saved Places"
            onPress={() => router.push('/settings/saved-locations')}
            iconColor={textColor}
          />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingsItem icon="car-outline" label="Drivers" iconColor={textColor} />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingsItem icon="sparkles-outline" label="Widgets" iconColor={textColor} />
          <View style={[styles.separator, { backgroundColor: separatorColor }]} />
          <SettingsItem icon="attach-outline" label="Attachments" iconColor={textColor} />
          {Platform.OS === 'ios' && (
            <>
              <View style={[styles.separator, { backgroundColor: separatorColor }]} />
              <SettingsItem
                icon="download-outline"
                label="Import Calendars"
                onPress={() => router.push('/settings/import-calendars')}
                iconColor={textColor}
              />
            </>
          )}
        </View>

        {/* Family Section - Only show if user doesn't have a family */}
        {!hasFamily && (
          <>
            <Text style={[styles.sectionHeader, { color: subTextColor }]}>Family</Text>
            <View style={[styles.card, { backgroundColor: cardColor }]}>
              <SettingsItem
                icon="people-outline"
                label="Join a Family"
                onPress={() => router.push('/join-family')}
                description="Enter a code to join an existing family"
                iconColor={textColor}
              />
            </View>
          </>
        )}

        {/* More Section */}
        <Text style={[styles.sectionHeader, { color: subTextColor }]}>More</Text>
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          {Platform.OS === 'ios' && (
            <SettingsItem
              icon="calendar-outline"
              label="Calendar Access"
              value={getPermissionLabel()}
              onPress={handleCalendarPermissionPress}
              iconColor={textColor}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  proBanner: {
    borderRadius: 12,
    marginBottom: 24,
    padding: 16,
  },
  proBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  proBannerText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  manageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  accountContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  accountSubtext: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    marginBottom: 2,
  },
  accountName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  accountEmail: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    position: 'relative',
    width: 20,
    height: 20,
  },
  overlayIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  questionMark: {
    position: 'absolute',
    top: -4,
    right: -4,
    fontSize: 10,
    fontWeight: '600',
    color: '#1D1D1F',
    backgroundColor: '#FFFFFF',
    width: 12,
    height: 12,
    borderRadius: 6,
    textAlign: 'center',
    lineHeight: 12,
  },
  settingsItemTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  settingsItemText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D1D1F',
  },
  settingsItemDescription: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F5F5F7',
    marginLeft: 32,
  },
  settingsItemValue: {
    fontSize: 17,
    fontWeight: '400',
    color: '#8E8E93',
    marginRight: 4,
  },
});
