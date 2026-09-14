import { Stack } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ListProvider, useLists } from '../context/ListContext';
import { StatusBar } from 'expo-status-bar';
import { LogBox, View, ActivityIndicator, StyleSheet } from 'react-native';
import AuthScreen from '../components/AuthScreen';

// Crash reporting configuration
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

function RootLayout() {
  return (
    <AuthProvider>
      <ListProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="list/[id]" />
        </Stack>
      </ListProvider>
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);

// Suppress legacy warning from third-party drag-and-drop dependency
LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
]);

// Main app content container wrapped inside the context provider
function AppContent() {
  const { isDarkMode } = useLists();
  const { user, isLoading: isAuthLoading } = useAuth();
  const themeBg = isDarkMode ? '#121212' : '#FFFFFF';

  // Auth session is still being restored from AsyncStorage — show a spinner
  // instead of flashing the sign-in screen or the app content.
  if (isAuthLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeBg }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  // No authenticated user — show the sign in / sign up screen instead of the app.
  if (!user) {
    return (
      <>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <AuthScreen />
      </>
    );
  }

  return (
    <>
      {/* Dynamic status bar style based on dark mode setting */}
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* Root navigation stack router */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' },
        }}
      >
        {/* Main tab navigator route */}
        <Stack.Screen name="(tabs)" />
        
        {/* Dynamic list detail modal/screen route */}
        <Stack.Screen
          name="list/[id]"
          options={{
            headerShown: true,
            title: '',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' },
            headerTintColor: isDarkMode ? '#FFFFFF' : '#000000',
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});