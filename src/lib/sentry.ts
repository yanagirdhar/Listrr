import * as Sentry from '@sentry/react-native';

// Sentry DSNs are safe to ship in the client bundle — they only allow
// *sending* events, unlike the Supabase service-role key.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let initialized = false;

export function initSentry() {
  if (initialized) return;

  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.warn('EXPO_PUBLIC_SENTRY_DSN is not set — crash reporting is disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
  });

  initialized = true;
}