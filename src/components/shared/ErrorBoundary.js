// ErrorBoundary.js - last line of defence against a white screen.
//
// A render error anywhere below this unmounts the whole React tree and leaves
// the user staring at nothing, with no report reaching us. This catches it,
// sends it to Sentry with the component stack, and offers a way back.
//
// Deliberately NOT themed through useAppContext: this boundary is mounted
// OUTSIDE AppProvider so it still works when the failure is in the provider
// itself, which is the case a themed fallback would be unable to render. That
// is also why the palette below is hard-coded rather than pulled from tokens.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { reportError } from '../../services/analytics';
import logger from '../../utils/logger';

// The DBE burgundy system, inlined — see the note above on why tokens are not
// available at this level. Values match utils/theme.js.
const INK = '#101013';
const SURFACE = '#1C1C21';
const TEXT = '#E9E9ED';
const TEXT_DIM = '#83838D';
const BURGUNDY = '#8A1C22';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logger.error('Unhandled render error', error);
    reportError(error, { componentStack: info?.componentStack || null });
  }

  handleRetry = () => {
    // Remounts the subtree. Recovers from transient failures (a bad fetch
    // during render); a deterministic crash will simply land here again,
    // which is honest — better than a button that pretends to fix it.
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Something broke</Text>
          <Text style={styles.body}>
            This screen hit an error and stopped. The problem has been reported
            automatically — you do not need to send anything.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleRetry}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: SURFACE, borderRadius: 16, padding: 24, width: '100%', maxWidth: 380 },
  title: { color: TEXT, fontSize: 20, fontWeight: '700', marginBottom: 10 },
  body: { color: TEXT_DIM, fontSize: 15, lineHeight: 21, marginBottom: 22 },
  button: { backgroundColor: BURGUNDY, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
