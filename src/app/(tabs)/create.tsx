import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLists } from '../../context/ListContext';
import { ListType } from '../../types/list';

export default function CreateListScreen() {
  const router = useRouter();
  const { addList, isDarkMode } = useLists();

  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [type, setType] = useState<ListType>('checklist');
  const [items, setItems] = useState<string[]>(['']);

  const theme = {
    bg: isDarkMode ? '#121212' : '#FFFFFF',
    inputBg: isDarkMode ? '#1E1E1E' : '#F2F2F7',
    textPrimary: isDarkMode ? '#FFFFFF' : '#000000',
    textSecondary: isDarkMode ? '#A0A0A0' : '#8E8E93',
    placeholder: isDarkMode ? '#666666' : '#A0A0A0',
  };

  const handleAddItemField = () => setItems([...items, '']);

  const handleItemChange = (text: string, index: number) => {
    const updated = [...items];
    updated[index] = text;
    setItems(updated);
  };

  const handleRemoveItemField = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const filteredItems = items.filter((i) => i.trim().length > 0);
    addList(title, type, tag.trim() || 'General', filteredItems);

    setTitle('');
    setTag('');
    setType('checklist');
    setItems(['']);
    router.push('/');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>List Title</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
          placeholder="e.g. Weekly Meal Prep"
          placeholderTextColor={theme.placeholder}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>Category / Tag</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textPrimary }]}
          placeholder="e.g. Personal, Work, Fitness"
          placeholderTextColor={theme.placeholder}
          value={tag}
          onChangeText={setTag}
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>List Format</Text>
        <View style={styles.typeSelector}>
          {(['checklist', 'bulleted', 'numbered'] as ListType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeOption,
                { backgroundColor: theme.inputBg },
                type === t && styles.typeOptionActive,
              ]}
              onPress={() => setType(t)}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: theme.textPrimary },
                  type === t && styles.typeTextActive,
                ]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.textSecondary }]}>List Items</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemInputRow}>
            <TextInput
              style={[
                styles.input,
                styles.itemInput,
                { backgroundColor: theme.inputBg, color: theme.textPrimary },
              ]}
              placeholder={`Item ${index + 1}`}
              placeholderTextColor={theme.placeholder}
              value={item}
              onChangeText={(text) => handleItemChange(text, index)}
            />
            {items.length > 1 && (
              <TouchableOpacity
                onPress={() => handleRemoveItemField(index)}
                style={styles.removeBtn}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addMoreBtn} onPress={handleAddItemField}>
          <Ionicons name="add" size={20} color="#208AEF" />
          <Text style={styles.addMoreText}>Add Another Item</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, !title.trim() && styles.disabledBtn]}
          onPress={handleSave}
          disabled={!title.trim()}
        >
          <Text style={styles.submitBtnText}>Save List</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: '5%' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  typeSelector: { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  typeOptionActive: { backgroundColor: '#208AEF' },
  typeText: { fontSize: 14, fontWeight: '500' },
  typeTextActive: { color: '#FFFFFF' },
  itemInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemInput: { flex: 1 },
  removeBtn: { paddingLeft: 10 },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  addMoreText: { color: '#208AEF', fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledBtn: { backgroundColor: '#A0A0A0' },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});