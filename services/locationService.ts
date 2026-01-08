/**
 * Location Service - Platform-agnostic API
 * 
 * Automatically imports the correct implementation based on platform:
 * - Web: Uses Google Places API (JavaScript)
 * - Native: Uses Expo Location + Google Geocoding API
 */

// Re-export types
export type { LocationResult, LocationServiceInterface } from './locationService.types';

// Import and re-export platform-specific implementation
// Metro bundler will automatically resolve to .web.ts or .native.ts based on platform
export {
  searchLocations,
  reverseGeocode,
  getCurrentLocation,
  getCurrentLocationWithAddress,
} from './locationServiceImpl';
