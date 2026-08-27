import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ListProvider, useLists } from '../context/ListContext';
import { StatusBar } from 'expo-status-bar';
import { LogBox, View, ActivityIndicator, StyleSheet } from 'react-native';
import AuthScreen from '../components/AuthScreen';

// Suppress legacy warning from third-party drag-and-drop dependency
LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
]);

// Inner content container reacting to dynamic auth & theme state
function AppContent() {
  const { isDarkMode } = useLists();
  const { user, isLoading: isAuthLoading } = useAuth();

  const themeBg = isDarkMode ? '#121212' : '#FFFFFF';

  // Loading spinner while retrieving auth session
  if (isAuthLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeBg }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  // If user is unauthenticated, render the modern Auth screen
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
          contentStyle: { backgroundColor: themeBg },
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

// Entry layout wrapping the entire app in Auth and List state providers
export default function RootLayout() {
  return (
    <AuthProvider>
      <ListProvider>
        <AppContent />
      </ListProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});