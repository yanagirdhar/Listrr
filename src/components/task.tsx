import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';

type TaskProps = {
  name: string;
  completed: boolean;
};

export function Task({ name, completed }: TaskProps) {
  return (
    <View style={styles.task}>
      <ThemedText>{name}</ThemedText>
      <ThemedText>{completed ? '✓' : '○'}</ThemedText>
    </View>
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