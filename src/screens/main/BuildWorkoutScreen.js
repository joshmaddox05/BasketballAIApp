// BuildWorkoutScreen.js - Multi-step wizard for creating personalized workout plans
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Animated,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import {
  WizardProgressBar,
  DurationCard,
  FocusAreaCard,
  PlanDayCard
} from '../../components/buildWorkout';
import {
  generateWorkoutPlan,
  generatePlanTitle,
  FOCUS_AREAS,
  DURATION_TYPES
} from '../../services/workoutPlanGenerator';
import { createCustomPlan } from '../../services/firestoreService';
import { auth } from '../../config/firebaseConfig';

const BuildWorkoutScreen = ({ navigation }) => {
  const { userData, theme, isDarkMode } = useAppContext();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState([]);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [planTitle, setPlanTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate step transitions
  const animateTransition = (direction = 'forward') => {
    const startValue = direction === 'forward' ? 50 : -50;

    slideAnim.setValue(startValue);
    fadeAnim.setValue(0);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };

  // Handle duration selection
  const handleDurationSelect = (durationId) => {
    setSelectedDuration(durationId);
  };

  // Handle focus area toggle
  const handleFocusAreaToggle = (focusId) => {
    setSelectedFocusAreas((prev) => {
      if (prev.includes(focusId)) {
        return prev.filter((id) => id !== focusId);
      }
      return [...prev, focusId];
    });
  };

  // Navigate to next step
  const goToNextStep = () => {
    if (currentStep === 1 && !selectedDuration) {
      Alert.alert('Select Duration', 'Please select how long you want your workout plan to be.');
      return;
    }

    if (currentStep === 2 && selectedFocusAreas.length === 0) {
      Alert.alert('Select Focus Areas', 'Please select at least one focus area for your workout.');
      return;
    }

    if (currentStep === 2) {
      // Generate the plan
      generatePlan();
    }

    if (currentStep < 3) {
      animateTransition('forward');
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Navigate to previous step
  const goToPrevStep = () => {
    if (currentStep > 1) {
      animateTransition('backward');
      setCurrentStep((prev) => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  // Generate workout plan
  const generatePlan = () => {
    setIsGenerating(true);

    try {
      const userLevel = userData?.skillLevel || 'Beginner';

      const plan = generateWorkoutPlan({
        durationType: selectedDuration,
        focusAreas: selectedFocusAreas,
        userLevel
      });

      setGeneratedPlan(plan);
      setPlanTitle(plan.title);
    } catch (error) {
      console.error('Error generating plan:', error);
      Alert.alert('Error', 'Failed to generate workout plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate plan
  const regeneratePlan = () => {
    generatePlan();
  };

  // Save and start the plan
  const savePlan = async () => {
    if (!generatedPlan) return;

    setIsSaving(true);

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert('Error', 'You must be logged in to create a workout plan.');
        return;
      }

      const planData = {
        ...generatedPlan,
        title: planTitle || generatedPlan.title
      };

      const result = await createCustomPlan(uid, planData);

      if (result.success) {
        // Navigate to the plan detail screen
        navigation.replace('CustomPlanDetail', { planId: result.planId });
      } else {
        Alert.alert('Error', result.error || 'Failed to save plan.');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      Alert.alert('Error', 'Failed to save workout plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderDurationStep();
      case 2:
        return renderFocusAreaStep();
      case 3:
        return renderPreviewStep();
      default:
        return null;
    }
  };

  // Step 1: Duration Selection
  const renderDurationStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>How long do you want to train?</Text>
      <Text style={styles.stepSubtitle}>
        Select the duration for your personalized workout plan
      </Text>

      <View style={styles.cardsContainer}>
        {Object.values(DURATION_TYPES).map((duration) => (
          <DurationCard
            key={duration.id}
            duration={duration}
            isSelected={selectedDuration === duration.id}
            onSelect={handleDurationSelect}
          />
        ))}
      </View>
    </View>
  );

  // Step 2: Focus Area Selection
  const renderFocusAreaStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What do you want to focus on?</Text>
      <Text style={styles.stepSubtitle}>
        Select one or more areas to include in your plan
      </Text>

      <View style={styles.cardsContainer}>
        {Object.values(FOCUS_AREAS).map((focus) => (
          <FocusAreaCard
            key={focus.id}
            focusArea={focus}
            isSelected={selectedFocusAreas.includes(focus.id)}
            onToggle={handleFocusAreaToggle}
          />
        ))}
      </View>

      {selectedFocusAreas.length > 0 && (
        <View style={styles.selectedSummary}>
          <Text style={styles.selectedText}>
            Selected: {selectedFocusAreas.map((id) => FOCUS_AREAS[id]?.name).join(', ')}
          </Text>
        </View>
      )}
    </View>
  );

  // Step 3: Preview & Customize
  const renderPreviewStep = () => {
    if (isGenerating) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8A1C22" />
          <Text style={styles.loadingText}>Generating your personalized plan...</Text>
        </View>
      );
    }

    if (!generatedPlan) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to generate plan</Text>
          <TouchableOpacity style={styles.retryButton} onPress={generatePlan}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.stepContent}
      >
        <Text style={styles.stepTitle}>Your Custom Plan</Text>
        <Text style={styles.stepSubtitle}>Review and customize your workout plan</Text>

        {/* Editable Title */}
        <View style={styles.titleInputContainer}>
          <Text style={styles.inputLabel}>Plan Name</Text>
          <TextInput
            style={styles.titleInput}
            value={planTitle}
            onChangeText={setPlanTitle}
            placeholder="Enter plan name..."
            placeholderTextColor="#666666"
          />
        </View>

        {/* Plan Summary */}
        <View style={styles.planSummary}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="calendar-outline" size={20} color="#8A1C22" />
              <Text style={styles.summaryValue}>{generatedPlan.durationDays} Days</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={20} color="#8A1C22" />
              <Text style={styles.summaryValue}>
                ~{Math.round(generatedPlan.totalEstimatedDuration / 60)}h total
              </Text>
            </View>
          </View>
          <View style={styles.focusBadges}>
            {generatedPlan.focusAreas.map((focusId) => {
              const focus = FOCUS_AREAS[focusId];
              return (
                <View
                  key={focusId}
                  style={[styles.focusBadge, { backgroundColor: `${focus.color}20` }]}
                >
                  <Ionicons name={focus.icon} size={14} color={focus.color} />
                  <Text style={[styles.focusBadgeText, { color: focus.color }]}>
                    {focus.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Schedule Preview */}
        <View style={styles.scheduleContainer}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>Schedule</Text>
            <TouchableOpacity onPress={regeneratePlan} style={styles.regenerateButton}>
              <Ionicons name="refresh" size={18} color="#8A1C22" />
              <Text style={styles.regenerateText}>Regenerate</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scheduleScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {generatedPlan.schedule.map((daySchedule) => (
              <PlanDayCard
                key={daySchedule.day}
                daySchedule={daySchedule}
                onPress={() => {}}
              />
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // Get button text based on step
  const getNextButtonText = () => {
    if (currentStep === 3) {
      return isSaving ? 'Saving...' : 'Start Plan';
    }
    return 'Continue';
  };

  // Check if next button should be disabled
  const isNextDisabled = () => {
    if (currentStep === 1 && !selectedDuration) return true;
    if (currentStep === 2 && selectedFocusAreas.length === 0) return true;
    if (currentStep === 3 && (isGenerating || isSaving)) return true;
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevStep} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Build Your Workout</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Progress Bar */}
      <WizardProgressBar currentStep={currentStep} totalSteps={3} />

      {/* Step Content */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>
      </Animated.View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backStepButton}
            onPress={goToPrevStep}
            disabled={isSaving}
          >
            <Text style={styles.backStepButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            isNextDisabled() && styles.nextButtonDisabled,
            currentStep === 1 && styles.nextButtonFull
          ]}
          onPress={currentStep === 3 ? savePlan : goToNextStep}
          disabled={isNextDisabled()}
        >
          {(isGenerating || isSaving) && (
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.buttonLoader} />
          )}
          <Text style={styles.nextButtonText}>{getNextButtonText()}</Text>
          {currentStep < 3 && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  headerRight: {
    width: 40
  },
  contentContainer: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20
  },
  stepContent: {
    flex: 1,
    paddingTop: 10
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#888888',
    marginBottom: 24
  },
  cardsContainer: {
    flex: 1
  },
  selectedSummary: {
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 12,
    marginTop: 16
  },
  selectedText: {
    color: '#AAAAAA',
    fontSize: 14
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
    fontSize: 16,
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#8A1C22',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  titleInputContainer: {
    marginBottom: 20
  },
  inputLabel: {
    color: '#888888',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500'
  },
  titleInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A2A2A'
  },
  planSummary: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8
  },
  focusBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8
  },
  focusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  focusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6
  },
  scheduleContainer: {
    flex: 1
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  scheduleTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700'
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  regenerateText: {
    color: '#8A1C22',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4
  },
  scheduleScroll: {
    maxHeight: 300
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A'
  },
  backStepButton: {
    flex: 0.4,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  backStepButtonText: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '600'
  },
  nextButton: {
    flex: 0.6,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#8A1C22',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  nextButtonFull: {
    flex: 1
  },
  nextButtonDisabled: {
    backgroundColor: '#3A3A3A'
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8
  },
  buttonLoader: {
    marginRight: 8
  }
});

export default BuildWorkoutScreen;
