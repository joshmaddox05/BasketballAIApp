// App.js
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from './context/AppContext';
import AppNavigator from './navigation/AppNavigator';
import { ToastProvider } from './components/dbe';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from './config/env';
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

export default function App() {
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
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
                <AppProvider>
                    <ToastProvider>
                        <AppNavigator />
                    </ToastProvider>
                </AppProvider>
            </StripeProvider>
        </GestureHandlerRootView>
    );
}
