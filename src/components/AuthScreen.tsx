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
  useWindowDimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLists } from '../context/ListContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { isDarkMode } = useLists();
  const { width } = useWindowDimensions();

  // State: 'signin' or 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Form fields
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic theme styling
  const theme = {
    bg: isDarkMode ? '#0F0F12' : '#F5F7FB',
    cardBg: isDarkMode ? '#1A1B20' : '#FFFFFF',
    inputBg: isDarkMode ? '#24262E' : '#EEF2F6',
    textPrimary: isDarkMode ? '#FFFFFF' : '#111827',
    textSecondary: isDarkMode ? '#9CA3AF' : '#6B7280',
    borderColor: isDarkMode ? '#2E323D' : '#E5E7EB',
    tabInactive: isDarkMode ? '#24262E' : '#F3F4F6',
    brandBlue: '#208AEF',
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

    if (mode === 'signup') {
      if (cleanPassword !== confirmPassword.trim()) {
        setErrorMessage('Passwords do not match');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(cleanIdentifier, cleanPassword);
        if (error) {
          setErrorMessage(error.message || 'Invalid username/email or password');
        }
      } else {
        const customUsername = username.trim() || cleanIdentifier.split('@')[0];
        const { error } = await signUp(cleanIdentifier, cleanPassword, customUsername);
        if (error) {
          setErrorMessage(error.message || 'Failed to create account. Please try again.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const maxCardWidth = Math.min(width * 0.92, 440);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.cardWrapper, { width: maxCardWidth }]}>
          {/* Logo Badge & Brand Header */}
          <View style={styles.headerArea}>
            <Image
              source={require('../../assets/Branding/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>Listrr</Text>
            <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
              {mode === 'signin'
                ? 'Welcome back! Sign in to access your private lists.'
                : 'Create your private database workspace. No confirmation needed!'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.authCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
            {/* Mode Switcher Tabs */}
            <View style={[styles.tabBar, { backgroundColor: theme.tabInactive }]}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  mode === 'signin' && [styles.tabButtonActive, { backgroundColor: theme.brandBlue }],
                ]}
                onPress={() => handleModeSwitch('signin')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: mode === 'signin' ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  mode === 'signup' && [styles.tabButtonActive, { backgroundColor: theme.brandBlue }],
                ]}
                onPress={() => handleModeSwitch('signup')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: mode === 'signup' ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color="#FF3B30" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.fieldsContainer}>
              {/* Optional Display Username field on Sign Up */}
              {mode === 'signup' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>YOUR NAME / USERNAME</Text>
                  <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.borderColor }]}>
                    <Ionicons name="person-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: theme.textPrimary }]}
                      placeholder="e.g. Alex Morgan"
                      placeholderTextColor={theme.textSecondary}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="words"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>
                </View>
              )}

              {/* Username or Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  {mode === 'signup' ? 'USERNAME OR EMAIL' : 'USERNAME OR EMAIL'}
                </Text>
                <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.borderColor }]}>
                  <Ionicons
                    name={identifier.includes('@') ? 'mail-outline' : 'at-outline'}
                    size={18}
                    color={theme.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: theme.textPrimary }]}
                    placeholder={mode === 'signup' ? 'username or user@email.com' : 'Your username or email'}
                    placeholderTextColor={theme.textSecondary}
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PASSWORD</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.borderColor }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: theme.textPrimary }]}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType={mode === 'signup' ? 'next' : 'done'}
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password (Sign Up Only) */}
              {mode === 'signup' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>CONFIRM PASSWORD</Text>
                  <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.borderColor }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: theme.textPrimary }]}
                      placeholder="Re-enter your password"
                      placeholderTextColor={theme.textSecondary}
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

              {/* Primary Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.brandBlue }, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>
                      {mode === 'signin' ? 'Authenticating...' : 'Creating Workspace...'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.submitRow}>
                    <Text style={styles.submitButtonText}>
                      {mode === 'signin' ? 'Sign In' : 'Create My Account'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick info note */}
          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.brandBlue} style={{ marginRight: 6 }} />
            <Text style={[styles.footerNoteText, { color: theme.textSecondary }]}>
              Each account has a 100% private, isolated database partition.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 12,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    elevation: 4,
    boxShadow: '0px 4px 8px rgba(32, 138, 239, 0.3)',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  authCard: {
    width: '100%',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    elevation: 3,
    boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.1)',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    elevation: 2,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.15)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  fieldsContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    boxShadow: '0px 3px 6px rgba(32, 138, 239, 0.25)',
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  footerNoteText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
