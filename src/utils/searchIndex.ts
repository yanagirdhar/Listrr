import { List } from '../types/list';

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  listIds: Set<string> = new Set<string>();
}

export class ListSearchIndex {
  private root = new TrieNode();

  constructor(lists: List[]) {
    this.buildIndex(lists);
  }

  private insertWord(word: string, listId: string) {
    let node = this.root;
    const cleanWord = word.toLowerCase().trim();
    for (const char of cleanWord) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
      node.listIds.add(listId);
    }
  }

  private buildIndex(lists: List[]) {
    for (const list of lists) {
      // Index title words
      list.title.split(/\s+/).forEach((w) => this.insertWord(w, list.id));
      // Index tag words
      if (list.tag) {
        list.tag.split(/\s+/).forEach((w) => this.insertWord(w, list.id));
      }
      // Index sub-item words
      for (const item of list.items) {
        item.text.split(/\s+/).forEach((w) => this.insertWord(w, list.id));
      }
    }
  }

  // O(K) prefix search lookup
  public search(query: string): Set<string> | null {
    const trimmed = query.toLowerCase().trim();
    if (!trimmed) return null;

    const words = trimmed.split(/\s+/);
    let resultIds: Set<string> | null = null;

    for (const word of words) {
      let node = this.root;
      let found = true;
      for (const char of word) {
        if (!node.children.has(char)) {
          found = false;
          break;
        }
        node = node.children.get(char)!;
      }

      const matchingIds: Set<string> = found ? node.listIds : new Set<string>();

      if (resultIds === null) {
        resultIds = new Set<string>(matchingIds);
      } else {
        // Intersect matching sets safely without array conversion inference errors
        const nextIntersection = new Set<string>();
        resultIds.forEach((id: string) => {
          if (matchingIds.has(id)) {
            nextIntersection.add(id);
          }
        });
        resultIds = nextIntersection;
      }
    }

    return resultIds;
  }
}