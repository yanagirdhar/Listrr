import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

type TaskProps = {
  name: string;
  completed: boolean;
  onToggle: () => void;
  onDelete: () => void;
};

export function Task({ name, completed, onToggle, onDelete }: TaskProps) {
  return (
    <View style={styles.task}>
      <Pressable style={styles.taskContent} onPress={onToggle}>
        <ThemedText
          style={[
            styles.taskText,
            {
              textDecorationLine: completed ? 'line-through' : 'none',
              opacity: completed ? 0.6 : 1,
            },
          ]}
        >
          {name}
        </ThemedText>
        <ThemedText>{completed ? '✓' : '○'}</ThemedText>
      </Pressable>

      <Pressable onPress={onDelete} style={styles.deleteButton} hitSlop={10}>
        <ThemedText style={styles.deleteText}>✕</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  task: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 15,
  },
  taskText: {
    flex: 1,
    marginRight: 10,
  },
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    color: '#ff4d4d',
    fontSize: 16,
    fontWeight: 'bold',
  },
});