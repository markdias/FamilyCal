import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// Check if we're in a browser environment (not SSR)
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Secure storage adapter for Supabase auth tokens
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      // Use localStorage for web (only in browser, not SSR)
      if (isBrowser) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (isBrowser) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (isBrowser) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key not found. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Enable for web OAuth
  },
});

// Database types based on familycal.sql schema
export interface Family {
  id: string;
  name: string;
  family_name: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  family_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  contact_type: 'family_member' | 'external_driver' | 'emergency_contact' | 'other';
  relationship: string | null;
  is_virtual: boolean;
  date_of_birth: string | null;
  avatar_url: string | null;
  notes: string | null;
  color: string | null;
  invitation_sent: boolean;
  invitation_sent_at: string | null;
  invitation_accepted_at: string | null;
  routines_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  contact_id: string;
  role: 'owner' | 'admin' | 'member' | null;
  joined_at: string;
  added_by: string | null;
  contact?: Contact;
}

export interface FamilyInvitation {
  id: string;
  family_id: string;
  contact_id: string | null;
  invited_by: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'member';
  invitation_token: string;
  invitation_message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventCategory {
  id: string;
  family_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Event {
  id: string;
  family_id: string;
  category_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  notes: string | null;
  location: string | null;
  structured_location_title: string | null;
  structured_location_address: string | null;
  structured_location_latitude: number | null;
  structured_location_longitude: number | null;
  structured_location_radius: number | null;
  url: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  timezone: string;
  travel_time: number | null;
  start_location_title: string | null;
  start_location_address: string | null;
  start_location_latitude: number | null;
  start_location_longitude: number | null;
  availability: 'busy' | 'free' | 'tentative' | 'unavailable';
  status: 'confirmed' | 'tentative' | 'cancelled';
  drop_off_driver_id: string | null;
  collection_driver_id: string | null;
  same_driver: boolean;
  is_recurring: boolean;
  recurrence_rule: string | null;
  recurrence_frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  recurrence_interval: number;
  recurrence_days_of_week: string[] | null;
  recurrence_days_of_month: number[] | null;
  recurrence_months_of_year: number[] | null;
  recurrence_weeks_of_year: number[] | null;
  recurrence_days_of_year: number[] | null;
  recurrence_set_positions: number[] | null;
  recurrence_count: number | null;
  recurrence_end_date: string | null;
  recurrence_week_start: string;
  created_at: string;
  updated_at: string;
  category?: EventCategory;
  participants?: EventParticipant[];
}

export interface EventParticipant {
  id: string;
  event_id: string;
  contact_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'maybe';
  is_organizer: boolean;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
  contact?: Contact;
}

export interface EventReminder {
  id: string;
  event_id: string;
  user_id: string;
  reminder_type: 'minutes' | 'hours' | 'days' | 'weeks';
  reminder_value: number;
  notification_method: 'push' | 'email' | 'both';
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface EventException {
  id: string;
  event_id: string;
  exception_date: string;
  is_deleted: boolean;
  title: string | null;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  upcoming_events_card_view: boolean;
  events_per_person?: number;
  default_screen?: 'family' | 'calendar';
  auto_refresh_minutes?: number | null;
  default_maps_app?: 'apple' | 'google' | 'waze';
  appearance?: 'light' | 'dark' | 'system';
  family_calendar_color?: string;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  family_id: string;
  contact_id: string | null;
  title: string;
  description: string | null;
  icon: string | null;
  cover_url?: string | null;
  avatar_url?: string | null;
  sort_order?: number;
  day_type: 'everyday' | 'weekday' | 'weekend';
  start_time?: string | null;
  end_time?: string | null;
  created_at: string;
  updated_at: string;
  items?: RoutineItem[];
}

export interface RoutineItem {
  id: string;
  routine_id: string;
  title: string;
  description: string | null;
  cover_url?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  completions?: RoutineCompletion[];
}

export interface RoutineCompletion {
  id: string;
  item_id: string;
  contact_id: string;
  completed_at: string;
  completion_date: string;
  created_at: string;
}
