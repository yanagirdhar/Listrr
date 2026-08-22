import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLists } from '../../context/ListContext';

export default function ProfileScreen() {
  const router = useRouter();
  
  // Get lists state and dark mode handlers from context
  const { lists, isDarkMode, toggleDarkMode } = useLists();
  
  // Get responsive screen dimensions
  const { width } = useWindowDimensions();

  // Compute stats overview metrics from global lists data
  const archivedCount = lists.filter((l) => l.isArchived).length;
  const totalLists = lists.length;
  const totalItems = lists.reduce((acc, list) => acc + list.items.length, 0);
  const completedItems = lists.reduce(
    (acc, list) => acc + list.items.filter((item) => item.isCompleted).length,
    0
  );

  // Dynamic avatar size based on screen width
  const avatarSize = Math.min(width * 0.2, 80);

  // Theme color styles
  const dynamicStyles = {
    container: { backgroundColor: isDarkMode ? '#121212' : '#F2F2F7' },
    card: { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' },
    textPrimary: { color: isDarkMode ? '#FFFFFF' : '#000000' },
    textSecondary: { color: isDarkMode ? '#A0A0A0' : '#8E8E93' },
    divider: { backgroundColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' },
  };

  return (
    <ScrollView
      style={[styles.container, dynamicStyles.container]}
      contentContainerStyle={styles.content}
    >
      {/* Profile avatar and user info */}
      <View style={styles.profileHeader}>
        <View
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: isDarkMode ? '#1A385C' : '#E6F4FE',
            },
          ]}
        >
          <Ionicons name="person" size={avatarSize * 0.5} color="#208AEF" />
        </View>
        <Text style={[styles.userName, dynamicStyles.textPrimary]}>Listrr User</Text>
        <Text style={[styles.userEmail, dynamicStyles.textSecondary]}>
          user@listrr.app
        </Text>
      </View>

      {/* App preferences settings (Dark mode toggle) */}
      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
        Preferences
      </Text>
      <View style={[styles.card, dynamicStyles.card]}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabelGroup}>
            <Ionicons
              name={isDarkMode ? 'moon' : 'sunny'}
              size={20}
              color={isDarkMode ? '#FFD60A' : '#FF9500'}
            />
            <Text style={[styles.settingLabel, dynamicStyles.textPrimary]}>
              Dark Mode
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#767577', true: '#208AEF' }}
            thumbColor={isDarkMode ? '#FFFFFF' : '#F4F3F4'}
          />
        </View>
      </View>

      {/* Navigation link to view archived lists */}
      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
        Archived Lists
      </Text>
      <TouchableOpacity
        style={[styles.card, dynamicStyles.card, styles.settingRow]}
        onPress={() => router.push('/archived')}
      >
        <View style={styles.settingLabelGroup}>
          <Ionicons name="archive-outline" size={20} color="#FF9500" />
          <Text style={[styles.settingLabel, dynamicStyles.textPrimary]}>
            View Archived Lists ({archivedCount})
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={dynamicStyles.textSecondary.color}
        />
      </TouchableOpacity>

      {/* Summary stats grid */}
      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
        Overview
      </Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <Text style={styles.statNumber}>{totalLists}</Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
            Total Lists
          </Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <Text style={styles.statNumber}>{totalItems}</Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
            Total Items
          </Text>
        </View>
        <View style={[styles.statCard, dynamicStyles.card]}>
          <Text style={styles.statNumber}>{completedItems}</Text>
          <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>
            Completed
          </Text>
        </View>
      </View>

      {/* App info section */}
      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
        About
      </Text>
      <View style={[styles.card, dynamicStyles.card]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, dynamicStyles.textPrimary]}>
            App Version
          </Text>
          <Text style={[styles.infoValue, dynamicStyles.textSecondary]}>
            1.0.0
          </Text>
        </View>
        <View style={[styles.divider, dynamicStyles.divider]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, dynamicStyles.textPrimary]}>
            Framework
          </Text>
          <Text style={[styles.infoValue, dynamicStyles.textSecondary]}>
            Expo Router
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: '5%' },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: { fontSize: 20, fontWeight: 'bold' },
  userEmail: { fontSize: 14, marginTop: 2 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  card: { borderRadius: 12, padding: 16, marginBottom: 8 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingLabel: { fontSize: 16, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#208AEF' },
  statLabel: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 15 },
  infoValue: { fontSize: 15 },
  divider: { height: 1, marginVertical: 10 },
});