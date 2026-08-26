import React, { useState } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useLists } from '../../context/ListContext';
import { useAuth } from '../../context/AuthContext';

const MAX_AVATAR_SIZE_BYTES = 500 * 1024; // 500 KB limit

export default function ProfileScreen() {
  const router = useRouter();
  const { user, username, email, avatarUrl, signOut, updateAvatar, deleteAccount } = useAuth();
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  
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
  const avatarSize = Math.min(width * 0.22, 90);

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

  // Cross-platform Sign Out handler
  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmSignOut =
        typeof window !== 'undefined'
          ? window.confirm('Are you sure you want to sign out?')
          : true;
      if (confirmSignOut) {
        await signOut();
      }
    } else {
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
    }
  };

  // Cross-platform Account Deletion handler (Apple App Store Guideline 5.1.1(v))
  const handleDeleteAccount = async () => {
    const message =
      'Are you sure you want to delete your account? All your lists and account data will be permanently removed. This action cannot be undone.';
    if (Platform.OS === 'web') {
      const confirmDelete =
        typeof window !== 'undefined'
          ? window.confirm(message)
          : true;
      if (confirmDelete) {
        await deleteAccount();
      }
    } else {
      Alert.alert(
        'Delete Account',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteAccount();
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  // Handle Pick Profile Picture with < 500 KB constraint
  const handlePickAvatar = async () => {
    setAvatarError(null);

    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        const msg = 'Please grant photo library permissions to change your avatar.';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Permission Required', msg);
        return;
      }

      // Launch image picker with square crop
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedAsset = result.assets[0];
      
      // Calculate byte size (base64 length * 0.75 or fileSize)
      let estimatedSizeBytes = selectedAsset.fileSize || 0;
      if (!estimatedSizeBytes && selectedAsset.base64) {
        estimatedSizeBytes = Math.round(selectedAsset.base64.length * 0.75);
      }

      // Enforce 500 KB limit strictly
      if (estimatedSizeBytes > MAX_AVATAR_SIZE_BYTES) {
        const sizeInKb = (estimatedSizeBytes / 1024).toFixed(0);
        const errorMsg = `Image size (${sizeInKb} KB) exceeds the 500 KB limit. Please choose a smaller image.`;
        setAvatarError(errorMsg);
        if (Platform.OS === 'web') alert(errorMsg);
        else Alert.alert('Image Too Large', errorMsg);
        return;
      }

      setIsUpdatingAvatar(true);

      // Create data URI
      const dataUri = selectedAsset.base64
        ? `data:image/jpeg;base64,${selectedAsset.base64}`
        : selectedAsset.uri;

      await updateAvatar(dataUri);
    } catch (err: any) {
      console.error('Error selecting avatar:', err);
      setAvatarError(err.message || 'Failed to update profile picture.');
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  // Handle Remove Profile Picture
  const handleRemoveAvatar = async () => {
    setIsUpdatingAvatar(true);
    try {
      await updateAvatar(null);
    } catch (err) {
      console.warn('Error removing avatar:', err);
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, dynamicStyles.container]}
      contentContainerStyle={styles.content}
    >
      {/* Profile avatar with edit badge & user info */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            style={[
              styles.avatar,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
                backgroundColor: isDarkMode ? '#1A385C' : '#E6F4FE',
              },
            ]}
            onPress={handlePickAvatar}
            disabled={isUpdatingAvatar}
            activeOpacity={0.8}
          >
            {isUpdatingAvatar ? (
              <ActivityIndicator size="small" color="#208AEF" />
            ) : avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={[
                  styles.avatarImage,
                  {
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarSize / 2,
                  },
                ]}
              />
            ) : (
              <Text style={[styles.avatarInitials, { fontSize: avatarSize * 0.38 }]}>
                {initials}
              </Text>
            )}
          </TouchableOpacity>

          {/* Edit Camera Badge */}
          <TouchableOpacity
            style={styles.cameraBadge}
            onPress={handlePickAvatar}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.userName, dynamicStyles.textPrimary]}>{username}</Text>
        <Text style={[styles.userEmail, dynamicStyles.textSecondary]}>
          {email || 'Authenticated User'}
        </Text>

        {/* Change / Remove photo action row */}
        <View style={styles.avatarActionsRow}>
          <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarActionBtn}>
            <Text style={styles.avatarActionText}>Change Photo (max 500KB)</Text>
          </TouchableOpacity>
          {avatarUrl && (
            <>
              <Text style={styles.avatarActionDivider}>•</Text>
              <TouchableOpacity onPress={handleRemoveAvatar} style={styles.avatarActionBtn}>
                <Text style={[styles.avatarActionText, { color: '#FF3B30' }]}>Remove</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {avatarError && (
          <Text style={styles.avatarErrorText}>{avatarError}</Text>
        )}
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

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutRow}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <View style={styles.settingLabelGroup}>
            <Ionicons name="log-out-outline" size={20} color="#FF9500" />
            <Text style={[styles.infoLabel, { color: '#FF9500', fontWeight: '600' }]}>
              Sign Out
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FF9500" />
        </TouchableOpacity>

        <View style={[styles.divider, dynamicStyles.divider]} />

        {/* Delete Account Button (Apple Guideline 5.1.1(v)) */}
        <TouchableOpacity
          style={styles.signOutRow}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <View style={styles.settingLabelGroup}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={[styles.infoLabel, { color: '#FF3B30', fontWeight: '600' }]}>
              Delete Account & Data
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
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontWeight: '800',
    color: '#208AEF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#208AEF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  userName: { fontSize: 20, fontWeight: 'bold' },
  userEmail: { fontSize: 14, marginTop: 2 },
  avatarActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  avatarActionBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  avatarActionText: {
    fontSize: 13,
    color: '#208AEF',
    fontWeight: '600',
  },
  avatarActionDivider: {
    color: '#8E8E93',
  },
  avatarErrorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 6,
    textAlign: 'center',
  },
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