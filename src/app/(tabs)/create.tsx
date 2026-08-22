import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useLists } from '../../context/ListContext';
import { ListType, ListItem } from '../../types/list';

export default function CreateScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { lists, addList, updateList, isDarkMode } = useLists();

  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [type, setType] = useState<ListType>('checklist');
  const [items, setItems] = useState<ListItem[]>([
    { id: Date.now().toString(), text: '', isCompleted: false },
  ]);

  const inputsRef = useRef<{ [key: string]: TextInput | null }>({});
  const scrollViewRef = useRef<ScrollView | null>(null);

  const resetForm = useCallback(() => {
    setTitle('');
    setTag('');
    setType('checklist');
    setItems([{ id: Date.now().toString(), text: '', isCompleted: false }]);
  }, []);

  // Hydrate initial data only when editId changes or initial screen focus occurs
  useEffect(() => {
    if (editId) {
      const target = lists.find((l) => l.id === editId);
      if (target) {
        setTitle(target.title);
        setTag(target.tag || '');
        setType(target.type);
        setItems(
          target.items.length > 0
            ? target.items
            : [{ id: Date.now().toString(), text: '', isCompleted: false }]
        );
      }
    } else {
      resetForm();
    }
  }, [editId]); // Intentionally omitting `lists` to prevent re-renders while typing

  // Reset parameters on screen blur without causing mid-typing layout jumps
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (editId) {
          router.setParams({ editId: undefined });
        }
        resetForm();
      };
    }, [editId, resetForm, router])
  );

  const theme = {
    bg: isDarkMode ? '#121212' : '#F2F2F7',
    cardBg: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    textPrimary: isDarkMode ? '#FFFFFF' : '#000000',
    textSecondary: isDarkMode ? '#A0A0A0' : '#8E8E93',
  };

  const handleAddItem = () => {
    const newId = Date.now().toString();
    setItems((prev) => [...prev, { id: newId, text: '', isCompleted: false }]);

    // Smoothly focus the new input and scroll to bottom
    setTimeout(() => {
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

  const handleSave = () => {
    if (!title.trim()) return;

    const stringItems = items
      .map((i) => i.text.trim())
      .filter((text) => text.length > 0);

    const tagValue = tag.trim() || undefined;

    if (editId) {
      updateList(editId, title.trim(), type, tagValue, stringItems);
    } else {
      addList(title.trim(), type, tagValue, stringItems);
    }

    resetForm();
    router.push('/(tabs)');
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
        <Text style={[styles.heading, { color: theme.textPrimary }]}>
          {editId ? 'Edit List' : 'Create New List'}
        </Text>

        {/* Title Input */}
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

        {/* Tag Input */}
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

        {/* List Type Selector */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>TYPE</Text>
          <View style={styles.typeSelector}>
            {(['checklist', 'bulleted', 'numbered'] as ListType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  { backgroundColor: theme.cardBg },
                  type === t && styles.typeBtnActive,
                ]}
                onPress={() => setType(t)}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: theme.textPrimary },
                    type === t && styles.typeBtnTextActive,
                  ]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Items List */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>ITEMS</Text>
          {items.map((item, index) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={[styles.itemPrefix, { color: theme.textSecondary }]}>
                {type === 'numbered' ? `${index + 1}.` : '•'}
              </Text>
              <TextInput
                ref={(el) => {
                  inputsRef.current[item.id] = el;
                }}
                style={[
                  styles.itemInput,
                  { backgroundColor: theme.cardBg, color: theme.textPrimary },
                ]}
                placeholder="Item detail..."
                placeholderTextColor={theme.textSecondary}
                value={item.text}
                onChangeText={(text) => handleItemChange(text, item.id)}
                returnKeyType="next"
                onSubmitEditing={handleAddItem}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                onPress={() => handleRemoveItem(item.id)}
                style={styles.removeBtn}
              >
                <Ionicons name="close-circle" size={22} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add Item Button */}
          <TouchableOpacity
            style={[styles.addItemBtn, { backgroundColor: theme.cardBg }]}
            onPress={handleAddItem}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#208AEF" />
            <Text style={styles.addItemText}>Add Another Item</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!title.trim()}
        >
          <Text style={styles.saveBtnText}>
            {editId ? 'Update List' : 'Save List'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  typeSelector: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#208AEF' },
  typeBtnText: { fontSize: 13, fontWeight: '600' },
  typeBtnTextActive: { color: '#FFFFFF' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  itemPrefix: { fontSize: 16, fontWeight: '600', width: 20, textAlign: 'center' },
  itemInput: { flex: 1, height: 44, borderRadius: 8, paddingHorizontal: 12, fontSize: 15 },
  removeBtn: { padding: 4 },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 8,
    marginTop: 4,
    gap: 6,
  },
  addItemText: { color: '#208AEF', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    backgroundColor: '#208AEF',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});