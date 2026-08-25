export type ListType = 'checklist' | 'numbered' | 'bulleted';

export interface ListItem {
  id: string;
  listId?: string;
  text: string;
  isCompleted?: boolean;
  position?: number;
  createdAt?: string;
}

export interface List {
  id: string;
  title: string;
  type: ListType;
  tag?: string;
  isPinned: boolean;
  isArchived?: boolean;
  position?: number;
  createdAt: string;
  updatedAt?: string;
  items: ListItem[];
}