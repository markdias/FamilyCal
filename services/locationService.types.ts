/**
 * Location service types shared across all platforms
 */

/**
 * Represents a location result from autocomplete or geocoding
 */
export interface LocationResult {
  /** Full formatted address */
  address: string;
  /** Optional custom title (e.g., "Home", "School") */
  title?: string;
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Google Place ID (optional, for future reference) */
  placeId?: string;
}

/**
 * Interface for location service implementations
 */
export interface LocationServiceInterface {
  /**
   * Search for locations based on a query string
   * @param query The search query (partial address)
   * @returns Array of matching location results
   */
  searchLocations(query: string): Promise<LocationResult[]>;

  /**
   * Reverse geocode coordinates to an address
   * @param lat Latitude
   * @param lon Longitude
   * @returns Location result with address, or null if geocoding fails
   */
  reverseGeocode(lat: number, lon: number): Promise<LocationResult | null>;

  /**
   * Get the user's current location coordinates
   * @returns Current latitude and longitude, or null if unavailable
   */
  getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null>;
}
