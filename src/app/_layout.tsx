import { Stack } from 'expo-router';
import { ListProvider, useLists } from '../context/ListContext';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';

// Suppress legacy warning from third-party drag-and-drop dependency
LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
]);

// Main app content container wrapped inside the context provider
function AppContent() {
  const { isDarkMode } = useLists();

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

// Entry layout wrapping the entire app in the global list state provider
export default function RootLayout() {
  return (
    <ListProvider>
      <AppContent />
    </ListProvider>
  );
}