import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLists } from '../../context/ListContext';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, username, email, signOut } = useAuth();
  
  // Get lists state and dark mode handlers from context
  const {
    lists,
    isDarkMode,
    syncStatus,
    toggleDarkMode,
    refreshLists,
    isLoading,
  } = useLists();
  
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

  // Derive user initials
  const initials = (username || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Theme color styles
  const dynamicStyles = {
    container: { backgroundColor: isDarkMode ? '#121212' : '#F2F2F7' },
    card: { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' },
    textPrimary: { color: isDarkMode ? '#FFFFFF' : '#000000' },
    textSecondary: { color: isDarkMode ? '#A0A0A0' : '#8E8E93' },
    divider: { backgroundColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' },
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ],
      { cancelable: true }
    );
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
          <Text style={[styles.avatarInitials, { fontSize: avatarSize * 0.4 }]}>
            {initials}
          </Text>
        </View>
        <Text style={[styles.userName, dynamicStyles.textPrimary]}>{username}</Text>
        <Text style={[styles.userEmail, dynamicStyles.textSecondary]}>
          {email || 'Authenticated User'}
        </Text>
      </View>

      {/* Account Details Section */}
      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
        Account
      </Text>
      <View style={[styles.card, dynamicStyles.card]}>
        <View style={styles.infoRow}>
          <View style={styles.settingLabelGroup}>
            <Ionicons name="person-circle-outline" size={20} color="#208AEF" />
            <Text style={[styles.infoLabel, dynamicStyles.textPrimary]}>Username</Text>
          </View>
          <Text style={[styles.infoValue, dynamicStyles.textSecondary]}>{username}</Text>
        </View>

        <View style={[styles.divider, dynamicStyles.divider]} />

        <View style={styles.infoRow}>
          <View style={styles.settingLabelGroup}>
            <Ionicons name="mail-outline" size={20} color="#208AEF" />
            <Text style={[styles.infoLabel, dynamicStyles.textPrimary]}>Account ID</Text>
          </View>
          <Text style={[styles.infoValue, { color: '#8E8E93', fontSize: 13 }]}>
            {user?.id ? `${user.id.slice(0, 12)}...` : 'Local User'}
          </Text>
        </View>

        <View style={[styles.divider, dynamicStyles.divider]} />

        <TouchableOpacity
          style={styles.signOutRow}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <View style={styles.settingLabelGroup}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={[styles.infoLabel, { color: '#FF3B30', fontWeight: '600' }]}>
              Sign Out
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {/* Database & Realtime Status */}
      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
        Database & Sync
      </Text>
      <View style={[styles.card, dynamicStyles.card]}>
        <View style={styles.infoRow}>
          <View style={styles.settingLabelGroup}>
            <Ionicons name="server-outline" size={20} color="#208AEF" />
            <Text style={[styles.infoLabel, dynamicStyles.textPrimary]}>Database Isolation</Text>
          </View>
          <Text style={[styles.infoValue, { color: '#34C759', fontWeight: '600' }]}>Private User RLS</Text>
        </View>
        <View style={[styles.divider, dynamicStyles.divider]} />
        <View style={styles.infoRow}>
          <View style={styles.settingLabelGroup}>
            <Ionicons name="pulse-outline" size={20} color={syncStatus === 'connected' ? '#34C759' : '#FF9500'} />
            <Text style={[styles.infoLabel, dynamicStyles.textPrimary]}>Realtime Sync</Text>
          </View>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    syncStatus === 'connected'
                      ? '#34C759'
                      : syncStatus === 'syncing'
                      ? '#FF9500'
                      : syncStatus === 'error'
                      ? '#FF3B30'
                      : '#8E8E93',
                },
              ]}
            />
            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    syncStatus === 'connected'
                      ? '#34C759'
                      : syncStatus === 'syncing'
                      ? '#FF9500'
                      : '#8E8E93',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                },
              ]}
            >
              {syncStatus}
            </Text>
          </View>
        </View>
        <View style={[styles.divider, dynamicStyles.divider]} />
        <TouchableOpacity
          style={styles.syncBtnRow}
          onPress={() => refreshLists()}
          disabled={isLoading}
        >
          <Text style={[styles.syncBtnText, { color: '#208AEF' }]}>
            {isLoading ? 'Syncing...' : 'Force Sync with Supabase'}
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#208AEF" />
          ) : (
            <Ionicons name="refresh" size={18} color="#208AEF" />
          )}
        </TouchableOpacity>
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
        <View style={styles.aboutBrandRow}>
          <Image
            source={require('../../../assets/Branding/logo.png')}
            style={styles.aboutLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.aboutBrandTitle, dynamicStyles.textPrimary]}>Listrr</Text>
            <Text style={[styles.aboutBrandSubtitle, dynamicStyles.textSecondary]}>
              Private Multi-Tenant Workspace
            </Text>
          </View>
        </View>
        <View style={[styles.divider, dynamicStyles.divider]} />
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
            Multi-Tenant Security
          </Text>
          <Text style={[styles.infoValue, { color: '#34C759', fontWeight: '500' }]}>
            Row-Level Security Active
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: '5%', paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    fontWeight: '800',
    color: '#208AEF',
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
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel: { fontSize: 15 },
  infoValue: { fontSize: 15 },
  statusPill: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  syncBtnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
  syncBtnText: { fontSize: 15, fontWeight: '600' },
  signOutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  aboutBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  aboutLogo: { width: 36, height: 36, borderRadius: 8 },
  aboutBrandTitle: { fontSize: 16, fontWeight: '700' },
  aboutBrandSubtitle: { fontSize: 12, marginTop: 1 },
  divider: { height: 1, marginVertical: 10 },
});