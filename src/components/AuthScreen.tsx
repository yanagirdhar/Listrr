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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLists } from '../context/ListContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { isDarkMode } = useLists();

  // 'signin' | 'signup' — same two-mode pattern as the existing chip filters
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    setSuccessMessage(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanIdentifier = identifier.trim();

    // The password is deliberately NOT trimmed. Trimming it here silently
    // changes the credential, so a password containing leading/trailing
    // whitespace (set via the dashboard or a reset link) could never be
    // used to sign in, and an account created here could not be accessed
    // from any other Supabase client.
    const rawPassword = password;

    if (!cleanIdentifier) {
      setErrorMessage('Please enter your email');
      return;
    }
    // Slightly stricter than a bare '@' check, still permissive.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (!rawPassword) {
      setErrorMessage('Please enter your password');
      return;
    }
    if (rawPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }
    if (mode === 'signup' && rawPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(cleanIdentifier, rawPassword);
        if (error) {
          // Supabase returns this verbatim for an unconfirmed address;
          // spelling out the next step avoids a dead end after sign-up.
          setErrorMessage(
            /email not confirmed/i.test(error.message)
              ? 'Please confirm your email address first — check your inbox and spam folder for the confirmation link.'
              : error.message || 'Invalid email or password'
          );
        }
        return;
      }

      const { error, requiresEmailConfirmation } = await signUp(cleanIdentifier, rawPassword);

      if (error) {
        setErrorMessage(error.message || 'Failed to create account. Please try again.');
        return;
      }

      if (requiresEmailConfirmation) {
        // Phrased so it is also correct when the address already exists —
        // Supabase intentionally returns an identical response in that case
        // to prevent account enumeration.
        setSuccessMessage(
          'Check your email (including spam) for a confirmation link, then come back and sign in. If you already have an account, sign in instead.'
        );
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      // signIn/signUp resolve rather than reject, but an unexpected throw
      // must not leave the button stuck in its loading state.
      setErrorMessage(err?.message || 'An unexpected error occurred. Please try again.');
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
        {/* Brand header */}
        <View style={styles.headerArea}>
          <View style={[styles.badge, dynamicStyles.avatarBg, { overflow: 'hidden' }]}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={{ width: 64, height: 64, resizeMode: 'cover' }}
            />
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

        {/* Form card */}
        <View style={[styles.card, dynamicStyles.card]}>
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#FF3B30" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#34C759" style={{ marginRight: 8 }} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, dynamicStyles.textSecondary]}>Email</Text>
            <View style={[styles.inputBox, dynamicStyles.inputBg]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={dynamicStyles.textSecondary.color}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.textInput, dynamicStyles.textPrimary]}
                placeholder="you@email.com"
                placeholderTextColor={dynamicStyles.textSecondary.color}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
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
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: '6%', width: '100%', maxWidth: 720, alignSelf: 'center' },
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: { color: '#34C759', fontSize: 13, flex: 1 },
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