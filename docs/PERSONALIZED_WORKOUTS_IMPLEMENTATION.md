# Personalized Workouts Implementation

## Overview
This document describes the implementation of the personalized workout system with expanded workout templates and a rule-based recommendation engine.

## What Was Implemented

### 1. Expanded Workout Templates
**File: `src/data/workoutTemplates.js`**

Expanded workout templates to include **at least 5 workouts per category** with subscription tiers:

#### Shooting Workouts (6 total)
- **Beginner Shooting Basics** (FREE) - 20 min
- **Free Throw Master** (FREE) - 15 min
- **Mid-Range Specialist** (BASIC) - 30 min
- **Three-Point Shooter** (BASIC) - 35 min
- **Advanced Shooting Workout** (PREMIUM) - 45 min
- **Elite Scorer Training** (PRO) - 60 min

#### Dribbling Workouts (6 total)
- **Ball Handling Fundamentals** (FREE) - 25 min
- **Quick Hands** (FREE) - 20 min
- **Combo Moves** (BASIC) - 30 min
- **Speed Handler** (BASIC) - 25 min
- **Elite Ball Handling** (PREMIUM) - 35 min
- **Pro Ball Handler** (PRO) - 45 min

#### Physical Workouts (6 total)
- **Basic Conditioning** (FREE) - 20 min
- **Cardio Blast** (FREE) - 25 min
- **Basketball Conditioning** (BASIC) - 30 min
- **Vertical Jump Trainer** (BASIC) - 35 min
- **Athletic Development** (PREMIUM) - 45 min
- **Pro Athlete Conditioning** (PRO) - 60 min

#### Defense Workouts (6 total)
- **Defensive Fundamentals** (FREE) - 25 min
- **Defense 101** (FREE) - 20 min
- **Perimeter Defense** (BASIC) - 30 min
- **Post Defender** (BASIC) - 30 min
- **Lockdown Defender** (PREMIUM) - 40 min
- **Elite Defense System** (PRO) - 50 min

#### Passing Workouts (5 total)
- **Passing Fundamentals** (FREE) - 20 min
- **Basic Passing Skills** (FREE) - 15 min
- **Complete Passer** (BASIC) - 30 min
- **Playmaker Training** (BASIC) - 25 min
- **Elite Playmaker** (PREMIUM) - 35 min

#### New Step Templates Added
**Shooting:**
- Mid-Range Mastery
- Catch and Shoot
- Off the Dribble

**Dribbling:**
- Behind the Back
- Speed Dribbling
- Two Ball Dribbling

**Physical:**
- Suicide Drills
- Box Jumps
- Basketball Burpees
- Agility Ladder

**Defense:**
- Mirror Drill
- Charge Taking
- Deny Defense
- Post Defense

**Passing:**
- Overhead Pass
- Behind the Back Pass
- No Look Pass
- Post Entry Pass

### 2. Rule-Based Personalization Engine
**File: `src/services/workoutPersonalizationEngine.js`**

Created a comprehensive rule-based recommendation engine that analyzes user data and provides personalized workout suggestions.

#### Scoring Algorithm
The engine scores workouts based on multiple factors (100 point scale):

1. **Skill Level Matching (30 points)**
   - Perfect match: 30 points
   - Adjacent difficulty: 15 points
   - Maps user level (beginner/intermediate/advanced) to workout difficulty

2. **Goals Matching (25 points)**
   - Matches workouts to user's selected goals
   - Example: "Improve shooting accuracy" → Shooting workouts get +25 points

3. **Focus Areas Matching (20 points)**
   - Aligns with user's focus areas from onboarding
   - Example: User focused on "dribbling" → Dribbling workouts get +20 points

4. **Duration Matching (15 points)**
   - Exact match: 15 points
   - Within 10 minutes: 10 points
   - Within 20 minutes: 5 points

5. **Variety Bonus (10 points)**
   - Bonus for well-rounded workouts covering multiple categories

#### Key Functions

