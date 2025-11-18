# Quick Integration Guide

## How to Add Personalized Workouts to Your App

### Option 1: Add to Training Screen (Recommended)

**File: `src/screens/main/TrainingScreen.js`**

```javascript
// Add import at the top
import PersonalizedWorkoutSection from '../../components/shared/PersonalizedWorkoutSection';

// Inside the component's return statement, add before or after existing content:
<ScrollView style={styles.container}>
  {/* Personalized Recommendations */}
  <PersonalizedWorkoutSection navigation={navigation} />

  {/* Your existing content */}
  <View style={styles.categoriesContainer}>
    {/* ... existing code */}
  </View>
</ScrollView>
```

### Option 2: Create a New "For You" Screen

Create a new file: `src/screens/main/ForYouScreen.js`

```javascript
import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PersonalizedWorkoutSection from '../../components/shared/PersonalizedWorkoutSection';

const ForYouScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Recommended For You</Text>
          <Text style={styles.headerSubtitle}>
            Based on your goals and preferences
          </Text>
        </View>

        <PersonalizedWorkoutSection navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default ForYouScreen;
```

Then add to your navigator:
```javascript
// In MainNavigator.js
<Tab.Screen
  name="ForYou"
  component={ForYouScreen}
  options={{
    tabBarLabel: 'For You',
    tabBarIcon: ({ color }) => (
      <Ionicons name="sparkles" size={24} color={color} />
    ),
  }}
/>
```

### Option 3: Add to Home Screen

**File: `src/screens/main/HomeScreen.js`**

```javascript
// Add import
import { usePersonalizedWorkouts } from '../../hooks/usePersonalizedWorkouts';

// Inside component
const { getNext } = usePersonalizedWorkouts();
const nextWorkout = getNext();

// Add to UI
{nextWorkout && (
  <TouchableOpacity
    style={styles.nextWorkoutCard}
    onPress={() => navigation.navigate('WorkoutDetail', { workout: nextWorkout })}
  >
    <View style={styles.cardHeader}>
      <Ionicons name="flash" size={24} color="#FF6B00" />
      <Text style={styles.cardTitle}>Your Next Workout</Text>
    </View>
    <Text style={styles.workoutName}>{nextWorkout.name}</Text>
    <Text style={styles.workoutMeta}>
      {nextWorkout.difficulty} • {nextWorkout.estimatedDuration} min
    </Text>
  </TouchableOpacity>
)}
```

### Option 4: Show Weekly Plan

Create a component that displays the weekly workout plan:

```javascript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePersonalizedWorkouts } from '../../hooks/usePersonalizedWorkouts';

const WeeklyPlanView = ({ navigation }) => {
  const { getWeeklyPlan } = usePersonalizedWorkouts();
  const weeklyPlan = getWeeklyPlan();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>This Week's Plan</Text>

      {Object.entries(weeklyPlan).map(([day, workout]) => (
        <TouchableOpacity
          key={day}
          style={styles.dayCard}
          onPress={() => navigation.navigate('WorkoutDetail', { workout })}
        >
          <View style={styles.dayBadge}>
            <Text style={styles.dayText}>{day}</Text>
          </View>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutName}>{workout.name}</Text>
            <Text style={styles.workoutMeta}>
              {workout.category} • {workout.estimatedDuration} min
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  dayBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  workoutMeta: {
    fontSize: 12,
    color: '#666',
  },
});

export default WeeklyPlanView;
```

## Using the Hook Directly

If you want to build custom UI, use the hook directly:

```javascript
import { usePersonalizedWorkouts } from '../hooks/usePersonalizedWorkouts';

function MyCustomComponent() {
  const {
    userProfile,          // User's profile data
    userSubscription,     // User's subscription tier
    getRecommendations,   // Get personalized recommendations
    getWeeklyPlan,        // Get weekly workout plan
    getNext,              // Get next workout
    getForGoal,           // Get workouts for a specific goal
    getLocked,            // Get locked premium workouts
    getByCategory,        // Get recommendations by category
  } = usePersonalizedWorkouts();

  // Example: Get top 5 shooting workouts
  const shootingWorkouts = getByCategory('Shooting', 5);

  // Example: Get workouts for a goal
  const goalWorkouts = getForGoal('Improve shooting accuracy', 5);

  // Example: Get next workout avoiding recent ones
  const recentWorkoutIds = ['shooting_1', 'dribbling_2'];
  const nextWorkout = getNext(recentWorkoutIds);

  return (
    // Your custom UI
  );
}
```

## Testing Different User Profiles

You can test the personalization by modifying user data in AppContext:

```javascript
// Test Profile 1: Beginner focusing on shooting
updateUserProfile({
  level: 'beginner',
  goals: [{ title: 'Improve shooting accuracy' }],
  focusAreas: ['shooting'],
  preferredDuration: 20,
});

// Test Profile 2: Advanced player working on all skills
updateUserProfile({
  level: 'advanced',
  goals: [
    { title: 'Master dribbling skills' },
    { title: 'Improve defensive skills' },
  ],
  focusAreas: ['dribbling', 'defense', 'strength'],
  preferredDuration: 45,
});

// Test Profile 3: Intermediate player with time constraints
updateUserProfile({
  level: 'intermediate',
  goals: [{ title: 'Build consistent training habit' }],
  focusAreas: ['shooting', 'physical'],
  preferredDuration: 15,
});
```

## Subscription Testing

Test different subscription tiers to see how content is gated:

```javascript
// Test as free user (limited access)
updateUserSubscription('free');

// Test as basic user (more workouts)
updateUserSubscription('basic');

// Test as premium user (advanced workouts)
updateUserSubscription('premium');

// Test as pro user (all workouts)
updateUserSubscription('pro');
```

## Quick Start

The fastest way to see it in action:

1. Import the PersonalizedWorkoutSection component
2. Add it to your TrainingScreen
3. Done! The component handles everything automatically

```javascript
// src/screens/main/TrainingScreen.js
import PersonalizedWorkoutSection from '../../components/shared/PersonalizedWorkoutSection';

// Add somewhere in your render:
<PersonalizedWorkoutSection navigation={navigation} />
```

That's it! The personalized workouts are now live in your app.
