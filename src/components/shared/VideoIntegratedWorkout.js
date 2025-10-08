// VideoIntegratedWorkout.js - Enhanced workout with YouTube video support
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayer from './VideoPlayer';
import YouTubeService from '../../services/youtubeService';

const VideoIntegratedWorkout = ({ 
  workout, 
  onVideoSelect, 
  showRelatedVideos = true 
}) => {
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    if (showRelatedVideos && workout) {
      loadRelatedVideos();
    }
  }, [workout]);

  const loadRelatedVideos = async () => {
    try {
      setLoading(true);
      const videos = await YouTubeService.searchVideosByCategory(
        workout.category || 'shooting',
        4
      );
      setRelatedVideos(videos);
    } catch (error) {
      console.error('Error loading related videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPress = (video) => {
    setSelectedVideo(video);
    if (onVideoSelect) {
      onVideoSelect(video);
    }
  };

  const renderVideoItem = ({ item }) => (
    <View style={styles.videoCard}>
      <VideoPlayer
        video={item}
        onVideoPress={handleVideoPress}
        showControls={false}
        style={styles.videoPlayer}
      />
    </View>
  );

  if (!workout) return null;

  return (
    <View style={styles.container}>
      {/* Workout Header */}
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutTitle}>{workout.title}</Text>
        <Text style={styles.workoutDescription}>{workout.description}</Text>
        
        <View style={styles.workoutMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{workout.duration}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="fitness-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{workout.level}</Text>
          </View>
        </View>
      </View>

      {/* Related Training Videos */}
      {showRelatedVideos && (
        <View style={styles.videosSection}>
          <View style={styles.videosSectionHeader}>
            <Text style={styles.videosSectionTitle}>Related Training Videos</Text>
            {relatedVideos.length > 0 && (
              <TouchableOpacity
                onPress={() => Alert.alert('Coming Soon', 'Video library integration coming soon!')}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading training videos...</Text>
            </View>
          ) : relatedVideos.length > 0 ? (
            <FlatList
              data={relatedVideos}
              renderItem={renderVideoItem}
              keyExtractor={item => item.youtubeId}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.videosList}
            />
          ) : (
            <View style={styles.noVideosContainer}>
              <Text style={styles.noVideosText}>
                No training videos available for this workout category.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Workout Steps */}
      <View style={styles.stepsSection}>
        <Text style={styles.stepsSectionTitle}>Workout Steps</Text>
        {workout.steps && workout.steps.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
            </View>
            <Text style={styles.stepInstructions}>{step.instructions}</Text>
            {step.tips && (
              <View style={styles.stepTips}>
                <Ionicons name="bulb-outline" size={16} color="#FF6B00" />
                <Text style={styles.stepTipsText}>{step.tips}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Equipment Needed */}
      {workout.equipment && workout.equipment.length > 0 && (
        <View style={styles.equipmentSection}>
          <Text style={styles.equipmentTitle}>Equipment Needed</Text>
          <View style={styles.equipmentList}>
            {workout.equipment.map((item, index) => (
              <View key={index} style={styles.equipmentItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.equipmentText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Coach Notes */}
      {workout.coachNotes && (
        <View style={styles.coachNotesSection}>
          <Text style={styles.coachNotesTitle}>Coach Notes</Text>
          <View style={styles.coachNotesContainer}>
            <Text style={styles.coachNotesText}>{workout.coachNotes}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  workoutHeader: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  workoutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  workoutDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
  },
  workoutMeta: {
    flexDirection: 'row',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  
  // Videos Section
  videosSection: {
    backgroundColor: '#FFF',
    paddingTop: 16,
    marginBottom: 8,
  },
  videosSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  videosSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '500',
  },
  videosList: {
    paddingHorizontal: 16,
  },
  videoCard: {
    width: 280,
    marginRight: 12,
  },
  videoPlayer: {
    marginBottom: 0,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  noVideosContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noVideosText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  
  // Steps Section
  stepsSection: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
  },
  stepsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  stepCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  stepInstructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  stepTips: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E6',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B00',
  },
  stepTipsText: {
    fontSize: 13,
    color: '#E65100',
    marginLeft: 6,
    flex: 1,
    fontStyle: 'italic',
  },
  
  // Equipment Section
  equipmentSection: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
  },
  equipmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  equipmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  equipmentText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 4,
  },
  
  // Coach Notes Section
  coachNotesSection: {
    backgroundColor: '#FFF',
    padding: 16,
  },
  coachNotesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  coachNotesContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  coachNotesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default VideoIntegratedWorkout;
