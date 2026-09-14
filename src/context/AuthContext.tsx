import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Helper to normalize a raw email input for Supabase Auth (trim + lowercase)
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Helper to derive a display name purely from the user's email — there is
// no separate username field anywhere in auth, so this is just a friendly
// capitalized version of the email's local part.
export function getDisplayUsername(user: User | null): string {
  if (!user) return 'Guest';
  if (user.email) {
    const prefix = user.email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return 'User';
}

// Payload handed to updateAvatar when setting a new photo. Pass null to remove.
export interface AvatarUpload {
  base64: string;
  mimeType?: string;
}

const AVATAR_BUCKET = 'avatars';

// Map a mime type to a file extension for the storage object path
function extensionForMimeType(mimeType?: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    default:
      return 'jpg';
  }
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateAvatar: (avatar: AvatarUpload | null) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
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
  deleteAccount: async () => ({ error: new Error('Authentication is initializing') }),
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

  // Sign In with email + password
  const signIn = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase database is not configured. Please check your .env file.') };
    }

    const emailToUse = normalizeAuthEmail(email);

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
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase database is not configured. Please check your .env file.') };
    }

    const emailToUse = normalizeAuthEmail(email);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailToUse,
        password,
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

  // Update Profile Picture Avatar — uploads to the 'avatars' Storage bucket
  // and stores only the resulting public URL (never the raw image bytes) in
  // auth metadata / the profiles table.
  const updateAvatar = useCallback(async (avatar: AvatarUpload | null): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured || !user) {
      setAvatarUrl(avatar ? `data:${avatar.mimeType || 'image/jpeg'};base64,${avatar.base64}` : null);
      return { error: null };
    }

    try {
      let newAvatarUrl: string | null = null;

      if (avatar) {
        const ext = extensionForMimeType(avatar.mimeType);
        const path = `${user.id}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, decodeBase64(avatar.base64), {
            contentType: avatar.mimeType || 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        // Cache-bust so <Image> picks up the new file even though the path
        // (and therefore the CDN-cached URL) stays the same after upsert.
        newAvatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      } else {
        // Remove any existing avatar files for this user from Storage.
        const { data: files } = await supabase.storage.from(AVATAR_BUCKET).list(user.id);
        if (files && files.length > 0) {
          const paths = files.map((f) => `${user.id}/${f.name}`);
          await supabase.storage.from(AVATAR_BUCKET).remove(paths);
        }
      }

      setAvatarUrl(newAvatarUrl);

      // Sync the (small) URL — never the image itself — to auth metadata
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: newAvatarUrl },
      });

      if (updateError) {
        console.warn('Failed to update user auth metadata avatar:', updateError.message);
      } else if (updateData?.user) {
        setUser(updateData.user);
      }

      // Sync to profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.warn('Note: profiles table update failed:', profileError.message);
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

  // Delete Account completely — calls the server-side 'delete-account' Edge
  // Function (service-role key required, so this can never happen purely
  // client-side) which removes the Storage avatar, app data, and the actual
  // Supabase Auth user itself.
  const deleteAccount = useCallback(async (): Promise<{ error: Error | null }> => {
    if (!user) return { error: null };

    const userId = user.id;

    try {
      if (isSupabaseConfigured) {
        const { error: fnError } = await supabase.functions.invoke('delete-account');
        if (fnError) {
          throw fnError;
        }
      }

      // Clear cached local storage for this user
      try {
        await AsyncStorage.removeItem(`@listrr_cached_lists_v2_${userId}`);
      } catch (storageErr) {
        console.warn('Failed to clear cached storage on account deletion:', storageErr);
      }

      // The auth user (and its session) no longer exists server-side at this
      // point — just clear local client state rather than calling signOut(),
      // which would try to revoke a session that's already gone.
      setUser(null);
      setSession(null);
      setAvatarUrl(null);

      return { error: null };
    } catch (err: any) {
      console.error('Error during account deletion:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, [user]);

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
        deleteAccount,
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
