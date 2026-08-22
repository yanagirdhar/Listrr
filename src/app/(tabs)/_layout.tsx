import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLists } from '../../context/ListContext';

export default function TabLayout() {
  const { isDarkMode } = useLists();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Scale floating button based on screen width
  const fabSize = Math.min(width * 0.13, 56);

  const theme = {
    bg: isDarkMode ? '#121212' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
    inactive: '#8E8E93',
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#208AEF',
          tabBarInactiveTintColor: theme.inactive,
          tabBarStyle: {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom || 8,
            paddingTop: 8,
            backgroundColor: theme.bg,
            borderTopColor: theme.border,
          },
          headerStyle: {
            backgroundColor: theme.bg,
            shadowColor: 'transparent',
            elevation: 0,
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: theme.text,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'My Lists',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="create"
          options={{
            title: 'Create List',
            tabBarLabel: () => null,
            tabBarIcon: () => (
              <View
                style={[
                  styles.floatingButton,
                  {
                    width: fabSize,
                    height: fabSize,
                    borderRadius: fabSize / 2,
                  },
                ]}
              >
                <Ionicons name="add" size={fabSize * 0.55} color="#FFFFFF" />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    backgroundColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
  },
});