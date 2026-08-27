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

  // Supabase anon keys are JWTs composed of 3 base64 segments separated by dots
  const segments = trimmedKey.split('.');
  if (segments.length !== 3 || segments.some((s) => s.length === 0)) {
    return false;
  }

  return true;
}

export const isSupabaseConfigured = checkIsSupabaseConfigured(supabaseUrl, supabaseAnonKey);



// Create Supabase client with custom storage engine for mobile/web cross-platform persistence
export const supabase = createClient(
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
