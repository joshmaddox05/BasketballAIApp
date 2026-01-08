// App.js
import { AppProvider } from './context/AppContext';
import AppNavigator from './navigation/AppNavigator';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from './config/env';

export default function App() {
    return (
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
            <AppProvider>
                <AppNavigator />
            </AppProvider>
        </StripeProvider>
    );
}