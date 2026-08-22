import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLists } from '../../context/ListContext';
import { List } from '../../types/list';
import { ListSearchIndex } from '../../utils/searchIndex';

const ListCard = React.memo(({ 
  item, 
  drag, 
  isActive, 
  theme, 
  onTogglePin, 
  onToggleComplete,
  onOpenDetail,
}: {
  item: List;
  drag: () => void;
  isActive: boolean;
  theme: any;
  onTogglePin: (id: string) => void;
  onToggleComplete: (listId: string, itemId: string) => void;
  onOpenDetail: (id: string) => void;
}) => {
  return (
    <ScaleDecorator>
      <View style={[styles.card, { backgroundColor: theme.cardBg }, isActive && styles.activeCard]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity onLongPress={drag} delayLongPress={100} style={styles.dragHandle}>
            <Ionicons name="menu-outline" size={22} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerLeft} 
            activeOpacity={0.7} 
            onPress={() => onOpenDetail(item.id)}
          >
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.tag && (
              <View style={[styles.tagBadge, { backgroundColor: theme.tagBadgeBg }]}>
                <Text style={styles.tagText} numberOfLines={1}>{item.tag}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => onTogglePin(item.id)} style={styles.iconBtn}>
              <Ionicons
                name={item.isPinned ? 'pin' : 'pin-outline'}
                size={20}
                color={item.isPinned ? '#208AEF' : theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={() => onOpenDetail(item.id)}>
          <View style={styles.itemsContainer}>
            {item.items.map((subItem, index) => (
              <Pressable
                key={subItem.id}
                style={styles.itemRow}
                onPress={() => item.type === 'checklist' && onToggleComplete(item.id, subItem.id)}
              >
                {item.type === 'checklist' && (
                  <Ionicons
                    name={subItem.isCompleted ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={subItem.isCompleted ? '#34C759' : theme.textSecondary}
                    style={styles.checkIcon}
                  />
                )}
                {item.type === 'numbered' && (
                  <Text style={[styles.typeIndicator, { color: theme.textSecondary }]}>{index + 1}. </Text>
                )}
                {item.type === 'bulleted' && (
                  <Text style={[styles.typeIndicator, { color: theme.textSecondary }]}>• </Text>
                )}
                <Text style={[styles.itemText, { color: theme.textPrimary }, subItem.isCompleted && styles.completedText]}>
                  {subItem.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </TouchableOpacity>
      </View>
    </ScaleDecorator>
  );
});

export default function ArchivedListsScreen() {
  const router = useRouter();
  const { lists, isDarkMode, togglePinList, toggleItemComplete, reorderLists } = useLists();
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Target ONLY archived lists
  const archivedLists = useMemo(() => lists.filter((l) => l.isArchived), [lists]);
  const searchIndex = useMemo(() => new ListSearchIndex(archivedLists), [archivedLists]);

  const searchMatchingIds = useMemo(() => {
    return searchIndex.search(searchQuery);
  }, [searchIndex, searchQuery]);

  const filteredLists = useMemo(() => {
    return archivedLists.filter((list) => {
      const matchesTag = selectedTag === 'All' || list.tag === selectedTag;
      const matchesSearch = searchMatchingIds === null || searchMatchingIds.has(list.id);
      return matchesTag && matchesSearch;
    });
  }, [archivedLists, selectedTag, searchMatchingIds]);

  const rawTags = archivedLists.map((l) => l.tag).filter((t): t is string => Boolean(t));
  const tags = useMemo(() => ['All', ...Array.from(new Set(rawTags))], [archivedLists]);

  const pinnedLists = useMemo(() => filteredLists.filter((l) => l.isPinned), [filteredLists]);
  const unpinnedLists = useMemo(() => filteredLists.filter((l) => !l.isPinned), [filteredLists]);

  const handleDragEndPinned = useCallback(
    ({ data }: { data: List[] }) => {
      const nonArchived = lists.filter((l) => !l.isArchived);
      const unpinnedArchived = archivedLists.filter((l) => !l.isPinned);
      reorderLists([...nonArchived, ...data, ...unpinnedArchived]);
    },
    [lists, archivedLists, reorderLists]
  );

  const handleDragEndUnpinned = useCallback(
    ({ data }: { data: List[] }) => {
      const nonArchived = lists.filter((l) => !l.isArchived);
      const pinnedArchived = archivedLists.filter((l) => l.isPinned);
      reorderLists([...nonArchived, ...pinnedArchived, ...data]);
    },
    [lists, archivedLists, reorderLists]
  );

  const theme = useMemo(() => ({
    bg: isDarkMode ? '#121212' : '#F2F2F7',
    filterBg: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    cardBg: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    textPrimary: isDarkMode ? '#FFFFFF' : '#000000',
    textSecondary: isDarkMode ? '#A0A0A0' : '#8E8E93',
    chipBg: isDarkMode ? '#2C2C2E' : '#E5E5EA',
    chipText: isDarkMode ? '#FFFFFF' : '#000000',
    tagBadgeBg: isDarkMode ? '#1A385C' : '#E6F4FE',
    sectionHeader: isDarkMode ? '#8E8E93' : '#6C6C70',
    searchBg: isDarkMode ? '#2C2C2E' : '#E5E5EA',
  }), [isDarkMode]);

  const renderListItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<List>) => (
      <ListCard
        item={item}
        drag={drag}
        isActive={isActive}
        theme={theme}
        onTogglePin={togglePinList}
        onToggleComplete={toggleItemComplete}
        onOpenDetail={(id) => router.push(`/list/${id}` as const)}
      />
    ),
    [theme, togglePinList, toggleItemComplete, router]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['bottom']}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={[styles.searchContainer, { backgroundColor: theme.searchBg }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search archived lists..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        {/* Filter Bar */}
        <View style={[styles.filterContainer, { backgroundColor: theme.filterBg }]}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={tags}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: theme.chipBg }, selectedTag === item && styles.chipActive]}
                onPress={() => setSelectedTag(item)}
              >
                <Text style={[styles.chipText, { color: theme.chipText }, selectedTag === item && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {filteredLists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="archive-outline" size={60} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No archived lists found</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {pinnedLists.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.sectionHeader }]}>📌 PINNED ARCHIVED</Text>
                <DraggableFlatList
                  data={pinnedLists}
                  onDragEnd={handleDragEndPinned}
                  keyExtractor={(item) => item.id}
                  renderItem={renderListItem}
                  scrollEnabled={false}
                />
              </View>
            )}

            {unpinnedLists.length > 0 && (
              <View style={styles.section}>
                {pinnedLists.length > 0 && (
                  <Text style={[styles.sectionTitle, { color: theme.sectionHeader }]}>OTHER ARCHIVED LISTS</Text>
                )}
                <DraggableFlatList
                  data={unpinnedLists}
                  onDragEnd={handleDragEndUnpinned}
                  keyExtractor={(item) => item.id}
                  renderItem={renderListItem}
                  scrollEnabled={false}
                />
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchSection: { paddingHorizontal: '4%', paddingTop: 8, paddingBottom: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, height: 38 },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  filterContainer: { paddingVertical: 8, paddingHorizontal: '4%' },
  chip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  chipActive: { backgroundColor: '#208AEF' },
  chipText: { fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },
  listContent: { padding: '4%' },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 4, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  activeCard: { opacity: 0.9, elevation: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dragHandle: { paddingRight: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
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