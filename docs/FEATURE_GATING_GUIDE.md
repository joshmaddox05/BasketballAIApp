# Feature Gating Implementation Guide

This guide explains how to implement subscription-based feature gating in the Basketball AI Training app.

## Overview

The app uses a tiered subscription model with the following levels:
- **Free**: Basic features
- **Basic** ($4.99/month): Unlimited workouts + basic AI analysis
- **Premium** ($9.99/month): Advanced AI + mentor sessions + exclusive challenges
- **Pro** ($19.99/month): All premium features + personalized training + priority support

## Architecture

### Core Components

1. **Subscription Utilities** (`src/utils/subscription.js`)
   - Defines subscription tiers and content access rules
   - Provides helper functions for access checks

2. **UpgradePrompt Component** (`src/components/shared/UpgradePrompt.js`)
   - Reusable modal for locked features
   - Shows subscription benefits and pricing
   - Handles upgrade navigation

3. **LockedFeatureCard Component** (`src/components/features/LockedFeatureCard.js`)
   - Reusable card UI for locked features
   - Can be used in lists or grids
   - Shows lock icon and premium badge

4. **useFeatureAccess Hook** (`src/hooks/useFeatureAccess.js`)
   - Custom hook for feature access management
   - Handles upgrade prompts automatically
   - Simplifies implementation

## Implementation Methods

### Method 1: Using Utility Functions (Recommended for Simple Checks)

Best for: One-time checks, button disabling, simple guards

```javascript
import { canAccessFeature, getRequiredSubscription } from '../utils/subscription';
import { useAppContext } from '../context/AppContext';
import UpgradePrompt from '../components/shared/UpgradePrompt';

function MyComponent() {
    const { userData } = useAppContext();
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
    const [lockedFeature, setLockedFeature] = useState(null);

    const handlePremiumFeature = () => {
        const userSubscription = userData?.subscription || 'free';
        const hasAccess = canAccessFeature('advancedMetrics', userSubscription);

        if (!hasAccess) {
            setLockedFeature({
                name: 'Advanced Metrics',
                requiredTier: getRequiredSubscription('feature', 'advancedMetrics'),
                customMessage: 'Get detailed insights into your performance...'
            });
            setShowUpgradePrompt(true);
            return;
        }

        // User has access - proceed with feature
        navigateToAdvancedMetrics();
    };

    return (
        <>
            <TouchableOpacity onPress={handlePremiumFeature}>
                <Text>View Advanced Metrics</Text>
            </TouchableOpacity>

            {lockedFeature && (
                <UpgradePrompt
                    visible={showUpgradePrompt}
                    onClose={() => setShowUpgradePrompt(false)}
                    onUpgrade={() => navigation.navigate('Settings')}
                    featureName={lockedFeature.name}
                    requiredTier={lockedFeature.requiredTier}
                    customMessage={lockedFeature.customMessage}
                />
            )}
        </>
    );
}
```

### Method 2: Using the Custom Hook

Best for: Multiple feature checks, complex screens

```javascript
import { useFeatureAccess } from '../hooks/useFeatureAccess';

function MyComponent() {
    const { checkFeatureAccess } = useFeatureAccess();

    const handlePremiumFeature = () => {
        if (checkFeatureAccess('advancedMetrics', 'Advanced Metrics')) {
            // User has access
            navigateToAdvancedMetrics();
        }
        // Prompt shown automatically if no access
    };

    return (
        <TouchableOpacity onPress={handlePremiumFeature}>
            <Text>View Advanced Metrics</Text>
        </TouchableOpacity>
    );
}
```

### Method 3: Using LockedFeatureCard Component

Best for: Feature discovery screens, settings pages

```javascript
import LockedFeatureCard from '../components/features/LockedFeatureCard';

function FeaturesScreen() {
    return (
        <ScrollView>
            <LockedFeatureCard
                featureName="advancedMetrics"
                displayName="Advanced Metrics"
                description="Get detailed insights into your shooting percentage, consistency, and more."
                icon="analytics"
                colors={['#2196F3', '#42A5F5']}
            />

            <LockedFeatureCard
                featureName="mentorChat"
                displayName="AI Mentor Chat"
                description="Get personalized coaching advice from our AI mentor anytime."
                icon="chatbubbles"
                colors={['#9C27B0', '#BA68C8']}
            />

            <LockedFeatureCard
                featureName="exportData"
                displayName="Export Data"
                description="Download your complete training history and statistics."
                icon="download"
                colors={['#4CAF50', '#66BB6A']}
            />
        </ScrollView>
    );
}
```

## Available Features and Required Tiers

Feature access is defined in `src/utils/subscription.js`:

```javascript
CONTENT_ACCESS.features = {
    aiShotAnalysis: 'basic',           // Basic AI shooting analysis
    advancedMetrics: 'premium',        // Detailed performance metrics
    personalizedPlans: 'pro',          // Custom training plans
    mentorChat: 'premium',             // AI mentor chat
    exportData: 'basic',               // Export training data
    offlineMode: 'premium',            // Offline access
    videoLibrary: 'free',              // Basic video library
    advancedVideoLibrary: 'premium',   // Extended video content
    challenges: 'free',                // Basic challenges
    exclusiveChallenges: 'premium',    // Premium-only challenges
    leaderboard: 'free',               // Global leaderboard
};
```

## Real-World Examples

### Example 1: Gating AI Shot Analysis

Location: `src/screens/shared/ShootingAnalysisScreen.js`

