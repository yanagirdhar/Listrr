import { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLists } from '../../context/ListContext';

export default function ListDetailScreen() {
  // Get list ID from route params
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();

  // Access global lists state and mutation methods
  const {
    lists,
    isDarkMode,
    toggleArchiveList,
    deleteList,
    toggleItemComplete,
  } = useLists();

  // Feedback toast state for clipboard copy action
  const [copiedToast, setCopiedToast] = useState(false);

  // Find target list object matching route parameter
  const currentList = lists.find((l) => l.id === id);

  // Dynamic theme styling object
  const theme = {
    bg: isDarkMode ? '#121212' : '#FFFFFF',
    textPrimary: isDarkMode ? '#FFFFFF' : '#000000',
    textSecondary: isDarkMode ? '#A0A0A0' : '#8E8E93',
    tagBg: isDarkMode ? '#1A385C' : '#E6F4FE',
    border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
  };

  // Copy list title and formatted item content to clipboard
  const handleCopyData = async () => {
    if (!currentList) return;

    const textToCopy =
      `${currentList.title}\n\n` +
      currentList.items
        .map((item, idx) => {
          if (currentList.type === 'checklist') {
            return `[${item.isCompleted ? 'x' : ' '}] ${item.text}`;
          }

          if (currentList.type === 'numbered') {
            return `${idx + 1}. ${item.text}`;
          }

          return `• ${item.text}`;
        })
        .join('\n');

    await Clipboard.setStringAsync(textToCopy);

    setCopiedToast(true);

    setTimeout(() => {
      setCopiedToast(false);
    }, 2000);
  };

  // Navigate to separate edit screen with current list ID
  const handleEdit = () => {
    if (!currentList) return;

    router.push({
      pathname: '/edit',
      params: {
        id: currentList.id,
      },
    });
  };

  // Toggle archive status and return to previous screen
  const handleArchive = () => {
    if (!currentList) return;

    toggleArchiveList(currentList.id);
    router.back();
  };

  // Delete list and return to previous screen
  const handleDelete = () => {
    if (!currentList) return;

    deleteList(currentList.id);
    router.back();
  };

  // Set header action buttons dynamically
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          {/* Edit */}
          <TouchableOpacity
            onPress={handleEdit}
            style={styles.headerBtn}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color="#208AEF"
            />
          </TouchableOpacity>

          {/* Copy */}
          <TouchableOpacity
            onPress={handleCopyData}
            style={styles.headerBtn}
          >
            <Ionicons
              name="copy-outline"
              size={20}
              color="#208AEF"
            />
          </TouchableOpacity>

          {/* Archive */}
          <TouchableOpacity
            onPress={handleArchive}
            style={styles.headerBtn}
          >
            <Ionicons
              name={
                currentList?.isArchived
                  ? 'archive'
                  : 'archive-outline'
              }
              size={20}
              color="#FF9500"
            />
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.headerBtn}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color="#FF3B30"
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, currentList]);

  // Fallback view if list does not exist or was deleted
  if (!currentList) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.bg },
        ]}
      >
        <Text style={{ color: theme.textSecondary }}>
          List not found.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg },
      ]}
    >
      {/* Toast banner indicating content was copied */}
      {copiedToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>
            Copied to clipboard!
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title and optional tag badge */}
        <Text
          style={[
            styles.title,
            { color: theme.textPrimary },
          ]}
        >
          {currentList.title}
        </Text>

        {currentList.tag && (
          <View
            style={[
              styles.tagBadge,
              { backgroundColor: theme.tagBg },
            ]}
          >
            <Text style={styles.tagText}>
              {currentList.tag}
            </Text>
          </View>
        )}

        {/* Item listing section */}
        <View style={styles.itemsWrapper}>
          {currentList.items.map((subItem, index) => (
            <Pressable
              key={subItem.id}
              style={[
                styles.itemRow,
                {
                  borderBottomColor: theme.border,
                },
              ]}
              onPress={() =>
                currentList.type === 'checklist' &&
                toggleItemComplete(
                  currentList.id,
                  subItem.id
                )
              }
            >
              {/* Checkbox indicator */}
              {currentList.type === 'checklist' && (
                <Ionicons
                  name={
                    subItem.isCompleted
                      ? 'checkbox'
                      : 'square-outline'
                  }
                  size={22}
                  color={
                    subItem.isCompleted
                      ? '#34C759'
                      : theme.textSecondary
                  }
                  style={styles.icon}
                />
              )}

              {/* Number prefix */}
              {currentList.type === 'numbered' && (
                <Text
                  style={[
                    styles.typeIndicator,
                    { color: theme.textSecondary },
                  ]}
                >
                  {index + 1}.{' '}
                </Text>
              )}

              {/* Bullet prefix */}
              {currentList.type === 'bulleted' && (
                <Text
                  style={[
                    styles.typeIndicator,
                    { color: theme.textSecondary },
                  ]}
                >
                  •{' '}
                </Text>
              )}

              {/* Item label */}
              <Text
                style={[
                  styles.itemText,
                  { color: theme.textPrimary },
                  subItem.isCompleted &&
                    styles.completedText,
                ]}
              >
                {subItem.text}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    padding: 20,
  },

  headerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  headerBtn: {
    padding: 4,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },

  tagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 20,
  },

  tagText: {
    color: '#208AEF',
    fontSize: 13,
    fontWeight: '600',
  },

  itemsWrapper: {
    marginTop: 8,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  icon: {
    marginRight: 10,
  },

  typeIndicator: {
    fontSize: 16,
    fontWeight: '600',
  },

  itemText: {
    fontSize: 16,
    flex: 1,
  },

  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },

  toast: {
    backgroundColor: '#34C759',
    paddingVertical: 10,
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },

  toastText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});