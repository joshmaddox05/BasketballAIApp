// VideoDetailScreen.js - Detailed view for a specific video
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Share,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YouTubeService from '../../services/youtubeService';
import VideoPlayer from '../../components/shared/VideoPlayer';
import { useAppContext } from '../../context/AppContext';

const VideoDetailScreen = ({ route, navigation }) => {
  const { video } = route.params;
  const { addActivity } = useAppContext();
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    loadRelatedVideos();
  }, [video]);

  const loadRelatedVideos = async () => {
    try {
      setLoading(true);
      // Get related videos based on the current video's category
      const related = await YouTubeService.searchVideosByCategory(
        video.category || 'shooting', 
        6
      );
      
      // Filter out the current video
      const filteredRelated = related.filter(v => v.youtubeId !== video.youtubeId);
      setRelatedVideos(filteredRelated);
    } catch (error) {
      console.error('Error loading related videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWatchVideo = async () => {
    try {
      // Try to open in YouTube app first, fallback to browser
      const youtubeAppUrl = `youtube://${video.youtubeId}`;
      const supported = await Linking.canOpenURL(youtubeAppUrl);
      
      if (supported) {
        await Linking.openURL(youtubeAppUrl);
      } else {
        await Linking.openURL(video.url);
      }

      // Track as an activity
      addActivity({
        title: `Watched: ${video.title}`,
        progress: 100,
        type: 'video'
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to open video');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this basketball training video: ${video.title}\n\n${video.url}`,
        url: video.url,
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share video');
    }
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    // In a real app, you would save this to storage or backend
    Alert.alert(
      bookmarked ? 'Removed from bookmarks' : 'Added to bookmarks',
      bookmarked 
        ? 'Video removed from your bookmarks' 
        : 'Video added to your bookmarks'
    );
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderRelatedVideo = ({ item }) => (
    <TouchableOpacity
      style={styles.relatedVideoCard}
      onPress={() => navigation.replace('VideoDetail', { video: item })}
    >
      <Image
        source={{ uri: item.thumbnail?.medium || item.thumbnail?.default || 'https://via.placeholder.com/120x90?text=Video' }}
        style={styles.relatedVideoThumbnail}
      />
      <View style={styles.relatedVideoInfo}>
        <Text style={styles.relatedVideoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.relatedVideoChannel} numberOfLines={1}>
          {item.channelTitle}
        </Text>
        <Text style={styles.relatedVideoMeta}>
          {formatViewCount(item.viewCount)} • {item.duration}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Details</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Video Thumbnail */}
        <View style={styles.videoContainer}>
          <Image
            source={{ uri: video.thumbnail?.high || video.thumbnail?.medium || video.thumbnail?.default || 'https://via.placeholder.com/640x360?text=Video' }}
            style={styles.videoThumbnail}
            resizeMode="cover"
          />
          
          {/* Play Button Overlay */}
          <TouchableOpacity 
            style={styles.playButtonOverlay}
            onPress={handleWatchVideo}
          >
            <View style={styles.playButton}>
              <Ionicons name="play" size={32} color="#FFF" />
            </View>
          </TouchableOpacity>
          
          {/* Duration Badge */}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        </View>

        {/* Video Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>{video.title}</Text>
          
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
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{video.level}</Text>
                </View>
              </>
            )}
          </View>

          {/* Channel Info */}
          <View style={styles.channelInfo}>
            <View style={styles.channelAvatar}>
              <Ionicons name="person-circle" size={40} color="#DDD" />
            </View>
            <View style={styles.channelDetails}>
              <Text style={styles.channelName}>{video.channelTitle}</Text>
              <Text style={styles.channelSubscribers}>Basketball Training</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleWatchVideo}
            >
              <Ionicons name="play" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Watch on YouTube</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.secondaryButton, bookmarked && styles.bookmarkedButton]}
              onPress={handleBookmark}
            >
              <Ionicons 
                name={bookmarked ? "bookmark" : "bookmark-outline"} 
                size={20} 
                color={bookmarked ? "#FFF" : "#8A1C22"} 
              />
              <Text style={[
                styles.secondaryButtonText,
                bookmarked && styles.bookmarkedButtonText
              ]}>
                {bookmarked ? "Bookmarked" : "Bookmark"}
              </Text>
            </TouchableOpacity>
          </View>

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

          {/* Video Tags */}
          {video.tags && video.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={styles.tagsTitle}>Tags</Text>
              <View style={styles.tagsList}>
                {video.tags.slice(0, 5).map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Related Videos */}
          {relatedVideos.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>Related Videos</Text>
              <FlatList
                data={relatedVideos}
                renderItem={renderRelatedVideo}
                keyExtractor={item => item.youtubeId}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  videoContainer: {
    position: 'relative',
    height: 220,
    backgroundColor: '#000',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(138, 28, 34,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  videoInfo: {
    backgroundColor: '#FFF',
    padding: 16,
  },
  videoTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 25,
    marginBottom: 8,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaText: {
    fontSize: 16,
    color: '#666',
  },
  metaDot: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 6,
  },
  levelBadge: {
    backgroundColor: '#8A1C22',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  levelText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  channelAvatar: {
    marginRight: 12,
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    fontSize: 17.5,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  channelSubscribers: {
    fontSize: 16,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#8A1C22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 17.5,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#8A1C22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  bookmarkedButton: {
    backgroundColor: '#8A1C22',
    borderColor: '#8A1C22',
  },
  secondaryButtonText: {
    color: '#8A1C22',
    fontSize: 17.5,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bookmarkedButtonText: {
    color: '#FFF',
  },
  descriptionContainer: {
    marginBottom: 20,
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
  tagsContainer: {
    marginBottom: 20,
  },
  tagsTitle: {
    fontSize: 17.5,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#666',
  },
  relatedSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  relatedVideoCard: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    overflow: 'hidden',
  },
  relatedVideoThumbnail: {
    width: 120,
    height: 68,
    backgroundColor: '#F0F0F0',
  },
  relatedVideoInfo: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  relatedVideoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 19,
  },
  relatedVideoChannel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  relatedVideoMeta: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
});

export default VideoDetailScreen;
