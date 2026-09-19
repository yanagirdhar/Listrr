import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Values are trimmed at read-time so a stray space in .env never causes a
// hard-to-diagnose "invalid URL" or "invalid key" error.
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

function checkIsSupabaseConfigured(url: string, key: string): boolean {
  if (!url || !key) return false;

  // Validate URL protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

  // Reject known template/placeholder URLs from .env.example / starter boilerplate
  const knownTemplateHosts = [
    'https://your-project-id.supabase.co',
    'https://your-project.supabase.co',
    'https://your-project-url',
    'https://placeholder.supabase.co',
    'http://placeholder.supabase.co',
  ];
  if (knownTemplateHosts.some((host) => url.toLowerCase().startsWith(host.toLowerCase()))) {
    return false;
  }
  if (
    url.includes('your-project-id') ||
    url.includes('your-project-url') ||
    url.includes('<project-ref>')
  ) {
    return false;
  }

  // Reject known template anon keys
  const knownTemplateKeys = [
    'your-anon-public-key-here',
    'your-anon-key',
    'placeholder-key',
    '<anon-key>',
  ];
  if (knownTemplateKeys.some((tplKey) => key.toLowerCase() === tplKey.toLowerCase())) {
    return false;
  }
  if (key.includes('your-anon-public-key') || key.includes('<anon-key>')) return false;

  // New publishable key format (sb_publishable_...)
  if (key.startsWith('sb_publishable_') && key.length > 20) return true;

  // Legacy JWT anon key (3 base64 segments separated by dots)
  const segments = key.split('.');
  if (segments.length === 3 && segments.every((s) => s.length > 0)) return true;

  return key.length >= 20;
}

export const isSupabaseConfigured = checkIsSupabaseConfigured(supabaseUrl, supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
      '(or your sb_publishable_ key) in .env and restart the dev server with --clear.'
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __supabaseClientInstance: SupabaseClient<any> | undefined;
  // eslint-disable-next-line no-var
  var __supabaseAppStateSubscription: { remove: () => void } | undefined;
}

function createSupabaseClient(): SupabaseClient<any> {
  return createClient<any>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        // On web, supabase-js uses localStorage by default; AsyncStorage is
        // only correct on native.
        storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        // This MUST be true on web, otherwise the tokens appended to the
        // email-confirmation and password-reset redirect URLs are never
        // consumed and the user lands back on the sign-in screen having
        // apparently done nothing. It must stay false on native, where
        // there is no URL to read.
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    }
  );
}

// A single client for the whole app. Stored on globalThis so that Fast
// Refresh in development does not create a second client that competes
// over the same persisted session and fights the token-refresh timer.
export const supabase: SupabaseClient<any> =
  globalThis.__supabaseClientInstance ?? createSupabaseClient();

globalThis.__supabaseClientInstance = supabase;

if (Platform.OS !== 'web') {
  // Remove any listener left behind by a previous module evaluation
  // (Fast Refresh) before adding a new one, otherwise every reload stacks
  // another subscription that keeps calling start/stopAutoRefresh.
  globalThis.__supabaseAppStateSubscription?.remove();

  supabase.auth.startAutoRefresh();

  globalThis.__supabaseAppStateSubscription = AppState.addEventListener(
    'change',
    (nextAppState) => {
      if (nextAppState === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    }
  );
}
