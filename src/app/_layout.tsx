import { Stack } from 'expo-router';
import { ListProvider, useLists } from '../context/ListContext';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';

// Suppress legacy warning from third-party drag-and-drop dependency
LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
]);

function AppContent() {
  const { isDarkMode } = useLists();

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' },
        }}
      >
        <Stack.Screen name="(tabs)" />
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

export default function RootLayout() {
  return (
    <ListProvider>
      <AppContent />
    </ListProvider>
  );
}