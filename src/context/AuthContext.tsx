import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Helper to normalize input into a valid email format for Supabase Auth
export function normalizeAuthEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  // Convert alphanumeric username to an internal auth email
  const sanitized = trimmed.replace(/[^a-z0-9_.-]/g, '');
  return `${sanitized || 'user'}@listrr.app`;
}

// Helper to extract a display username from user metadata or email
export function getDisplayUsername(user: User | null): string {
  if (!user) return 'Guest';
  const meta = user.user_metadata;
  if (meta?.username && typeof meta.username === 'string' && meta.username.trim()) {
    return meta.username.trim();
  }
  if (meta?.full_name && typeof meta.full_name === 'string' && meta.full_name.trim()) {
    return meta.full_name.trim();
  }
  if (user.email) {
    const prefix = user.email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return 'User';
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (identifier: string, password: string, usernameInput?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateAvatar: (base64OrUrl: string | null) => Promise<{ error: Error | null }>;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  username: 'Guest',
  email: null,
  avatarUrl: null,
  isLoading: true,
  isConfigured: isSupabaseConfigured,
  signIn: async () => ({ error: new Error('Authentication is initializing') }),
  signUp: async () => ({ error: new Error('Authentication is initializing') }),
  signOut: async () => {},
  updateAvatar: async () => ({ error: new Error('Authentication is initializing') }),
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session and listen for auth state changes
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Error retrieving initial Supabase session:', error.message);
        }
        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          const metaAvatar = initialSession?.user?.user_metadata?.avatar_url || null;
          setAvatarUrl(metaAvatar);
        }
      } catch (err) {
        console.error('Unexpected auth initialization error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    if (!isSupabaseConfigured) return;

    // Listen for real-time auth changes (Sign in, Sign out, Token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        const metaAvatar = currentSession?.user?.user_metadata?.avatar_url || null;
        setAvatarUrl(metaAvatar);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign In with email or username + password
  const signIn = useCallback(async (identifier: string, password: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase database is not configured. Please check your .env file.') };
    }

    const emailToUse = normalizeAuthEmail(identifier);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        return { error };
      }

      setSession(data.session);
      setUser(data.user);
      setAvatarUrl(data.user?.user_metadata?.avatar_url || null);
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, []);

  // Sign Up instantly without email confirmation delays
  const signUp = useCallback(async (
    identifier: string,
    password: string,
    usernameInput?: string
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase database is not configured. Please check your .env file.') };
    }

    const emailToUse = normalizeAuthEmail(identifier);
    const resolvedUsername = usernameInput?.trim() || identifier.trim().split('@')[0];

    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailToUse,
        password,
        options: {
          data: {
            username: resolvedUsername,
            full_name: resolvedUsername,
          },
        },
      });

      if (error) {
        return { error };
      }

      // If session is already available, update state directly
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        setAvatarUrl(data.user?.user_metadata?.avatar_url || null);
        return { error: null };
      }

      // If user was created, immediately attempt sign-in to bypass any confirmation blocks
      const signInResult = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (signInResult.error) {
        if (signInResult.error.message.toLowerCase().includes('email not confirmed')) {
          return {
            error: new Error(
              'Account created! If you see email confirmation error, please disable "Confirm Email" in your Supabase dashboard (Authentication -> Providers -> Email) for instant access.'
            ),
          };
        }
        return { error: signInResult.error };
      }

      setSession(signInResult.data.session);
      setUser(signInResult.data.user);
      setAvatarUrl(signInResult.data.user?.user_metadata?.avatar_url || null);
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, []);

  // Update Profile Picture Avatar
  const updateAvatar = useCallback(async (newAvatar: string | null): Promise<{ error: Error | null }> => {
    setAvatarUrl(newAvatar);

    if (!isSupabaseConfigured || !user) {
      return { error: null };
    }

    try {
      // 1. Update user metadata in Supabase Auth
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: newAvatar },
      });

      if (updateError) {
        console.warn('Failed to update user auth metadata avatar:', updateError.message);
      } else if (updateData?.user) {
        setUser(updateData.user);
      }

      // 2. Sync to profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: newAvatar,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.warn('Note: profiles table update failed (may not be migrated yet):', profileError.message);
      }

      return { error: null };
    } catch (err: any) {
      console.error('Error updating avatar in Supabase:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, [user]);

  // Sign Out cleanly & immediately on all platforms
  const signOut = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Error during Supabase sign out:', err);
    } finally {
      setUser(null);
      setSession(null);
      setAvatarUrl(null);
    }
  }, []);

  const currentUsername = getDisplayUsername(user);
  const currentEmail = user?.email || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        username: currentUsername,
        email: currentEmail,
        avatarUrl,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
};
