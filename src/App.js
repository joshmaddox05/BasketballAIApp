// App.js
import { AppProvider } from './context/AppContext';
import AppNavigator from './navigation/AppNavigator';
import { StripeProvider } from '@stripe/stripe-react-native';

// Stripe publishable key (test mode)
// Get this from: https://dashboard.stripe.com/test/apikeys
// TODO: Move to environment variables for production
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SNiC5PTDEZhEg0xlrPILcbmVjNtTuqzRo73modFqCJ36KIkrsRn4BkPVjaMJ7CxgAQVoekyd2LE9Uv5g75SlPtP003POE5BEF';

export default function App() {
    return (
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
            <AppProvider>
                <AppNavigator />
            </AppProvider>
        </StripeProvider>
    );
}