/**
 * SupabaseAuthService - Authentication Service
 * Handles user authentication state, login/logout, token management
 */

import * as SecureStore from 'expo-secure-store';
import SupabaseClient from './SupabaseClient';

// Storage keys
const STORAGE_KEYS = {
  HAS_COMPLETED_ONBOARDING: 'hasCompletedOnboarding',
  HAS_COMPLETED_FAMILY_SETUP: 'hasCompletedFamilySetup',
  FAMILY_ID: 'com.famcal.familyId',
  SESSION: 'supabase.session',
};

class SupabaseAuthService {
  static instance = null;

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!SupabaseAuthService.instance) {
      SupabaseAuthService.instance = new SupabaseAuthService();
    }
    return SupabaseAuthService.instance;
  }

  constructor() {
    if (SupabaseAuthService.instance) {
      return SupabaseAuthService.instance;
    }

    this.supabase = null;
    this.currentUser = null;
    this.session = null;
    this.isGuest = false;
    this.authListeners = [];
  }

  /**
   * Initialize the auth service
   */
  async initialize() {
    this.supabase = SupabaseClient.getClient();

    // Get initial session
    const { data: { session }, error } = await this.supabase.auth.getSession();

    if (error) {
      console.error('SupabaseAuthService: Error getting session', error);
    }

    this.session = session;
    this.currentUser = session?.user || null;

    // Listen for auth changes
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('SupabaseAuthService: Auth state changed', event);
        this.session = session;
        this.currentUser = session?.user || null;
        this.notifyListeners(event, session);
      }
    );

    return {
      currentUser: this.currentUser,
      session: this.session,
      isGuest: this.isGuest,
    };
  }

  /**
   * Sign up with email and password
   */
  async signUp(email, password) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    this.currentUser = data.user;
    this.session = data.session;
    this.isGuest = false;

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data,
    };
  }

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    this.currentUser = null;
    this.session = null;
    this.isGuest = false;

    return { success: true };
  }

  /**
   * Enter guest mode (local-only, no cloud sync)
   */
  async enterGuestMode() {
    this.currentUser = null;
    this.session = null;
    this.isGuest = true;

    return { success: true };
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get current session
   */
  getSession() {
    return this.session;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.currentUser && !this.isGuest;
  }

  /**
   * Check if user is in guest mode
   */
  isGuestMode() {
    return this.isGuest;
  }

  /**
   * Refresh session (called on 401 errors)
   */
  async refreshSession() {
    const { data, error } = await this.supabase.auth.refreshSession();

    if (error) {
      console.error('SupabaseAuthService: Error refreshing session', error);
      return { success: false, error: error.message };
    }

    this.session = data.session;
    this.currentUser = data.session?.user || null;

    return {
      success: true,
      session: data.session,
      user: data.session?.user,
    };
  }

  /**
   * Reset password (send email)
   */
  async resetPassword(email) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Update password
   */
  async updatePassword(newPassword) {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback) {
    this.authListeners.push(callback);
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all auth listeners
   */
  notifyListeners(event, session) {
    this.authListeners.forEach(callback => {
      callback(event, session);
    });
  }

  /**
   * Onboarding state management
   */
  async hasCompletedOnboarding() {
    const value = await SecureStore.getItemAsync(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING);
    return value === 'true';
  }

  async setOnboardingCompleted(completed = true) {
    await SecureStore.setItemAsync(
      STORAGE_KEYS.HAS_COMPLETED_ONBOARDING,
      completed ? 'true' : 'false'
    );
  }

  /**
   * Family setup state management
   */
  async hasCompletedFamilySetup() {
    const value = await SecureStore.getItemAsync(STORAGE_KEYS.HAS_COMPLETED_FAMILY_SETUP);
    return value === 'true';
  }

  async setFamilySetupCompleted(completed = true) {
    await SecureStore.setItemAsync(
      STORAGE_KEYS.HAS_COMPLETED_FAMILY_SETUP,
      completed ? 'true' : 'false'
    );
  }

  /**
   * Get current family ID
   */
  async getFamilyId() {
    return await SecureStore.getItemAsync(STORAGE_KEYS.FAMILY_ID);
  }

  /**
   * Set current family ID
   */
  async setFamilyId(familyId) {
    if (familyId) {
      await SecureStore.setItemAsync(STORAGE_KEYS.FAMILY_ID, familyId);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.FAMILY_ID);
    }
  }
}

// Export singleton instance
export default SupabaseAuthService.getInstance();