```javascript
import { canAccessFeature, getRequiredSubscription } from '../../utils/subscription';
import UpgradePrompt from '../../components/shared/UpgradePrompt';

const startCapture = () => {
    const userSubscription = userData?.subscription || 'free';
    const hasAccess = canAccessFeature('aiShotAnalysis', userSubscription);

    if (!hasAccess) {
        const requiredTier = getRequiredSubscription('feature', 'aiShotAnalysis');
        setLockedFeature({
            name: 'AI Shot Analysis',
            requiredTier,
            customMessage: 'Unlock AI-powered shooting form analysis...'
        });
        setShowUpgradePrompt(true);
        return;
    }

    setCurrentStage('recording');
};
```

### Example 2: Conditional UI Rendering

```javascript
import { canAccessFeature } from '../utils/subscription';
import { useAppContext } from '../context/AppContext';

function ProgressScreen() {
    const { userData } = useAppContext();
    const userSubscription = userData?.subscription || 'free';
    const hasAdvancedMetrics = canAccessFeature('advancedMetrics', userSubscription);

    return (
        <View>
            {/* Always show basic metrics */}
            <BasicMetrics />

            {/* Show advanced metrics only for premium users */}
            {hasAdvancedMetrics ? (
                <AdvancedMetrics />
            ) : (
                <LockedFeatureCard
                    featureName="advancedMetrics"
                    displayName="Advanced Metrics"
                    description="Unlock detailed performance analytics"
                />
            )}
        </View>
    );
}
```

### Example 3: Limiting Feature Usage

```javascript
import { hasReachedLimit, calculateUsage } from '../utils/subscription';

function ShotAnalysisScreen() {
    const { userData } = useAppContext();
    const userSubscription = userData?.subscription || 'free';
    const usage = userData?.featureUsage || {};

    const handleAnalysis = () => {
        // Check if user has reached their limit
        const { hasAccess, reachedLimit } = checkUsageLimit(
            'basicAiAnalysis',
            usage
        );

        if (reachedLimit) {
            Alert.alert(
                'Limit Reached',
                'You've used all your AI analyses this month. Upgrade to Premium for unlimited access.',
                [
                    { text: 'Maybe Later', style: 'cancel' },
                    {
                        text: 'Upgrade',
                        onPress: () => navigation.navigate('Settings', { openSubscription: true })
                    }
                ]
            );
            return;
        }

        // Proceed with analysis
        performAnalysis();
    };
}
```

## Testing Feature Gates

### Test Scenarios

1. **Free User** (subscription: 'free')
   - Should see upgrade prompts for premium features
   - Should have access to basic features only

2. **Basic User** (subscription: 'basic')
   - Should access AI shot analysis
   - Should see prompts for premium-only features

3. **Premium User** (subscription: 'premium')
   - Should access all premium features
   - Should see prompts for pro-only features

4. **Pro User** (subscription: 'pro')
   - Should access all features
   - No upgrade prompts should appear

### Manual Testing Steps

1. **Change subscription tier in Firestore**:
   ```
   users/{userId}/subscription: "free" | "basic" | "premium" | "pro"
   ```

2. **Test each tier**:
   - Restart app
   - Try to access gated features
   - Verify upgrade prompt shows for locked features
   - Verify features work correctly when unlocked

3. **Test upgrade flow**:
   - Click "Upgrade" button in prompt
   - Verify navigation to subscription screen
   - Complete subscription
   - Verify feature unlocks

## Best Practices

### DO:
✅ Always check feature access before proceeding with premium functionality
✅ Provide clear, helpful messages about what the feature does
✅ Show upgrade prompts immediately when user tries to access locked features
✅ Use descriptive feature names that match the UI
✅ Test with all subscription tiers
✅ Handle edge cases (no subscription, expired subscription)

### DON'T:
❌ Don't hide premium features completely - show them with locks to drive upgrades
❌ Don't show multiple upgrade prompts simultaneously
❌ Don't block core functionality (sign in, basic workouts)
❌ Don't make it confusing which tier unlocks which feature
❌ Don't forget to handle offline scenarios

## Adding New Gated Features

1. **Add to subscription.js**:
```javascript
// In CONTENT_ACCESS.features
features: {
    myNewFeature: SUBSCRIPTION_TIERS.PREMIUM,  // or BASIC, PRO
}
```

2. **Add translations** (if using i18n):
```javascript
// In i18n files
{
    "myNewFeature": "My New Feature Description"
}
```

3. **Implement the gate**:
```javascript
const hasAccess = canAccessFeature('myNewFeature', userSubscription);
if (!hasAccess) {
    // Show upgrade prompt
}
```

4. **Add to subscription plan features**:
```javascript
// In SUBSCRIPTION_PLANS array
{
    id: 'premium',
    features: [
        { key: 'myNewFeature', enabled: true },
    ]
}
```

## Troubleshooting

### Issue: Feature gate not working
- Check that feature name in CONTENT_ACCESS matches the one you're checking
- Verify user's subscription tier is correctly set in Firestore
- Check console logs for access check results

### Issue: Upgrade prompt not showing
- Verify UpgradePrompt component is rendered in your component tree
- Check that lockedFeature state is set correctly
- Ensure onUpgrade callback is provided

### Issue: Wrong tier required
- Check the feature definition in CONTENT_ACCESS.features
- Verify the tier hierarchy in hasAccess function

## Summary

The feature gating system provides:
- 🔒 **Flexible access control** based on subscription tiers
- 🎨 **Beautiful UI components** for locked features
- ⚡ **Easy implementation** with utilities and hooks
- 📈 **Clear upgrade path** for users
- 🧪 **Testable** with different subscription tiers

For questions or issues, refer to:
- `/src/utils/subscription.js` - Access control logic
- `/src/components/shared/UpgradePrompt.js` - Upgrade modal
- `/src/components/features/LockedFeatureCard.js` - Locked feature UI
- `/src/screens/shared/ShootingAnalysisScreen.js` - Real-world example

---

**Last Updated**: November 2025
