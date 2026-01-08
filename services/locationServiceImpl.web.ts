/**
 * Web Location Service Implementation
 * Uses Google Places API (JavaScript) for autocomplete and geocoding
 */

import { GOOGLE_MAPS_API_KEY } from '@/lib/googleMapsConfig';
import type { LocationResult } from './locationService.types';

// Type definitions for Google Maps API
declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          AutocompleteService: any;
          PlacesService: any;
        };
        Geocoder: any;
        LatLng: any;
      };
    };
  }
}

let isScriptLoaded = false;
let scriptLoadPromise: Promise<void> | null = null;

/**
 * Load the Google Maps JavaScript API
 * Uses callback method to ensure places library is fully loaded
 */
function loadGoogleMapsScript(): Promise<void> {
  if (isScriptLoaded && window.google?.maps?.places) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      isScriptLoaded = true;
      resolve();
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error('Google Maps API key is not configured'));
      return;
    }

    // Create a global callback function that Google Maps will call when loaded
    const callbackName = 'initGoogleMaps_' + Date.now();
    (window as any)[callbackName] = () => {
      isScriptLoaded = true;
      delete (window as any)[callbackName]; // Clean up
      resolve();
    };

    const script = document.createElement('script');
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=${callbackName}`;
    
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('[LocationService Web] Failed to load Google Maps script');
      delete (window as any)[callbackName]; // Clean up
      reject(new Error('Failed to load Google Maps script'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/**
 * Search for locations using Google Places Autocomplete
 * Uses the modern AutocompleteSuggestion API (recommended as of March 2025)
 */
export async function searchLocations(query: string): Promise<LocationResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    await loadGoogleMapsScript();

    // Verify that the places library is loaded
    if (!window.google?.maps?.places) {
      console.error('[LocationService Web] Places library not available after script load');
      return [];
    }

    // Use the AutocompleteService API
    return new Promise((resolve) => {
      const service = new window.google!.maps.places.AutocompleteService();
      
      service.getPlacePredictions(
        { 
          input: query,
          types: ['geocode', 'establishment']
        },
        (predictions: any[], status: string) => {
          if (status === 'OK' && predictions) {
            const results: LocationResult[] = predictions.map((prediction: any) => ({
              address: prediction.description,
              title: prediction.structured_formatting?.main_text || '',
              latitude: 0, // Will be populated when selected
              longitude: 0,
              placeId: prediction.place_id,
            }));
            resolve(results);
          } else if (status === 'ZERO_RESULTS') {
            resolve([]);
          } else {
            console.warn('[LocationService Web] Autocomplete error:', status);
            resolve([]);
          }
        }
      );
    });
  } catch (error) {
    console.error('[LocationService Web] Search error:', error);
    return [];
  }
}

/**
 * Reverse geocode coordinates to an address
 */
export async function reverseGeocode(lat: number, lon: number): Promise<LocationResult | null> {
  try {
    await loadGoogleMapsScript();

    return new Promise((resolve) => {
      const geocoder = new window.google!.maps.Geocoder();
      const latLng = new window.google!.maps.LatLng(lat, lon);

      geocoder.geocode({ location: latLng }, (results: any[], status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          const result = results[0];
          resolve({
            address: result.formatted_address,
            latitude: lat,
            longitude: lon,
            placeId: result.place_id,
          });
        } else {
          console.warn('[LocationService Web] Geocoding error:', status);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('[LocationService Web] Reverse geocode error:', error);
    return null;
  }
}

/**
 * Get current location using browser Geolocation API
 */
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) {
    console.warn('[LocationService Web] Geolocation not supported');
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('[LocationService Web] Geolocation error:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
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
