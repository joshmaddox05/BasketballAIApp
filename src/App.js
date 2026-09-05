// App.js
import * as Sentry from '@sentry/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from './context/AppContext';
import AppNavigator from './navigation/AppNavigator';
import { ToastProvider } from './components/dbe';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY, SENTRY_DSN, APP_ENVIRONMENT, IS_PRODUCTION } from './config/env';
import { initAnalytics } from './services/analytics';
import { useFonts } from 'expo-font';
import {
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';

// Both run at module scope, before the first render, so a crash during the very
// first mount is still captured. Each is a no-op when its key is absent, which
// is the normal state for a local checkout without the secrets.
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENVIRONMENT,
    enableAutoSessionTracking: true,
    // Full traces in the pilot (low volume, and we want to see everything);
    // sampled down in production, where the traffic could get expensive.
    tracesSampleRate: IS_PRODUCTION ? 0.2 : 1.0,
    // sendDefaultPii would attach IP addresses and usernames. The cohort is
    // mostly minors — see the privacy note in services/analytics.js.
    sendDefaultPii: false,
  });
}
initAnalytics();

function App() {
    // DBE design system fonts (Archivo = headings/numbers, Figtree = body).
    // Bundled locally by @expo-google-fonts, so this resolves without network.
    const [fontsLoaded, fontError] = useFonts({
        Archivo_700Bold,
        Archivo_800ExtraBold,
        Figtree_400Regular,
        Figtree_500Medium,
        Figtree_600SemiBold,
        Figtree_700Bold,
        Figtree_800ExtraBold,
    });

    if (!fontsLoaded && !fontError) {
        return null;
    }

    // GestureHandlerRootView must wrap everything for gesture-handler to receive
    // touches — anything outside it silently gets no gestures.
    //
    // ErrorBoundary sits INSIDE that but OUTSIDE AppProvider on purpose: a
    // failure in the context provider itself is one of the cases most likely to
    // white-screen the app, and a boundary nested under the provider could not
    // render its own fallback when that happens.
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ErrorBoundary>
                <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
                    <AppProvider>
                        <ToastProvider>
                            <AppNavigator />
                        </ToastProvider>
                    </AppProvider>
                </StripeProvider>
            </ErrorBoundary>
        </GestureHandlerRootView>
    );
}

// Sentry.wrap adds native crash capture, touch breadcrumbs and app-start
// instrumentation around the root component.
export default Sentry.wrap(App);
