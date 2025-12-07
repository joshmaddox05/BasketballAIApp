// PlanDayCard.js - Day preview card for multi-day workout plans
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FOCUS_AREAS } from '../../services/workoutPlanGenerator';

const PlanDayCard = ({
  daySchedule,
  onPress,
  isCompact = false
}) => {
  const {
    day,
    title,
    focusArea,
    workouts = [],
    estimatedDuration,
    completed,
    isRestDay,
    isAssessmentDay,
    weekTheme
  } = daySchedule;

  const focusConfig = FOCUS_AREAS[focusArea] || { color: '#888888', icon: 'fitness-outline' };

  const getStatusIcon = () => {
    if (completed) return 'checkmark-circle';
    if (isRestDay) return 'bed-outline';
    if (isAssessmentDay) return 'trophy-outline';
    return 'ellipse-outline';
  };

  const getStatusColor = () => {
    if (completed) return '#4CAF50';
    if (isRestDay) return '#9C27B0';
    if (isAssessmentDay) return '#FFD700';
    return '#3A3A3A';
  };

  if (isCompact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, completed && styles.compactCardCompleted]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.dayBadge, { backgroundColor: `${focusConfig.color}20` }]}>
          <Text style={[styles.dayBadgeText, { color: focusConfig.color }]}>{day}</Text>
        </View>
        <Ionicons name={getStatusIcon()} size={16} color={getStatusColor()} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        completed && styles.cardCompleted,
        isRestDay && styles.cardRest
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Day Number */}
      <View style={[styles.dayContainer, { backgroundColor: `${focusConfig.color}20` }]}>
        <Text style={[styles.dayNumber, { color: focusConfig.color }]}>{day}</Text>
        <Ionicons name={getStatusIcon()} size={18} color={getStatusColor()} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {weekTheme && (
            <View style={styles.themeBadge}>
              <Text style={styles.themeText}>{weekTheme}</Text>
            </View>
          )}
        </View>

        {!isRestDay && workouts.length > 0 && (
          <View style={styles.workoutsList}>
            {workouts.slice(0, 2).map((workout, index) => (
              <Text key={index} style={styles.workoutName} numberOfLines={1}>
                • {workout.title}
              </Text>
            ))}
            {workouts.length > 2 && (
              <Text style={styles.moreWorkouts}>
                +{workouts.length - 2} more
              </Text>
            )}
          </View>
        )}

        {isRestDay && (
          <Text style={styles.restText}>
            Light stretching and recovery
          </Text>
        )}

        {isAssessmentDay && !isRestDay && (
          <Text style={styles.assessmentText}>
            Test your progress!
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.durationContainer}>
            <Ionicons name="time-outline" size={14} color="#888888" />
            <Text style={styles.durationText}>{estimatedDuration} min</Text>
          </View>
          <View style={styles.focusContainer}>
            <Ionicons name={focusConfig.icon} size={14} color={focusConfig.color} />
            <Text style={[styles.focusText, { color: focusConfig.color }]}>
              {FOCUS_AREAS[focusArea]?.name || focusArea}
            </Text>
          </View>
        </View>
      </View>

      {/* Right Arrow */}
      <Ionicons name="chevron-forward" size={20} color="#555555" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A'
  },
  cardCompleted: {
    backgroundColor: '#1A2A1A',
    borderColor: '#2A3A2A'
  },
  cardRest: {
    backgroundColor: '#1A1A2A',
    borderColor: '#2A2A3A'
  },
  dayContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2
  },
  content: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1
  },
  themeBadge: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8
  },
  themeText: {
    fontSize: 10,
    color: '#888888',
    fontWeight: '500'
  },
  workoutsList: {
    marginBottom: 6
  },
  workoutName: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2
  },
  moreWorkouts: {
    fontSize: 11,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 2
  },
  restText: {
    fontSize: 13,
    color: '#9C27B0',
    fontStyle: 'italic',
    marginBottom: 6
  },
  assessmentText: {
    fontSize: 13,
    color: '#FFD700',
    fontWeight: '500',
    marginBottom: 6
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  durationText: {
    fontSize: 12,
    color: '#888888',
    marginLeft: 4
  },
  focusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  focusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4
  },
  // Compact styles
  compactCard: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A'
  },
  compactCardCompleted: {
    backgroundColor: '#1A2A1A',
    borderColor: '#4CAF50'
  },
  dayBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  }
});

export default PlanDayCard;
