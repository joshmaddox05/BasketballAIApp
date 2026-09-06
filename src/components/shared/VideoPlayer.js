// VideoPlayer.js - Reusable video player component
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Alert,
  Modal,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayerModal from './VideoPlayerModal';

const VideoPlayer = ({ 
  video, 
  style, 
  showControls = true, 
  showDescription = true,
  onVideoPress 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  const handleVideoPress = () => {
    if (onVideoPress) {
      onVideoPress(video);
    } else {
      // Open in embedded player modal
      setShowPlayerModal(true);
    }
  };

  const openVideo = async () => {
    try {
      // Try to open in YouTube app first, fallback to browser
      const youtubeAppUrl = `youtube://${video.youtubeId}`;
      const supported = await Linking.canOpenURL(youtubeAppUrl);
      
      if (supported) {
        await Linking.openURL(youtubeAppUrl);
      } else {
        await Linking.openURL(video.url);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open video');
    }
  };

  const formatViewCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    } else {
      return `${count} views`;
    }
  };

  const formatPublishedDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return '1 day ago';
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.videoContainer}
        onPress={handleVideoPress}
        activeOpacity={0.8}
      >
        {/* Video Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: video.thumbnail?.medium || video.thumbnail?.default || 'https://via.placeholder.com/640x360?text=Video' }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          
          {/* Play Button Overlay */}
          <View style={styles.playButton}>
            <Ionicons name="play" size={24} color="#FFF" />
          </View>
          
          {/* Duration Badge */}
          {video.duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{video.duration}</Text>
            </View>
          )}
          
          {/* Featured Badge */}
          {video.featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.featuredText}>Popular</Text>
            </View>
          )}
        </View>

        {/* Video Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.title} numberOfLines={2}>
            {video.title}
          </Text>
          
          <Text style={styles.channelName} numberOfLines={1}>
            {video.channelTitle}
          </Text>
          
          <View style={styles.videoMeta}>
            <Text style={styles.metaText}>
              {formatViewCount(video.viewCount)}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>
              {formatPublishedDate(video.publishedAt)}
            </Text>
            {video.level && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={[styles.metaText, styles.levelText]}>
                  {video.level}
                </Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Controls */}
      {showControls && (
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setShowPlayerModal(true)}
          >
            <Ionicons name="play-circle-outline" size={20} color="#8A1C22" />
            <Text style={[styles.controlText, { color: '#8A1C22' }]}>Play in App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={openVideo}
          >
            <Ionicons name="open-outline" size={20} color="#666" />
            <Text style={styles.controlText}>YouTube</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Embedded Video Player Modal */}
      <VideoPlayerModal 
        visible={showPlayerModal}
        video={video}
        onClose={() => setShowPlayerModal(false)}
      />

      {/* Video Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Video Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetails(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Video Thumbnail */}
            <Image
              source={{ uri: video.thumbnail?.high || video.thumbnail?.medium || video.thumbnail?.default || 'https://via.placeholder.com/640x360?text=Video' }}
              style={styles.modalThumbnail}
              resizeMode="cover"
            />
            
            {/* Video Title */}
            <Text style={styles.modalVideoTitle}>{video.title}</Text>
            
            {/* Channel Info */}
            <View style={styles.channelInfo}>
              <Text style={styles.channelNameLarge}>{video.channelTitle}</Text>
              <View style={styles.videoStats}>
                <Text style={styles.statsText}>
                  {formatViewCount(video.viewCount)}
                </Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.statsText}>
                  {formatPublishedDate(video.publishedAt)}
                </Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.statsText}>{video.duration}</Text>
              </View>
            </View>
            
            {/* Video Description */}
            {showDescription && video.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionTitle}>Description</Text>
                <Text style={styles.description}>
                  {video.description.length > 500 
                    ? `${video.description.substring(0, 500)}...`
                    : video.description
                  }
                </Text>
              </View>
            )}
            
            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={openVideo}
              >
                <Ionicons name="play" size={20} color="#FFF" />
                <Text style={styles.primaryButtonText}>Watch on YouTube</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  videoContainer: {
    flex: 1,
  },
  thumbnailContainer: {
    position: 'relative',
    height: 180,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  videoInfo: {
    padding: 12,
  },
  title: {
    fontSize: 17.5,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    lineHeight: 23,
  },
  channelName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#999',
  },
  levelText: {
    color: '#8A1C22',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 4,
  },
  controls: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 16,
  },
  controlText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 6,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalThumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#F0F0F0',
  },
  modalVideoTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
    lineHeight: 25,
  },
  channelInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  channelNameLarge: {
    fontSize: 17.5,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 16,
    color: '#999',
  },
  descriptionContainer: {
    padding: 16,
  },
  descriptionTitle: {
    fontSize: 17.5,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 21,
  },
  actionButtons: {
    padding: 16,
  },
  primaryButton: {
    backgroundColor: '#8A1C22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 17.5,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default VideoPlayer;
