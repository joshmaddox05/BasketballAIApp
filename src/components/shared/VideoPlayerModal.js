import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YouTubePlayerEmbedded from './YouTubePlayerEmbedded';
import youtubeService from '../../services/youtubeService';

const { width } = Dimensions.get('window');

const VideoPlayerModal = ({ visible, video, onClose }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playerState, setPlayerState] = useState(null);

  useEffect(() => {
    if (video && visible) {
      checkBookmarkStatus();
      // Add to viewing history
      youtubeService.addToViewingHistory(video);
    }
  }, [video, visible]);

  const checkBookmarkStatus = async () => {
    if (video) {
      const bookmarked = await youtubeService.isBookmarked(video.youtubeId);
      setIsBookmarked(bookmarked);
    }
  };

  const handleBookmark = async () => {
    if (!video) return;
    
    setIsLoading(true);
    try {
      if (isBookmarked) {
        await youtubeService.removeBookmark(video.youtubeId);
        setIsBookmarked(false);
        Alert.alert('Removed', 'Video removed from bookmarks');
      } else {
        await youtubeService.bookmarkVideo(video);
        setIsBookmarked(true);
        Alert.alert('Bookmarked', 'Video added to bookmarks');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to update bookmark');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!video) return;
    
    try {
      await Share.share({
        message: `Check out this basketball training video: ${video.title}`,
        url: video.url,
        title: video.title
      });
    } catch (error) {
      console.error('Error sharing video:', error);
    }
  };

  const handlePlayerReady = (data) => {
    console.log('YouTube player ready:', data);
  };

  const handleStateChange = (data) => {
    console.log('YouTube player state changed:', data);
    setPlayerState(data.state);
    
    // YouTube player states:
    // -1: unstarted
    // 0: ended
    // 1: playing
    // 2: paused
    // 3: buffering
    // 5: video cued
  };

  const handlePlayerError = (data) => {
    console.error('YouTube player error:', data);
    Alert.alert('Player Error', 'Unable to load video. Please try again.');
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

  if (!video) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Training Video</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                onPress={handleBookmark} 
                style={styles.actionButton}
                disabled={isLoading}
              >
                <Ionicons 
                  name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                  size={24} 
                  color={isBookmarked ? "#8A1C22" : "#666"} 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                <Ionicons name="share-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* YouTube Player */}
            <View style={styles.playerContainer}>
              <YouTubePlayerEmbedded 
                videoId={video.youtubeId}
                autoplay={false}
                controls={true}
                showInfo={false}
                onPlayerReady={handlePlayerReady}
                onStateChange={handleStateChange}
                onError={handlePlayerError}
              />
            </View>

            {/* Video Info */}
            <View style={styles.videoInfo}>
              <Text style={styles.title}>{video.title}</Text>
              
              <View style={styles.metaInfo}>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={16} color="#666" />
                    <Text style={styles.metaText}>{video.channelTitle}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.metaText}>{video.duration}</Text>
                  </View>
                </View>
                
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="eye-outline" size={16} color="#666" />
                    <Text style={styles.metaText}>{formatViewCount(video.viewCount)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.metaText}>{formatPublishedDate(video.publishedAt)}</Text>
                  </View>
                </View>
              </View>

              {/* Level Badge */}
              {video.level && (
                <View style={styles.levelContainer}>
                  <View style={styles.levelBadge}>
                    <Ionicons name="trophy-outline" size={16} color="#8A1C22" />
                    <Text style={styles.levelText}>{video.level}</Text>
                  </View>
                </View>
              )}

              {/* Description */}
              {video.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionTitle}>Description</Text>
                  <Text style={styles.description}>
                    {video.description.length > 300 
                      ? `${video.description.substring(0, 300)}...`
                      : video.description
                    }
                  </Text>
                </View>
              )}

              {/* Player Status */}
              {playerState !== null && (
                <View style={styles.playerStatus}>
                  <View style={styles.statusItem}>
                    <Ionicons 
                      name={
                        playerState === 1 ? "play" : 
                        playerState === 2 ? "pause" : 
                        playerState === 3 ? "sync" : 
                        "stop"
                      } 
                      size={16} 
                      color="#666" 
                    />
                    <Text style={styles.statusText}>
                      {playerState === 1 ? "Playing" : 
                       playerState === 2 ? "Paused" : 
                       playerState === 3 ? "Buffering" : 
                       playerState === 0 ? "Ended" : 
                       "Ready"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Tips */}
              <View style={styles.tipsContainer}>
                <View style={styles.tipCard}>
                  <Ionicons name="bulb-outline" size={20} color="#8A1C22" />
                  <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>Watch & Practice</Text>
                    <Text style={styles.tipText}>
                      Watch the video carefully, then practice the techniques shown. 
                      Repeat the exercises to build muscle memory.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.tipCard}>
                  <Ionicons name="bookmark-outline" size={20} color="#4CAF50" />
                  <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>Save for Later</Text>
                    <Text style={styles.tipText}>
                      Bookmark this video to easily find it in your saved videos for future reference.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  playerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#000',
  },
  videoInfo: {
    padding: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    lineHeight: 25,
  },
  metaInfo: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 6,
  },
  levelContainer: {
    marginBottom: 16,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#8A1C22',
  },
  levelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8A1C22',
    marginLeft: 4,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 17.5,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 21,
  },
  playerStatus: {
    marginBottom: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 6,
  },
  tipsContainer: {
    marginTop: 8,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8A1C22',
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 19,
  },
});

export default VideoPlayerModal;
