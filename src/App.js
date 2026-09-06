// App.js
import * as Sentry from '@sentry/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from './context/AppContext';
import AppNavigator from './navigation/AppNavigator';
import { ToastProvider } from './components/dbe';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY, SENTRY_DSN, APP_ENVIRONMENT, IS_PRODUCTION } from './config/env';
import { initAnalytics, navigationIntegration } from './services/analytics';
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

// Attribute keys that must never leave the device. Anything ending in "name" is
// treated as a person's name (athleteName, coachName, parentName) unless it is
// on the allow-list below, where "name" describes code rather than a human.
// Erring toward dropping a useful column is the correct trade here.
const SENSITIVE_ATTRIBUTE = /email|phone|password|secret|token|apikey|api_key|name$/i;
const SAFE_NAME_ATTRIBUTE =
  /^(screen|file|event|route|component|workout|drill|template|skill|integration|error|exception)Name$/i;

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
    // Setting this is also what switches on the SDK's automatic mobile
    // instrumentation — app start, JS stalls, slow/frozen frames and a span
    // per network request all come from here with no integration listed.
    tracesSampleRate: IS_PRODUCTION ? 0.2 : 1.0,
    // React Navigation is the one piece that is not automatic: without it there
    // is no transaction per screen, so app-start data has nothing to hang off
    // and a slow screen looks the same as a fast one. Built in analytics.js
    // because it has to exist before this call. Listing integrations here adds
    // to the SDK defaults rather than replacing them.
    integrations: [navigationIntegration],
    // Touch tracing. A tap only produces a transaction if the element carries a
    // `sentry-label` — everything unlabelled is skipped by the SDK, so this is
    // safe to switch on app-wide and the volume is bounded by the handful of
    // buttons we chose to label.
    //
    // touchEventBoundaryProps: { labelName: 'accessibilityLabel' } would label
    // most of the app in one line, and is deliberately NOT used: accessibility
    // labels are user-facing text ("Message from Coach Barnes"), and the label
    // lands verbatim in the transaction name. Labels stay developer-authored.
    enableUserInteractionTracing: true,
    // The mobile default is [/.*/] — every outgoing request gets sentry-trace
    // and baggage headers, including ones to Firebase, Stripe and ElevenLabs,
    // who have no use for them and may reject the preflight. Only our own AI
    // backend can continue a trace, so only it gets the headers.
    tracePropagationTargets: [/^https:\/\/basketballaiappapi\.onrender\.com/],
    // sendDefaultPii would attach IP addresses and usernames. The cohort is
    // mostly minors — see the privacy note in services/analytics.js.
    sendDefaultPii: false,
    // Structured logs (Sentry Logs). Off by default in the SDK. Every log the
    // app emits goes through services/analytics.js, so the privacy rules in
    // that file cover log attributes the same way they cover events.
    //
    // consoleLoggingIntegration is deliberately NOT added: the app's console
    // calls carry free text and whole objects, which is exactly what must not
    // reach the pilot's telemetry. A log is explicit or it does not happen.
    enableLogs: true,
    beforeSendLog: (log) => {
      // Logs have no sample rate — dropping levels here is the only volume
      // control there is, and trace/debug are the ones that get noisy.
      if (IS_PRODUCTION && (log.level === 'trace' || log.level === 'debug')) {
        return null;
      }
      // Last line of defence for the privacy rule. The real guard is clean()
      // in services/analytics.js; this catches an attribute added later at a
      // call site that never read that file.
      if (log.attributes) {
        for (const key of Object.keys(log.attributes)) {
          if (SENSITIVE_ATTRIBUTE.test(key) && !SAFE_NAME_ATTRIBUTE.test(key)) {
            delete log.attributes[key];
          }
        }
      }
      return log;
    },
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
