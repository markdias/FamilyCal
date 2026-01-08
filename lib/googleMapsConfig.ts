/**
 * Google Maps Platform Configuration
 * 
 * Manages API key configuration for Google Maps services across platforms.
 * Supports Places API, Geocoding API, and Maps JavaScript API.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get the Google Maps API key from Expo config
 * The key is stored in app.json under extra.googleMapsApiKey
 * Try multiple sources for compatibility across different Expo versions and platforms
 */
export const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.extra?.googleMapsApiKey ||
  Constants.manifest?.extra?.googleMapsApiKey ||
  Constants.manifest2?.extra?.expoClient?.extra?.googleMapsApiKey ||
  // API key must be configured in app.json or environment variables
  null;

// Validate API key on load
if (!GOOGLE_MAPS_API_KEY) {
  console.error('[GoogleMaps Config] API key not configured. Location services will not work.');
}

/**
 * Validate that the API key is configured
 */
export function validateApiKey(): boolean {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === '') {
    console.error(
      '[GoogleMaps] API key not configured. Please set googleMapsApiKey in app.json under extra field or use environment variables.'
    );
    return false;
  }
  return true;
}

/**
 * Get the base URL for Google Maps Platform REST APIs
 */
export const GOOGLE_MAPS_API_BASE_URL = 'https://maps.googleapis.com/maps/api';

/**
 * Geocoding API endpoint
 */
export const GEOCODING_API_URL = `${GOOGLE_MAPS_API_BASE_URL}/geocode/json`;

/**
 * Place Autocomplete API endpoint
 */
export const PLACE_AUTOCOMPLETE_API_URL = `${GOOGLE_MAPS_API_BASE_URL}/place/autocomplete/json`;

/**
 * Place Details API endpoint
 */
export const PLACE_DETAILS_API_URL = `${GOOGLE_MAPS_API_BASE_URL}/place/details/json`;

/**
 * Configuration for Google Maps JavaScript API loader (web only)
 */
export const GOOGLE_MAPS_JS_CONFIG = {
  apiKey: GOOGLE_MAPS_API_KEY,
  version: 'weekly',
  libraries: ['places', 'geocoding'] as const,
};

/**
 * Platform-specific configuration
 */
export const platformConfig = {
  // Web: Uses Google Maps JavaScript API
  web: {
    useJavaScriptAPI: true,
    libraries: ['places', 'geocoding'],
  },
  // Native: Uses REST APIs with expo-location for current location
  native: {
    useRestAPI: true,
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  },
};

/**
 * Get platform-specific configuration
 */
export function getPlatformConfig() {
  return Platform.OS === 'web' ? platformConfig.web : platformConfig.native;
}

/**
 * Debounce delay for autocomplete requests (in milliseconds)
 * This helps reduce API costs by limiting the number of requests
 */
export const AUTOCOMPLETE_DEBOUNCE_MS = 300;

/**
 * Maximum number of autocomplete results to return
 */
export const MAX_AUTOCOMPLETE_RESULTS = 5;

/**
 * Maximum number of recent locations to track
 */
export const MAX_RECENT_LOCATIONS = 10;
