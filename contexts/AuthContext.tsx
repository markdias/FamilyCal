import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, Contact } from '@/lib/supabase';

// Required for expo-web-browser to work properly with Supabase OAuth
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userContact: Contact | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName?: string
  ) => Promise<{ error: AuthError | Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshUserContact: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userContact, setUserContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's contact record
  const fetchUserContact = async (userId: string) => {
    try {
      // Don't use .single() - user might not have a contact yet (new users)
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        console.error('Error fetching user contact:', error);
        setUserContact(null);
        return;
      }
      
      // Get first contact or null
      setUserContact(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error fetching user contact:', error);
      setUserContact(null);
    }
  };

  // Refresh user contact data
  const refreshUserContact = async () => {
    if (user?.id) {
      await fetchUserContact(user.id);
    }
  };

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          await fetchUserContact(initialSession.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchUserContact(newSession.user.id);
        } else {
          setUserContact(null);
        }

        if (event === 'SIGNED_OUT') {
          setUserContact(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      // Get the redirect URL for the current platform
      const redirectTo = Platform.OS === 'web' 
        ? `${window.location.origin}/` 
        : Linking.createURL('/');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error) {
        console.error('Google sign-in error:', error);
        return { error };
      }

      // For native platforms, open the OAuth URL in the browser
      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo
        );

        if (result.type === 'success') {
          // The URL contains the OAuth tokens
          const url = result.url;
          
          // Extract the session from the URL
          const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            // Set the session with the tokens
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Error setting session:', sessionError);
              return { error: sessionError };
            }
          }
        } else if (result.type === 'cancel') {
          return { error: new Error('User cancelled the authentication') };
        }
      }

      return { error: null };
    } catch (err) {
      console.error('Unexpected error during Google sign-in:', err);
      return { error: err instanceof Error ? err : new Error('Unknown error occurred') };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName?: string
  ) => {
    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName || '',
        },
      },
    });

    if (error) {
      return { error };
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      return { error: null, needsEmailConfirmation: true };
    }

    // If we have a session (email confirmation disabled), we don't create contact here
    // The contact will be created when the user creates/joins a family
    return { error: null, needsEmailConfirmation: false };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      // Only clear state on successful signout
      setSession(null);
      setUser(null);
      setUserContact(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userContact,
        isLoading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshUserContact,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