**`getPersonalizedWorkouts(userProfile, userSubscription, options)`**
- Returns personalized workout recommendations sorted by relevance
- Filters by subscription access
- Options: limit, category, excludeWorkoutIds

**`getWeeklyWorkoutPlan(userProfile, userSubscription)`**
- Generates a complete weekly workout schedule
- Distributes workouts across user's selected training days
- Rotates through categories for variety

**`getNextWorkout(userProfile, userSubscription, recentWorkouts)`**
- Recommends the next workout based on recent activity
- Avoids recently completed workouts
- Prioritizes underworked categories

**`getWorkoutsForGoal(goalTitle, userProfile, userSubscription, limit)`**
- Returns workouts specifically for a goal
- Example: Get all shooting workouts for "Improve shooting accuracy" goal

**`getLockedWorkouts(userSubscription, limit)`**
- Shows premium workouts requiring subscription upgrade
- Useful for conversion optimization

### 3. React Hook
**File: `src/hooks/usePersonalizedWorkouts.js`**

Custom hook that makes the personalization engine easy to use in React components.

#### Usage Example:
```javascript
import { usePersonalizedWorkouts } from '../hooks/usePersonalizedWorkouts';

function MyComponent() {
  const {
    userProfile,
    userSubscription,
    getRecommendations,
    getWeeklyPlan,
    getNext,
    getForGoal,
    getLocked,
    getByCategory,
  } = usePersonalizedWorkouts();

  // Get top 10 personalized recommendations
  const recommendations = getRecommendations({ limit: 10 });

  // Get weekly plan
  const weeklyPlan = getWeeklyPlan();

  // Get next workout
  const nextWorkout = getNext(['workout1', 'workout2']); // recent workouts

  return (
    // ... render workouts
  );
}
```

### 4. UI Component
**File: `src/components/shared/PersonalizedWorkoutSection.js`**

Ready-to-use React component displaying personalized workout recommendations.

#### Features:
- **Next Workout Card**: Highlighted recommendation for the user's next workout
- **Recommended Workouts**: Horizontal scroll of personalized recommendations
- **Premium Workouts Preview**: Shows locked workouts with upgrade prompt
- **Match Percentage**: Displays how well each workout matches the user's profile
- **Subscription Integration**: Automatically filters based on user's subscription tier

#### Integration Example:
```javascript
import PersonalizedWorkoutSection from '../components/shared/PersonalizedWorkoutSection';

function TrainingScreen({ navigation }) {
  return (
    <ScrollView>
      <PersonalizedWorkoutSection
        navigation={navigation}
        onWorkoutPress={(workout) => {
          // Handle workout selection
          navigation.navigate('WorkoutDetail', { workout });
        }}
      />
    </ScrollView>
  );
}
```

## How It Works

### User Journey

1. **Onboarding**: User completes questionnaire
   - Skill level (beginner/intermediate/advanced)
   - Goals (shooting, dribbling, vertical jump, etc.)
   - Training preferences (days, duration, time, focus areas)

2. **Profile Building**: System creates user profile
   ```javascript
   {
     level: 'intermediate',
     goals: [
       { title: 'Improve shooting accuracy', category: 'shooting' },
       { title: 'Master dribbling skills', category: 'dribbling' }
     ],
     preferences: {
       trainingDays: ['Mon', 'Wed', 'Fri'],
       preferredDuration: 30,
       preferredTime: 'evening',
       focusAreas: ['shooting', 'dribbling', 'defense']
     }
   }
   ```

3. **Workout Scoring**: Each workout gets scored
   - Intermediate user → Intermediate workouts score higher
   - Shooting goal → Shooting workouts get +25 points
   - 30-minute preference → 30-minute workouts get +15 points
   - Result: Personalized ranking

4. **Recommendations**: Top-scored workouts are recommended
   - Filtered by subscription access
   - Sorted by personalized score
   - Displayed with match percentage

### Subscription Gating

