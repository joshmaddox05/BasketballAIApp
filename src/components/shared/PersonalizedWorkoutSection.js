// PersonalizedWorkoutSection.js
// Component displaying personalized workout recommendations
import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePersonalizedWorkouts } from '../../hooks/usePersonalizedWorkouts';
import { hasAccess } from '../../utils/subscription';

const PersonalizedWorkoutSection = ({ navigation, onWorkoutPress }) => {
  const {
    userProfile,
    userSubscription,
    getRecommendations,
    getNext,
    getLocked,
  } = usePersonalizedWorkouts();

  // Get recommended workouts
  const recommendations = useMemo(() => {
    return getRecommendations({ limit: 6 });
  }, [userProfile, userSubscription]);

  // Get next workout
  const nextWorkout = useMemo(() => {
    return getNext();
  }, [userProfile, userSubscription]);

  // Get locked premium workouts
  const lockedWorkouts = useMemo(() => {
    return getLocked(3);
  }, [userSubscription]);

  const handleWorkoutPress = (workout) => {
    if (onWorkoutPress) {
      onWorkoutPress(workout);
    } else {
      navigation.navigate('WorkoutDetail', { workout });
    }
  };

  const handleUpgradePress = () => {
    navigation.navigate('Subscription');
  };

  const renderWorkoutCard = (workout, isLocked = false) => (
    <TouchableOpacity
      key={workout.id}
      style={[styles.workoutCard, isLocked && styles.lockedWorkoutCard]}
      onPress={() => isLocked ? handleUpgradePress() : handleWorkoutPress(workout)}
    >
      {isLocked && (
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={16} color="#FFF" />
        </View>
      )}

      <View style={styles.workoutHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{workout.category}</Text>
        </View>
        <View style={styles.difficultyBadge}>
          <Text style={styles.difficultyBadgeText}>{workout.difficulty}</Text>
        </View>
      </View>

      <Text style={styles.workoutTitle}>{workout.name}</Text>
      <Text style={styles.workoutDescription} numberOfLines={2}>
        {workout.description}
      </Text>

      <View style={styles.workoutFooter}>
        <View style={styles.durationContainer}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.durationText}>{workout.estimatedDuration} min</Text>
        </View>

        {workout.personalizedScore && (
          <View style={styles.matchBadge}>
            <Ionicons name="sparkles" size={14} color="#8A1C22" />
            <Text style={styles.matchText}>
              {Math.round(workout.personalizedScore)}% Match
            </Text>
          </View>
        )}
      </View>

      {isLocked && (
        <View style={styles.upgradePrompt}>
          <Text style={styles.upgradeText}>Upgrade to unlock</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Next Workout Recommendation */}
      {nextWorkout && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={24} color="#8A1C22" />
            <Text style={styles.sectionTitle}>Your Next Workout</Text>
          </View>

          <TouchableOpacity
            style={styles.nextWorkoutCard}
            onPress={() => handleWorkoutPress(nextWorkout)}
          >
            <View style={styles.nextWorkoutContent}>
              <Text style={styles.nextWorkoutTitle}>{nextWorkout.name}</Text>
              <Text style={styles.nextWorkoutDescription}>
                {nextWorkout.description}
              </Text>

              <View style={styles.nextWorkoutMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="trending-up" size={16} color="#8A1C22" />
                  <Text style={styles.metaText}>{nextWorkout.difficulty}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time" size={16} color="#8A1C22" />
                  <Text style={styles.metaText}>{nextWorkout.estimatedDuration} min</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="barbell" size={16} color="#8A1C22" />
                  <Text style={styles.metaText}>{nextWorkout.category}</Text>
                </View>
              </View>
            </View>

            <View style={styles.startButton}>
              <Ionicons name="play" size={24} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Recommended Workouts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="star" size={24} color="#8A1C22" />
          <Text style={styles.sectionTitle}>Recommended for You</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.workoutsScroll}
        >
          {recommendations.map(workout => renderWorkoutCard(workout, false))}
        </ScrollView>
      </View>

      {/* Premium Workouts Preview */}
      {lockedWorkouts.length > 0 && userSubscription === 'free' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="diamond" size={24} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Premium Workouts</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.workoutsScroll}
          >
            {lockedWorkouts.map(workout => renderWorkoutCard(workout, true))}
          </ScrollView>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgradePress}
          >
            <Ionicons name="diamond" size={20} color="#FFF" />
            <Text style={styles.upgradeButtonText}>Unlock Premium Workouts</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },

  // Next Workout Card
  nextWorkoutCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8A1C22',
    shadowColor: '#8A1C22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  nextWorkoutContent: {
    flex: 1,
  },
  nextWorkoutTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  nextWorkoutDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  nextWorkoutMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  startButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8A1C22',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  // Workout Cards
  workoutsScroll: {
    paddingHorizontal: 16,
  },
  workoutCard: {
    width: 240,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lockedWorkoutCard: {
    opacity: 0.7,
  },
  lockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  workoutHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#FFF0E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  categoryBadgeText: {
    fontSize: 13,
    color: '#8A1C22',
    fontWeight: '600',
  },
  difficultyBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyBadgeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  workoutTitle: {
    fontSize: 17.5,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  workoutDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
    lineHeight: 19,
  },
  workoutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD3B6',
  },
  matchText: {
    fontSize: 13,
    color: '#8A1C22',
    fontWeight: '600',
    marginLeft: 4,
  },
  upgradePrompt: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  upgradeText: {
    fontSize: 14,
    color: '#9C27B0',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Upgrade Button
  upgradeButton: {
    backgroundColor: '#9C27B0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  upgradeButtonText: {
    fontSize: 17.5,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
});

export default PersonalizedWorkoutSection;
