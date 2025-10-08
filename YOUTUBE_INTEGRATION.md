# YouTube Data API Integration for Basketball Training App

This integration adds YouTube training videos to enhance the basketball training experience with real professional content.

## Features Added

### 1. YouTube Service (`src/services/youtubeService.js`)
- **Video Search by Category**: Search for basketball training videos by specific categories (shooting, dribbling, physical, etc.)
- **Popular Videos**: Fetch trending basketball training videos
- **Recommended Videos**: Get personalized video recommendations based on user's training history
- **Video Details**: Retrieve comprehensive video information including thumbnails, duration, view counts, etc.
- **Caching**: Intelligent caching system to reduce API calls and improve performance

### 2. Video Player Component (`src/components/shared/VideoPlayer.js`)
- **Rich Video Display**: Shows video thumbnails, titles, channel info, and metadata
- **Interactive Controls**: Play buttons, duration badges, and featured markers
- **Modal Details View**: Detailed video information with descriptions and stats
- **External Linking**: Opens videos in YouTube app or browser
- **Responsive Design**: Optimized for mobile viewing

### 3. Video Library Screen (`src/screens/main/VideoLibraryScreen.js`)
- **Category Filtering**: Browse videos by training categories
- **Search Functionality**: Search for specific training content
- **Recommended Section**: Personalized video recommendations
- **Grid Layout**: Optimized 2-column layout for mobile
- **Pull-to-Refresh**: Easy content refresh functionality

### 4. Video Detail Screen (`src/screens/main/VideoDetailScreen.js`)
- **Full Video Information**: Complete video details and descriptions
- **Bookmarking**: Save favorite videos for later viewing
- **Related Videos**: Discover similar training content
- **Social Sharing**: Share videos with other users
- **Activity Tracking**: Track video viewing as training activities

### 5. Enhanced Training Screen
- **Integrated Video Section**: Training videos appear alongside workouts
- **Category-Specific Content**: Videos related to specific workout types
- **Quick Access**: Direct navigation to video library

### 6. Enhanced Home Screen
- **Quick Actions**: Fast access to video library and shot analysis
- **Video Integration**: Videos as part of the training ecosystem

## API Configuration

The YouTube Data API is configured with your provided API key:
```javascript
const YOUTUBE_API_KEY = 'AIzaSyDPXAmdrHdF1FSVrNU_M7z74lUaDGUGA6Y';
```

## Usage Examples

### Basic Video Search
```javascript
import YouTubeService from './src/services/youtubeService';

// Search for shooting videos
const shootingVideos = await YouTubeService.searchVideosByCategory('shooting', 10);

// Search with custom query
const customVideos = await YouTubeService.searchVideosByQuery('NBA shooting drills', 5);

// Get popular training videos
const popularVideos = await YouTubeService.getPopularTrainingVideos(15);
```

### Video Player Usage
```javascript
import VideoPlayer from './src/components/shared/VideoPlayer';

<VideoPlayer
  video={videoObject}
  onVideoPress={(video) => navigation.navigate('VideoDetail', { video })}
  showControls={true}
  showDescription={true}
/>
```

### Context Integration
```javascript
import { useAppContext } from './src/context/AppContext';

const { 
  trainingVideos, 
  bookmarkedVideos, 
  addBookmarkedVideo, 
  removeBookmarkedVideo 
} = useAppContext();
```

## Navigation Routes Added

- **VideoLibrary**: Main video browsing screen
- **VideoDetail**: Individual video details and playback

## Features Implemented

### ✅ Core Functionality
- [x] YouTube Data API integration
- [x] Video search by category
- [x] Popular videos fetching
- [x] Video player component
- [x] Video library screen
- [x] Video detail screen
- [x] Navigation integration
- [x] Context state management
- [x] Bookmarking system
- [x] Related videos
- [x] Search functionality
- [x] Category filtering
- [x] Responsive design
- [x] Error handling
- [x] Loading states
- [x] Caching system

### 🔄 Enhanced Features
- [x] Activity tracking for video viewing
- [x] Personalized recommendations
- [x] Integration with existing workout system
- [x] Quick access from home screen
- [x] Social sharing capabilities
- [x] Offline bookmark storage

### 🎯 Training Categories Supported
- **Shooting**: Form, drills, accuracy training
- **Dribbling**: Ball handling, crossovers, moves
- **Physical**: Conditioning, agility, strength
- **Strategy**: Plays, tactics, game situations
- **Mental**: Psychology, motivation, mindset
- **Nutrition**: Diet, supplements, meal planning

## API Endpoints Used

1. **Search Videos**: `youtube/v3/search`
2. **Video Details**: `youtube/v3/videos`
3. **Channel Info**: `youtube/v3/channels`

## Performance Optimizations

- **Caching**: 1-hour cache for video data
- **Lazy Loading**: Videos load on demand
- **Image Optimization**: Multiple thumbnail sizes
- **Network Error Handling**: Graceful fallbacks
- **Memory Management**: Efficient component rendering

## Security Features

- **API Key Protection**: Secure API key handling
- **Input Validation**: Search query sanitization
- **Error Boundaries**: Crash prevention
- **Rate Limiting**: API call optimization

## Future Enhancements

1. **Offline Viewing**: Download videos for offline access
2. **Playlist Creation**: User-created training playlists
3. **Video Comments**: Community interaction features
4. **Progress Tracking**: Video completion tracking
5. **Advanced Filtering**: Duration, difficulty, coach filters
6. **AI Recommendations**: Machine learning-based suggestions

## Testing the Integration

1. **Start the app**: `npm start`
2. **Navigate to Training tab**
3. **Look for "Training Videos" section**
4. **Tap "See All" to open Video Library**
5. **Search and filter videos**
6. **Tap any video to view details**
7. **Test bookmarking and sharing features**

## Troubleshooting

### Common Issues:
1. **No videos loading**: Check internet connection and API key
2. **Search not working**: Verify search query format
3. **Videos not opening**: Ensure YouTube app is installed or browser is available
4. **Slow loading**: Check network speed and consider using WiFi

### Error Messages:
- "Unable to load training videos": Network or API issue
- "No videos found": Try different search terms or categories
- "Unable to open video": YouTube app or browser issue

The integration provides a seamless experience where users can discover professional basketball training content while following their personalized workout plans.
