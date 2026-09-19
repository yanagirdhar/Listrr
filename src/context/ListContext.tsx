import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { List, ListItem, ListType } from '../types/list';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth, listCacheKeyForUser } from './AuthContext';

export type SyncStatus = 'connected' | 'offline' | 'unconfigured' | 'syncing' | 'error';

// Safe cross-platform UUID v4 generator
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Check if string is a valid UUID
export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// Type definition for context state and helper actions
export interface ListContextType {
  lists: List[];
  isLoading: boolean;
  isDarkMode: boolean;
  isConfigured: boolean;
  syncStatus: SyncStatus;
  errorMessage: string | null;
  toggleDarkMode: () => void;
  refreshLists: () => Promise<void>;
  addList: (title: string, type: ListType, tag?: string, items?: string[]) => Promise<void>;
  updateList: (id: string, title: string, type: ListType, tag?: string, items?: string[]) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  togglePinList: (id: string) => Promise<void>;
  toggleArchiveList: (id: string) => Promise<void>;
  toggleItemComplete: (listId: string, itemId: string) => Promise<void>;
  addItemToList: (listId: string, text: string) => Promise<void>;
  reorderLists: (newLists: List[]) => Promise<void>;
}

const defaultListContext: ListContextType = {
  lists: [],
  isLoading: true,
  isDarkMode: false,
  isConfigured: isSupabaseConfigured,
  syncStatus: isSupabaseConfigured ? 'syncing' : 'unconfigured',
  errorMessage: null,
  toggleDarkMode: () => {},
  refreshLists: async () => {},
  addList: async () => {},
  updateList: async () => {},
  deleteList: async () => {},
  togglePinList: async () => {},
  toggleArchiveList: async () => {},
  toggleItemComplete: async () => {},
  addItemToList: async () => {},
  reorderLists: async () => {},
};

// React context initialization
const ListContext = createContext<ListContextType>(defaultListContext);

