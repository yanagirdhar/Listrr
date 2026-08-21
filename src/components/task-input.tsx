import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from './themed-text';

type TaskInputProps = {
  onAddTask: (name: string) => void;
};

export function TaskInput({ onAddTask }: TaskInputProps) {
  const [text, setText] = useState('');

  const handleAdd = () => {
    if (text.trim().length === 0) return;
    onAddTask(text.trim());
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Enter a task..."
        placeholderTextColor="#999"
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleAdd}
      />

      <Pressable style={styles.button} onPress={handleAdd}>
        <ThemedText style={styles.buttonText}>✓</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#1c1c1e',
  },
  button: {
    marginLeft: 10,
    marginTop: 15,
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 20,
    color: '#fff',
  },
});