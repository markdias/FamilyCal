/**
 * AppSettingsService - User Preferences and Pro Feature Enforcement
 * Handles app settings, Pro feature checks, and widget configuration
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  PRO_ENABLED: 'com.famcal.pro.enabled',
  SETTINGS: 'com.famcal.settings',
};

// Default settings
const DEFAULT_SETTINGS = {
  // Pro status
  isProEnabled: false,

  // Notifications
  notificationsEnabled: true,
  morningBriefEnabled: true,
  morningBriefTime: '07:00',
  morningBriefWeekdaysOnly: false,
  eventRemindersEnabled: true,

  // Theme
  theme: 'light', // 'light', 'dark', 'auto'

  // Calendar
  defaultCalendarId: null,
  showDeclinedEvents: true,

  // Spotlight
  spotlightEventIds: [],
  maxSpotlightEvents: 5,

  // Widgets
  widgetConfig: {
    enabled: false,
    daysToShow: 3,
    showBirthdays: false,
  },

  // Saved Places (Pro feature)
  savedPlaces: [],

  // Drivers (Pro feature)
  drivers: [],

  // External calendars
  externalCalendars: [],
};

// Pro feature limits
const PRO_LIMITS = {
  FREE: {
    familyMembers: 2,
    sharedCalendars: 1,
    storage: 0, // MB
    spotlightEvents: 5,
    themes: ['default'],
    widgets: false,
    savedPlaces: false,
    drivers: false,
  },
  PRO: {
    familyMembers: Infinity,
    sharedCalendars: Infinity,
    storage: 1000, // MB
    spotlightEvents: Infinity,
    themes: ['light', 'dark', 'auto'],
    widgets: true,
    savedPlaces: true,
    drivers: true,
  },
};

class AppSettingsService {
  static instance = null;

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!AppSettingsService.instance) {
      AppSettingsService.instance = new AppSettingsService();
    }
    return AppSettingsService.instance;
  }

  constructor() {
    if (AppSettingsService.instance) {
      return AppSettingsService.instance;
    }

    this.settings = { ...DEFAULT_SETTINGS };
    this.syncDebounceTimer = null;
  }

  /**
   * Initialize the settings service
   */
  async initialize() {
    // Load Pro status from SecureStore
    const proEnabled = await SecureStore.getItemAsync(STORAGE_KEYS.PRO_ENABLED);
    this.settings.isProEnabled = proEnabled === 'true';

    // Load settings from AsyncStorage
    try {
      const storedSettings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) {
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...JSON.parse(storedSettings),
          isProEnabled: this.settings.isProEnabled, // Preserve Pro status
        };
      }
    } catch (error) {
      console.error('AppSettingsService: Error loading settings', error);
    }

    return this.settings;
  }

  /**
   * Get all settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Get a specific setting
   */
  getSetting(key) {
    return this.settings[key];
  }

  /**
   * Set a specific setting
   */
  async setSetting(key, value) {
    this.settings[key] = value;
    await this.syncSettings();
    return this.settings;
  }

  /**
   * Set multiple settings
   */
  async setSettings(updates) {
    this.settings = {
      ...this.settings,
      ...updates,
    };
    await this.syncSettings();
    return this.settings;
  }

  /**
   * Sync settings to AsyncStorage with debounce
   */
  async syncSettings() {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.SETTINGS,
          JSON.stringify(this.settings)
        );
      } catch (error) {
        console.error('AppSettingsService: Error syncing settings', error);
      }
    }, 1000); // 1 second debounce
  }

  /**
   * Pro feature checks
   */
  get isProUser() {
    return this.settings.isProEnabled;
  }

  async enablePro() {
    await SecureStore.setItemAsync(STORAGE_KEYS.PRO_ENABLED, 'true');
    this.settings.isProEnabled = true;
    await this.syncSettings();
  }

  async disablePro() {
    await SecureStore.setItemAsync(STORAGE_KEYS.PRO_ENABLED, 'false');
    this.settings.isProEnabled = false;
    await this.syncSettings();
  }

  /**
   * Get limits for current tier
   */
  getLimits() {
    return this.isProUser ? PRO_LIMITS.PRO : PRO_LIMITS.FREE;
  }

  /**
   * Check if action is allowed based on Pro status
   */
  canAccessProFeature(feature) {
    if (this.isProUser) {
      return true;
    }

    const limits = PRO_LIMITS.FREE;
    return limits[feature] === true || limits[feature] === Infinity;
  }

  /**
   * Check if user can add more family members
   */
  canAddFamilyMember(currentCount) {
    if (this.isProUser) {
      return true;
    }
    return currentCount < PRO_LIMITS.FREE.familyMembers;
  }

  /**
   * Check if user can add more shared calendars
   */
  canAddSharedCalendar(currentCount) {
    if (this.isProUser) {
      return true;
    }
    return currentCount < PRO_LIMITS.FREE.sharedCalendars;
  }

  /**
   * Check if user can upload attachments
   */
  canUploadAttachments() {
    return this.isProUser;
  }

  /**
   * Check if user can use widgets
   */
  canUseWidgets() {
    return this.isProUser;
  }

  /**
   * Check if user can use saved places
   */
  canUseSavedPlaces() {
    return this.isProUser;
  }

  /**
   * Check if user can use drivers
   */
  canUseDrivers() {
    return this.isProUser;
  }

  /**
   * Check if user can add spotlight events
   */
  canAddSpotlightEvent(currentCount) {
    if (this.isProUser) {
      return true;
    }
    return currentCount < PRO_LIMITS.FREE.spotlightEvents;
  }

  /**
   * Check if user can use theme
   */
  canUseTheme(theme) {
    if (this.isProUser) {
      return true;
    }
    return PRO_LIMITS.FREE.themes.includes(theme);
  }

  /**
   * Spotlight events management
   */
  async addSpotlightEvent(eventId) {
    const currentIds = this.settings.spotlightEventIds || [];
    if (!currentIds.includes(eventId)) {
      if (this.canAddSpotlightEvent(currentIds.length)) {
        this.settings.spotlightEventIds = [...currentIds, eventId];
        await this.syncSettings();
      }
    }
  }

  async removeSpotlightEvent(eventId) {
    this.settings.spotlightEventIds = (this.settings.spotlightEventIds || []).filter(
      id => id !== eventId
    );
    await this.syncSettings();
  }

  /**
   * Saved places management (Pro feature)
   */
  async addSavedPlace(place) {
    if (!this.isProUser) {
      return { success: false, error: 'Pro feature' };
    }

    const places = this.settings.savedPlaces || [];
    const newPlace = {
      id: place.id || Date.now().toString(),
      ...place,
    };
    this.settings.savedPlaces = [...places, newPlace];
    await this.syncSettings();

    return { success: true, place: newPlace };
  }

  async removeSavedPlace(placeId) {
    this.settings.savedPlaces = (this.settings.savedPlaces || []).filter(
      place => place.id !== placeId
    );
    await this.syncSettings();
  }

  /**
   * Drivers management (Pro feature)
   */
  async addDriver(driver) {
    if (!this.isProUser) {
      return { success: false, error: 'Pro feature' };
    }

    const drivers = this.settings.drivers || [];
    const newDriver = {
      id: driver.id || Date.now().toString(),
      ...driver,
    };
    this.settings.drivers = [...drivers, newDriver];
    await this.syncSettings();

    return { success: true, driver: newDriver };
  }

  async removeDriver(driverId) {
    this.settings.drivers = (this.settings.drivers || []).filter(
      driver => driver.id !== driverId
    );
    await this.syncSettings();
  }

  /**
   * Reset all settings to defaults
   */
  async resetSettings() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.settings.isProEnabled = this.settings.isProEnabled; // Preserve Pro status
    await this.syncSettings();
  }
}

// Export singleton instance
export default AppSettingsService.getInstance();
