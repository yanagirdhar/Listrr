import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

function checkIsSupabaseConfigured(url: string, key: string): boolean {
  if (!url || !key) return false;
  const lowerUrl = url.toLowerCase().trim();
  const lowerKey = key.toLowerCase().trim();

  // Validate URL protocol
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
    return false;
  }

  // Reject template placeholders from .env.example / starter boilerplates
  const urlPlaceholders = [
    'your-project',
    'your-project-id',
    'your-project-url',
    'placeholder',
    'example',
    '<project-ref>',
  ];
  if (urlPlaceholders.some((ph) => lowerUrl.includes(ph))) {
    return false;
  }

  const keyPlaceholders = [
    'your-anon',
    'your-anon-key',
    'your-anon-public-key',
    'placeholder',
    'example',
    '<anon-key>',
  ];
  if (keyPlaceholders.some((ph) => lowerKey.includes(ph))) {
    return false;
  }

  // Real Supabase anon keys are JWTs (typically > 80 chars)
  if (lowerKey.length < 20) {
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
