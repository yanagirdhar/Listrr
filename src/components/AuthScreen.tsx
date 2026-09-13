import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLists } from '../context/ListContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { isDarkMode } = useLists();

  // 'signin' | 'signup' — same two-mode pattern as your existing chip filters
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reuses the exact same theme tokens as index.tsx / profile.tsx
  const dynamicStyles = {
    container: { backgroundColor: isDarkMode ? '#121212' : '#F2F2F7' },
    card: { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' },
    textPrimary: { color: isDarkMode ? '#FFFFFF' : '#000000' },
    textSecondary: { color: isDarkMode ? '#A0A0A0' : '#8E8E93' },
    inputBg: { backgroundColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' },
    chipBg: { backgroundColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' },
    avatarBg: { backgroundColor: isDarkMode ? '#1A385C' : '#E6F4FE' },
  };

  const handleModeSwitch = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier) {
      setErrorMessage('Please enter your username or email');
      return;
    }
    if (!cleanPassword) {
      setErrorMessage('Please enter your password');
      return;
    }
    if (cleanPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }
    if (mode === 'signup' && cleanPassword !== confirmPassword.trim()) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(cleanIdentifier, cleanPassword);
        if (error) setErrorMessage(error.message || 'Invalid username/email or password');
      } else {
        const customUsername = username.trim() || cleanIdentifier.split('@')[0];
        const { error } = await signUp(cleanIdentifier, cleanPassword, customUsername);
        if (error) setErrorMessage(error.message || 'Failed to create account. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, dynamicStyles.container]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header — reuses the same accent-circle pattern as the Profile avatar */}
        <View style={styles.headerArea}>
          <View style={[styles.badge, dynamicStyles.avatarBg]}>
            <Ionicons name="list" size={36} color="#208AEF" />
          </View>
          <Text style={[styles.brandTitle, dynamicStyles.textPrimary]}>Listrr</Text>
          <Text style={[styles.brandSubtitle, dynamicStyles.textSecondary]}>
            {mode === 'signin'
              ? 'Sign in to access your lists.'
              : 'Create an account to get started.'}
          </Text>
        </View>

        {/* Mode switcher — same chip visual language as the tag filter row */}
        <View style={[styles.tabBar, dynamicStyles.chipBg]}>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'signin' && styles.tabButtonActive]}
            onPress={() => handleModeSwitch('signin')}
          >
            <Text style={[styles.tabText, { color: mode === 'signin' ? '#FFFFFF' : dynamicStyles.textSecondary.color }]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'signup' && styles.tabButtonActive]}
            onPress={() => handleModeSwitch('signup')}
          >
            <Text style={[styles.tabText, { color: mode === 'signup' ? '#FFFFFF' : dynamicStyles.textSecondary.color }]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form card — same card style used everywhere else in the app */}
        <View style={[styles.card, dynamicStyles.card]}>
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#FF3B30" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>Name / Username</Text>
              <View style={[styles.inputBox, dynamicStyles.inputBg]}>
                <Ionicons name="person-outline" size={18} color={dynamicStyles.textSecondary.color} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, dynamicStyles.textPrimary]}
                  placeholder="e.g. Alex Morgan"
                  placeholderTextColor={dynamicStyles.textSecondary.color}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>Username or Email</Text>
            <View style={[styles.inputBox, dynamicStyles.inputBg]}>
              <Ionicons
                name={identifier.includes('@') ? 'mail-outline' : 'at-outline'}
                size={18}
                color={dynamicStyles.textSecondary.color}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, dynamicStyles.textPrimary]}
                placeholder={mode === 'signup' ? 'username or you@email.com' : 'Your username or email'}
                placeholderTextColor={dynamicStyles.textSecondary.color}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>Password</Text>
            <View style={[styles.inputBox, dynamicStyles.inputBg]}>
              <Ionicons name="lock-closed-outline" size={18} color={dynamicStyles.textSecondary.color} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, dynamicStyles.textPrimary]}
                placeholder="Min. 6 characters"
                placeholderTextColor={dynamicStyles.textSecondary.color}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType={mode === 'signup' ? 'next' : 'done'}
                onSubmitEditing={mode === 'signin' ? handleSubmit : undefined}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={dynamicStyles.textSecondary.color}
                />
              </TouchableOpacity>
            </View>
          </View>

          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>Confirm Password</Text>
              <View style={[styles.inputBox, dynamicStyles.inputBg]}>
                <Ionicons name="lock-closed-outline" size={18} color={dynamicStyles.textSecondary.color} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, dynamicStyles.textPrimary]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={dynamicStyles.textSecondary.color}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <View style={styles.submitRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: '6%' },
  headerArea: { alignItems: 'center', marginBottom: 24 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandTitle: { fontSize: 24, fontWeight: 'bold' },
  brandSubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  tabBar: { flexDirection: 'row', borderRadius: 10, padding: 4, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#208AEF' },
  tabText: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: 12, padding: 16 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: { color: '#FF3B30', fontSize: 13, flex: 1 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, height: 44 },
  inputIcon: { marginRight: 6 },
  textInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  eyeBtn: { padding: 4 },
  submitButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: { opacity: 0.65 },
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});