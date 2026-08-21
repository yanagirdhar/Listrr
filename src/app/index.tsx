import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Task } from '@/components/task';
import { TaskInput } from '@/components/task-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type TaskItem = {
  id: string;
  name: string;
  completed: boolean;
};

export default function HomeScreen() {
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', name: 'Learn React Native', completed: false },
    { id: '2', name: 'Build Todo App', completed: true },
  ]);

  const handleAddTask = (name: string) => {
    const newTask: TaskItem = {
      id: Date.now().toString(),
      name,
      completed: false,
    };
    setTasks((prevTasks) => [newTask, ...prevTasks]);
  };

  const handleToggleTask = (id: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <ThemedText type="title" style={styles.title}>
            My Todo List
          </ThemedText>

          <TaskInput onAddTask={handleAddTask} />

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {tasks.map((task) => (
              <Task
                key={task.id}
                name={task.name}
                completed={task.completed}
                onToggle={() => handleToggleTask(task.id)}
              />
            ))}
          </ScrollView>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  title: {
    textAlign: 'center',
    fontSize: 40,
    marginBottom: 15,
  },
  list: {
    width: '100%',
  },
});