// Helper to transform raw Supabase join rows into frontend List objects
function transformSupabaseRows(data: any[]): List[] {
  return data.map((row) => {
    const rawItems: any[] = row.list_items || [];
    const sortedItems = [...rawItems].sort((a, b) => {
      if (a.position !== undefined && b.position !== undefined && a.position !== b.position) {
        return a.position - b.position;
      }
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

    return {
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      title: row.title || '',
      type: (row.type as ListType) || 'checklist',
      tag: row.tag || 'General',
      isPinned: Boolean(row.is_pinned),
      isArchived: Boolean(row.is_archived),
      position: row.position ?? 0,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at,
      items: sortedItems.map((item) => ({
        id: String(item.id),
        listId: String(item.list_id || row.id),
        text: item.text || '',
        isCompleted: Boolean(item.is_completed),
        position: item.position ?? 0,
        createdAt: item.created_at,
      })),
    };
  });
}

export const ListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(systemColorScheme === 'dark');

  // Database and UI states
  const [lists, setLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isSupabaseConfigured ? 'syncing' : 'unconfigured'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const listsRef = useRef<List[]>(lists);
  listsRef.current = lists;

  const fetchRequestVersionRef = useRef(0);
  const currentUserId = user?.id;

  // last known server-backed snapshot; used for rollback on mutation failures
  const lastGoodSnapshotRef = useRef<List[]>([]);

  const cacheKey = currentUserId
    ? listCacheKeyForUser(currentUserId)
    : '@listrr_cached_lists_v2_guest';

  useEffect(() => {
    setIsDarkMode(systemColorScheme === 'dark');
  }, [systemColorScheme]);

  useEffect(() => {
    lastGoodSnapshotRef.current = lists;
  }, [lists]);

  // Use this as a soft fallback only. Persist only after a successful server mutation.
  const saveToLocalCache = useCallback(async (dataToCache: List[]) => {
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(dataToCache));
    } catch (e) {
      console.warn('Failed to cache lists locally:', e);
    }
  }, [cacheKey]);

  // Load from local AsyncStorage cache for current user
  const loadFromLocalCache = useCallback(async (): Promise<List[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to load cached lists:', e);
    }
    return null;
  }, [cacheKey]);

  // Restore previous server-backed snapshot after a failed mutation
  const rollbackToSnapshot = useCallback(
    async (snapshot: List[]) => {
      const rollbackValue = snapshot.length > 0 ? snapshot : [];
      setLists(rollbackValue);
      listsRef.current = rollbackValue;
      await saveToLocalCache(rollbackValue);
    },
    [saveToLocalCache]
  );

  // Fetch real data from Supabase DB scoped to current authenticated user
  const fetchListsFromDB = useCallback(async (showLoading = false) => {
    if (isAuthLoading) return;

    const requestVersion = ++fetchRequestVersionRef.current;

    if (!currentUserId) {
      setLists([]);
      listsRef.current = [];
      setIsLoading(false);
      setSyncStatus('offline');
      return;
    }

    if (!isSupabaseConfigured) {
      const cached = await loadFromLocalCache();
      const snapshot = cached || [];
      setLists(snapshot);
      listsRef.current = snapshot;
      lastGoodSnapshotRef.current = snapshot;
      setIsLoading(false);
      setSyncStatus('unconfigured');
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }
    setSyncStatus('syncing');

    try {
      const { data, error } = await supabase
        .from('lists')
        .select(`
          *,
          list_items (
            id,
            list_id,
            text,
            is_completed,
            position,
            created_at
          )
        `)
        .eq('user_id', currentUserId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

      if (requestVersion !== fetchRequestVersionRef.current) return;

      if (error) throw error;

      const parsedLists = data ? transformSupabaseRows(data) : [];
      setLists(parsedLists);
      listsRef.current = parsedLists;
      lastGoodSnapshotRef.current = parsedLists;

      // Only cache after successful server confirmation.
      await saveToLocalCache(parsedLists);

      setSyncStatus('connected');
      setErrorMessage(null);
    } catch (err: any) {
      if (requestVersion !== fetchRequestVersionRef.current) return;

      console.error('Error fetching user data from Supabase:', err);
      setSyncStatus('error');

      if (err?.code === '42703' || String(err?.message).includes('lists.user_id does not exist')) {
        setErrorMessage('Database migration required: Please run the latest migrations in supabase/migrations in your Supabase SQL editor.');
      } else {
        setErrorMessage(err.message || 'Failed to fetch your lists from database');
      }

      const cached = await loadFromLocalCache();
      const fallbackSnapshot = cached && cached.length > 0 ? cached : [];
      setLists(fallbackSnapshot);
      listsRef.current = fallbackSnapshot;
      lastGoodSnapshotRef.current = fallbackSnapshot;
    } finally {
      if (requestVersion === fetchRequestVersionRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentUserId, isAuthLoading, loadFromLocalCache, saveToLocalCache]);

  // Initial load and Realtime Postgres Channel subscription when user is authenticated
  useEffect(() => {
    if (isAuthLoading) return;

    if (!currentUserId) {
      setLists([]);
      listsRef.current = [];
      setIsLoading(false);
      return;
    }

    fetchListsFromDB(true);

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`realtime_user_workspace_${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          fetchListsFromDB(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'list_items',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          fetchListsFromDB(false);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setSyncStatus('offline');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, isAuthLoading, fetchListsFromDB]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const refreshLists = async () => {
    await fetchListsFromDB(true);
  };

  // Safe multi-step writes:
  // 1) update local UI optimistically
  // 2) perform server writes
  // 3) if any step fails, revert to the last known good snapshot
  // 4) never persist a failed mutation to AsyncStorage as authoritative
  const addList = async (
    title: string,
    type: ListType,
    tag?: string,
    itemTexts: string[] = []
  ) => {
    if (!currentUserId) return;

    const previousSnapshot = [...lastGoodSnapshotRef.current];
    const listId = generateUUID();
    const tagValue = tag?.trim() || 'General';
    const createdAt = new Date().toISOString();

    const optimisticItems: ListItem[] = itemTexts.map((text, idx) => ({
      id: generateUUID(),
      listId,
      text: text.trim(),
      isCompleted: false,
      position: idx,
      createdAt,
    }));

    const optimisticList: List = {
      id: listId,
      userId: currentUserId,
      title: title.trim(),
      type,
      tag: tagValue,
      isPinned: false,
      isArchived: false,
      position: 0,
      createdAt,
      items: optimisticItems,
    };

    const nextLists = [optimisticList, ...listsRef.current];
    setLists(nextLists);
    listsRef.current = nextLists;

    if (!isSupabaseConfigured) return;

    try {
      const { error: listError } = await supabase.from('lists').insert({
        id: listId,
        user_id: currentUserId,
        title: title.trim(),
        type,
        tag: tagValue,
        is_pinned: false,
        is_archived: false,
        position: 0,
      });

      if (listError) throw listError;

      if (optimisticItems.length > 0) {
        const itemsToInsert = optimisticItems.map((item) => ({
          id: item.id,
          list_id: listId,
          text: item.text,
          is_completed: false,
          position: item.position ?? 0,
        }));

        const { error: itemsError } = await supabase.from('list_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      // Server confirmed; now update local cache.
      const confirmedSnapshot = [...listsRef.current];
      setLists(confirmedSnapshot);
      listsRef.current = confirmedSnapshot;
      lastGoodSnapshotRef.current = confirmedSnapshot;
      await saveToLocalCache(confirmedSnapshot);
      await fetchListsFromDB(false);
    } catch (err: any) {
      console.error('Error adding list to Supabase:', err);
      setErrorMessage(err.message || 'Failed to save list');

      // Revert to the last known good server-backed state, not the bad optimistic state.
      await rollbackToSnapshot(previousSnapshot);
      await fetchListsFromDB(false);
      throw err;
    }
  };

  const updateList = async (
    id: string,
    title: string,
    type: ListType,
    tag?: string,
    itemTexts: string[] = []
  ) => {
    if (!currentUserId) return;

    const previousSnapshot = [...lastGoodSnapshotRef.current];
    const tagValue = tag?.trim() || 'General';

    const targetList = listsRef.current.find((l) => l.id === id);
    const updatedItems: ListItem[] = itemTexts.map((text, idx) => {
      const existing = targetList?.items[idx];
      return {
        id: existing && isValidUUID(existing.id) ? existing.id : generateUUID(),
        listId: id,
        text: text.trim(),
        isCompleted: existing?.isCompleted || false,
        position: idx,
      };
    });

    const nextLists = listsRef.current.map((list) => {
      if (list.id !== id) return list;
      return {
        ...list,
        title: title.trim(),
        type,
        tag: tagValue,
        items: updatedItems,
      };
    });

    setLists(nextLists);
    listsRef.current = nextLists;

    if (!isSupabaseConfigured || !isValidUUID(id)) return;

    try {
      const { error: listError } = await supabase
        .from('lists')
        .update({
          title: title.trim(),
          type,
          tag: tagValue,
        })
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (listError) throw listError;

      const { error: deleteError } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', id);

      if (deleteError) throw deleteError;

      if (updatedItems.length > 0) {
        const itemsToInsert = updatedItems.map((item) => ({
          id: item.id,
          list_id: id,
          text: item.text,
          is_completed: item.isCompleted,
          position: item.position ?? 0,
        }));

        const { error: insertError } = await supabase
          .from('list_items')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      const confirmedSnapshot = [...listsRef.current];
      setLists(confirmedSnapshot);
      listsRef.current = confirmedSnapshot;
      lastGoodSnapshotRef.current = confirmedSnapshot;
      await saveToLocalCache(confirmedSnapshot);
      await fetchListsFromDB(false);
    } catch (err: any) {
      console.error('Error updating list in Supabase:', err);
      setErrorMessage(err.message || 'Failed to update list');

      await rollbackToSnapshot(previousSnapshot);
      await fetchListsFromDB(false);
      throw err;
    }
  };

  const deleteList = async (id: string) => {
    if (!currentUserId) return;

    const previousSnapshot = [...lastGoodSnapshotRef.current];
    const nextLists = listsRef.current.filter((list) => list.id !== id);

    setLists(nextLists);
    listsRef.current = nextLists;

    if (!isSupabaseConfigured || !isValidUUID(id)) return;

    try {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;

      const confirmedSnapshot = [...listsRef.current];
      setLists(confirmedSnapshot);
      listsRef.current = confirmedSnapshot;
      lastGoodSnapshotRef.current = confirmedSnapshot;
      await saveToLocalCache(confirmedSnapshot);
    } catch (err: any) {
      console.error('Error deleting list from Supabase:', err);
      setErrorMessage(err.message || 'Failed to delete list');
      await rollbackToSnapshot(previousSnapshot);
      await fetchListsFromDB(false);
      throw err;
    }
  };

  const togglePinList = async (id: string) => {
    if (!currentUserId) return;

    const previousSnapshot = [...lastGoodSnapshotRef.current];
    let targetNewPinned = true;

    const nextLists = listsRef.current.map((list) => {
      if (list.id === id) {
        targetNewPinned = !list.isPinned;
        return { ...list, isPinned: targetNewPinned };
      }
      return list;
    });

    setLists(nextLists);
    listsRef.current = nextLists;

    if (!isSupabaseConfigured || !isValidUUID(id)) return;

    try {
      const { error } = await supabase
        .from('lists')
        .update({ is_pinned: targetNewPinned })
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;

      const confirmedSnapshot = [...listsRef.current];
      setLists(confirmedSnapshot);
      listsRef.current = confirmedSnapshot;
      lastGoodSnapshotRef.current = confirmedSnapshot;
      await saveToLocalCache(confirmedSnapshot);
    } catch (err: any) {
      console.error('Error toggling pin in Supabase:', err);
      await rollbackToSnapshot(previousSnapshot);
      await fetchListsFromDB(false);
      throw err;
    }
  };

  const toggleArchiveList = async (id: string) => {
    if (!currentUserId) return;

    const previousSnapshot = [...lastGoodSnapshotRef.current];
    let targetNewArchived = true;

    const nextLists = listsRef.current.map((list) => {
      if (list.id === id) {
        targetNewArchived = !list.isArchived;
        return { ...list, isArchived: targetNewArchived };
      }
      return list;
    });

    setLists(nextLists);
    listsRef.current = nextLists;

    if (!isSupabaseConfigured || !isValidUUID(id)) return;

    try {
      const { error } = await supabase
        .from('lists')
        .update({ is_archived: targetNewArchived })
        .eq('id', id)
        .eq('user_id', currentUserId);

      if (error) throw error;

      const confirmedSnapshot = [...listsRef.current];
      setLists(confirmedSnapshot);
      listsRef.current = confirmedSnapshot;
      lastGoodSnapshotRef.current = confirmedSnapshot;
      await saveToLocalCache(confirmedSnapshot);
    } catch (err: any) {
      console.error('Error toggling archive in Supabase:', err);
      await rollbackToSnapshot(previousSnapshot);
      await fetchListsFromDB(false);
      throw err;
    }
  };

  const toggleItemComplete = async (listId: string, itemId: string) => {
    if (!currentUserId) return;

    const previousSnapshot = [...lastGoodSnapshotRef.current];
    let targetNewCompleted: boolean | null = null;

    const nextLists = listsRef.current.map((list) => {
      if (list.id !== listId) return list;

      return {
        ...list,
        items: list.items.map((item) => {
          if (item.id === itemId) {
            const nextCompleted = !item.isCompleted;
            targetNewCompleted = nextCompleted;
            return { ...item, isCompleted: nextCompleted };
          }
          return item;
        }),
      };
    });

    if (targetNewCompleted === null) return;

    setLists(nextLists);
    listsRef.current = nextLists;

    if (!isSupabaseConfigured || !isValidUUID(itemId)) return;

    try {
      const { error } = await supabase
        .from('list_items')
        .update({ is_completed: targetNewCompleted })
        .eq('id', itemId);

      if (error) throw error;

      const confirmedSnapshot = [...listsRef.current];
      setLists(confirmedSnapshot);
      listsRef.current = confirmedSnapshot;
      lastGoodSnapshotRef.current = confirmedSnapshot;
      await saveToLocalCache(confirmedSnapshot);
    } catch (err: any) {
      console.error('Error toggling item completion in Supabase:', err);
      await rollbackToSnapshot(previousSnapshot);
      await fetchListsFromDB(false);
      throw err;
    }
  };

  const addItemToList = async (listId: string, text: string) => {
    if (!currentUserId) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    const previousSnapshot = [...lastGoodSnapshotRef.current];
    const newItemId = generateUUID();
    let nextPosition = 0;

    const nextLists = listsRef.current.map((list) => {
      if (list.id !== listId) return list;
      nextPosition = list.items.length;
      return {
        ...list,
        items: [
          ...list.items,
          {
            id: newItemId,
            listId,
            text: trimmed,
            isCompleted: false,
            position: nextPosition,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });

    setLists(nextLists);
    listsRef.current = nextLists;

    if (!isSupabaseConfigured || !isValidUUID(listId)) return;

    try {
      const { error } = await supabase.from('list_items').insert({
        id: newItemId,
        list_id: listId,
        text: trimmed,
        is_completed: false,
        position: nextPosition,
      });

      if (error) throw error;

      const confirmedSnapshot = [...listsRef.current];
      setLists(confirmedSnapshot);
      listsRef.current = confirmedSnapshot;
      lastGoodSnapshotRef.current = confirmedSnapshot;
      await saveToLocalCache(confirmedSnapshot);
      await fetchListsFromDB(false);
    } catch (err: any) {
      console.error('Error adding item to Supabase:', err);
      await rollbackToSnapshot(previousSnapshot);
      await fetchListsFromDB(false);
      throw err;
    }
  };

  // Reorder lists and sync position index to database
  const reorderLists = async (newLists: List[]) => {
    if (!currentUserId) return;

    const previousSnapshot = [...lastGoodSnapshotRef.current];
    const updated = newLists.map((item, index) => ({
      ...item,
      position: index,
    }));

    setLists(updated);
    listsRef.current = updated;

    if (!isSupabaseConfigured) return;

    try {
      const validUpdates = updated
        .filter((l) => isValidUUID(l.id))
        .map((list, index) =>
          supabase
            .from('lists')
            .update({ position: index })
            .eq('id', list.id)
            .eq('user_id', currentUserId)
        );

      await Promise.all(validUpdates);

      const confirmedSnapshot = [...updated];
      setLists(confirmedSnapshot);
      listsRef.current = confirmedSnapshot;
      lastGoodSnapshotRef.current = confirmedSnapshot;
      await saveToLocalCache(confirmedSnapshot);
    } catch (err: any) {
      console.error('Error syncing reordered lists to Supabase:', err);
      await rollbackToSnapshot(previousSnapshot);
      await fetchListsFromDB(false);
      throw err;
    }
  };

  return (
    <ListContext.Provider
      value={{
        lists,
        isLoading: isLoading || isAuthLoading,
        isDarkMode,
        isConfigured: isSupabaseConfigured,
        syncStatus,
        errorMessage,
        toggleDarkMode,
        refreshLists,
        addList,
        updateList,
        deleteList,
        togglePinList,
        toggleArchiveList,
        toggleItemComplete,
        addItemToList,
        reorderLists,
      }}
    >
      {children}
    </ListContext.Provider>
  );
};

export const useLists = () => {
  const context = useContext(ListContext);
  return context || defaultListContext;
};
