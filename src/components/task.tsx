import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';

type TaskProps = {
  name: string;
  completed: boolean;
  onToggle: () => void;
};

export function Task({ name, completed, onToggle }: TaskProps) {
  return (
    <Pressable style={styles.task} onPress={onToggle}>
      <ThemedText
        style={{
          textDecorationLine: completed ? 'line-through' : 'none',
          opacity: completed ? 0.6 : 1,
        }}
      >
        {name}
      </ThemedText>
      <ThemedText>{completed ? '✓' : '○'}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  task: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    marginBottom: 10,
  },
});