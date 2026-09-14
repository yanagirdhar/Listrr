import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Catches render-time crashes anywhere below it in the tree so a single
// broken screen shows a recoverable fallback instead of a blank white/black
// screen, and reports the crash to Sentry so it shows up in Play Vitals
// triage instead of disappearing silently on the user's device.
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const isDarkMode = useColorScheme() === 'dark';
  const bg = isDarkMode ? '#121212' : '#FFFFFF';
  const text = isDarkMode ? '#FFFFFF' : '#000000';
  const subtext = isDarkMode ? '#A0A0A0' : '#8E8E93';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
      <Text style={[styles.title, { color: text }]}>Something went wrong</Text>
      <Text style={[styles.subtitle, { color: subtext }]}>
        Listrr ran into an unexpected error. The issue has been reported automatically.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onReset} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  button: {
    marginTop: 24,
    height: 46,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
