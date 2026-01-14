import { Contact, EventParticipant, supabase } from '@/lib/supabase';
import { getUserContactForFamily } from '@/services/contactService';
import { EventWithDetails, getEventsForDateRange, getEventsForMonth, getTodayEvents, getUpcomingEvents } from '@/services/eventService';
import { getPersonalCalendarEventsForUser, PersonalCalendarEvent } from '@/services/personalCalendarService';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAppSettings } from './AppSettingsContext';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';

interface CacheEntry {
  events: EventWithDetails[];
  lastFetched: number; // timestamp
  isLoading: boolean;
}

interface EventCacheContextType {
  // Get events for a cache key (read-only, doesn't trigger fetches)
  getEvents: (key: string) => EventWithDetails[];

  // Ensure events are fetched for a key (call in useEffect, not render)
  ensureEventsFetched: (key: string, forceRefresh?: boolean) => void;

  // Check if a cache key is loading
  isLoading: (key: string) => boolean;

  // Invalidate cache entries
  invalidateCache: (keys?: string[], deletedEventId?: string) => void;

  // Force refresh a cache key
  refreshCache: (key: string) => Promise<void>;

  // Get cache entry directly (for advanced usage)
  getCacheEntry: (key: string) => CacheEntry | undefined;

  // Get cache statistics (for debugging)
  getCacheStats: () => { totalEntries: number; totalEvents: number; cacheSize: string };
}

const EventCacheContext = createContext<EventCacheContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'familycal_event_cache_v1_';
const MAX_CACHE_AGE_DAYS = 180; // Keep last 6 months for better performance

// Helper to get storage key for a family
function getStorageKey(familyId: string): string {
  return `${STORAGE_KEY_PREFIX}${familyId}`;
}

// Helper to serialize cache for storage
function serializeCache(cache: { [key: string]: CacheEntry }): string {
  return JSON.stringify(cache);
}

