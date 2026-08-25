import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { List, ListItem, ListType } from '../types/list';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const CACHE_STORAGE_KEY = '@listrr_cached_lists_v2';

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

// React context initialization
const ListContext = createContext<ListContextType | undefined>(undefined);

// Helper to transform raw Supabase join rows into frontend List objects
function transformSupabaseRows(data: any[]): List[] {
  return data.map((row) => {
    const rawItems: any[] = row.list_items || [];
    // Sort items by position ascending, then created_at
    const sortedItems = [...rawItems].sort((a, b) => {
      if (a.position !== undefined && b.position !== undefined && a.position !== b.position) {
        return a.position - b.position;
      }
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });

    return {
      id: String(row.id),
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

  useEffect(() => {
    setIsDarkMode(systemColorScheme === 'dark');
  }, [systemColorScheme]);

  // Persist lists to AsyncStorage cache
  const saveToLocalCache = async (dataToCache: List[]) => {
    try {
      await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(dataToCache));
    } catch (e) {
      console.warn('Failed to cache lists locally:', e);
    }
  };

  // Load from local AsyncStorage cache
  const loadFromLocalCache = async (): Promise<List[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to load cached lists:', e);
    }
    return null;
  };

  // Fetch real data from Supabase DB
  const fetchListsFromDB = useCallback(async (showLoading = false) => {
    if (!isSupabaseConfigured) {
      const cached = await loadFromLocalCache();
      if (cached && cached.length > 0) {
        setLists(cached);
      }
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
          id,
          title,
          type,
          tag,
          is_pinned,
          is_archived,
          position,
          created_at,
          updated_at,
          list_items (
            id,
            list_id,
            text,
            is_completed,
            position,
            created_at
          )
        `)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const parsedLists = transformSupabaseRows(data);
        setLists(parsedLists);
        await saveToLocalCache(parsedLists);
        setSyncStatus('connected');
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.error('Error fetching data from Supabase:', err);
      setSyncStatus('error');
      setErrorMessage(err.message || 'Failed to fetch real data from Supabase');
      // Load cache as fallback
      const cached = await loadFromLocalCache();
      if (cached && cached.length > 0) {
        setLists(cached);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and Realtime Postgres Channel subscription
  useEffect(() => {
    fetchListsFromDB(true);

    if (!isSupabaseConfigured) return;

    // Subscribe to realtime database changes for both lists and list_items tables
    const channel = supabase
      .channel('public:lists_and_items_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lists' },
        (payload) => {
          console.log('Realtime Postgres Change (lists):', payload.eventType);
          fetchListsFromDB(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_items' },
        (payload) => {
          console.log('Realtime Postgres Change (list_items):', payload.eventType);
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
  }, [fetchListsFromDB]);

  // Toggle theme mode manually
  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Manual refresh helper
  const refreshLists = async () => {
    await fetchListsFromDB(true);
  };

  // Add a new list to Supabase with client-generated UUIDs
  const addList = async (
    title: string,
    type: ListType,
    tag?: string,
    itemTexts: string[] = []
  ) => {
    const listId = generateUUID();
    const tagValue = tag?.trim() || 'General';
    const createdAt = new Date().toISOString();

    const optimisticItems: ListItem[] = itemTexts.map((text, idx) => ({
      id: generateUUID(),
      listId: listId,
      text: text.trim(),
      isCompleted: false,
      position: idx,
      createdAt,
    }));

    const optimisticList: List = {
      id: listId,
      title: title.trim(),
      type,
      tag: tagValue,
      isPinned: false,
      isArchived: false,
      position: 0,
      createdAt,
      items: optimisticItems,
    };

    // Optimistic UI update
    setLists((prev) => [optimisticList, ...prev]);

    if (!isSupabaseConfigured) {
      saveToLocalCache([optimisticList, ...listsRef.current]);
      return;
    }

    try {
      // 1. Insert list row with explicit UUID
      const { data: listData, error: listError } = await supabase
        .from('lists')
        .insert({
          id: listId,
          title: title.trim(),
          type,
          tag: tagValue,
          is_pinned: false,
          is_archived: false,
          position: 0,
        })
        .select()
        .single();

      if (listError) throw listError;

      // 2. Insert items with explicit UUIDs
      if (optimisticItems.length > 0) {
        const itemsToInsert = optimisticItems.map((item) => ({
          id: item.id,
          list_id: listId,
          text: item.text,
          is_completed: false,
          position: item.position ?? 0,
        }));

        const { error: itemsError } = await supabase
          .from('list_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await fetchListsFromDB(false);
    } catch (err: any) {
      console.error('Error adding list to Supabase:', err);
      setErrorMessage(err.message);
      await fetchListsFromDB(false);
    }
  };

  // Update existing list attributes and items
  const updateList = async (
    id: string,
    title: string,
    type: ListType,
    tag?: string,
    itemTexts: string[] = []
  ) => {
    const tagValue = tag?.trim() || 'General';

    const updatedItems: ListItem[] = itemTexts.map((text, idx) => {
      const existing = lists.find((l) => l.id === id)?.items[idx];
      return {
        id: existing && isValidUUID(existing.id) ? existing.id : generateUUID(),
        listId: id,
        text: text.trim(),
        isCompleted: existing?.isCompleted || false,
        position: idx,
      };
    });

    // Optimistic update
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== id) return list;
        return {
          ...list,
          title: title.trim(),
          type,
          tag: tagValue,
          items: updatedItems,
        };
      })
    );

    if (!isSupabaseConfigured || !isValidUUID(id)) {
      saveToLocalCache(listsRef.current);
      return;
    }

    try {
      // 1. Update list metadata
      const { error: listError } = await supabase
        .from('lists')
        .update({
          title: title.trim(),
          type,
          tag: tagValue,
        })
        .eq('id', id);

      if (listError) throw listError;

      // 2. Refresh items
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

      await fetchListsFromDB(false);
    } catch (err: any) {
      console.error('Error updating list in Supabase:', err);
      setErrorMessage(err.message);
      await fetchListsFromDB(false);
    }
  };

  // Remove a list permanently from database
  const deleteList = async (id: string) => {
    // Optimistic delete
    setLists((prev) => prev.filter((list) => list.id !== id));

    if (!isSupabaseConfigured || !isValidUUID(id)) {
      saveToLocalCache(listsRef.current.filter((l) => l.id !== id));
      return;
    }

    try {
      const { error } = await supabase.from('lists').delete().eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting list from Supabase:', err);
      setErrorMessage(err.message);
      await fetchListsFromDB(false);
    }
  };

  // Toggle pin status for a specific list
  const togglePinList = async (id: string) => {
    const target = lists.find((l) => l.id === id);
    const newPinned = target ? !target.isPinned : true;

    // Optimistic update
    setLists((prev) =>
      prev.map((list) => (list.id === id ? { ...list, isPinned: newPinned } : list))
    );

    if (!isSupabaseConfigured || !isValidUUID(id)) {
      saveToLocalCache(listsRef.current);
      return;
    }

    try {
      const { error } = await supabase
        .from('lists')
        .update({ is_pinned: newPinned })
        .eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error toggling pin in Supabase:', err);
      await fetchListsFromDB(false);
    }
  };

  // Toggle archive status for a specific list
  const toggleArchiveList = async (id: string) => {
    const target = lists.find((l) => l.id === id);
    const newArchived = target ? !target.isArchived : true;

    // Optimistic update
    setLists((prev) =>
      prev.map((list) => (list.id === id ? { ...list, isArchived: newArchived } : list))
    );

    if (!isSupabaseConfigured || !isValidUUID(id)) {
      saveToLocalCache(listsRef.current);
      return;
    }

    try {
      const { error } = await supabase
        .from('lists')
        .update({ is_archived: newArchived })
        .eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error toggling archive in Supabase:', err);
      await fetchListsFromDB(false);
    }
  };

  // Toggle checklist item completion status in database
  const toggleItemComplete = async (listId: string, itemId: string) => {
    let newCompleted = false;

    // Optimistic update
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map((item) => {
            if (item.id === itemId) {
              newCompleted = !item.isCompleted;
              return { ...item, isCompleted: newCompleted };
            }
            return item;
          }),
        };
      })
    );

    if (!isSupabaseConfigured || !isValidUUID(itemId)) {
      saveToLocalCache(listsRef.current);
      return;
    }

    try {
      const { error } = await supabase
        .from('list_items')
        .update({ is_completed: newCompleted })
        .eq('id', itemId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error toggling item completion in Supabase:', err);
      await fetchListsFromDB(false);
    }
  };

  // Append a single item entry to an existing list in database
  const addItemToList = async (listId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newItemId = generateUUID();

    // Optimistic update
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: [
            ...list.items,
            { id: newItemId, listId, text: trimmed, isCompleted: false, position: list.items.length },
          ],
        };
      })
    );

    if (!isSupabaseConfigured || !isValidUUID(listId)) {
      saveToLocalCache(listsRef.current);
      return;
    }

    try {
      const target = lists.find((l) => l.id === listId);
      const position = target ? target.items.length : 0;

      const { error } = await supabase.from('list_items').insert({
        id: newItemId,
        list_id: listId,
        text: trimmed,
        is_completed: false,
        position,
      });

      if (error) throw error;
      await fetchListsFromDB(false);
    } catch (err: any) {
      console.error('Error adding item to Supabase:', err);
      await fetchListsFromDB(false);
    }
  };

  // Reorder lists and sync position index to database
  const reorderLists = async (newLists: List[]) => {
    const updated = newLists.map((item, index) => ({
      ...item,
      position: index,
    }));

    setLists(updated);

    if (!isSupabaseConfigured) {
      saveToLocalCache(updated);
      return;
    }

    try {
      const validUpdates = updated
        .filter((l) => isValidUUID(l.id))
        .map((list, index) =>
          supabase.from('lists').update({ position: index }).eq('id', list.id)
        );
      await Promise.all(validUpdates);
    } catch (err: any) {
      console.error('Error syncing reordered lists to Supabase:', err);
    }
  };

  return (
    <ListContext.Provider
      value={{
        lists,
        isLoading,
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
  if (!context) {
    throw new Error('useLists must be used within a ListProvider');
  }
  return context;
};