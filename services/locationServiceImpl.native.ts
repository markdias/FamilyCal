/**
 * Native Location Service Implementation
 * Uses Expo Location for current position and Google Geocoding API for address lookup
 */

import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '@/lib/googleMapsConfig';
import type { LocationResult } from './locationService.types';

const GEOCODING_API_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';
const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

/**
 * Search for locations using Google Places Autocomplete API
 */
export async function searchLocations(query: string): Promise<LocationResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('[LocationService Native] API key not configured');
    return [];
  }

  try {
    const url = `${PLACES_API_BASE}?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&types=geocode|establishment`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.predictions) {
      return data.predictions.map((prediction: any) => ({
        address: prediction.description,
        title: prediction.structured_formatting?.main_text || '',
        latitude: 0, // Will be populated when selected
        longitude: 0,
        placeId: prediction.place_id,
      }));
    } else {
      console.warn('[LocationService Native] Autocomplete error:', data.status);
      return [];
    }
  } catch (error) {
    console.error('[LocationService Native] Search error:', error);
    return [];
  }
}

/**
 * Reverse geocode coordinates to an address using Google Geocoding API
 */
export async function reverseGeocode(lat: number, lon: number): Promise<LocationResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('[LocationService Native] API key not configured');
    return null;
  }

  try {
    const url = `${GEOCODING_API_BASE}?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        address: result.formatted_address,
        latitude: lat,
        longitude: lon,
        placeId: result.place_id,
      };
    } else {
      console.warn('[LocationService Native] Geocoding error:', data.status);
      return null;
    }
  } catch (error) {
    console.error('[LocationService Native] Reverse geocode error:', error);
    return null;
  }
}

/**
 * Get current location using Expo Location
 */
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('[LocationService Native] Location permission denied');
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('[LocationService Native] Get location error:', error);
    return null;
  }
}

/**
 * Get current location with address
 */
export async function getCurrentLocationWithAddress(): Promise<LocationResult | null> {
  const coords = await getCurrentLocation();
  
  if (!coords) {
    return null;
  }
  
  return reverseGeocode(coords.latitude, coords.longitude);
}
