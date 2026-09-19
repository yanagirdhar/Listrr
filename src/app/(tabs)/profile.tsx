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
import * as ImageManipulator from 'expo-image-manipulator';
import { useLists } from '../../context/ListContext';
import { useAuth } from '../../context/AuthContext';

const MAX_AVATAR_SIZE_BYTES = 200 * 1024;

const normalizeHeicAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
  const mimeType = (asset.mimeType || 'image/jpeg').toLowerCase();
  const isHeic = ['image/heic', 'image/heif', 'image/heif-sequence'].includes(mimeType);

  if (!isHeic && mimeType !== 'image/jpeg' && mimeType !== 'image/png' && mimeType !== 'image/webp') {
    return {
      base64: asset.base64 || '',
      mimeType: 'image/jpeg',
    };
  }

  if (isHeic || mimeType === 'image/webp') {
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1200 } }],
      {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    return {
      base64: manipulated.base64 || '',
      mimeType: 'image/jpeg',
    };
  }

  return {
    base64: asset.base64 || '',
    mimeType: mimeType === 'image/png' ? 'image/png' : 'image/jpeg',
  };
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, username, email, avatarUrl, signOut, updateAvatar, deleteAccount } = useAuth();
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { lists, isDarkMode, toggleDarkMode } = useLists();
  const { width } = useWindowDimensions();

  const archivedCount = lists.filter((l) => l.isArchived).length;
  const totalLists = lists.length;
  const totalItems = lists.reduce((acc, list) => acc + list.items.length, 0);
  const completedItems = lists.reduce(
    (acc, list) => acc + list.items.filter((item) => item.isCompleted).length,
    0
  );

  const avatarSize = Math.min(width * 0.2, 80);

  const dynamicStyles = {
    container: { backgroundColor: isDarkMode ? '#121212' : '#F2F2F7' },
    card: { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' },
    textPrimary: { color: isDarkMode ? '#FFFFFF' : '#000000' },
    textSecondary: { color: isDarkMode ? '#A0A0A0' : '#8E8E93' },
    divider: { backgroundColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' },
  };

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

      const normalized = await normalizeHeicAvatar(selectedAsset);

      if (!normalized.base64) {
        const errorMsg = 'Could not read the selected image. Please try a different photo.';
        setAvatarError(errorMsg);
        return;
      }

      setIsUpdatingAvatar(true);

      const { error } = await updateAvatar({
        base64: normalized.base64,
        mimeType: normalized.mimeType,
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

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined' ? window.confirm('Are you sure you want to sign out?') : true;
      if (confirmed) await signOut();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => await signOut() },
      ]);
    }
  };

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
      const confirmed =
        typeof window !== 'undefined' ? window.confirm(message) : true;
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

        {avatarError && <Text style={styles.avatarErrorText}>{avatarError}</Text>}
      </View>

      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>Preferences</Text>
      <View style={[styles.card, dynamicStyles.card]}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabelGroup}>
            <Ionicons
              name={isDarkMode ? 'moon' : 'sunny'}
              size={20}
              color={isDarkMode ? '#FFD60A' : '#FF9500'}
            />
            <Text style={[styles.settingLabel, dynamicStyles.textPrimary]}>Dark Mode</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#767577', true: '#208AEF' }}
            thumbColor={isDarkMode ? '#FFFFFF' : '#F4F3F4'}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, dynamicStyles.textSecondary]}>Account</Text>
      <View style={[styles.card, dynamicStyles.card]}>
        <TouchableOpacity style={styles.settingRow} onPress={handleSignOut} activeOpacity={0.7}>
          <View style={styles.settingLabelGroup}>
            <Ionicons name="log-out-outline" size={20} color="#FF9500" />
            <Text style={[styles.settingLabel, dynamicStyles.textPrimary]}>Sign Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={dynamicStyles.textSecondary.color} />
        </TouchableOpacity>

        <View style={[styles.divider, dynamicStyles.divider]} />

        <TouchableOpacity style={styles.settingRow} onPress={handleDeleteAccount} activeOpacity={0.7}>
          <View style={styles.settingLabelGroup}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>Delete Account</Text>
          </View>
          {deleting ? <ActivityIndicator size="small" color="#FF3B30" /> : null}
        </TouchableOpacity>
      </View>

      <View style={[styles.statsCard, dynamicStyles.card]}>
        <Text style={[styles.statsTitle, dynamicStyles.textPrimary]}>Overview</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, dynamicStyles.textPrimary]}>{totalLists}</Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Lists</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, dynamicStyles.textPrimary]}>{totalItems}</Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Items</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, dynamicStyles.textPrimary]}>{completedItems}</Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Done</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, dynamicStyles.textPrimary]}>{archivedCount}</Text>
            <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>Archived</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: { borderWidth: 2, borderColor: '#208AEF', marginBottom: 12 },
  userName: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  userEmail: { fontSize: 14, marginBottom: 12 },
  avatarActionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarActionText: { color: '#208AEF', fontWeight: '600' },
  avatarActionDivider: { marginHorizontal: 8 },
  avatarErrorText: { color: '#FF3B30', marginTop: 8, textAlign: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  card: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  settingLabelGroup: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { marginLeft: 12, fontSize: 16, fontWeight: '500' },
  divider: { height: 1, width: '100%' },
  statsCard: { borderRadius: 12, padding: 16, marginTop: 4 },
  statsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
});