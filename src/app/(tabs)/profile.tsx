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

// Matches the 'avatars' Storage bucket's file_size_limit (204800 bytes) set
// in supabase/schema.sql (section 6) — keep these two in sync.
const MAX_AVATAR_SIZE_BYTES = 200 * 1024; // 200 KB limit

export default function ProfileScreen() {
  const router = useRouter();

  // Real auth-backed identity + account actions
  const { user, username, email, avatarUrl, signOut, updateAvatar, deleteAccount } = useAuth();
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // Pick a new profile photo, enforce the 200KB limit, and hand it to
  // AuthContext to upload to Supabase Storage (see updateAvatar).
  const handlePickAvatar = async () => {
    setAvatarError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const selectedAsset = result.assets[0];
      let estimatedSizeBytes = selectedAsset.fileSize || 0;
      if (!estimatedSizeBytes && selectedAsset.base64) {
        estimatedSizeBytes = Math.round(selectedAsset.base64.length * 0.75);
      }

      if (estimatedSizeBytes > MAX_AVATAR_SIZE_BYTES) {
        const sizeInKb = (estimatedSizeBytes / 1024).toFixed(0);
        const errorMsg = `Image size (${sizeInKb} KB) exceeds the 200 KB limit. Please choose a smaller image.`;
        setAvatarError(errorMsg);
        if (Platform.OS === 'web') alert(errorMsg);
        else Alert.alert('Image Too Large', errorMsg);
        return;
      }

      if (!selectedAsset.base64) {
        const errorMsg = 'Could not read the selected image. Please try a different photo.';
        setAvatarError(errorMsg);
        return;
      }

      setIsUpdatingAvatar(true);
      const { error } = await updateAvatar({
        base64: selectedAsset.base64,
        mimeType: selectedAsset.mimeType || 'image/jpeg',
      });
      if (error) {
        setAvatarError(error.message || 'Failed to update profile picture.');
      }
    } catch (err: any) {
      console.error('Error selecting avatar:', err);
      setAvatarError(err.message || 'Failed to update profile picture.');
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  // Remove the current profile photo
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

  // Cross-platform sign out confirmation
  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to sign out?') : true;
      if (confirmed) await signOut();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => await signOut() },
      ]);
    }
  };

  // Cross-platform account deletion confirmation. Delegates to
  // AuthContext.deleteAccount(), which calls the server-side 'delete-account'
  // Edge Function (service-role key stays server-side) and also clears this
  // user's locally cached list data — doing both here inline previously
  // meant the AsyncStorage cache for the deleted account was never cleared.
  const handleDeleteAccount = async () => {
    const message = 'This will permanently delete your account, lists, and uploaded avatar. This action cannot be undone.';

    const performDelete = async () => {
      try {
        setDeleting(true);
        const { error } = await deleteAccount();
        if (error) throw error;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to delete account.';
        if (Platform.OS === 'web') alert(errorMsg);
        else Alert.alert('Error', errorMsg);
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(message) : true;
      if (confirmed) await performDelete();
    } else {
      Alert.alert('Delete Account', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  return (
    <ScrollView
      style={[styles.container, dynamicStyles.container]}
      contentContainerStyle={styles.content}
    >
      {/* Profile avatar and user info */}
      <View style={styles.profileHeader}>
        <TouchableOpacity
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: isDarkMode ? '#1A385C' : '#E6F4FE',
              overflow: 'hidden',
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
              style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
            />
          ) : (
            <Ionicons name="person" size={avatarSize * 0.5} color="#208AEF" />
          )}
        </TouchableOpacity>
        <Text style={[styles.userName, dynamicStyles.textPrimary]}>{username}</Text>
        <Text style={[styles.userEmail, dynamicStyles.textSecondary]}>
          {email || 'Authenticated User'}
        </Text>

        {/* Change / remove photo — minimal text links, same typography scale as the rest of the app */}
        <View style={styles.avatarActionsRow}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={isUpdatingAvatar}>
            <Text style={styles.avatarActionText}>Change Photo</Text>
          </TouchableOpacity>
          {avatarUrl && (
            <>
              <Text style={[styles.avatarActionDivider, dynamicStyles.textSecondary]}> • </Text>
              <TouchableOpacity onPress={handleRemoveAvatar} disabled={isUpdatingAvatar}>
                <Text style={[styles.avatarActionText, { color: '#FF3B30' }]}>Remove</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {avatarError && (
          <Text style={styles.avatarErrorText}>{avatarError}</Text>
        )}
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

      {/* Account actions — reuses the same card/settingRow pattern as everything else on this screen */}
      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>
        Account
      </Text>
      <View style={[styles.card, dynamicStyles.card]}>
        <TouchableOpacity style={styles.settingRow} onPress={handleSignOut} activeOpacity={0.7}>
          <View style={styles.settingLabelGroup}>
            <Ionicons name="log-out-outline" size={20} color="#FF9500" />
            <Text style={[styles.settingLabel, { color: '#FF9500' }]}>Sign Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FF9500" />
        </TouchableOpacity>
        <View style={[styles.divider, dynamicStyles.divider]} />
        <TouchableOpacity 
          style={styles.settingRow} 
          onPress={handleDeleteAccount} 
          disabled={deleting}
          activeOpacity={0.7}
        >
          <View style={styles.settingLabelGroup}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>Delete Account</Text>
          </View>
          {deleting ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="#FF3B30" />
          )}
        </TouchableOpacity>
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
  avatarActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  avatarActionText: { fontSize: 13, fontWeight: '600', color: '#208AEF' },
  avatarActionDivider: { fontSize: 13 },
  avatarErrorText: { fontSize: 12, color: '#FF3B30', marginTop: 6, textAlign: 'center' },
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