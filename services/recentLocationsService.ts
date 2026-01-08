/**
 * Recent Locations Service
 * 
 * Manages tracking and retrieval of recently used locations.
 * Recent locations are automatically tracked when users select a location for an event.
 * Limited to the most recent 10 locations per family.
 */

import { supabase } from '@/lib/supabase';
import { MAX_RECENT_LOCATIONS } from '@/lib/googleMapsConfig';

export interface RecentLocation {
  id: string;
  family_id: string;
  address: string;
  latitude: number;
  longitude: number;
  place_id: string | null;
  last_used_at: string;
  use_count: number;
  created_at: string;
}

/**
 * Get recent locations for a family
 * Returns up to MAX_RECENT_LOCATIONS most recently used locations
 */
export async function getRecentLocations(
  familyId: string
): Promise<{ data: RecentLocation[] | null; error: any }> {
  const { data, error } = await supabase
    .from('recent_locations')
    .select('*')
    .eq('family_id', familyId)
    .order('last_used_at', { ascending: false })
    .limit(MAX_RECENT_LOCATIONS);

  return { data, error };
}

/**
 * Track a location usage
 * If the location already exists, update the last_used_at and increment use_count
 * Otherwise, create a new recent location entry
 */
export async function trackLocationUsage(
  familyId: string,
  location: {
    address: string;
    latitude: number;
    longitude: number;
    placeId?: string;
  }
): Promise<{ error: any }> {
  try {
    // Check if this location already exists
    const { data: existing, error: checkError } = await supabase
      .from('recent_locations')
      .select('*')
      .eq('family_id', familyId)
      .eq('address', location.address)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected
      return { error: checkError };
    }

    if (existing) {
      // Update existing location
      const { error: updateError } = await supabase
        .from('recent_locations')
        .update({
          last_used_at: new Date().toISOString(),
          use_count: existing.use_count + 1,
          latitude: location.latitude,
          longitude: location.longitude,
          place_id: location.placeId || existing.place_id,
        })
        .eq('id', existing.id);

      return { error: updateError };
    } else {
      // Create new recent location
      const { error: insertError } = await supabase
        .from('recent_locations')
        .insert({
          family_id: familyId,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          place_id: location.placeId || null,
          last_used_at: new Date().toISOString(),
          use_count: 1,
        });

      if (insertError) {
        return { error: insertError };
      }

      // Clean up old entries if we exceed MAX_RECENT_LOCATIONS
      await cleanupOldRecentLocations(familyId);

      return { error: null };
    }
  } catch (error) {
    console.error('[recentLocationsService] Error tracking location:', error);
    return { error };
  }
}

/**
 * Clean up old recent locations to keep only MAX_RECENT_LOCATIONS
 */
async function cleanupOldRecentLocations(familyId: string): Promise<void> {
  try {
    // Get all recent locations for this family, ordered by last_used_at
    const { data, error } = await supabase
      .from('recent_locations')
      .select('id')
      .eq('family_id', familyId)
      .order('last_used_at', { ascending: false });

    if (error || !data) {
      return;
    }

    // If we have more than MAX_RECENT_LOCATIONS, delete the oldest ones
    if (data.length > MAX_RECENT_LOCATIONS) {
      const idsToDelete = data.slice(MAX_RECENT_LOCATIONS).map((loc) => loc.id);

      await supabase
        .from('recent_locations')
        .delete()
        .in('id', idsToDelete);
    }
  } catch (error) {
    console.error('[recentLocationsService] Error cleaning up old locations:', error);
  }
}

/**
 * Delete a specific recent location
 */
export async function deleteRecentLocation(
  locationId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('recent_locations')
    .delete()
    .eq('id', locationId);

  return { error };
}

/**
 * Clear all recent locations for a family
 */
export async function clearRecentLocations(
  familyId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('recent_locations')
    .delete()
    .eq('family_id', familyId);

  return { error };
}
