import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

function checkIsSupabaseConfigured(url: string, key: string): boolean {
  if (!url || !key) return false;
  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();

  // Validate URL protocol
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return false;
  }

  // Reject known template/placeholder URLs from .env.example / starter boilerplate
  const knownTemplateHosts = [
    'https://your-project-id.supabase.co',
    'https://your-project.supabase.co',
    'https://your-project-url',
    'https://placeholder.supabase.co',
    'http://placeholder.supabase.co',
  ];
  if (knownTemplateHosts.some((host) => trimmedUrl.toLowerCase().startsWith(host.toLowerCase()))) {
    return false;
  }
  if (trimmedUrl.includes('your-project-id') || trimmedUrl.includes('your-project-url') || trimmedUrl.includes('<project-ref>')) {
    return false;
  }

  // Reject known template anon keys
  const knownTemplateKeys = [
    'your-anon-public-key-here',
    'your-anon-key',
    'placeholder-key',
    '<anon-key>',
  ];
  if (knownTemplateKeys.some((tplKey) => trimmedKey.toLowerCase() === tplKey.toLowerCase())) {
    return false;
  }
  if (trimmedKey.includes('your-anon-public-key') || trimmedKey.includes('<anon-key>')) {
    return false;
  }

  // Supabase keys can be classic JWTs (3 segments separated by dots) or modern publishable keys (starting with sb_publishable_)
  if (trimmedKey.startsWith('sb_publishable_') && trimmedKey.length > 20) {
    return true;
  }

  const segments = trimmedKey.split('.');
  if (segments.length === 3 && segments.every((s) => s.length > 0)) {
    return true;
  }

  // Allow other non-placeholder keys of sufficient length
  return trimmedKey.length >= 20;
}

export const isSupabaseConfigured = checkIsSupabaseConfigured(supabaseUrl, supabaseAnonKey);



declare global {
  // eslint-disable-next-line no-var
  var __supabaseClientInstance: ReturnType<typeof createClient<any>> | undefined;
}

// Create Supabase client singleton with custom storage engine for mobile/web cross-platform persistence
export const supabase =
  globalThis.__supabaseClientInstance ||
  createClient<any>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        storage: Platform.OS !== 'web' ? AsyncStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );

if (process.env.NODE_ENV !== 'production') {
  globalThis.__supabaseClientInstance = supabase;
}
