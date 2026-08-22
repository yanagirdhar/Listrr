export type ListType = 'checklist' | 'numbered' | 'bulleted';

export interface ListItem {
  id: string;
  text: string;
  isCompleted?: boolean;
}

export interface List {
  id: string;
  title: string;
  type: ListType;
  tag?: string;
  isPinned: boolean;
  isArchived?: boolean;
  createdAt: string;
  items: ListItem[];
}