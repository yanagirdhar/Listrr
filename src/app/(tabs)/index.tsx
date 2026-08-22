import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLists } from '../../context/ListContext';
import { List } from '../../types/list';

export default function ListsScreen() {
  const { lists, isDarkMode, togglePinList, deleteList, toggleItemComplete } = useLists();
  const [selectedTag, setSelectedTag] = useState<string>('All');

  const rawTags = lists.map((l) => l.tag).filter((t): t is string => Boolean(t));
  const tags = ['All', ...Array.from(new Set(rawTags))];

  const filteredLists = lists.filter((list) => {
    if (selectedTag === 'All') return true;
    return list.tag === selectedTag;
  });

  const sortedLists = [...filteredLists].sort((a, b) => {
    if (a.isPinned === b.isPinned) return 0;
    return a.isPinned ? -1 : 1;
  });

  const theme = {
    bg: isDarkMode ? '#121212' : '#F2F2F7',
    filterBg: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    cardBg: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    textPrimary: isDarkMode ? '#FFFFFF' : '#000000',
    textSecondary: isDarkMode ? '#A0A0A0' : '#8E8E93',
    chipBg: isDarkMode ? '#2C2C2E' : '#E5E5EA',
    chipText: isDarkMode ? '#FFFFFF' : '#000000',
    tagBadgeBg: isDarkMode ? '#1A385C' : '#E6F4FE',
  };

  const renderListItem = ({ item: list }: { item: List }) => (
    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text
            style={[styles.cardTitle, { color: theme.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {list.title}
          </Text>
          {list.tag && (
            <View style={[styles.tagBadge, { backgroundColor: theme.tagBadgeBg }]}>
              <Text style={styles.tagText} numberOfLines={1}>
                {list.tag}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => togglePinList(list.id)} style={styles.iconBtn}>
            <Ionicons
              name={list.isPinned ? 'pin' : 'pin-outline'}
              size={20}
              color={list.isPinned ? '#208AEF' : theme.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteList(list.id)} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.itemsContainer}>
        {list.items.map((item, index) => (
          <Pressable
            key={item.id}
            style={styles.itemRow}
            onPress={() => list.type === 'checklist' && toggleItemComplete(list.id, item.id)}
          >
            {list.type === 'checklist' && (
              <Ionicons
                name={item.isCompleted ? 'checkbox' : 'square-outline'}
                size={20}
                color={item.isCompleted ? '#34C759' : theme.textSecondary}
                style={styles.checkIcon}
              />
            )}
            {list.type === 'numbered' && (
              <Text style={[styles.typeIndicator, { color: theme.textSecondary }]}>
                {index + 1}.{' '}
              </Text>
            )}
            {list.type === 'bulleted' && (
              <Text style={[styles.typeIndicator, { color: theme.textSecondary }]}>• </Text>
            )}
            <Text
              style={[
                styles.itemText,
                { color: theme.textPrimary },
                item.isCompleted && styles.completedText,
              ]}
            >
              {item.text}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
      <View style={[styles.filterContainer, { backgroundColor: theme.filterBg }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={tags}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: theme.chipBg },
                selectedTag === item && styles.chipActive,
              ]}
              onPress={() => setSelectedTag(item)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: theme.chipText },
                  selectedTag === item && styles.chipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={sortedLists}
        keyExtractor={(item) => item.id}
        renderItem={renderListItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={60} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No lists found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterContainer: { paddingVertical: 12, paddingHorizontal: '4%' },
  chip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  chipActive: { backgroundColor: '#208AEF' },
  chipText: { fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },
  listContent: { padding: '4%' },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', flexShrink: 1 },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 12, color: '#208AEF', fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 2 },
  itemsContainer: { gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  checkIcon: { marginRight: 8 },
  typeIndicator: { fontSize: 15, fontWeight: '600' },
  itemText: { fontSize: 15, flex: 1 },
  completedText: { textDecorationLine: 'line-through', opacity: 0.5 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: '20%' },
  emptyText: { marginTop: 12, fontSize: 16 },
});