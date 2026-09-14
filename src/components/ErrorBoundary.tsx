import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Minimal, theme-matching crash fallback. This does not change the app's
// visual design during normal operation — it only renders after an
// otherwise-unhandled render error.
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught render error:', error, errorInfo);
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#FFFFFF' }]}>
      <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
        Something went wrong
      </Text>
      <Text style={[styles.subtitle, { color: isDark ? '#A0A0A0' : '#8E8E93' }]}>
        Listrr ran into an unexpected error. The issue has been reported automatically.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onReset} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#208AEF', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});