import { useState, useRef, useCallback, useEffect } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { useLists } from '../../context/ListContext';
import { ListType, ListItem } from '../../types/list';

const createBlankItem = (): ListItem => ({
  id: Date.now().toString(),
  text: '',
  isCompleted: false,
});

const MAX_TITLE_LENGTH = 120;
const MAX_TAG_LENGTH = 80;
const MAX_ITEM_LENGTH = 500;
const MAX_ITEM_COUNT = 100;

export default function CreateScreen() {
  const router = useRouter();
  const { addList, isDarkMode } = useLists();

  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [type, setType] = useState<ListType>('checklist');
  const [items, setItems] = useState<ListItem[]>([createBlankItem()]);

  const inputsRef = useRef<{ [key: string]: TextInput | null }>({});
  const scrollViewRef = useRef<ScrollView | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setTitle('');
      setTag('');
      setType('checklist');
      setItems([createBlankItem()]);
      inputsRef.current = {};
    }, [])
  );

  const theme = {
    bg: isDarkMode ? '#121212' : '#F2F2F7',
    cardBg: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    textPrimary: isDarkMode ? '#FFFFFF' : '#000000',
    textSecondary: isDarkMode ? '#A0A0A0' : '#8E8E93',
  };

  const handleAddItem = () => {
    if (items.length >= MAX_ITEM_COUNT) {
      Alert.alert('Item limit reached', `A list can contain up to ${MAX_ITEM_COUNT} items.`);
      return;
    }
    const newId = Date.now().toString();
    setItems((prev) => [
      ...prev,
      { id: newId, text: '', isCompleted: false },
    ]);
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      inputsRef.current[newId]?.focus();
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (text: string, id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedTag = tag.trim();
    const stringItems = items.map((item) => item.text.trim()).filter(Boolean);

    if (!trimmedTitle) {
      Alert.alert('Missing title', 'Please enter a title for this list.');
      return;
    }
    if (trimmedTitle.length > MAX_TITLE_LENGTH || trimmedTag.length > MAX_TAG_LENGTH) {
      Alert.alert('Text too long', `Titles are limited to ${MAX_TITLE_LENGTH} characters and tags to ${MAX_TAG_LENGTH}.`);
      return;
    }
    if (stringItems.some((text) => text.length > MAX_ITEM_LENGTH)) {
      Alert.alert('Item too long', `Each item is limited to ${MAX_ITEM_LENGTH} characters.`);
      return;
    }

    const tagValue = trimmedTag || undefined;

    try {
      await addList(trimmedTitle, type, tagValue, stringItems);
      router.push('/(tabs)');
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Could not create this list.');
    }
  };

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
        <Text style={[styles.heading, { color: theme.textPrimary }]}>Create New List</Text>

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
            maxLength={MAX_TITLE_LENGTH}
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
            maxLength={MAX_TAG_LENGTH}
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
                  { backgroundColor: theme.cardBg },
                  type === option && styles.typeButtonSelected,
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
                  {
                    backgroundColor: theme.cardBg,
                    color: theme.textPrimary,
                  },
                ]}
                placeholder={`Item ${index + 1}`}
                placeholderTextColor={theme.textSecondary}
                value={item.text}
                onChangeText={(text) => handleItemChange(text, item.id)}
                maxLength={MAX_ITEM_LENGTH}
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
          <Text style={styles.saveButtonText}>Save List</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
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