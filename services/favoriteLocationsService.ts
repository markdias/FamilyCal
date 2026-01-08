/**
 * Favorite Locations Service
 * 
 * Manages CRUD operations for favorite locations stored in the database.
 * Favorite locations are saved per family and shared across all family members.
 */

import { supabase } from '@/lib/supabase';

export interface FavoriteLocation {
  id: string;
  family_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  place_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateFavoriteLocationInput = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
};

export type UpdateFavoriteLocationInput = {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string | null;
};

/**
 * Get all favorite locations for a family
 */
export async function getFavoriteLocations(
  familyId: string
): Promise<{ data: FavoriteLocation[] | null; error: any }> {
  const { data, error } = await supabase
    .from('favorite_locations')
    .select('*')
    .eq('family_id', familyId)
    .order('name');

  return { data, error };
}

/**
 * Get a single favorite location by ID
 */
export async function getFavoriteLocation(
  locationId: string
): Promise<{ data: FavoriteLocation | null; error: any }> {
  const { data, error } = await supabase
    .from('favorite_locations')
    .select('*')
    .eq('id', locationId)
    .single();

  return { data, error };
}

/**
 * Create a new favorite location
 */
export async function createFavoriteLocation(
  familyId: string,
  location: CreateFavoriteLocationInput
): Promise<{ data: FavoriteLocation | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('favorite_locations')
    .insert({
      family_id: familyId,
      created_by: user.id,
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      place_id: location.placeId || null,
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Update an existing favorite location
 */
export async function updateFavoriteLocation(
  locationId: string,
  updates: UpdateFavoriteLocationInput
): Promise<{ data: FavoriteLocation | null; error: any }> {
  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.address !== undefined) updateData.address = updates.address;
  if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
  if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
  if (updates.placeId !== undefined) updateData.place_id = updates.placeId;

  const { data, error } = await supabase
    .from('favorite_locations')
    .update(updateData)
    .eq('id', locationId)
    .select()
    .single();

  return { data, error };
}

/**
 * Delete a favorite location
 */
export async function deleteFavoriteLocation(
  locationId: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('favorite_locations')
    .delete()
    .eq('id', locationId);

  return { error };
}

/**
 * Check if a location name already exists for a family
 */
export async function favoriteLocationNameExists(
  familyId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from('favorite_locations')
    .select('id')
    .eq('family_id', familyId)
    .ilike('name', name);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[favoriteLocationsService] Error checking name:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Search favorite locations by name or address
 */
export async function searchFavoriteLocations(
  familyId: string,
  query: string
): Promise<{ data: FavoriteLocation[] | null; error: any }> {
  const { data, error } = await supabase
    .from('favorite_locations')
    .select('*')
    .eq('family_id', familyId)
    .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
    .order('name');

  return { data, error };
}
