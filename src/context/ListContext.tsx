import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { List, ListType } from '../types/list';

// Type definition for context state and helper actions
interface ListContextType {
  lists: List[];
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  addList: (title: string, type: ListType, tag?: string, items?: string[]) => void;
  updateList: (id: string, title: string, type: ListType, tag?: string, items?: string[]) => void;
  deleteList: (id: string) => void;
  togglePinList: (id: string) => void;
  toggleArchiveList: (id: string) => void;
  toggleItemComplete: (listId: string, itemId: string) => void;
  addItemToList: (listId: string, text: string) => void;
  reorderLists: (newLists: List[]) => void;
}

// React context initialization
const ListContext = createContext<ListContextType | undefined>(undefined);

// Initial mock data seed
const INITIAL_LISTS: List[] = [
  {
    id: '1',
    title: 'Weekend Grocery Run',
    type: 'checklist',
    tag: 'Shopping',
    isPinned: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    items: [
      { id: '101', text: 'Oat milk', isCompleted: true },
      { id: '102', text: 'Avocados', isCompleted: false },
      { id: '103', text: 'Sourdough bread', isCompleted: false },
    ],
  },
  {
    id: '2',
    title: 'Project Launch Sequence',
    type: 'numbered',
    tag: 'Work',
    isPinned: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    items: [
      { id: '201', text: 'Run production build' },
      { id: '202', text: 'Deploy NestJS backend' },
      { id: '203', text: 'Submit to App Store' },
    ],
  },
];

export const ListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Sync system dark mode preference with app theme state
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(systemColorScheme === 'dark');

  useEffect(() => {
    setIsDarkMode(systemColorScheme === 'dark');
  }, [systemColorScheme]);

  // Global state for list collection
  const [lists, setLists] = useState<List[]>(INITIAL_LISTS);

  // Toggle theme mode manually
  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Update overall list order (e.g. after reordering via drag-and-drop)
  const reorderLists = (newLists: List[]) => {
    setLists(newLists);
  };

  // Add a new list to state
  const addList = (title: string, type: ListType, tag?: string, itemTexts: string[] = []) => {
    const newList: List = {
      id: Date.now().toString(),
      title,
      type,
      tag: tag || 'General',
      isPinned: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      items: itemTexts.map((text, idx) => ({
        id: `${Date.now()}-${idx}`,
        text,
        isCompleted: false,
      })),
    };
    setLists((prev) => [newList, ...prev]);
  };

  // Update existing list attributes and items
  const updateList = (id: string, title: string, type: ListType, tag?: string, itemTexts: string[] = []) => {
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== id) return list;
        return {
          ...list,
          title,
          type,
          tag: tag || 'General',
          items: itemTexts.map((text, idx) => ({
            id: list.items[idx]?.id || `${Date.now()}-${idx}`,
            text,
            isCompleted: list.items[idx]?.isCompleted || false,
          })),
        };
      })
    );
  };

  // Remove a list permanently
  const deleteList = (id: string) => {
    setLists((prev) => prev.filter((list) => list.id !== id));
  };

  // Toggle pin status for a specific list
  const togglePinList = (id: string) => {
    setLists((prev) =>
      prev.map((list) => (list.id === id ? { ...list, isPinned: !list.isPinned } : list))
    );
  };

  // Toggle archive status for a specific list
  const toggleArchiveList = (id: string) => {
    setLists((prev) =>
      prev.map((list) => (list.id === id ? { ...list, isArchived: !list.isArchived } : list))
    );
  };

  // Toggle checklist item completion status
  const toggleItemComplete = (listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map((item) =>
            item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
          ),
        };
      })
    );
  };

  // Append a single item entry to an existing list
  const addItemToList = (listId: string, text: string) => {
    setLists((prev) =>
      prev.map((list) => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: [...list.items, { id: Date.now().toString(), text, isCompleted: false }],
        };
      })
    );
  };

  return (
    <ListContext.Provider
      value={{
        lists,
        isDarkMode,
        toggleDarkMode,
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

// Custom hook for accessing list context safely
export const useLists = () => {
  const context = useContext(ListContext);
  if (!context) {
    throw new Error('useLists must be used within a ListProvider');
  }
  return context;
};