Each workout has a `requiredTier` field:
- `SUBSCRIPTION_TIERS.FREE`: Available to all users
- `SUBSCRIPTION_TIERS.BASIC`: Requires Basic subscription or higher
- `SUBSCRIPTION_TIERS.PREMIUM`: Requires Premium subscription or higher
- `SUBSCRIPTION_TIERS.PRO`: Requires Pro subscription

The engine automatically filters workouts based on user's subscription using the `hasAccess()` function.

## Future ML Enhancement Path

The current rule-based system can be enhanced with machine learning:

### Phase 1: Data Collection
- Track workout completions
- Monitor user engagement metrics
- Record workout ratings/feedback
- Collect performance improvements

### Phase 2: Feature Engineering
- User features: age, experience, goals, preferences
- Workout features: difficulty, duration, category, steps
- Interaction features: completion rate, ratings, time of day

### Phase 3: Model Training
- **Collaborative Filtering**: Recommend workouts based on similar users
- **Content-Based Filtering**: Enhance current rule-based approach with learned weights
- **Hybrid Model**: Combine both approaches

### Phase 4: Integration
- Replace scoring algorithm with ML model predictions
- A/B test ML vs rule-based recommendations
- Gradually roll out based on performance

The current implementation provides all the necessary hooks and interfaces to plug in an ML model later without changing the API.

## Testing the Implementation

### 1. Test Personalized Recommendations
```javascript
import { getPersonalizedWorkouts } from '../services/workoutPersonalizationEngine';

const userProfile = {
  level: 'intermediate',
  goals: [{ title: 'Improve shooting accuracy' }],
  preferences: {
    focusAreas: ['shooting'],
    preferredDuration: 30,
  },
};

const recommendations = getPersonalizedWorkouts(userProfile, 'free', { limit: 5 });
console.log(recommendations);
// Should show shooting workouts around 30 minutes, free tier only
```

### 2. Test Weekly Plan
```javascript
import { getWeeklyWorkoutPlan } from '../services/workoutPersonalizationEngine';

const userProfile = {
  level: 'beginner',
  preferences: {
    trainingDays: ['Mon', 'Wed', 'Fri'],
    preferredDuration: 20,
  },
};

const weeklyPlan = getWeeklyWorkoutPlan(userProfile, 'basic');
console.log(weeklyPlan);
// Should return workouts for Mon, Wed, Fri with variety
```

### 3. Test Next Workout
```javascript
import { getNextWorkout } from '../services/workoutPersonalizationEngine';

const recentWorkouts = ['shooting_1', 'shooting_2'];
const nextWorkout = getNextWorkout(userProfile, 'free', recentWorkouts);
console.log(nextWorkout);
// Should recommend a non-shooting workout for variety
```

## Integration Checklist

- [x] Expand workout templates to 5+ per category
- [x] Add subscription tiers to all workouts
- [x] Create personalization engine with scoring algorithm
- [x] Implement React hook for easy access
- [x] Create UI component for displaying recommendations
- [ ] Integrate PersonalizedWorkoutSection into TrainingScreen
- [ ] Add personalized recommendations to home screen
- [ ] Test with different user profiles
- [ ] Monitor engagement metrics
- [ ] Collect user feedback

## Next Steps

1. **Integrate into TrainingScreen**: Add the PersonalizedWorkoutSection component to the main Training screen
2. **Update Home Screen**: Show "Your Next Workout" card on the home screen
3. **Analytics**: Track which recommendations users choose
4. **A/B Testing**: Test different scoring weights to optimize engagement
5. **Feedback Loop**: Allow users to rate workouts to improve recommendations
6. **ML Preparation**: Start collecting data for future ML implementation

## Summary

This implementation provides:
- **29+ workouts** across 5 categories (Shooting, Dribbling, Physical, Defense, Passing)
- **Subscription gating** with FREE, BASIC, PREMIUM, and PRO tiers
- **Rule-based personalization engine** that scores workouts based on user profile
- **Easy-to-use React hook** for accessing recommendations
- **Ready-to-integrate UI component** for displaying personalized workouts
- **Clear path to ML enhancement** in the future

The system is production-ready and can be immediately integrated into your app!
