// youtubeService.js - Service for YouTube Data API integration
import AsyncStorage from '@react-native-async-storage/async-storage';

const YOUTUBE_API_KEY = 'AIzaSyCOhPnUz793R1XZE_Uf73ORINAiWWJ-f4M';
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Basketball training related search terms
const BASKETBALL_TRAINING_KEYWORDS = {
  shooting: ['basketball shooting drills', 'basketball shooting form', 'NBA shooting workout', 'basketball shot technique'],
  dribbling: ['basketball dribbling drills', 'basketball ball handling', 'crossover dribble tutorial', 'basketball handles'],
  physical: ['basketball conditioning', 'basketball fitness workout', 'basketball agility drills', 'basketball strength training'],
  strategy: ['basketball plays', 'basketball offense', 'basketball defense', 'basketball tactics'],
  mental: ['basketball mental game', 'basketball psychology', 'basketball motivation', 'basketball mindset'],
  nutrition: ['basketball nutrition', 'athlete diet', 'sports nutrition basketball', 'basketball meal prep']
};

class YouTubeService {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    this.VIDEO_CACHE_KEY = 'youtube_videos_cache';
    this.BOOKMARKS_KEY = 'youtube_bookmarks';
    this.VIEWING_HISTORY_KEY = 'youtube_viewing_history';
    this.OFFLINE_VIDEOS_KEY = 'youtube_offline_videos';
  }
  
  /**
   * Validate API key format
   */
  static validateApiKey() {
    const keyPattern = /^AIza[0-9A-Za-z_-]{35}$/;
    const isValid = keyPattern.test(YOUTUBE_API_KEY);
    
    return {
      isValid,
      keyLength: YOUTUBE_API_KEY.length,
      startsCorrectly: YOUTUBE_API_KEY.startsWith('AIza'),
      key: YOUTUBE_API_KEY.substring(0, 10) + '...' + YOUTUBE_API_KEY.substring(YOUTUBE_API_KEY.length - 5)
    };
  }

  /**
   * Get diagnostic information
   */
  static getDiagnostics() {
    const keyInfo = this.validateApiKey();
    return {
      apiKey: keyInfo,
      baseUrl: YOUTUBE_API_BASE_URL,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Test API key and connection
   */
  async testApiKey() {
    try {
      console.log('Testing YouTube API key...');
      const testUrl = `${YOUTUBE_API_BASE_URL}/search?part=snippet&q=basketball&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
      console.log('Test URL:', testUrl);
      
      const response = await fetch(testUrl);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Key Test Failed:', response.status, errorData);
        
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.error) {
            errorMessage = `${errorJson.error.code}: ${errorJson.error.message}`;
            if (errorJson.error.errors && errorJson.error.errors.length > 0) {
              errorMessage += ` - ${errorJson.error.errors[0].reason}`;
            }
          }
        } catch (e) {
          errorMessage = errorData.substring(0, 200);
        }
        
        return { success: false, error: errorMessage, status: response.status };
      }
      
      const data = await response.json();
      console.log('API Key Test Successful:', data);
      return { success: true, data, quota: data.pageInfo };
    } catch (error) {
      console.error('API Key Test Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for basketball training videos by category
   * @param {string} category - Training category (shooting, dribbling, etc.)
   * @param {number} maxResults - Maximum number of results (default 10)
   * @param {string} duration - Video duration filter (short, medium, long)
   */
  async searchVideosByCategory(category = 'shooting', maxResults = 10, duration = 'medium') {
    const cacheKey = `category_${category}_${maxResults}_${duration}`;
    
    // Try to get from cache first
    const cachedData = await this.getCachedVideoData(cacheKey);
    if (cachedData) {
      console.log(`📦 Returning cached data for category: ${category}`);
      return cachedData;
    }

    try {
      const keywords = BASKETBALL_TRAINING_KEYWORDS[category] || BASKETBALL_TRAINING_KEYWORDS.shooting;
      const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
      
      // Use only basic search parameters to avoid 400 errors
      const params = new URLSearchParams({
        part: 'snippet',
        q: randomKeyword,
        type: 'video',
        maxResults: Math.min(maxResults, 25).toString(), // Limit to 25 max
        order: 'relevance',
        key: YOUTUBE_API_KEY
      });

      console.log('YouTube API Request:', `${YOUTUBE_API_BASE_URL}/search?${params.toString()}`);

      const response = await fetch(`${YOUTUBE_API_BASE_URL}/search?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('YouTube API Error Response:', response.status, errorText);
        
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMessage = `${errorJson.error.code}: ${errorJson.error.message}`;
            if (errorJson.error.errors && errorJson.error.errors.length > 0) {
              errorMessage += ` (${errorJson.error.errors[0].reason})`;
            }
          }
        } catch (e) {
          errorMessage = `${response.status} - ${errorText.substring(0, 100)}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('YouTube API Success:', data);
      
      if (!data.items || data.items.length === 0) {
        console.warn('No videos found for category:', category);
        return [];
      }

      // Get detailed video information
      const videoIds = data.items.map(item => item.id.videoId).join(',');
      const detailedVideos = await this.getVideoDetails(videoIds);
      
      const formattedData = this.formatVideoData(detailedVideos, category);
      
      // Cache the result
      await this.cacheVideoData(cacheKey, formattedData);
      
      return formattedData;
    } catch (error) {
      console.error('Error searching YouTube videos:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about specific videos
   * @param {string} videoIds - Comma-separated video IDs
   */
  async getVideoDetails(videoIds) {
    try {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails,statistics',
        id: videoIds,
        key: YOUTUBE_API_KEY
      });

      const response = await fetch(`${YOUTUBE_API_BASE_URL}/videos?${params}`);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting video details:', error);
      throw error;
    }
  }

  /**
   * Search for videos by specific query
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum number of results
   */
  async searchVideosByQuery(query, maxResults = 10) {
    try {
      const params = new URLSearchParams({
        part: 'snippet',
        q: `${query} basketball training`,
        type: 'video',
        maxResults: Math.min(maxResults, 25).toString(),
        order: 'relevance',
        key: YOUTUBE_API_KEY
      });

      console.log('YouTube API Query Request:', `${YOUTUBE_API_BASE_URL}/search?${params.toString()}`);

      const response = await fetch(`${YOUTUBE_API_BASE_URL}/search?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('YouTube API Error Response:', errorText);
        throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        console.warn('No videos found for query:', query);
        return [];
      }
      
      // Get detailed video information
      const videoIds = data.items.map(item => item.id.videoId).join(',');
      const detailedVideos = await this.getVideoDetails(videoIds);
      
      return this.formatVideoData(detailedVideos);
    } catch (error) {
      console.error('Error searching YouTube videos by query:', error);
      throw error;
    }
  }

  /**
   * Get popular basketball training videos
   * @param {number} maxResults - Maximum number of results
   */
  async getPopularTrainingVideos(maxResults = 15) {
    try {
      const params = new URLSearchParams({
        part: 'snippet',
        q: 'basketball training drills',
        type: 'video',
        maxResults: Math.min(maxResults, 25).toString(),
        order: 'viewCount',
        key: YOUTUBE_API_KEY
      });

      console.log('YouTube API Popular Request:', `${YOUTUBE_API_BASE_URL}/search?${params.toString()}`);

      const response = await fetch(`${YOUTUBE_API_BASE_URL}/search?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('YouTube API Error Response:', errorText);
        throw new Error(`YouTube API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        console.warn('No popular videos found');
        return [];
      }
      
      // Get detailed video information
      const videoIds = data.items.map(item => item.id.videoId).join(',');
      const detailedVideos = await this.getVideoDetails(videoIds);
      
      return this.formatVideoData(detailedVideos);
    } catch (error) {
      console.error('Error getting popular training videos:', error);
      throw error;
    }
  }

  /**
   * Format video data for use in the app
   * @param {Object} youtubeData - Raw YouTube API response
   * @param {string} category - Video category
   */
  formatVideoData(youtubeData, category = 'general') {
    if (!youtubeData || !youtubeData.items) {
      return [];
    }

    return youtubeData.items.map(item => ({
      id: item.id,
      youtubeId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: {
        default: item.snippet.thumbnails.default?.url,
        medium: item.snippet.thumbnails.medium?.url,
        high: item.snippet.thumbnails.high?.url,
        standard: item.snippet.thumbnails.standard?.url,
        maxres: item.snippet.thumbnails.maxres?.url
      },
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
      duration: this.parseDuration(item.contentDetails?.duration),
      durationISO: item.contentDetails?.duration,
      viewCount: parseInt(item.statistics?.viewCount || 0),
      likeCount: parseInt(item.statistics?.likeCount || 0),
      category: category,
      level: this.determineDifficultyLevel(item.snippet.title, item.snippet.description),
      url: `https://www.youtube.com/watch?v=${item.id}`,
      embedUrl: `https://www.youtube.com/embed/${item.id}`,
      tags: item.snippet.tags || [],
      featured: parseInt(item.statistics?.viewCount || 0) > 100000 // Mark popular videos as featured
    }));
  }

  /**
   * Parse ISO 8601 duration to readable format
   * @param {string} isoDuration - ISO 8601 duration string
   */
  parseDuration(isoDuration) {
    if (!isoDuration) return 'Unknown';
    
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 'Unknown';

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Determine difficulty level based on video title and description
   * @param {string} title - Video title
   * @param {string} description - Video description
   */
  determineDifficultyLevel(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('beginner') || text.includes('basic') || text.includes('fundamentals') || text.includes('intro')) {
      return 'Beginner';
    } else if (text.includes('advanced') || text.includes('pro') || text.includes('nba') || text.includes('elite')) {
      return 'Advanced';
    } else {
      return 'Intermediate';
    }
  }

  /**
   * Get channel information
   * @param {string} channelId - YouTube channel ID
   */
  async getChannelInfo(channelId) {
    try {
      const params = new URLSearchParams({
        part: 'snippet,statistics',
        id: channelId,
        key: YOUTUBE_API_KEY
      });

      const response = await fetch(`${YOUTUBE_API_BASE_URL}/channels?${params}`);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting channel info:', error);
      throw error;
    }
  }

  /**
   * Get recommended videos based on user's training history
   * @param {Array} completedWorkouts - User's completed workouts
   * @param {number} maxResults - Maximum number of results
   */
  async getRecommendedVideos(completedWorkouts = [], maxResults = 8) {
    try {
      // Analyze user's training patterns
      const categories = completedWorkouts.map(workout => workout.category).filter(Boolean);
      const mostTrainedCategory = this.getMostFrequentCategory(categories);
      
      // Get videos for user's most trained category
      return await this.searchVideosByCategory(mostTrainedCategory || 'shooting', maxResults);
    } catch (error) {
      console.error('Error getting recommended videos:', error);
      // Fallback to popular videos
      return await this.getPopularTrainingVideos(maxResults);
    }
  }

  /**
   * Get the most frequently trained category
   * @param {Array} categories - Array of training categories
   */
  getMostFrequentCategory(categories) {
    if (!categories.length) return 'shooting';
    
    const frequency = {};
    categories.forEach(category => {
      frequency[category] = (frequency[category] || 0) + 1;
    });
    
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }

  /**
   * Enhanced caching with AsyncStorage persistence
   */
  async cacheVideoData(key, data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        expires: Date.now() + this.CACHE_DURATION
      };

      // Cache in memory for fast access
      this.cache.set(key, cacheData);

      // Cache persistently in AsyncStorage
      const allCache = await this.getAllCachedData();
      allCache[key] = cacheData;
      await AsyncStorage.setItem(this.VIDEO_CACHE_KEY, JSON.stringify(allCache));

      console.log(`✅ Cached video data for key: ${key}`);
    } catch (error) {
      console.error('❌ Error caching video data:', error);
    }
  }

  /**
   * Get cached data with fallback to persistent storage
   */
  async getCachedVideoData(key) {
    try {
      // Check memory cache first (fastest)
      if (this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (Date.now() < cached.expires) {
          console.log(`📦 Retrieved from memory cache: ${key}`);
          return cached.data;
        } else {
          this.cache.delete(key);
        }
      }

      // Check persistent cache
      const allCache = await this.getAllCachedData();
      if (allCache[key]) {
        const cached = allCache[key];
        if (Date.now() < cached.expires) {
          // Restore to memory cache for future fast access
          this.cache.set(key, cached);
          console.log(`💾 Retrieved from persistent cache: ${key}`);
          return cached.data;
        } else {
          // Remove expired cache
          delete allCache[key];
          await AsyncStorage.setItem(this.VIDEO_CACHE_KEY, JSON.stringify(allCache));
        }
      }

      console.log(`🚫 No cache found for key: ${key}`);
      return null;
    } catch (error) {
      console.error('❌ Error getting cached video data:', error);
      return null;
    }
  }

  /**
   * Get all cached data from AsyncStorage
   */
  async getAllCachedData() {
    try {
      const cached = await AsyncStorage.getItem(this.VIDEO_CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('❌ Error getting all cached data:', error);
      return {};
    }
  }

  /**
   * Bookmark management
   */
  async bookmarkVideo(video) {
    try {
      const bookmarks = await this.getBookmarks();
      const isBookmarked = bookmarks.some(b => b.youtubeId === video.youtubeId);
      
      if (!isBookmarked) {
        bookmarks.push({
          ...video,
          bookmarkedAt: Date.now()
        });
        await AsyncStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
        console.log(`⭐ Bookmarked video: ${video.title}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error bookmarking video:', error);
      return false;
    }
  }

  async removeBookmark(videoId) {
    try {
      const bookmarks = await this.getBookmarks();
      const filtered = bookmarks.filter(b => b.youtubeId !== videoId);
      await AsyncStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(filtered));
      console.log(`🗑️ Removed bookmark: ${videoId}`);
      return true;
    } catch (error) {
      console.error('❌ Error removing bookmark:', error);
      return false;
    }
  }

  async getBookmarks() {
    try {
      const bookmarks = await AsyncStorage.getItem(this.BOOKMARKS_KEY);
      return bookmarks ? JSON.parse(bookmarks) : [];
    } catch (error) {
      console.error('❌ Error getting bookmarks:', error);
      return [];
    }
  }

  async isBookmarked(videoId) {
    try {
      const bookmarks = await this.getBookmarks();
      return bookmarks.some(b => b.youtubeId === videoId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Viewing history management
   */
  async addToViewingHistory(video) {
    try {
      const history = await this.getViewingHistory();
      
      // Remove if already exists to update timestamp
      const filtered = history.filter(h => h.youtubeId !== video.youtubeId);
      
      // Add to beginning of array
      filtered.unshift({
        ...video,
        viewedAt: Date.now()
      });

      // Keep only last 50 videos
      const trimmed = filtered.slice(0, 50);
      
      await AsyncStorage.setItem(this.VIEWING_HISTORY_KEY, JSON.stringify(trimmed));
      return true;
    } catch (error) {
      console.error('❌ Error adding to viewing history:', error);
      return false;
    }
  }

  async getViewingHistory() {
    try {
      const history = await AsyncStorage.getItem(this.VIEWING_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('❌ Error getting viewing history:', error);
      return [];
    }
  }

  async clearViewingHistory() {
    try {
      await AsyncStorage.removeItem(this.VIEWING_HISTORY_KEY);
      console.log('🗑️ Viewing history cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing viewing history:', error);
      return false;
    }
  }

  /**
   * Cache management utilities
   */
  async clearAllCache() {
    try {
      this.cache.clear();
      await AsyncStorage.removeItem(this.VIDEO_CACHE_KEY);
      console.log('🗑️ All video cache cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return false;
    }
  }

  async getCacheSize() {
    try {
      const allCache = await this.getAllCachedData();
      const size = JSON.stringify(allCache).length;
      return {
        entries: Object.keys(allCache).length,
        sizeInBytes: size,
        sizeInMB: (size / 1024 / 1024).toFixed(2)
      };
    } catch (error) {
      console.error('❌ Error getting cache size:', error);
      return { entries: 0, sizeInBytes: 0, sizeInMB: '0.00' };
    }
  }
}

export default new YouTubeService();
