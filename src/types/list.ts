export type ListType = 'numbered' | 'bulleted' | 'checklist';

export type ListItem = {
  id: string;
  text: string;
  isCompleted?: boolean;
};

export type List = {
  id: string;
  title: string;
  type: ListType;
  items: ListItem[];
  tag?: string;
  isPinned: boolean;
  createdAt: string;
};