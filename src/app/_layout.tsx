import { Stack } from 'expo-router';
import { ListProvider, useLists } from '../context/ListContext';
import { StatusBar } from 'expo-status-bar';

function AppContent() {
  const { isDarkMode } = useLists();

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
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