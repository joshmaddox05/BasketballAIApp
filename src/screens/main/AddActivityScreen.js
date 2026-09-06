// AddActivityScreen.js - Manual activity logging with custom types, notes, and photos
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Modal,
  FlatList
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '../../context/AppContext';
import { getTheme } from '../../utils/theme';
import { addActivity } from '../../services/firestoreService';
import { uploadActivityImage } from '../../services/storageService';

const AddActivityScreen = ({ navigation }) => {
  const { userData, theme: contextTheme, isDarkMode } = useAppContext();
  const theme = contextTheme || getTheme(isDarkMode || false);

  // Form state
  const [activityType, setActivityType] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('moderate');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showIntensityModal, setShowIntensityModal] = useState(false);

  const activityTypes = [
    { id: 'shooting', name: 'Shooting Practice', icon: 'basketball' },
    { id: 'dribbling', name: 'Ball Handling', icon: 'basketball-outline' },
    { id: 'conditioning', name: 'Conditioning', icon: 'fitness' },
    { id: 'strength', name: 'Strength Training', icon: 'barbell' },
    { id: 'pickup', name: 'Pickup Game', icon: 'people' },
    { id: 'league', name: 'League Game', icon: 'trophy' },
    { id: 'tournament', name: 'Tournament', icon: 'medal' },
    { id: 'drills', name: 'Drills', icon: 'repeat' },
    { id: 'scrimmage', name: 'Scrimmage', icon: 'game-controller' },
    { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' }
  ];

  const intensityLevels = [
    { id: 'light', name: 'Light', description: 'Easy pace, minimal effort', color: '#4CAF50' },
    { id: 'moderate', name: 'Moderate', description: 'Comfortable pace, steady effort', color: '#FF9800' },
    { id: 'intense', name: 'Intense', description: 'Challenging pace, high effort', color: '#F44336' },
    { id: 'maximal', name: 'Maximal', description: 'Maximum effort, all-out', color: '#9C27B0' }
  ];

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to add photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 3 - photos.length
      });

      if (!result.canceled) {
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          id: Date.now() + Math.random()
        }));
        setPhotos(prev => [...prev, ...newPhotos]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (!result.canceled) {
        const newPhoto = {
          uri: result.assets[0].uri,
          id: Date.now() + Math.random()
        };
        setPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const uploadPhotos = async () => {
    const uploadedPhotos = [];
    
    for (const photo of photos) {
      try {
        const photoUrl = await uploadActivityImage(
          userData.uid,
          `activity_${Date.now()}`,
          photo.uri
        );
        uploadedPhotos.push(photoUrl);
      } catch (error) {
        console.error('Error uploading photo:', error);
        // Continue with other photos even if one fails
      }
    }
    
    return uploadedPhotos;
  };

  const handleSubmit = async () => {
    // Validation
    if (!activityType) {
      Alert.alert('Missing Information', 'Please select an activity type.');
      return;
    }
    
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please enter a title for your activity.');
      return;
    }
    
    if (!duration.trim()) {
      Alert.alert('Missing Information', 'Please enter the duration of your activity.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photos if any
      const photoUrls = photos.length > 0 ? await uploadPhotos() : [];

      // Create activity data
      const activityData = {
        title: title.trim(),
        type: activityType,
        duration: parseInt(duration) || 0,
        intensity: intensity,
        notes: notes.trim(),
        photos: photoUrls,
        isManual: true,
        completedAt: new Date(),
        createdAt: new Date()
      };

      // Save to Firestore
      await addActivity(userData.uid, activityData);

      Alert.alert(
        'Activity Logged!',
        'Your activity has been successfully logged.',
        [
          {
            text: 'View Progress',
            onPress: () => navigation.navigate('Progress', { screen: 'ProgressMain' })
          },
          {
            text: 'Add Another',
            onPress: () => {
              // Reset form
              setActivityType('');
              setTitle('');
              setDuration('');
              setIntensity('moderate');
              setNotes('');
              setPhotos([]);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', 'Failed to save activity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTypeModal = () => (
    <Modal
      visible={showTypeModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => setShowTypeModal(false)}>
            <Text style={[styles.modalCancel, { color: theme.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Activity Type</Text>
          <View style={styles.placeholder} />
        </View>
        
        <FlatList
          data={activityTypes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.typeItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                setActivityType(item.id);
                setShowTypeModal(false);
              }}
            >
              <Ionicons name={item.icon} size={24} color={theme.primary} />
              <Text style={[styles.typeName, { color: theme.text }]}>{item.name}</Text>
              {activityType === item.id && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );

  const renderIntensityModal = () => (
    <Modal
      visible={showIntensityModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => setShowIntensityModal(false)}>
            <Text style={[styles.modalCancel, { color: theme.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Intensity Level</Text>
          <View style={styles.placeholder} />
        </View>
        
        <FlatList
          data={intensityLevels}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.intensityItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                setIntensity(item.id);
                setShowIntensityModal(false);
              }}
            >
              <View style={[styles.intensityIndicator, { backgroundColor: item.color }]} />
              <View style={styles.intensityContent}>
                <Text style={[styles.intensityName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.intensityDescription, { color: theme.textSecondary }]}>
                  {item.description}
                </Text>
              </View>
              {intensity === item.id && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );

  const selectedType = activityTypes.find(type => type.id === activityType);
  const selectedIntensity = intensityLevels.find(level => level.id === intensity);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Log Activity</Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[
            styles.submitButton,
            { 
              backgroundColor: isSubmitting ? theme.backgroundSecondary : theme.primary,
              opacity: isSubmitting ? 0.6 : 1
            }
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Activity Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Activity Type</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowTypeModal(true)}
          >
            <View style={styles.selectorContent}>
              {selectedType ? (
                <>
                  <Ionicons name={selectedType.icon} size={20} color={theme.primary} />
                  <Text style={[styles.selectorText, { color: theme.text }]}>
                    {selectedType.name}
                  </Text>
                </>
              ) : (
                <Text style={[styles.selectorPlaceholder, { color: theme.textSecondary }]}>
                  Select activity type
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Title</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.card, 
              color: theme.text,
              borderColor: theme.border
            }]}
            placeholder="e.g., Morning Shooting Practice"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Duration (minutes)</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.card, 
              color: theme.text,
              borderColor: theme.border
            }]}
            placeholder="30"
            placeholderTextColor={theme.textSecondary}
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>

        {/* Intensity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Intensity Level</Text>
          <TouchableOpacity
            style={[styles.selector, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowIntensityModal(true)}
          >
            <View style={styles.selectorContent}>
              {selectedIntensity ? (
                <>
                  <View style={[styles.intensityIndicator, { backgroundColor: selectedIntensity.color }]} />
                  <Text style={[styles.selectorText, { color: theme.text }]}>
                    {selectedIntensity.name}
                  </Text>
                </>
              ) : (
                <Text style={[styles.selectorPlaceholder, { color: theme.textSecondary }]}>
                  Select intensity level
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textArea, { 
              backgroundColor: theme.card, 
              color: theme.text,
              borderColor: theme.border
            }]}
            placeholder="Add any notes about your activity..."
            placeholderTextColor={theme.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Photos (Optional)</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Add up to 3 photos to document your activity
          </Text>
          
          <View style={styles.photosContainer}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(photo.id)}
                >
                  <Ionicons name="close-circle" size={24} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}
            
            {photos.length < 3 && (
              <TouchableOpacity
                style={[styles.addPhotoButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => {
                  Alert.alert(
                    'Add Photo',
                    'Choose how you want to add a photo',
                    [
                      { text: 'Camera', onPress: handleCameraCapture },
                      { text: 'Photo Library', onPress: handleImagePicker },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Ionicons name="camera" size={24} color={theme.primary} />
                <Text style={[styles.addPhotoText, { color: theme.textSecondary }]}>
                  Add Photo
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {renderTypeModal()}
      {renderIntensityModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17.5,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 17.5,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorText: {
    fontSize: 17.5,
    marginLeft: 10,
  },
  selectorPlaceholder: {
    fontSize: 17.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 17.5,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 17.5,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItem: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 17.5,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  typeName: {
    fontSize: 17.5,
    marginLeft: 15,
    flex: 1,
  },
  intensityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  intensityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  intensityContent: {
    marginLeft: 15,
    flex: 1,
  },
  intensityName: {
    fontSize: 17.5,
    fontWeight: '600',
  },
  intensityDescription: {
    fontSize: 16,
    marginTop: 2,
  },
});

export default AddActivityScreen;
