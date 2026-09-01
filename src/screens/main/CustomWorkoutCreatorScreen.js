// CustomWorkoutCreatorScreen.js - Create and edit custom workouts
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import {
  createCustomWorkout,
  updateCustomWorkout,
  getCustomWorkout
} from '../../services/firestoreService';
import {
  WORKOUT_CATEGORIES,
  WORKOUT_DIFFICULTIES,
  STEP_TEMPLATES,
  WORKOUT_TEMPLATES,
  getAllStepTemplates,
  getStepTemplatesByCategory,
} from '../../data/workoutTemplates';

const CustomWorkoutCreatorScreen = ({ route, navigation }) => {
  const { workoutId, template } = route.params || {};
  const { userData } = useAppContext();

  // Workout details
  const [workoutName, setWorkoutName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(WORKOUT_CATEGORIES.CUSTOM);
  const [difficulty, setDifficulty] = useState(WORKOUT_DIFFICULTIES.INTERMEDIATE);
  const [steps, setSteps] = useState([]);

  // UI state
  const [showStepPicker, setShowStepPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);
  const [stepFilter, setStepFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing workout or template on mount
  useEffect(() => {
    const loadWorkout = async () => {
      if (workoutId) {
        // Editing existing workout
        setLoading(true);
        try {
          const workout = await getCustomWorkout(userData.uid, workoutId);
          if (workout) {
            setWorkoutName(workout.name || '');
            setDescription(workout.description || '');
            setCategory(workout.category || WORKOUT_CATEGORIES.CUSTOM);
            setDifficulty(workout.difficulty || WORKOUT_DIFFICULTIES.INTERMEDIATE);
            setSteps(workout.steps || []);
          }
        } catch (error) {
          console.error('Error loading workout:', error);
          Alert.alert('Error', 'Failed to load workout');
        } finally {
          setLoading(false);
        }
      } else if (template) {
        // Starting from template
        setWorkoutName(template.name || '');
        setDescription(template.description || '');
        setCategory(template.category || WORKOUT_CATEGORIES.CUSTOM);
        setDifficulty(template.difficulty || WORKOUT_DIFFICULTIES.INTERMEDIATE);
        setSteps(template.steps || []);
      }
    };

    loadWorkout();
  }, [workoutId, template, userData.uid]);

  const addStep = (stepTemplate) => {
    setSteps([...steps, { ...stepTemplate, id: Date.now().toString() }]);
    setShowStepPicker(false);
  };

  const removeStep = (index) => {
    Alert.alert(
      'Remove Step',
      'Are you sure you want to remove this step?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newSteps = steps.filter((_, i) => i !== index);
            setSteps(newSteps);
          },
        },
      ]
    );
  };

  const moveStepUp = (index) => {
    if (index === 0) return;
    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setSteps(newSteps);
  };

  const moveStepDown = (index) => {
    if (index === steps.length - 1) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setSteps(newSteps);
  };

  const calculateEstimatedDuration = () => {
    return Math.round(steps.reduce((total, step) => total + (step.duration || 0), 0) / 60);
  };

  const validateWorkout = () => {
    if (!workoutName.trim()) {
      Alert.alert('Missing Name', 'Please enter a workout name');
      return false;
    }
    if (steps.length === 0) {
      Alert.alert('No Steps', 'Please add at least one step to your workout');
      return false;
    }
    return true;
  };

  const saveWorkout = async () => {
    if (!validateWorkout()) return;

    setSaving(true);
    try {
      const workoutData = {
        name: workoutName.trim(),
        description: description.trim(),
        category,
        difficulty,
        steps,
        estimatedDuration: calculateEstimatedDuration(),
        level: difficulty,
      };

      if (workoutId) {
        // Update existing workout
        await updateCustomWorkout(userData.uid, workoutId, workoutData);
        Alert.alert('Success', 'Workout updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        // Create new workout
        await createCustomWorkout(userData.uid, workoutData);
        Alert.alert('Success', 'Workout created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStepTemplates = stepFilter === 'all'
    ? getAllStepTemplates()
    : getStepTemplatesByCategory(stepFilter);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8A1C22" />
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {workoutId ? 'Edit Workout' : 'Create Workout'}
        </Text>
        <TouchableOpacity
          onPress={saveWorkout}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Workout Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Workout Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., My Custom Shooting Workout"
            value={workoutName}
            onChangeText={setWorkoutName}
            maxLength={50}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your workout..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        </View>

        {/* Category & Difficulty */}
        <View style={styles.row}>
          <View style={[styles.section, styles.halfWidth]}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={styles.pickerText}>{category}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={[styles.section, styles.halfWidth]}>
            <Text style={styles.label}>Difficulty</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowDifficultyPicker(true)}
            >
              <Text style={styles.pickerText}>{difficulty}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Estimated Duration */}
        <View style={styles.durationCard}>
          <Ionicons name="time-outline" size={24} color="#8A1C22" />
          <Text style={styles.durationText}>
            Estimated Duration: {calculateEstimatedDuration()} minutes
          </Text>
        </View>

        {/* Steps Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Workout Steps ({steps.length})</Text>
            <TouchableOpacity
              style={styles.addStepButton}
              onPress={() => setShowStepPicker(true)}
            >
              <Ionicons name="add-circle" size={24} color="#8A1C22" />
              <Text style={styles.addStepText}>Add Step</Text>
            </TouchableOpacity>
          </View>

          {steps.length === 0 ? (
            <View style={styles.emptySteps}>
              <Ionicons name="clipboard-outline" size={48} color="#CCC" />
              <Text style={styles.emptyStepsText}>No steps added yet</Text>
              <Text style={styles.emptyStepsSubtext}>
                Tap "Add Step" to start building your workout
              </Text>
            </View>
          ) : (
            steps.map((step, index) => (
              <View key={step.id || index} style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepName}>{step.name}</Text>
                    <Text style={styles.stepMeta}>
                      {Math.round(step.duration / 60)} min • {step.reps} reps
                    </Text>
                  </View>
                  <View style={styles.stepActions}>
                    <TouchableOpacity
                      onPress={() => moveStepUp(index)}
                      disabled={index === 0}
                      style={styles.stepActionButton}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={20}
                        color={index === 0 ? '#CCC' : '#666'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveStepDown(index)}
                      disabled={index === steps.length - 1}
                      style={styles.stepActionButton}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={index === steps.length - 1 ? '#CCC' : '#666'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeStep(index)}
                      style={styles.stepActionButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Step Picker Modal */}
      <Modal
        visible={showStepPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStepPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Step</Text>
            <TouchableOpacity onPress={() => setShowStepPicker(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            <TouchableOpacity
              style={[styles.filterChip, stepFilter === 'all' && styles.filterChipActive]}
              onPress={() => setStepFilter('all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  stepFilter === 'all' && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {Object.values(WORKOUT_CATEGORIES).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, stepFilter === cat && styles.filterChipActive]}
                onPress={() => setStepFilter(cat)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    stepFilter === cat && styles.filterChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.stepTemplateList}>
            {filteredStepTemplates.map((stepTemplate, index) => (
              <TouchableOpacity
                key={index}
                style={styles.stepTemplateCard}
                onPress={() => addStep(stepTemplate)}
              >
                <View style={styles.stepTemplateInfo}>
                  <Text style={styles.stepTemplateName}>{stepTemplate.name}</Text>
                  <Text style={styles.stepTemplateDescription}>
                    {stepTemplate.description}
                  </Text>
                  <View style={styles.stepTemplateMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color="#666" />
                      <Text style={styles.metaText}>
                        {Math.round(stepTemplate.duration / 60)} min
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="repeat-outline" size={14} color="#666" />
                      <Text style={styles.metaText}>{stepTemplate.reps} reps</Text>
                    </View>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{stepTemplate.category}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="add-circle-outline" size={24} color="#8A1C22" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>Select Category</Text>
            {Object.values(WORKOUT_CATEGORIES).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={styles.pickerOption}
                onPress={() => {
                  setCategory(cat);
                  setShowCategoryPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    category === cat && styles.pickerOptionTextActive,
                  ]}
                >
                  {cat}
                </Text>
                {category === cat && <Ionicons name="checkmark" size={20} color="#8A1C22" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Difficulty Picker Modal */}
      <Modal
        visible={showDifficultyPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDifficultyPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDifficultyPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerModalTitle}>Select Difficulty</Text>
            {Object.values(WORKOUT_DIFFICULTIES).map((diff) => (
              <TouchableOpacity
                key={diff}
                style={styles.pickerOption}
                onPress={() => {
                  setDifficulty(diff);
                  setShowDifficultyPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    difficulty === diff && styles.pickerOptionTextActive,
                  ]}
                >
                  {diff}
                </Text>
                {difficulty === diff && <Ionicons name="checkmark" size={20} color="#8A1C22" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 17.5,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#8A1C22',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16.5,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  picker: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pickerText: {
    fontSize: 16.5,
    color: '#333',
  },
  durationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#8A1C2230',
  },
  durationText: {
    fontSize: 16.5,
    fontWeight: '600',
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17.5,
    fontWeight: 'bold',
    color: '#333',
  },
  addStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addStepText: {
    fontSize: 16.5,
    fontWeight: '600',
    color: '#8A1C22',
  },
  emptySteps: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyStepsText: {
    fontSize: 17.5,
    fontWeight: '600',
    color: '#666',
  },
  emptyStepsSubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  stepCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8A1C22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepInfo: {
    flex: 1,
  },
  stepName: {
    fontSize: 16.5,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  stepMeta: {
    fontSize: 15,
    color: '#666',
  },
  stepActions: {
    flexDirection: 'row',
    gap: 8,
  },
  stepActionButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
  },
  filterScroll: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexGrow: 0,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#8A1C2215',
    borderColor: '#8A1C22',
  },
  filterChipText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#8A1C22',
    fontWeight: '600',
  },
  stepTemplateList: {
    flex: 1,
    padding: 16,
  },
  stepTemplateCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  stepTemplateInfo: {
    flex: 1,
  },
  stepTemplateName: {
    fontSize: 17.5,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepTemplateDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  stepTemplateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  categoryBadge: {
    backgroundColor: '#8A1C2215',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 13,
    color: '#8A1C22',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '80%',
    maxWidth: 320,
    padding: 20,
  },
  pickerModalTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerOptionText: {
    fontSize: 17.5,
    color: '#333',
  },
  pickerOptionTextActive: {
    color: '#8A1C22',
    fontWeight: '600',
  },
});

export default CustomWorkoutCreatorScreen;
