/**
 * SupabaseClient - Low-level Supabase client wrapper
 * Handles initialization and configuration of supabase-js
 */

import { createClient } from '@supabase/supabase-js';

// TODO: Move these to environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

class SupabaseClient {
  static instance = null;

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!SupabaseClient.instance) {
      SupabaseClient.instance = new SupabaseClient();
    }
    return SupabaseClient.instance;
  }

  constructor() {
    if (SupabaseClient.instance) {
      return SupabaseClient.instance;
    }

    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize Supabase client
   */
  initialize() {
    if (this.initialized) {
      return this.client;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('SupabaseClient: Missing Supabase URL or Anon Key. Using mock client.');
      this.client = this.createMockClient();
      this.initialized = true;
      return this.client;
    }

    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    this.initialized = true;
    return this.client;
  }

  /**
   * Get the Supabase client instance
   */
  getClient() {
    if (!this.initialized) {
      return this.initialize();
    }
    return this.client;
  }

  /**
   * Create a mock client for development without Supabase
   */
  createMockClient() {
    return {
      auth: {
        signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Mock: Supabase not configured' } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Mock: Supabase not configured' } }),
        signInWithOAuth: async () => ({ data: { user: null, session: null }, error: { message: 'Mock: Supabase not configured' } }),
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        refreshSession: async () => ({ data: { session: null }, error: { message: 'Mock: Supabase not configured' } }),
      },
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: { message: 'Mock: Supabase not configured' } }),
        update: () => ({ data: null, error: { message: 'Mock: Supabase not configured' } }),
        delete: () => ({ error: null }),
      }),
      rpc: async () => ({ data: null, error: { message: 'Mock: Supabase not configured' } }),
    };
  }

  /**
   * Check if client is properly configured
   */
  isConfigured() {
    return !!SUPABASE_URL && !!SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_');
  }

  /**
   * Reset client (useful for testing or logout)
   */
  reset() {
    this.client = null;
    this.initialized = false;
  }
}

// Export singleton instance
export default SupabaseClient.getInstance();