// Helper to deserialize cache from storage
function deserializeCache(raw: string): { [key: string]: CacheEntry } {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Standardized cache key generators
export function getMonthCacheKey(year: number, month: number): string {
  return `month:${year}-${month.toString().padStart(2, '0')}`;
}

export function getDayCacheKey(year: number, month: number, day: number): string {
  return `day:${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// Helper to determine which cache keys need invalidation based on event date
function getCacheKeysForEvent(eventDate: Date): string[] {
  const keys: string[] = ['today', 'upcoming'];

  const year = eventDate.getFullYear();
  const month = eventDate.getMonth() + 1;
  const day = eventDate.getDate();

  keys.push(getMonthCacheKey(year, month));
  keys.push(getDayCacheKey(year, month, day));

  return keys;
}

// Helper to clean old cache entries
function cleanOldCacheEntries(cache: { [key: string]: CacheEntry }): { [key: string]: CacheEntry } {
  const now = Date.now();
  const maxAge = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;
  const cleaned: { [key: string]: CacheEntry } = {};

  for (const [key, entry] of Object.entries(cache)) {
    if (now - entry.lastFetched < maxAge) {
      cleaned[key] = entry;
    }
  }

  return cleaned;
}

// Helper to trim cache to fit within size limit
function trimCacheForStorage(cache: { [key: string]: CacheEntry }, maxSizeBytes: number): { [key: string]: CacheEntry } {
  // Sort entries by lastFetched (oldest first) and event count (most events first)
  const entries = Object.entries(cache).sort((a, b) => {
    const [keyA, entryA] = a;
    const [keyB, entryB] = b;
    // Prioritize removing entries with more events or older entries
    if (entryA.events.length !== entryB.events.length) {
      return entryB.events.length - entryA.events.length;
    }
    return entryA.lastFetched - entryB.lastFetched;
  });

  const trimmed: { [key: string]: CacheEntry } = {};

  for (const [key, entry] of entries) {
    trimmed[key] = entry;
    const testRaw = serializeCache(trimmed);
    const testSize = testRaw.length; // Use string length as estimate

    if (testSize > maxSizeBytes) {
      // Remove the last added entry if it exceeds the limit
      delete trimmed[key];
      break;
    }
  }

  return trimmed;
}

// Helper to convert PersonalCalendarEvent to EventWithDetails format
async function convertPersonalCalendarEventToEventWithDetails(
  personalEvent: PersonalCalendarEvent,
  userId: string,
  familyId: string,
  calendarColor: string
): Promise<EventWithDetails> {
  // Get user's contact for this family
  const { data: userContact } = await getUserContactForFamily(userId, familyId);

  // Create participant entry for the user
  const participants: (EventParticipant & { contact: Contact })[] = [];
  if (userContact) {
    // Create a participant with the calendar color temporarily stored in the contact
    // We'll create a modified contact object with the calendar color for this event
    const contactWithCalendarColor: Contact = {
      ...userContact,
      color: calendarColor, // Use the iOS calendar color
    };

    participants.push({
      id: `temp-${personalEvent.id}`,
      event_id: `personal-${personalEvent.calendarId}-${personalEvent.id}`,
      contact_id: userContact.id,
      status: 'accepted',
      is_organizer: true,
      notifications_enabled: true,
      created_at: personalEvent.startDate.toISOString(),
      updated_at: personalEvent.startDate.toISOString(),
      contact: contactWithCalendarColor,
    });
  }

  return {
    id: `personal-${personalEvent.calendarId}-${personalEvent.id}`,
    family_id: familyId,
    category_id: null,
    created_by: userId,
    title: personalEvent.title,
    description: null,
    notes: personalEvent.notes || null,
    location: personalEvent.location || null,
    structured_location_title: null,
    structured_location_address: null,
    structured_location_latitude: null,
    structured_location_longitude: null,
    structured_location_radius: null,
    url: null,
    start_time: personalEvent.startDate.toISOString(),
    end_time: personalEvent.endDate.toISOString(),
    is_all_day: personalEvent.allDay,
    timezone: 'UTC',
    travel_time: null,
    start_location_title: null,
    start_location_address: null,
    start_location_latitude: null,
    start_location_longitude: null,
    availability: 'busy',
    status: 'confirmed',
    drop_off_driver_id: null,
    collection_driver_id: null,
    same_driver: false,
    is_recurring: false,
    recurrence_rule: null,
    recurrence_frequency: null,
    recurrence_interval: 1,
    recurrence_days_of_week: null,
    recurrence_days_of_month: null,
    recurrence_months_of_year: null,
    recurrence_weeks_of_year: null,
    recurrence_days_of_year: null,
    recurrence_set_positions: null,
    recurrence_count: null,
    recurrence_end_date: null,
    recurrence_week_start: 'MO',
    created_at: personalEvent.startDate.toISOString(),
    updated_at: personalEvent.startDate.toISOString(),
    category: undefined,
    participants: participants,
    // Mark as personal calendar event for identification
    original_event_id: `personal-${personalEvent.calendarId}-${personalEvent.id}`,
  } as EventWithDetails;
}

export function EventCacheProvider({ children }: { children: ReactNode }) {
  const { currentFamily } = useFamily();
  const { settings } = useAppSettings();
  const { user } = useAuth();
  const [cache, setCache] = useState<{ [key: string]: CacheEntry }>({});
  const cacheRef = useRef<{ [key: string]: CacheEntry }>({}); // Keep ref in sync with state
  const realtimeSubscriptionRef = useRef<any>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingRef = useRef<Set<string>>(new Set()); // Track keys currently being fetched
  const fetchStartTimeRef = useRef<{ [key: string]: number }>({}); // Track when fetches started
  const cacheLoadedRef = useRef<boolean>(false); // Track if cache has been loaded from storage

  // Keep ref in sync with state
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  // Load cache from storage on mount and when family changes
  useEffect(() => {
    if (!currentFamily) {
      setCache({});
      cacheLoadedRef.current = false;
      return;
    }

    async function loadCache() {
      if (!currentFamily) return;
      try {
        const storageKey = getStorageKey(currentFamily.id);
        let raw: string | null = null;

        if (Platform.OS === 'web') {
          raw = window.localStorage.getItem(storageKey);
        } else {
          raw = await SecureStore.getItemAsync(storageKey);
        }

        if (raw) {
          const loaded = deserializeCache(raw);
          const cleaned = cleanOldCacheEntries(loaded);
          // Reset isLoading to false for all entries loaded from storage
          // (they can't be loading since we just loaded them from storage)
          // Also clear fetchingRef and fetchStartTimeRef for any keys that were supposedly loading
          const resetLoading = Object.entries(cleaned).reduce((acc, [key, entry]) => {
            // Clear from fetchingRef since storage load means any previous fetch is stale
            fetchingRef.current.delete(key);
            delete fetchStartTimeRef.current[key];
            acc[key] = {
              ...entry,
              isLoading: false,
            };
            return acc;
          }, {} as { [key: string]: CacheEntry });
          setCache(resetLoading);
          // Update ref immediately
          cacheRef.current = resetLoading;

          // Save cleaned cache back (with isLoading reset)
          const cleanedRaw = serializeCache(resetLoading);
          if (Platform.OS === 'web') {
            window.localStorage.setItem(storageKey, cleanedRaw);
          } else {
            await SecureStore.setItemAsync(storageKey, cleanedRaw);
          }
        }
      } catch (err) {
        console.warn('Failed to load event cache:', err);
      } finally {
        // Mark cache as loaded so auto-fetch can proceed
        cacheLoadedRef.current = true;
      }
    }

    loadCache();
  }, [currentFamily?.id]);

  // Save cache to storage whenever it changes
  useEffect(() => {
    if (!currentFamily || Object.keys(cache).length === 0) {
      return;
    }

    async function saveCache() {
      if (!currentFamily) return;
      try {
        const storageKey = getStorageKey(currentFamily.id);
        // Remove isLoading from entries before saving (it's a runtime state, not persisted)
        const cacheToSave = Object.entries(cache).reduce((acc, [key, entry]) => {
          acc[key] = {
            events: entry.events,
            lastFetched: entry.lastFetched,
            isLoading: false, // Always save as false
          };
          return acc;
        }, {} as { [key: string]: CacheEntry });
        const raw = serializeCache(cacheToSave);

        // Check size before saving (SecureStore has around 2MB limit on iOS, smaller on Android)
        // Use string length as approximation
        const estimatedSize = raw.length;
        // Increase limit to 200KB to allow for more events while still being safe
        const MAX_SIZE = 200000;

        if (Platform.OS === 'web') {
          window.localStorage.setItem(storageKey, raw);
        } else {
          if (estimatedSize > MAX_SIZE) {
            console.warn(`[EventCache] Cache too large (estimated ${estimatedSize} bytes), trimming to prevent SecureStore error`);
            // Try to save a smaller version by removing older entries
            const trimmedCache = trimCacheForStorage(cacheToSave, MAX_SIZE);
            const trimmedRaw = serializeCache(trimmedCache);
            await SecureStore.setItemAsync(storageKey, trimmedRaw);
          } else {
            await SecureStore.setItemAsync(storageKey, raw);
          }
        }
      } catch (err) {
        console.warn('Failed to save event cache:', err);
      }
    }

    // Debounce saves to avoid too many writes
    const timeoutId = setTimeout(saveCache, 1000);
    return () => clearTimeout(timeoutId);
  }, [cache, currentFamily?.id]);

  // Fetch events for a specific cache key
  const fetchEventsForKey = useCallback(async (key: string, forceRefresh = false) => {
    if (!currentFamily) {
      console.log(`[EventCache] fetchEventsForKey(${key}): No currentFamily, skipping`);
      return;
    }

    // Synchronous check if already fetching this key
    if (fetchingRef.current.has(key)) {
      if (forceRefresh) {
        // Clear the existing fetch so we can start fresh
        fetchingRef.current.delete(key);
        delete fetchStartTimeRef.current[key];
      } else {
        // Already fetching, skip
        return;
      }
    }

    // Immediately mark as fetching before any async operations
    fetchingRef.current.add(key);
    fetchStartTimeRef.current[key] = Date.now();

    // Update cache to show loading state
    setCache(prev => {
      const entry = prev[key];
      return {
        ...prev,
        [key]: {
          ...(entry || { events: [], lastFetched: 0 }),
          isLoading: true,
        },
      };
    });

    try {
      let events: EventWithDetails[] = [];
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      if (key === 'today') {
        const today = new Date();
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const result = await getTodayEvents(currentFamily.id);
        if (result.error) {
          console.error(`[EventCache] Error fetching today events:`, result.error);
        } else {
          events = result.data || [];
          console.log(`[EventCache] Got ${events.length} events for ${key}`);
        }
      } else if (key === 'upcoming') {
        startDate = new Date();
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 6);
        // Don't pass a limit - we want ALL upcoming events, not just 200
        const result = await getUpcomingEvents(currentFamily.id);
        if (result.error) {
          console.error(`[EventCache] Error fetching upcoming events:`, result.error);
        } else {
          events = result.data || [];
          console.log(`[EventCache] Got ${events.length} events for ${key}`);
        }
      } else if (key.startsWith('month:')) {
        const [, datePart] = key.split(':');
        const [year, month] = datePart.split('-').map(Number);
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 1);
        const result = await getEventsForMonth(currentFamily.id, year, month);
        if (result.error) {
          console.error(`[EventCache] Error fetching month events:`, result.error);
        } else {
          events = result.data || [];
          console.log(`[EventCache] Got ${events.length} events for ${key}`);
        }
      } else if (key.startsWith('day:')) {
        const [, datePart] = key.split(':');
        const [year, month, day] = datePart.split('-').map(Number);
        startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        // Use start of next day (exclusive) to match getTodayEvents pattern
        endDate = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
        const result = await getEventsForDateRange(currentFamily.id, startDate, endDate);
        if (result.error) {
          console.error(`[EventCache] Error fetching day events:`, result.error);
        } else {
          events = result.data || [];
          console.log(`[EventCache] Got ${events.length} events for ${key}`);
        }
      }

      // On iOS, also fetch personal calendar events
      if (Platform.OS === 'ios' && user && startDate && endDate) {
        try {
          const { data: personalEvents, error: personalError } = await getPersonalCalendarEventsForUser(
            user.id,
            currentFamily.id,
            startDate,
            endDate,
            false // Include all personal calendars (not just family view)
          );

          if (!personalError && personalEvents && personalEvents.length > 0) {
            // Convert personal calendar events to EventWithDetails format
            // This is async, so we need to await all conversions
            const convertedPersonalEvents = await Promise.all(
              personalEvents.map(event =>
                convertPersonalCalendarEventToEventWithDetails(
                  event,
                  user.id,
                  currentFamily.id,
                  event.calendarColor // Pass the iOS calendar color
                )
              )
            );
            // Combine with Supabase events
            events = [...events, ...convertedPersonalEvents];
            console.log(`[EventCache] Added ${personalEvents.length} iOS calendar events to ${key}`);
          } else if (personalError) {
            console.warn(`[EventCache] Error fetching personal calendar events:`, personalError);
          }
        } catch (personalErr) {
          console.warn(`[EventCache] Exception fetching personal calendar events:`, personalErr);
          // Continue with Supabase events even if personal calendar fetch fails
        }
      }
      setCache(prev => ({
        ...prev,
        [key]: {
          events,
          lastFetched: Date.now(),
          isLoading: false,
        },
      }));
      fetchingRef.current.delete(key);
      delete fetchStartTimeRef.current[key]; // Clear fetch start time
    } catch (err) {
      console.error(`[EventCache] Error fetching events for key ${key}:`, err);
      // Keep stale cache if available, but mark as not loading
      setCache(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || { events: [], lastFetched: 0 }),
          isLoading: false,
        },
      }));
      fetchingRef.current.delete(key);
      delete fetchStartTimeRef.current[key]; // Clear fetch start time
    }
  }, [currentFamily, settings.autoRefreshMinutes, user]);

  // Get events for a cache key (read-only, doesn't trigger fetches)
  const getEvents = useCallback((key: string): EventWithDetails[] => {
    const entry = cache[key];
    return entry?.events || [];
  }, [cache]);

  // Ensure events are fetched for a key (call this in useEffect, not in render)
  const ensureEventsFetched = useCallback((key: string, forceRefresh = false) => {
    // Read from ref to avoid dependency on cache state
    const entry = cacheRef.current[key];

    // Detect stuck fetches: if fetch started more than 30 seconds ago and still loading, consider it stuck
    const STUCK_FETCH_TIMEOUT_MS = 30000; // 30 seconds
    const fetchStartTime = fetchStartTimeRef.current[key];
    const isStuck = entry?.isLoading && fetchStartTime && (Date.now() - fetchStartTime) > STUCK_FETCH_TIMEOUT_MS;

    if (isStuck) {
      console.warn(`[EventCache] Detected stuck fetch for ${key} (${Math.round((Date.now() - fetchStartTime) / 1000)}s), resetting`);
      // Clear the stuck state
      fetchingRef.current.delete(key);
      delete fetchStartTimeRef.current[key];
      setCache(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || { events: [], lastFetched: 0 }),
          isLoading: false,
        },
      }));
      // Update ref immediately
      if (cacheRef.current[key]) {
        cacheRef.current[key] = { ...cacheRef.current[key], isLoading: false };
      }
    }

    // Always try to refresh in background if we have any cached data, regardless of staleness
    // This ensures we show cached data immediately and update in background
    if (entry && entry.lastFetched > 0) {
      // We have cached data - trigger background refresh if not already loading
      if (!entry.isLoading && !fetchingRef.current.has(key)) {
        const cacheAge = Date.now() - entry.lastFetched;
        const autoRefreshMs = settings.autoRefreshMinutes ? settings.autoRefreshMinutes * 60 * 1000 : null;

        // Refresh if stale or if it's been more than 5 minutes since last fetch (more aggressive background updates)
        const shouldRefresh = forceRefresh ||
          (autoRefreshMs && cacheAge >= autoRefreshMs) ||
          (cacheAge >= 5 * 60 * 1000); // 5 minutes minimum

        if (shouldRefresh) {
          console.log(`[EventCache] Background refresh for ${key} (age: ${Math.round(cacheAge / 1000 / 60)}min)`);
          fetchEventsForKey(key, false);
        }
      }
      return; // Don't do anything else - we have cached data to show
    }

    // No cached data at all - we need to fetch
    if (!entry?.isLoading && !fetchingRef.current.has(key)) {
      console.log(`[EventCache] Initial fetch for ${key} (no cache)`);
      fetchEventsForKey(key, forceRefresh);
    }
    // No need to log when cache is fresh - this would be too noisy
  }, [fetchEventsForKey, settings.autoRefreshMinutes]);

  // Check if a cache key is loading
  const isLoading = useCallback((key: string): boolean => {
    return cache[key]?.isLoading || false;
  }, [cache]);

  // Invalidate cache entries
  const invalidateCache = useCallback((keys?: string[], deletedEventId?: string) => {
    setCache(prev => {
      const next = { ...prev };

      if (keys) {
        // Invalidate specific keys
        for (const key of keys) {
          delete next[key];
        }
      } else if (!deletedEventId) {
        // Invalidate all cache (only if no specific deletedEventId)
        return {};
      }

      // If an event was deleted, also remove it from all other cache entries
      // (This handles cases where the event date is unknown or it's in multiple keys)
      if (deletedEventId) {
        console.log(`[EventCache] Manually removing deleted event ${deletedEventId} from all cache entries`);
        Object.keys(next).forEach(key => {
          const entry = next[key];
          if (entry && entry.events) {
            const initialCount = entry.events.length;
            entry.events = entry.events.filter(e => e.id !== deletedEventId);
            if (entry.events.length !== initialCount) {
              console.log(`[EventCache] Removed event from key ${key}`);
            }
          }
        });
      }

      return next;
    });
  }, []);

  // Force refresh a cache key
  const refreshCache = useCallback(async (key: string) => {
    await fetchEventsForKey(key, true);
  }, [fetchEventsForKey]);

  // Get cache entry directly
  const getCacheEntry = useCallback((key: string): CacheEntry | undefined => {
    return cache[key];
  }, [cache]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const entries = Object.values(cache);
    const totalEvents = entries.reduce((sum, entry) => sum + entry.events.length, 0);
    const cacheSize = JSON.stringify(cache).length;
    return {
      totalEntries: entries.length,
      totalEvents,
      cacheSize: `${Math.round(cacheSize / 1024)}KB`
    };
  }, [cache]);

  // Set up Supabase realtime subscription
  useEffect(() => {
    if (!currentFamily) {
      // Clean up existing subscription
      if (realtimeSubscriptionRef.current) {
        supabase.removeChannel(realtimeSubscriptionRef.current);
        realtimeSubscriptionRef.current = null;
      }
      return;
    }

    // Subscribe to events table changes
    const channel = supabase
      .channel(`events:${currentFamily.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `family_id=eq.${currentFamily.id}`,
        },
        (payload) => {
          console.log('Event change detected:', payload.eventType, payload.new || payload.old);

          // Determine which cache keys to invalidate
          let keysToInvalidate: string[] = [];

          if (payload.eventType === 'INSERT' && payload.new) {
            const eventDate = new Date((payload.new as any).start_time);
            keysToInvalidate = getCacheKeysForEvent(eventDate);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const newEventDate = new Date((payload.new as any).start_time);
            const oldEventDate = payload.old ? new Date((payload.old as any).start_time) : newEventDate;

            // Invalidate both old and new dates
            keysToInvalidate = [
              ...getCacheKeysForEvent(newEventDate),
              ...getCacheKeysForEvent(oldEventDate),
            ];
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const eventDate = payload.old.start_time ? new Date((payload.old as any).start_time) : null;
            if (eventDate) {
              keysToInvalidate = getCacheKeysForEvent(eventDate);
            }
            // Always try to remove the specific ID from all cache entries
            invalidateCache(undefined, (payload.old as any).id);
          }

          // Also always invalidate today and upcoming
          keysToInvalidate.push('today', 'upcoming');

          // Remove duplicates
          keysToInvalidate = Array.from(new Set(keysToInvalidate));

          // Invalidate cache
          invalidateCache(keysToInvalidate);

          // Trigger refresh for invalidated keys
          setTimeout(() => {
            keysToInvalidate.forEach(key => {
              fetchEventsForKey(key, true);
            });
          }, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants',
        },
        (payload) => {
          console.log('Event participant change detected:', payload.eventType);

          // When participants change, we need to invalidate all caches
          // because participant changes affect how events are displayed
          invalidateCache();

          // Trigger refresh for today and upcoming
          setTimeout(() => {
            fetchEventsForKey('today', true);
            fetchEventsForKey('upcoming', true);
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    realtimeSubscriptionRef.current = channel;

    return () => {
      if (realtimeSubscriptionRef.current) {
        supabase.removeChannel(realtimeSubscriptionRef.current);
        realtimeSubscriptionRef.current = null;
      }
    };
  }, [currentFamily?.id, invalidateCache, fetchEventsForKey]);

  // Set up background refresh interval
  useEffect(() => {
    if (!currentFamily || !settings.autoRefreshMinutes) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    const intervalMs = settings.autoRefreshMinutes * 60 * 1000;

    refreshIntervalRef.current = setInterval(() => {
      // Refresh stale cache entries using functional state update
      setCache(prev => {
        const now = Date.now();
        const staleKeys: string[] = [];

        for (const [key, entry] of Object.entries(prev)) {
          if (!entry.isLoading && (now - entry.lastFetched) >= intervalMs) {
            staleKeys.push(key);
          }
        }

        // Refresh stale entries (fire and forget)
        for (const key of staleKeys) {
          fetchEventsForKey(key, false);
        }

        return prev; // Don't modify state here
      });
    }, intervalMs) as any;

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [currentFamily?.id, settings.autoRefreshMinutes, fetchEventsForKey]);

  // Auto-fetch today and upcoming on mount/family change
  useEffect(() => {
    if (!currentFamily) {
      return;
    }

    // Wait for cache to be loaded from storage before auto-fetching
    // This prevents race conditions where fetch starts before storage load completes
    const waitForCacheLoad = async () => {
      // Wait up to 500ms for cache to load
      let waited = 0;
      while (!cacheLoadedRef.current && waited < 500) {
        await new Promise(resolve => setTimeout(resolve, 50));
        waited += 50;
      }

      // Fetch today and upcoming events (only if not already cached)
      ensureEventsFetched('today', false);
      ensureEventsFetched('upcoming', false);
    };

    waitForCacheLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFamily?.id]);

  // Refresh data when app comes back into focus (web and native)
  useEffect(() => {
    if (!currentFamily) {
      return;
    }

    const handleVisibilityChange = () => {
      // On web, refresh when document becomes visible
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        if (!document.hidden) {
          console.log('[EventCache] App became visible on web - refreshing data');
          // Force refresh today and upcoming events
          fetchEventsForKey('today', true);
          fetchEventsForKey('upcoming', true);
        }
      }
    };

    const handleAppStateChange = (state: string) => {
      // On native, refresh when app becomes active
      if (Platform.OS !== 'web' && state === 'active') {
        console.log('[EventCache] App became active on native - refreshing data');
        // Force refresh today and upcoming events
        fetchEventsForKey('today', true);
        fetchEventsForKey('upcoming', true);
      }
    };

    // Set up listeners
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      const appStateListener = AppState.addEventListener('change', handleAppStateChange);
      return () => {
        appStateListener.remove();
      };
    }
  }, [currentFamily?.id, fetchEventsForKey]);

  const value: EventCacheContextType = {
    getEvents,
    ensureEventsFetched,
    isLoading,
    invalidateCache,
    refreshCache,
    getCacheEntry,
    getCacheStats,
  };

  return (
    <EventCacheContext.Provider value={value}>
      {children}
    </EventCacheContext.Provider>
  );
}

export function useEventCache() {
  const context = useContext(EventCacheContext);
  if (context === undefined) {
    throw new Error('useEventCache must be used within an EventCacheProvider');
  }
  return context;
}

// Export helper for determining cache keys
export function getCacheKeysForEventDate(eventDate: Date): string[] {
  return getCacheKeysForEvent(eventDate);
}
