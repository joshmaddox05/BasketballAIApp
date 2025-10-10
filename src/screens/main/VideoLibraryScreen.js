// VideoLibraryScreen.js - Screen for browsing YouTube training videos
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayer from '../../components/shared/VideoPlayer';
import YouTubeService from '../../services/youtubeService';
import { useAppContext } from '../../context/AppContext';

const VideoLibraryScreen = ({ navigation }) => {
  const { userData, activities } = useAppContext();
  const [videos, setVideos] = useState([]);
  const [recommendedVideos, setRecommendedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredVideos, setFilteredVideos] = useState([]);

  const categories = [
    { id: 'All', name: 'All', icon: 'basketball-outline' },
    { id: 'shooting', name: 'Shooting', icon: 'basketball-outline' },
    { id: 'dribbling', name: 'Dribbling', icon: 'hand-left-outline' },
    { id: 'physical', name: 'Physical', icon: 'fitness-outline' },
    { id: 'strategy', name: 'Strategy', icon: 'clipboard-outline' },
    { id: 'mental', name: 'Mental', icon: 'fitness-outline' },
    { id: 'nutrition', name: 'Nutrition', icon: 'nutrition-outline' }
  ];

  // Load videos when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadVideos();
    }, [])
  );

  // Filter videos when search query or category changes
  useEffect(() => {
    filterVideos();
  }, [videos, searchQuery, selectedCategory]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      
      // Load videos for different categories
      const [
        popularVideos,
        shootingVideos,
        dribblingVideos,
        physicalVideos,
        recommended
      ] = await Promise.all([
        YouTubeService.getPopularTrainingVideos(8),
        YouTubeService.searchVideosByCategory('shooting', 5),
        YouTubeService.searchVideosByCategory('dribbling', 5),
        YouTubeService.searchVideosByCategory('physical', 5),
        YouTubeService.getRecommendedVideos(activities, 6)
      ]);

      // Combine all videos
      const allVideos = [
        ...popularVideos,
        ...shootingVideos,
        ...dribblingVideos,
        ...physicalVideos
      ];

      // Remove duplicates based on video ID
      const uniqueVideos = allVideos.filter((video, index, self) =>
        index === self.findIndex(v => v.youtubeId === video.youtubeId)
      );

      setVideos(uniqueVideos);
      setRecommendedVideos(recommended);
    } catch (error) {
      console.error('Error loading videos:', error);
      Alert.alert(
        'Connection Error',
        'Unable to load training videos. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshVideos = async () => {
    setRefreshing(true);
    await loadVideos();
    setRefreshing(false);
  };

  const filterVideos = () => {
    let filtered = videos;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(video => 
        video.category === selectedCategory.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(query) ||
        video.description.toLowerCase().includes(query) ||
        video.channelTitle.toLowerCase().includes(query)
      );
    }

    setFilteredVideos(filtered);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const searchResults = await YouTubeService.searchVideosByQuery(searchQuery, 15);
      setVideos(searchResults);
      setSelectedCategory('All');
    } catch (error) {
      console.error('Error searching videos:', error);
      Alert.alert('Search Error', 'Unable to search videos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPress = (video) => {
    // Navigate to video detail screen or open video
    navigation.navigate('VideoDetail', { video });
  };

  const renderCategoryChip = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item.id && styles.selectedCategoryChip
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Ionicons 
        name={item.icon} 
        size={16} 
        color={selectedCategory === item.id ? '#FFF' : '#666'} 
        style={styles.categoryIcon}
      />
      <Text
        style={[
          styles.categoryChipText,
          selectedCategory === item.id && styles.selectedCategoryChipText
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderVideoItem = ({ item, index }) => (
    <View style={[
      styles.videoCard,
      index % 2 === 0 ? styles.videoCardLeft : styles.videoCardRight
    ]}>
      <VideoPlayer
        video={item}
        onVideoPress={handleVideoPress}
        showControls={false}
      />
    </View>
  );

  const renderRecommendedVideo = ({ item }) => (
    <View style={styles.recommendedVideoCard}>
      <VideoPlayer
        video={item}
        onVideoPress={handleVideoPress}
        showControls={false}
      />
    </View>
  );

  if (loading && videos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading training videos...</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Training Videos</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshVideos}
        >
          <Ionicons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search basketball training videos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryChip}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      <FlatList
        data={filteredVideos}
        renderItem={renderVideoItem}
        keyExtractor={item => item.youtubeId}
        numColumns={2}
        contentContainerStyle={styles.videosList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshVideos}
            tintColor="#FF6B00"
          />
        }
        ListHeaderComponent={
          recommendedVideos.length > 0 && selectedCategory === 'All' ? (
            <View style={styles.recommendedSection}>
              <Text style={styles.sectionTitle}>Recommended for You</Text>
              <FlatList
                data={recommendedVideos}
                renderItem={renderRecommendedVideo}
                keyExtractor={item => item.youtubeId}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recommendedList}
              />
              <Text style={styles.sectionTitle}>All Training Videos</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="videocam-outline" size={60} color="#DDD" />
              <Text style={styles.emptyTitle}>No Videos Found</Text>
              <Text style={styles.emptyMessage}>
                {searchQuery 
                  ? `No videos found for "${searchQuery}"`
                  : "No videos available for this category"
                }
              </Text>
              {searchQuery && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                >
                  <Text style={styles.clearSearchText}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  categoriesContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  selectedCategoryChip: {
    backgroundColor: '#FF6B00',
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryChipText: {
    color: '#FFF',
  },
  recommendedSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recommendedList: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  recommendedVideoCard: {
    width: 280,
    marginRight: 12,
  },
  videosList: {
    padding: 8,
  },
  videoCard: {
    flex: 1,
    margin: 8,
  },
  videoCardLeft: {
    marginRight: 4,
  },
  videoCardRight: {
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearSearchButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF6B00',
    borderRadius: 8,
  },
  clearSearchText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default VideoLibraryScreen;
