# How to See Your New Workouts

## What Just Changed

I've updated the app to load **all 29 new workouts** from the workout templates. Here's what you need to know:

## ✅ Changes Made

1. **AppContext.js Updated**
   - Now imports and loads all workout templates automatically
   - Converts template format to app format
   - Adds subscription filtering functions

2. **New Workouts Available**
   - 29 total workouts across all categories
   - Each workout has a subscription tier (FREE, BASIC, PREMIUM, PRO)
   - Your current subscription determines which workouts you can access

## 🔍 Where to See Workouts

The workouts will appear in your existing screens:

### Training Screen
All workouts should now be visible in the Training tab. The workouts are categorized by:
- **Shooting** (6 workouts)
- **Dribbling** (6 workouts)
- **Physical** (6 workouts)
- **Defense** (6 workouts)
- **Passing** (5 workouts)

### Checking Your Subscription

Your current subscription tier determines which workouts you can access:

**Current Subscription in App**: Check `userData.subscription`

To test different tiers, you can temporarily change your subscription:

```javascript
// In AppContext or your settings
userData.subscription = 'free';    // See FREE workouts only
userData.subscription = 'basic';   // See FREE + BASIC workouts
userData.subscription = 'premium'; // See FREE + BASIC + PREMIUM
userData.subscription = 'pro';     // See all workouts
```

## 📊 Workout Distribution by Tier

**FREE Tier** (Default)
- 12 workouts available
- 2 per category (Shooting, Dribbling, Physical, Defense, Passing)
- Perfect for getting started

**BASIC Tier** ($4.99/month)
- 21 workouts total (FREE + 9 new)
- Intermediate difficulty workouts unlocked

**PREMIUM Tier** ($9.99/month)
- 27 workouts total (BASIC + 6 new)
- Advanced workouts unlocked
- 1 passing workout

**PRO Tier** ($19.99/month)
- All 29 workouts
- Elite/Expert difficulty workouts
- Complete access

## 🎯 How Workouts Are Filtered

The app automatically filters workouts based on your subscription:

1. **In Context**:
   - `workouts` - All workouts
   - `getAccessibleWorkouts()` - Only workouts you can access
   - `getLockedWorkouts()` - Premium workouts you can't access yet

2. **In Components**:
   Use the `hasAccess()` function from `utils/subscription.js`:
   ```javascript
   import { hasAccess } from '../utils/subscription';

   const canAccess = hasAccess(userSubscription, workout.requiredTier);
   ```

## 🧪 Testing Different Subscriptions

To test the subscription gating:

### Option 1: Modify AppContext (Temporary)
```javascript
// In AppContext.js initialUserData
subscription: 'premium', // Change this to test different tiers
```

### Option 2: Use the Subscription Screen
Navigate to the subscription upgrade screen and the upgrade function will update `userData.subscription`.

### Option 3: Console Commands (Dev)
If you're in development mode, you can run:
```javascript
// In your React component or Chrome DevTools
const { userData, upgradeSubscription } = useAppContext();
upgradeSubscription('premium'); // Or 'basic', 'pro', etc.
```

## 🔓 Unlocking Premium Workouts

To unlock premium workouts:

1. Navigate to the Subscription/Settings screen
2. Choose a subscription tier (BASIC, PREMIUM, or PRO)
3. Complete payment (via Stripe integration)
4. Workouts will automatically unlock

Or for testing, temporarily set:
```javascript
userData.subscription = 'pro'; // Unlocks everything
```

## 📱 Viewing Workouts in UI

Your existing screens should now show:

**TrainingScreen.js**
- All accessible workouts based on subscription
- Can filter by category
- Can search workouts

**WorkoutDetailScreen.js**
- Full workout details
- Step-by-step instructions
- Equipment needed
- Coach notes

## 💡 Adding Personalized Recommendations

To show personalized workouts (optional), add to any screen:

```javascript
import PersonalizedWorkoutSection from '../components/shared/PersonalizedWorkoutSection';

// In your component
<PersonalizedWorkoutSection navigation={navigation} />
```

This will show:
- Next recommended workout
- Personalized suggestions based on user goals
- Premium workout preview

## 🚨 Troubleshooting

### "I still don't see the new workouts"

1. **Restart the app** - The app loads workouts on startup
2. **Check your subscription** - You might only see FREE workouts
3. **Check console** - Look for any errors in loading workouts
4. **Clear cache** - Clear AsyncStorage if workouts are cached

### "I only see 3 workouts"

This means you're on FREE tier and seeing only the initial sample workouts. The new templates should replace these. Try:
1. Force reload the app (Cmd+R on iOS simulator)
2. Check that `getAllWorkoutTemplates()` is being called
3. Look in console for any import errors

### "All workouts show as locked"

Your subscription tier is set to 'free'. To see more workouts:
```javascript
// Temporarily upgrade for testing
userData.subscription = 'basic'; // or 'premium' or 'pro'
```

## ✨ Next Steps

1. **Test the workouts** - Navigate through different categories
2. **Try different subscriptions** - See how gating works
3. **Add personalized section** - Show smart recommendations
4. **Customize workout display** - Adjust UI to your preference

## 📖 Related Docs

- `PERSONALIZED_WORKOUTS_IMPLEMENTATION.md` - Full technical details
- `INTEGRATION_GUIDE.md` - How to add personalized recommendations
- `src/data/workoutTemplates.js` - All workout templates

The workouts are live in your app! 🎉
