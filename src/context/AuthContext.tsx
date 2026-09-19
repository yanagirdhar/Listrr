import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Helper to normalize a raw email input for Supabase Auth (trim + lowercase)
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Keep this in sync with ListContext's cacheKey builder.
export const listCacheKeyForUser = (userId: string) =>
  `@listrr_cached_lists_v2_${userId}`;

// Helper to derive a display name purely from the user's email.
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
// Signed URLs for the private avatars bucket expire after this many seconds.
const AVATAR_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// Fetch a fresh signed URL for the current user's avatar from the private
// bucket. Falls back to the public URL stored in auth metadata (legacy) when
// no avatar_path is set (e.g. accounts created before the private-bucket
// migration).
async function getCurrentAvatarUrl(user: User | null): Promise<string | null> {
  const avatarPath = user?.user_metadata?.avatar_path;
  if (!avatarPath) {
    // Legacy: avatar stored as a public URL directly in metadata.
    return user?.user_metadata?.avatar_url || null;
  }

  try {
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(avatarPath, AVATAR_SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.warn('Failed to refresh signed avatar URL:', error.message);
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (err) {
    console.warn('Unexpected error creating signed avatar URL:', err);
    return null;
  }
}

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

/**
 * supabase-js rejects a non-2xx Edge Function response with a
 * `FunctionsHttpError` whose `context` is the raw `Response`. The body is
 * still unread at that point, so we must await `.text()` to see the real
 * reason — otherwise all the caller ever sees is the generic
 * "Edge Function returned a non-2xx status code".
 *
 * The body can only be consumed once, so this reads it exactly once and
 * falls back cleanly at every step.
 */
async function describeFunctionsError(fnError: unknown): Promise<string> {
  const fallback =
    fnError instanceof Error ? fnError.message : String(fnError ?? 'Unknown error');

  const context = (fnError as { context?: unknown })?.context;
  if (!context || typeof (context as Response).text !== 'function') {
    return fallback;
  }

  const response = context as Response;
  const status = typeof response.status === 'number' ? response.status : undefined;

  let raw = '';
  try {
    raw = await response.text();
  } catch (readErr) {
    console.warn('Could not read delete-account error body:', readErr);
    return status ? `${fallback} (HTTP ${status})` : fallback;
  }

  if (!raw) {
    return status ? `${fallback} (HTTP ${status})` : fallback;
  }

  try {
    const parsed = JSON.parse(raw) as {
      error?: string;
      detail?: string;
      message?: string;
      stage?: string;
    };
    const primary = parsed.error ?? parsed.message;
    const detail = parsed.detail;

    if (primary && detail && detail !== primary) return `${primary} (${detail})`;
    if (primary) return primary;
    if (detail) return detail;
  } catch {
    // Not JSON — the raw text is the most useful thing we have.
  }

  return raw.slice(0, 500);
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
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null; requiresEmailConfirmation: boolean }>;
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
  signUp: async () => ({
    error: new Error('Authentication is initializing'),
    requiresEmailConfirmation: false,
  }),
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

  const isMountedRef = useRef(true);
  // Guards against a slow avatar request from a previous user landing after
  // a newer one has already resolved (classic out-of-order response race).
  const avatarRequestSeqRef = useRef(0);
  // Set while deleteAccount is tearing down, so the SIGNED_OUT event it
  // triggers cannot resurrect stale user state.
  const isDeletingRef = useRef(false);

  const refreshAvatarFor = useCallback((nextUser: User | null) => {
    const seq = ++avatarRequestSeqRef.current;
    void getCurrentAvatarUrl(nextUser)
      .then((url) => {
        if (isMountedRef.current && seq === avatarRequestSeqRef.current) {
          setAvatarUrl(url);
        }
      })
      .catch((error) => {
        console.warn('Failed to refresh signed avatar URL:', error);
        if (isMountedRef.current && seq === avatarRequestSeqRef.current) {
          setAvatarUrl(null);
        }
      });
  }, []);

  // Initialize session and listen for auth state changes
  useEffect(() => {
    isMountedRef.current = true;

    async function initSession() {
      if (!isSupabaseConfigured) {
        if (isMountedRef.current) setIsLoading(false);
        return;
      }

      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn('Error retrieving initial Supabase session:', error.message);
        }

        if (isMountedRef.current) {
          setSession(initialSession ?? null);
          setUser(initialSession?.user ?? null);
          refreshAvatarFor(initialSession?.user ?? null);
        }
      } catch (err) {
        console.error('Unexpected auth initialization error:', err);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    }

    initSession();

    if (!isSupabaseConfigured) {
      return () => {
        isMountedRef.current = false;
      };
    }

    // IMPORTANT: this callback runs while supabase-js holds its internal auth
    // lock. Calling any other Supabase method synchronously from here (the
    // previous code called Storage.createSignedUrl) risks deadlocking token
    // refresh on React Native. All Supabase work is therefore deferred to a
    // separate task with setTimeout(..., 0), which is the documented pattern.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMountedRef.current) return;

      // Purely synchronous state — safe to do inline.
      setSession(currentSession ?? null);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);

      if (isDeletingRef.current && event === 'SIGNED_OUT') {
        setAvatarUrl(null);
        return;
      }

      const nextUser = currentSession?.user ?? null;

      if (!nextUser) {
        setAvatarUrl(null);
        return;
      }

      // TOKEN_REFRESHED does not change the avatar; skip the needless
      // signed-URL round trip that used to fire on every refresh tick.
      if (event === 'TOKEN_REFRESHED') return;

      setTimeout(() => {
        if (isMountedRef.current) refreshAvatarFor(nextUser);
      }, 0);
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [refreshAvatarFor]);

  // ---------------------------------------------------------------------
  // Sign in
  // ---------------------------------------------------------------------
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      if (!isSupabaseConfigured) {
        return {
          error: new Error(
            'Supabase is not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
          ),
        };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizeAuthEmail(email),
          // NOTE: the password is passed through verbatim. It must never be
          // trimmed or otherwise transformed here, or credentials set
          // elsewhere (dashboard, reset link) will silently fail to match.
          password,
        });

        if (error) return { error };

        // onAuthStateChange also fires for this, but setting state here too
        // removes a frame of "signed in but UI still shows the auth wall".
        setSession(data.session ?? null);
        setUser(data.user ?? null);
        refreshAvatarFor(data.user ?? null);

        return { error: null };
      } catch (err: any) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [refreshAvatarFor]
  );

  // ---------------------------------------------------------------------
  // Sign up (email confirmation supported)
  // ---------------------------------------------------------------------
  const signUp = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error: Error | null; requiresEmailConfirmation: boolean }> => {
      if (!isSupabaseConfigured) {
        return {
          error: new Error(
            'Supabase is not configured. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
          ),
          requiresEmailConfirmation: false,
        };
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: normalizeAuthEmail(email),
          password,
        });

        if (error) return { error, requiresEmailConfirmation: false };

        // Supabase deliberately returns a success-shaped response for an
        // email that already exists (anti user-enumeration). The tell is an
        // empty `identities` array. Surfacing a neutral message keeps the
        // anti-enumeration property while not claiming a new account was
        // created.
        const isExistingUser =
          Array.isArray(data.user?.identities) && data.user!.identities!.length === 0;

        if (isExistingUser) {
          return { error: null, requiresEmailConfirmation: true };
        }

        // No session back => confirmation email required before sign-in.
        return { error: null, requiresEmailConfirmation: !data.session };
      } catch (err: any) {
        return {
          error: err instanceof Error ? err : new Error(String(err)),
          requiresEmailConfirmation: false,
        };
      }
    },
    []
  );

  // ---------------------------------------------------------------------
  // Avatar — uploads to the private 'avatars' bucket, stores signed URL
  // ---------------------------------------------------------------------
  const updateAvatar = useCallback(
    async (avatar: AvatarUpload | null): Promise<{ error: Error | null }> => {
      if (!isSupabaseConfigured || !user) {
        setAvatarUrl(
          avatar ? `data:${avatar.mimeType || 'image/jpeg'};base64,${avatar.base64}` : null
        );
        return { error: null };
      }

      try {
        let newAvatarUrl: string | null = null;
        let avatarPath: string | null = null;

        if (avatar) {
          const ext = extensionForMimeType(avatar.mimeType);
          const path = `${user.id}/avatar.${ext}`;
          avatarPath = path;

          const { error: uploadError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .upload(path, decodeBase64(avatar.base64), {
              contentType: avatar.mimeType || 'image/jpeg',
              upsert: true,
            });

          if (uploadError) throw uploadError;

          // Switching file extension would otherwise leave the old object
          // behind and count against the user's storage forever.
          const { data: existingFiles } = await supabase.storage
            .from(AVATAR_BUCKET)
            .list(user.id);

          const stalePaths = (existingFiles ?? [])
            .map((f) => `${user.id}/${f.name}`)
            .filter((p) => p !== path);

          if (stalePaths.length > 0) {
            await supabase.storage.from(AVATAR_BUCKET).remove(stalePaths);
          }

          // Bucket is private — we must use signed URLs, not public URLs.
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .createSignedUrl(path, AVATAR_SIGNED_URL_TTL_SECONDS);

          if (signedUrlError) throw signedUrlError;
          newAvatarUrl = signedUrlData?.signedUrl ?? null;
        } else {
          // Remove avatar — delete all files in this user's storage folder.
          const { data: files, error: listError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .list(user.id);

          if (listError) throw listError;

          if (files && files.length > 0) {
            const paths = files.map((f) => `${user.id}/${f.name}`);
            const { error: removeError } = await supabase.storage
              .from(AVATAR_BUCKET)
              .remove(paths);
            if (removeError) throw removeError;
          }
        }

        setAvatarUrl(newAvatarUrl);

        // Store the object PATH (not the signed URL) in auth metadata so a
        // fresh, unexpired signed URL can be minted per session.
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          data: { avatar_url: newAvatarUrl, avatar_path: avatarPath },
        });

        if (updateError) {
          // Without this the avatar will not survive a restart.
          throw updateError;
        }

        if (updateData?.user) setUser(updateData.user);

        // Sync to profiles table (best-effort mirror; auth metadata is source of truth).
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            avatar_url: newAvatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (profileError) {
          console.warn('profiles avatar sync failed:', profileError.message);
        }

        return { error: null };
      } catch (err: any) {
        console.error('Error updating avatar in Supabase:', err);
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [user]
  );

  // ---------------------------------------------------------------------
  // Sign out
  // ---------------------------------------------------------------------
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

  // ---------------------------------------------------------------------
  // Delete account
  // ---------------------------------------------------------------------
  const deleteAccount = useCallback(async (): Promise<{ error: Error | null }> => {
    if (!user) return { error: null };

    const userId = user.id;

    try {
      if (isSupabaseConfigured) {
        // Force a refresh first: an expired access token is the single most
        // common cause of the Edge Function replying 401.
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        let accessToken = sessionData.session?.access_token;

        const expiresAt = sessionData.session?.expires_at;
        const isNearExpiry =
          typeof expiresAt === 'number' && expiresAt * 1000 - Date.now() < 60_000;

        if (!accessToken || isNearExpiry) {
          const { data: refreshed, error: refreshError } =
            await supabase.auth.refreshSession();
          if (refreshError && !accessToken) throw refreshError;
          accessToken = refreshed?.session?.access_token ?? accessToken;
        }

        if (!accessToken) {
          throw new Error(
            'Your session has expired. Please sign in again before deleting your account.'
          );
        }

        isDeletingRef.current = true;

        const { error: fnError } = await supabase.functions.invoke('delete-account', {
          // An explicit body guarantees a POST with a JSON content type.
          body: { userId },
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (fnError) {
          const responseText = await describeFunctionsError(fnError);
          console.error('delete-account invocation failed:', responseText);
          throw new Error(responseText);
        }
      }

      // Clear this user's cached lists.
      try {
        await AsyncStorage.removeItem(listCacheKeyForUser(userId));
      } catch (storageErr) {
        console.warn('Failed to clear cached storage on account deletion:', storageErr);
      }

      // The server-side user is gone, but supabase-js still holds the
      // persisted session in AsyncStorage. Without a LOCAL sign-out the next
      // cold start restores a session for a deleted user and the auto-refresh
      // timer fails in a loop.
      // scope: 'local' skips the network revoke call, which would 403 anyway.
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (signOutErr) {
        console.warn('Local session teardown after deletion failed:', signOutErr);
      }

      setUser(null);
      setSession(null);
      setAvatarUrl(null);

      return { error: null };
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error during account deletion:', message);
      return { error: new Error(message) };
    } finally {
      isDeletingRef.current = false;
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        username: getDisplayUsername(user),
        email: user?.email || null,
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

export const useAuth = () => useContext(AuthContext);
