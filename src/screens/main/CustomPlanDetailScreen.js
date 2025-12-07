// CustomPlanDetailScreen.js - View and continue an active custom workout plan
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { PlanDayCard } from '../../components/buildWorkout';
import { FOCUS_AREAS } from '../../services/workoutPlanGenerator';
import {
  getCustomPlan,
  abandonCustomPlan,
  deleteCustomPlan
} from '../../services/firestoreService';
import { auth } from '../../config/firebaseConfig';

const CustomPlanDetailScreen = ({ navigation, route }) => {
  const { planId } = route.params;
  const { userData } = useAppContext();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch plan data
  const fetchPlan = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert('Error', 'You must be logged in to view this plan.');
        navigation.goBack();
        return;
      }

      const result = await getCustomPlan(uid, planId);

      if (result.success) {
        setPlan(result.plan);
      } else {
        Alert.alert('Error', 'Failed to load plan.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      Alert.alert('Error', 'Failed to load plan.');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPlan();
    }, [planId])
  );

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchPlan();
  };

  // Navigate to day workout
  const handleDayPress = (daySchedule) => {
    if (daySchedule.completed) {
      // Show completion summary for completed days
      Alert.alert(
        'Day Completed!',
        `You completed this day with a score of ${daySchedule.score || 0}%.\n\nDo you want to redo this workout?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Redo',
            onPress: () => navigateToDay(daySchedule)
          }
        ]
      );
    } else {
      navigateToDay(daySchedule);
    }
  };

  const navigateToDay = (daySchedule) => {
    navigation.navigate('CustomPlanDay', {
      planId,
      dayIndex: daySchedule.day - 1,
      daySchedule
    });
  };

  // Handle abandon plan
  const handleAbandon = () => {
    Alert.alert(
      'Abandon Plan',
      'Are you sure you want to abandon this workout plan? Your progress will be saved but the plan will be marked as abandoned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: async () => {
            try {
              const uid = auth.currentUser?.uid;
              await abandonCustomPlan(uid, planId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to abandon plan.');
            }
          }
        }
      ]
    );
  };

  // Handle delete plan
  const handleDelete = () => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this workout plan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const uid = auth.currentUser?.uid;
              await deleteCustomPlan(uid, planId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete plan.');
            }
          }
        }
      ]
    );
  };

  // Calculate progress
  const getProgress = () => {
    if (!plan?.schedule) return { completed: 0, total: 0, percentage: 0 };

    const completed = plan.schedule.filter((d) => d.completed).length;
    const total = plan.schedule.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  // Find next incomplete day
  const getNextDay = () => {
    if (!plan?.schedule) return null;
    return plan.schedule.find((d) => !d.completed);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Plan not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const progress = getProgress();
  const nextDay = getNextDay();
  const isCompleted = plan.status === 'completed' || progress.percentage === 100;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {plan.title}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
          <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B00"
          />
        }
      >
        {/* Status Badge */}
        {plan.status !== 'active' && (
          <View
            style={[
              styles.statusBadge,
              plan.status === 'completed' && styles.statusCompleted,
              plan.status === 'abandoned' && styles.statusAbandoned
            ]}
          >
            <Ionicons
              name={plan.status === 'completed' ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={plan.status === 'completed' ? '#4CAF50' : '#FF6B6B'}
            />
            <Text
              style={[
                styles.statusText,
                { color: plan.status === 'completed' ? '#4CAF50' : '#FF6B6B' }
              ]}
            >
              {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
            </Text>
          </View>
        )}

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <Text style={styles.progressPercentage}>{progress.percentage}%</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress.percentage}%` }]} />
          </View>

          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text style={styles.progressStatText}>
                {progress.completed} of {progress.total} days completed
              </Text>
            </View>
            <View style={styles.progressStat}>
              <Ionicons name="time-outline" size={18} color="#888888" />
              <Text style={styles.progressStatText}>
                ~{Math.round(plan.totalEstimatedDuration / 60)}h total
              </Text>
            </View>
          </View>
        </View>

        {/* Focus Areas */}
        <View style={styles.focusSection}>
          <Text style={styles.sectionTitle}>Focus Areas</Text>
          <View style={styles.focusBadges}>
            {plan.focusAreas?.map((focusId) => {
              const focus = FOCUS_AREAS[focusId];
              if (!focus) return null;
              return (
                <View
                  key={focusId}
                  style={[styles.focusBadge, { backgroundColor: `${focus.color}20` }]}
                >
                  <Ionicons name={focus.icon} size={16} color={focus.color} />
                  <Text style={[styles.focusBadgeText, { color: focus.color }]}>
                    {focus.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Continue Button (if not completed) */}
        {!isCompleted && nextDay && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => handleDayPress(nextDay)}
          >
            <View style={styles.continueContent}>
              <View>
                <Text style={styles.continueLabel}>Continue with</Text>
                <Text style={styles.continueTitle}>{nextDay.title}</Text>
              </View>
              <View style={styles.continueArrow}>
                <Ionicons name="play" size={24} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Completion Message */}
        {isCompleted && (
          <View style={styles.completedCard}>
            <Ionicons name="trophy" size={40} color="#FFD700" />
            <Text style={styles.completedTitle}>Plan Completed!</Text>
            <Text style={styles.completedSubtitle}>
              Great job finishing your {plan.durationDays}-day workout plan!
            </Text>
            {plan.totalScore > 0 && (
              <Text style={styles.completedScore}>
                Overall Score: {Math.round(plan.totalScore)}%
              </Text>
            )}
          </View>
        )}

        {/* Schedule */}
        <View style={styles.scheduleSection}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          {plan.schedule?.map((daySchedule) => (
            <PlanDayCard
              key={daySchedule.day}
              daySchedule={daySchedule}
              onPress={() => handleDayPress(daySchedule)}
            />
          ))}
        </View>

        {/* Actions */}
        {plan.status === 'active' && (
          <TouchableOpacity style={styles.abandonButton} onPress={handleAbandon}>
            <Text style={styles.abandonButtonText}>Abandon Plan</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#AAAAAA',
    fontSize: 16,
    marginTop: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    marginBottom: 16
  },
  backButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 12
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    marginBottom: 16
  },
  statusCompleted: {
    backgroundColor: '#1A2A1A'
  },
  statusAbandoned: {
    backgroundColor: '#2A1A1A'
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6
  },
  progressCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF6B00'
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B00',
    borderRadius: 4
  },
  progressStats: {
    gap: 8
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressStatText: {
    color: '#AAAAAA',
    fontSize: 14,
    marginLeft: 8
  },
  focusSection: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12
  },
  focusBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  focusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  focusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6
  },
  continueButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24
  },
  continueContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  continueLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 4
  },
  continueTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700'
  },
  continueArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  completedCard: {
    backgroundColor: '#1A2A1A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A3A2A'
  },
  completedTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12
  },
  completedSubtitle: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center'
  },
  completedScore: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12
  },
  scheduleSection: {
    marginBottom: 20
  },
  abandonButton: {
    paddingVertical: 14,
    alignItems: 'center'
  },
  abandonButtonText: {
    color: '#FF6B6B',
    fontSize: 15,
    fontWeight: '600'
  }
});

export default CustomPlanDetailScreen;
