import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLists } from '../../context/ListContext';
import { ListType, ListItem } from '../../types/list';

export default function EditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists, updateList, isDarkMode } = useLists();

  const currentList = lists.find((list) => list.id === id);

  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [type, setType] = useState<ListType>('checklist');
  const [items, setItems] = useState<ListItem[]>([]);

  const inputsRef = useRef<{ [key: string]: TextInput | null }>({});
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!currentList) return;

    setTitle(currentList.title);
    setTag(currentList.tag || '');
    setType(currentList.type);
    setItems(
      currentList.items.length > 0
        ? currentList.items
        : [{ id: Date.now().toString(), text: '', isCompleted: false }]
    );
  }, [currentList]);

  const theme = {
    bg: isDarkMode ? '#121212' : '#F2F2F7',
    cardBg: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    textPrimary: isDarkMode ? '#FFFFFF' : '#000000',
    textSecondary: isDarkMode ? '#A0A0A0' : '#8E8E93',
  };

  const handleAddItem = () => {
    const newId = Date.now().toString();
    setItems((prev) => [...prev, { id: newId, text: '', isCompleted: false }]);
    setTimeout(() => {
      inputsRef.current[newId]?.focus();
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleItemChange = (text: string, itemId: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, text } : item))
    );
  };

  const handleSave = async () => {
    if (!currentList || !title.trim()) return;

    const stringItems = items
      .map((item) => item.text.trim())
      .filter((text) => text.length > 0);

    const tagValue = tag.trim() || undefined;

    try {
      await updateList(currentList.id, title.trim(), type, tagValue, stringItems);
      router.back();
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Could not update this list.');
    }
  };

  if (!currentList) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.textSecondary }}>List not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.heading, { color: theme.textPrimary }]}>Edit List</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>TITLE</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.cardBg, color: theme.textPrimary },
            ]}
            placeholder="e.g., Grocery Shopping"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>TAG (OPTIONAL)</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.cardBg, color: theme.textPrimary },
            ]}
            placeholder="e.g., Work, Personal"
            placeholderTextColor={theme.textSecondary}
            value={tag}
            onChangeText={setTag}
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>TYPE</Text>
          <View style={styles.typeSelector}>
            {(['checklist', 'numbered', 'bulleted'] as ListType[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.typeButton,
                  type === option && styles.typeButtonSelected,
                  { backgroundColor: theme.cardBg },
                ]}
                onPress={() => setType(option)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: type === option ? '#FFFFFF' : theme.textPrimary },
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>ITEMS</Text>

          {items.map((item, index) => (
            <View key={item.id} style={styles.itemRow}>
              <TextInput
                ref={(ref) => {
                  inputsRef.current[item.id] = ref;
                }}
                style={[
                  styles.itemInput,
                  { backgroundColor: theme.cardBg, color: theme.textPrimary },
                ]}
                placeholder={`Item ${index + 1}`}
                placeholderTextColor={theme.textSecondary}
                value={item.text}
                onChangeText={(text) => handleItemChange(text, item.id)}
              />
              {items.length > 1 && (
                <TouchableOpacity
                  onPress={() => handleRemoveItem(item.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Ionicons name="add-circle-outline" size={20} color="#208AEF" />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  typeSelector: { flexDirection: 'row', gap: 8 },
  typeButton: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  typeButtonSelected: { backgroundColor: '#208AEF' },
  typeButtonText: { fontWeight: '600', textTransform: 'capitalize' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  itemInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  removeButton: { marginLeft: 10, padding: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingVertical: 12 },
  addButtonText: { color: '#208AEF', fontWeight: '700', marginLeft: 6 },
  saveButton: { backgroundColor: '#208AEF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});