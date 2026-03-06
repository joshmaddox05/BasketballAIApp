// aiAnalysisService.js - Service for AI-powered shooting analysis
// Expo SDK 54 moves uploadAsync and FileSystemUploadType to the legacy export path.
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config/api';

class AIAnalysisService {
  constructor() {
    // Backend API URL - points to separate backend repository
    // Production: https://basketballaiappapi.onrender.com
    // Local development: http://localhost:8000
    this.API_BASE_URL = CONFIG.API_BASE_URL || 'https://basketballaiappapi.onrender.com';
    this.ANALYSIS_CACHE_KEY = 'ai_analysis_cache';
    this.MODELS_CACHE_KEY = 'ai_models_cache';
    this.isOfflineMode = CONFIG.isOfflineMode || false; // Use config setting
    this.timeout = CONFIG.timeout || 600000; // 10 minutes timeout (increased from 5 for optimized backend)

    console.log('🔧 AI Service initialized:', {
      url: this.API_BASE_URL,
      offline: this.isOfflineMode,
      timeout: `${this.timeout / 1000}s`
    });

    // Wake up the backend to reduce cold start delays
    this.wakeUpBackend();
  }

  /**
   * Wake up the backend server to reduce cold start delays
   */
  async wakeUpBackend() {
    if (this.isOfflineMode) return;
    
    try {
      console.log('☕ Waking up backend server...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for health check

      const response = await fetch(`${this.API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('✅ Backend is awake and ready');
      } else {
        console.log('⚠️ Backend responded but may be warming up');
      }
    } catch (error) {
      console.log('⚠️ Backend wake-up failed (expected for cold start):', error.message);
    }
  }

  /**
   * Analyze shooting form from video
   * @param {Object} videoData - Video data from camera capture
   * @returns {Object} Analysis results
   */
  async analyzeShootingForm(videoData) {
    try {
      console.log('🎯 Starting shooting form analysis...');
      
      // Prepare analysis data
      const analysisData = {
        videoUri: videoData.videoUri,
        duration: videoData.duration,
        analysisMode: videoData.analysisMode,
        timestamp: videoData.timestamp,
        cameraType: videoData.cameraType
      };

      if (this.isOfflineMode) {
        // Simulate offline analysis for development
        return await this.simulateAnalysis(analysisData);
      } else {
        // Real AI analysis via FastAPI
        return await this.performRealAnalysis(analysisData);
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      throw new Error('Failed to analyze shooting form. Please try again.');
    }
  }

  // Removed compareWithStephCurry method - no longer comparing to specific players

  // Removed simulateCurryComparison method - no longer comparing to specific players

  // Removed formatCurryComparisonResults method - no longer comparing to specific players

  /**
   * Generate strengths for simulated results
   */
  generateStrengths() {
    const strengths = [
      'Good release timing',
      'Consistent follow-through',
      'Balanced stance',
      'Proper elbow position',
      'Good arc trajectory',
      'Solid base positioning'
    ];
    return this.shuffleArray(strengths).slice(0, 2 + Math.floor(Math.random() * 2));
  }

  /**
   * Generate improvement areas for simulated results
   */
  generateImprovementAreas() {
    const areas = [
      'Release angle consistency',
      'Elbow alignment throughout shot',
      'Follow-through extension',
      'Weight distribution',
      'Shot arc optimization',
      'Balance maintenance'
    ];
    return this.shuffleArray(areas).slice(0, 2 + Math.floor(Math.random() * 2));
  }

  /**
   * Shuffle array helper
   */
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  /**
   * Perform real analysis via FastAPI server
   * @param {Object} analysisData - Analysis input data
   */
  async performRealAnalysis(analysisData) {
    try {
      console.log('📡 Performing real analysis with backend...');
      console.log('📹 Video URI:', analysisData.videoUri);
      
      // Check if this is a test/debug scenario
      if (analysisData.videoUri?.includes('test://') || analysisData.videoUri?.includes('simulated://')) {
        console.log('🧪 Test URI detected, using simulated analysis...');
        return await this.simulateAnalysis(analysisData);
      }
      
      // Upload video file
      console.log('📤 Uploading video to backend...');
      const videoFile = await this.uploadVideo(analysisData.videoUri);
      console.log('✅ Video uploaded:', videoFile);
      
      // Send analysis request
      console.log('🔍 Sending analysis request...');
      const response = await fetch(`${this.API_BASE_URL}/analyze/shooting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoFile.id,
          analysis_mode: analysisData.analysisMode,
          camera_type: analysisData.cameraType,
          duration: analysisData.duration
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Analysis API error:', response.status, errorText);
        throw new Error(`Analysis API error: ${response.status} - ${errorText}`);
      }

      const results = await response.json();
      console.log('✅ Analysis complete from backend');
      
      // Cache results
      await this.cacheAnalysisResults(analysisData.timestamp, results);
      
      return this.formatAnalysisResults(results);
    } catch (error) {
      console.error('❌ Real analysis error:', error);
      console.log('🔄 Falling back to simulated analysis...');
      // Fallback to simulated analysis
      return await this.simulateAnalysis(analysisData);
    }
  }

  /**
   * Upload video to FastAPI server
   * @param {string} videoUri - Local video file URI
   */
  async uploadVideo(videoUri) {
    try {
      console.log('📁 Checking video file:', videoUri);
      
      // Check if this is a simulated/test URI
      if (videoUri.includes('simulated') || videoUri.includes('test://') || videoUri.includes('./')) {
        console.log('🧪 Simulated video URI detected, skipping upload');
        throw new Error('Simulated video - skip upload');
      }
      
      const videoInfo = await FileSystem.getInfoAsync(videoUri);
      
      if (!videoInfo.exists) {
        console.error('❌ Video file not found at:', videoUri);
        throw new Error('Video file not found');
      }

      console.log('📊 Video file info:', {
        size: videoInfo.size,
        exists: videoInfo.exists,
        isDirectory: videoInfo.isDirectory
      });

      const formData = new FormData();
      formData.append('video', {
        uri: videoUri,
        type: 'video/mp4',
        name: 'shooting_video.mp4',
      });

      console.log('📤 Uploading to:', `${this.API_BASE_URL}/upload/video`);
      // Note: Do NOT set Content-Type header manually for FormData
      const response = await fetch(`${this.API_BASE_URL}/upload/video`, {
        method: 'POST',
        body: formData,
        timeout: this.timeout
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Video upload error:', error);
      throw error;
    }
  }

  /**
   * Simulate AI analysis for development/offline mode
   * @param {Object} analysisData - Analysis input data
   */
  async simulateAnalysis(analysisData) {
    return new Promise((resolve) => {
      // Simulate processing time
      setTimeout(() => {
        const simulatedResults = this.generateSimulatedResults(analysisData);
        resolve(simulatedResults);
      }, 3000); // 3 second delay
    });
  }

  /**
   * Generate realistic simulated analysis results
   * @param {Object} analysisData - Input data for simulation
   */
  generateSimulatedResults(analysisData) {
    const baseScore = 70 + Math.random() * 20; // 70-90 range
    
    const results = {
      overall_score: Math.round(baseScore),
      confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
      analysis_mode: analysisData.analysisMode,
      timestamp: analysisData.timestamp,
      
      // Pose analysis
      pose_analysis: {
        release_angle: {
          value: 45 + Math.random() * 15, // 45-60 degrees
          ideal_range: [45, 55],
          score: 7 + Math.random() * 3,
          feedback: this.generateAngleFeedback()
        },
        elbow_alignment: {
          deviation: Math.random() * 10, // 0-10 degrees
          score: 6 + Math.random() * 3,
          feedback: this.generateElbowFeedback()
        },
        follow_through: {
          extension: 0.8 + Math.random() * 0.2, // 80-100%
          wrist_snap: 0.7 + Math.random() * 0.3,
          score: 7 + Math.random() * 3,
          feedback: this.generateFollowThroughFeedback()
        },
        balance_stability: {
          center_of_mass_shift: Math.random() * 5, // 0-5 cm
          foot_positioning: 0.8 + Math.random() * 0.2,
          score: 7 + Math.random() * 3,
          feedback: this.generateBalanceFeedback()
        }
      },

      // Biomechanical analysis
      biomechanics: {
        energy_transfer: 0.75 + Math.random() * 0.2,
        timing_sequence: 0.8 + Math.random() * 0.15,
        power_generation: 0.7 + Math.random() * 0.25,
        efficiency_score: Math.round(75 + Math.random() * 20)
      },

      // Frame-by-frame keypoints
      keyframe_analysis: this.generateKeyframeData(),

      // Comparison with pro models
      pro_comparison: {
        similarity_score: 0.7 + Math.random() * 0.25,
        closest_match: 'Stephen Curry',
        differences: this.generateProDifferences()
      },

      // Recommendations
      recommendations: this.generateRecommendations(baseScore),
      
      // Visual data for overlays
      pose_overlay_data: this.generatePoseOverlayData(),
      
      // Improvement areas
      focus_areas: this.generateFocusAreas()
    };

    return this.formatAnalysisResults(results);
  }

  /**
   * Generate feedback for release angle
   */
  generateAngleFeedback() {
    const feedbacks = [
      "Good release angle! Stay within the 45-55 degree range for optimal trajectory.",
      "Your release angle is slightly high. Try to lower it for better accuracy.",
      "Release angle is too low. Focus on getting more arc on your shot.",
      "Excellent release angle! This is in the optimal range for most shooters."
    ];
    return feedbacks[Math.floor(Math.random() * feedbacks.length)];
  }

  /**
   * Generate feedback for elbow alignment
   */
  generateElbowFeedback() {
    const feedbacks = [
      "Your elbow is well-aligned under the ball. Maintain this consistency.",
      "Elbow is slightly out to the side. Focus on keeping it directly under the ball.",
      "Good elbow positioning! This helps with accuracy and power transfer.",
      "Try to keep your elbow more stable throughout the shooting motion."
    ];
    return feedbacks[Math.floor(Math.random() * feedbacks.length)];
  }

  /**
   * Generate feedback for follow-through
   */
  generateFollowThroughFeedback() {
    const feedbacks = [
      "Excellent follow-through! Your wrist snap and extension are on point.",
      "Work on getting more wrist snap at release for better ball rotation.",
      "Good extension, but focus on holding the follow-through longer.",
      "Your follow-through shows good fundamentals. Keep practicing this motion."
    ];
    return feedbacks[Math.floor(Math.random() * feedbacks.length)];
  }

  /**
   * Generate feedback for balance
   */
  generateBalanceFeedback() {
    const feedbacks = [
      "Great balance and stability throughout your shot!",
      "Slight forward lean detected. Work on staying centered over your base.",
      "Good foot positioning. Your balance is solid.",
      "Try to minimize swaying during your shooting motion."
    ];
    return feedbacks[Math.floor(Math.random() * feedbacks.length)];
  }

  /**
   * Generate keyframe analysis data
   */
  generateKeyframeData() {
    const frames = [];
    const numFrames = 30; // 30 frames for analysis
    
    for (let i = 0; i < numFrames; i++) {
      frames.push({
        frame_number: i,
        timestamp: (i / numFrames) * 2, // 2 second shot
        pose_points: this.generatePosePoints(),
        metrics: {
          release_angle: 45 + Math.sin(i / 5) * 10,
          elbow_angle: 90 + Math.cos(i / 3) * 20,
          knee_bend: 160 + Math.sin(i / 4) * 10
        }
      });
    }
    
    return frames;
  }

  /**
   * Generate pose points for a frame
   */
  generatePosePoints() {
    return {
      nose: { x: 0.5 + Math.random() * 0.02, y: 0.15 + Math.random() * 0.02, confidence: 0.9 },
      leftShoulder: { x: 0.4 + Math.random() * 0.02, y: 0.25 + Math.random() * 0.02, confidence: 0.95 },
      rightShoulder: { x: 0.6 + Math.random() * 0.02, y: 0.25 + Math.random() * 0.02, confidence: 0.95 },
      leftElbow: { x: 0.35 + Math.random() * 0.05, y: 0.35 + Math.random() * 0.05, confidence: 0.9 },
      rightElbow: { x: 0.65 + Math.random() * 0.05, y: 0.35 + Math.random() * 0.05, confidence: 0.9 },
      leftWrist: { x: 0.3 + Math.random() * 0.05, y: 0.45 + Math.random() * 0.05, confidence: 0.85 },
      rightWrist: { x: 0.7 + Math.random() * 0.05, y: 0.45 + Math.random() * 0.05, confidence: 0.85 },
      leftHip: { x: 0.45 + Math.random() * 0.02, y: 0.55 + Math.random() * 0.02, confidence: 0.9 },
      rightHip: { x: 0.55 + Math.random() * 0.02, y: 0.55 + Math.random() * 0.02, confidence: 0.9 },
      leftKnee: { x: 0.44 + Math.random() * 0.02, y: 0.7 + Math.random() * 0.02, confidence: 0.85 },
      rightKnee: { x: 0.56 + Math.random() * 0.02, y: 0.7 + Math.random() * 0.02, confidence: 0.85 },
      leftAnkle: { x: 0.43 + Math.random() * 0.02, y: 0.85 + Math.random() * 0.02, confidence: 0.8 },
      rightAnkle: { x: 0.57 + Math.random() * 0.02, y: 0.85 + Math.random() * 0.02, confidence: 0.8 }
    };
  }

  /**
   * Generate pro comparison differences
   */
  generateProDifferences() {
    return [
      "Release point is 2 inches lower than Curry's optimal position",
      "Shooting elbow alignment is 5 degrees wider than ideal",
      "Follow-through timing is 0.1 seconds faster than recommended",
      "Foot spacing is 3 inches wider than typical pro stance"
    ];
  }

  /**
   * Generate recommendations based on score
   */
  generateRecommendations(score) {
    if (score > 85) {
      return [
        "Maintain your excellent form consistency",
        "Focus on shot repetition to build muscle memory",
        "Work on shooting from different angles and distances"
      ];
    } else if (score > 75) {
      return [
        "Work on elbow alignment for improved accuracy",
        "Practice follow-through extension",
        "Focus on balance and stability drills"
      ];
    } else {
      return [
        "Start with basic shooting form fundamentals",
        "Practice proper foot positioning and balance",
        "Work on consistent release point",
        "Focus on slow, controlled shooting motions"
      ];
    }
  }

  /**
   * Generate pose overlay data for visualization
   */
  generatePoseOverlayData() {
    return {
      optimal_pose: this.generatePosePoints(),
      user_pose: this.generatePosePoints(),
      alignment_errors: [
        { joint: 'rightElbow', error_magnitude: 0.05, error_direction: 'outward' },
        { joint: 'leftKnee', error_magnitude: 0.02, error_direction: 'forward' }
      ],
      improvement_suggestions: [
        { area: 'elbow', instruction: "Move elbow 2 inches inward" },
        { area: 'follow_through', instruction: "Extend wrist snap by 0.2 seconds" }
      ]
    };
  }

  /**
   * Generate focus areas for improvement
   */
  generateFocusAreas() {
    const allAreas = [
      { name: 'Release Angle', priority: 'high', description: 'Optimize arc for better accuracy' },
      { name: 'Elbow Alignment', priority: 'medium', description: 'Keep elbow under the ball' },
      { name: 'Follow Through', priority: 'high', description: 'Improve wrist snap and extension' },
      { name: 'Balance', priority: 'low', description: 'Maintain stability throughout shot' },
      { name: 'Timing', priority: 'medium', description: 'Coordinate leg and arm motion' }
    ];

    // Return 2-3 random areas
    const numAreas = 2 + Math.floor(Math.random() * 2);
    return allAreas.sort(() => 0.5 - Math.random()).slice(0, numAreas);
  }

  /**
   * Format analysis results for app consumption
   */
  formatAnalysisResults(rawResults) {
    return {
      id: `analysis_${Date.now()}`,
      timestamp: rawResults.timestamp || Date.now(),
      overallScore: rawResults.overall_score,
      confidence: rawResults.confidence,
      
      metrics: [
        {
          id: 'releaseAngle',
          name: 'Release Angle',
          score: Math.round(rawResults.pose_analysis.release_angle.score),
          value: `${Math.round(rawResults.pose_analysis.release_angle.value)}°`,
          ideal: '45-55°',
          feedback: rawResults.pose_analysis.release_angle.feedback,
          status: this.getMetricStatus(rawResults.pose_analysis.release_angle.score)
        },
        {
          id: 'elbowAlignment',
          name: 'Elbow Alignment',
          score: Math.round(rawResults.pose_analysis.elbow_alignment.score),
          value: `${Math.round(rawResults.pose_analysis.elbow_alignment.deviation)}° deviation`,
          ideal: 'Vertical alignment',
          feedback: rawResults.pose_analysis.elbow_alignment.feedback,
          status: this.getMetricStatus(rawResults.pose_analysis.elbow_alignment.score)
        },
        {
          id: 'followThrough',
          name: 'Follow Through',
          score: Math.round(rawResults.pose_analysis.follow_through.score),
          value: `${Math.round(rawResults.pose_analysis.follow_through.extension * 100)}% extension`,
          ideal: 'Full arm extension',
          feedback: rawResults.pose_analysis.follow_through.feedback,
          status: this.getMetricStatus(rawResults.pose_analysis.follow_through.score)
        },
        {
          id: 'balance',
          name: 'Balance & Stability',
          score: Math.round(rawResults.pose_analysis.balance_stability.score),
          value: `${Math.round(rawResults.pose_analysis.balance_stability.foot_positioning * 100)}% stable`,
          ideal: 'Stable throughout',
          feedback: rawResults.pose_analysis.balance_stability.feedback,
          status: this.getMetricStatus(rawResults.pose_analysis.balance_stability.score)
        }
      ],

      improvements: rawResults.recommendations,
      focusAreas: rawResults.focus_areas,
      proComparison: rawResults.pro_comparison,
      keyframeData: rawResults.keyframe_analysis,
      overlayData: rawResults.pose_overlay_data,
      biomechanics: rawResults.biomechanics
    };
  }

  /**
   * Get metric status based on score
   */
  getMetricStatus(score) {
    if (score >= 8) return 'good';
    if (score >= 6) return 'improve';
    return 'poor';
  }

  /**
   * Cache analysis results
   */
  async cacheAnalysisResults(timestamp, results) {
    try {
      const existingCache = await AsyncStorage.getItem(this.ANALYSIS_CACHE_KEY);
      const cache = existingCache ? JSON.parse(existingCache) : {};
      
      cache[timestamp] = {
        results,
        cached_at: Date.now()
      };

      await AsyncStorage.setItem(this.ANALYSIS_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Cache error:', error);
    }
  }

  /**
   * Get cached analysis results
   */
  async getCachedResults(timestamp) {
    try {
      const cache = await AsyncStorage.getItem(this.ANALYSIS_CACHE_KEY);
      if (cache) {
        const parsedCache = JSON.parse(cache);
        return parsedCache[timestamp]?.results || null;
      }
      return null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Enable/disable offline mode
   */
  setOfflineMode(enabled) {
    this.isOfflineMode = enabled;
    console.log(`🔄 AI Analysis ${enabled ? 'offline' : 'online'} mode enabled`);
  }

  /**
   * Set FastAPI server URL
   */
  setServerURL(url) {
    this.API_BASE_URL = url;
    console.log(`🌐 API Server URL set to: ${url}`);
  }

  /**
   * Comprehensive shooting analysis with form analysis and coaching feedback
   * @param {Object} videoData - Video data from camera capture
   * @returns {Object} Comprehensive analysis results with coaching recommendations
   */
  async analyzeComprehensive(videoData) {
    try {
      console.log('🎯 Starting comprehensive form analysis...');
      console.log('📹 Video URI:', videoData.videoUri);
      
      if (this.isOfflineMode) {
        console.log('⚠️ Running in offline mode - using simulated comprehensive data');
        return await this.simulateComprehensiveAnalysis(videoData);
      }

      // Validate video URI
      if (!videoData.videoUri) {
        console.error('❌ No video URI provided');
        throw new Error('No video URI provided');
      }

      // Check if this is a simulated or test video URI
      if (videoData.videoUri.includes('simulated') || 
          videoData.videoUri.includes('test://') || 
          videoData.videoUri.startsWith('file://simulated')) {
        console.log('⚠️ Detected simulated video URI - falling back to simulation');
        return await this.simulateComprehensiveAnalysis(videoData);
      }

      console.log('📁 Video file URI validated:', videoData.videoUri);

      // Step 1: Create analysis session
      console.log('🔵 Step 1: Creating analysis session...');
      const sessionResp = await fetch(`${this.API_BASE_URL}/analysis-sessions`, {
        method: 'POST',
      });
      if (!sessionResp.ok) {
        const errorText = await sessionResp.text();
        throw new Error(`Session creation failed: ${sessionResp.status} - ${errorText}`);
      }
      const { session_id } = await sessionResp.json();
      console.log('✅ Session created:', session_id);

      // Step 2: Get presigned upload URL
      console.log('🔵 Step 2: Getting presigned upload URL...');
      const urlResp = await fetch(`${this.API_BASE_URL}/analysis-sessions/${session_id}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: 'shooting_video.mp4', content_type: 'video/mp4' }),
      });
      if (!urlResp.ok) {
        const errorText = await urlResp.text();
        throw new Error(`Failed to get upload URL: ${urlResp.status} - ${errorText}`);
      }
      const { upload_url } = await urlResp.json();
      console.log('✅ Got presigned upload URL');

      // Step 3: Upload video directly to presigned URL
      console.log('🔵 Step 3: Uploading video to storage...');
      const uploadResult = await FileSystem.uploadAsync(upload_url, videoData.videoUri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': 'video/mp4' },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });
      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(`Video upload failed with status: ${uploadResult.status}`);
      }
      console.log('✅ Video uploaded to storage');

      // Step 4: Start analysis
      console.log('🔵 Step 4: Starting analysis...');
      const startResp = await fetch(`${this.API_BASE_URL}/analysis-sessions/${session_id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_mode: 'shot', frame_skip: 1 }),
      });
      if (!startResp.ok) {
        const errorText = await startResp.text();
        throw new Error(`Failed to start analysis: ${startResp.status} - ${errorText}`);
      }
      console.log('✅ Analysis queued');

      // Step 5: Poll for results
      console.log('🔵 Step 5: Polling for results...');
      const results = await this._pollSessionResults(session_id);
      console.log('✅ Received form analysis results from backend');
      console.log('📊 Result keys:', Object.keys(results));

      // Cache results
      await this.cacheAnalysisResults(videoData.timestamp, results);

      return this.formatFormAnalysisResults(results);
    } catch (error) {
      console.error('❌ Comprehensive analysis error:', error);

      // If this is an API error with tips, rethrow it so the UI can handle it
      if (error.apiError || error.tips) {
        throw error;
      }

      // For network errors or other issues, provide a helpful message
      if (error.message.includes('Network') || error.message.includes('fetch')) {
        const networkError = new Error('Unable to connect to the analysis server. Please check your internet connection and try again.');
        networkError.apiError = true;
        throw networkError;
      }

      // For other errors, rethrow with context
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Poll analysis session until DONE or FAILED
   * @param {string} session_id - The session UUID
   * @param {number} maxAttempts - Max number of poll attempts (default 120 = 10 min at 5s interval)
   * @param {number} intervalMs - Polling interval in ms
   */
  async _pollSessionResults(session_id, maxAttempts = 120, intervalMs = 5000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));

      const resp = await fetch(`${this.API_BASE_URL}/analysis-sessions/${session_id}`);
      if (!resp.ok) {
        throw new Error(`Polling failed: ${resp.status}`);
      }

      const { session } = await resp.json();
      console.log(`🔄 Poll attempt ${attempt + 1}: status = ${session.status}`);

      if (session.status === 'DONE') {
        return session;
      }

      if (session.status === 'FAILED') {
        const error = new Error(session.error || 'Analysis failed on the server');
        error.apiError = true;
        error.tips = session.tips || [];
        throw error;
      }
    }

    throw new Error('Analysis timed out after 10 minutes. Please try again with a shorter video.');
  }

  /**
   * Format form analysis results from backend API
   * Maps backend response to app's expected format
   */
  formatFormAnalysisResults(apiResults) {
    console.log('📝 Formatting form analysis results...');
    console.log('🌐 API Response:', JSON.stringify(apiResults, null, 2));

    const normalizedResults = this._normalizeAnalysisResults(apiResults);

    // Check if API returned an error
    if (normalizedResults.success === false) {
      console.warn('⚠️ API returned failure:', normalizedResults.error);

      // Create a custom error object with tips if available
      const error = new Error(normalizedResults.error || 'Analysis failed');
      error.apiError = true;
      error.tips = normalizedResults.tips || [];
      error.confidence = normalizedResults.confidence;
      throw error;
    }

    // Map the metrics from the API response to the UI format
    const metricsArray = this._mapMetricsToArray(normalizedResults.metrics || {});

    // Extract improvement areas from coaching cues and improvement summary
    const improvements = this._extractImprovements(normalizedResults, metricsArray);
    const overallScore = this._deriveOverallScore(normalizedResults, metricsArray);
    const overlayVideoUrl = this._extractOverlayVideoUrl(normalizedResults);

    const formattedResults = {
      videoId: normalizedResults.video_id || normalizedResults.session_id || normalizedResults.id,
      overallScore,
      grade: normalizedResults.overall_grade || this.getGradeFromScore(overallScore),
      confidence: normalizedResults.confidence || normalizedResults.quality?.confidence || 0.90,

      // Metrics as array for FlatList rendering
      metrics: metricsArray,

      // Coaching cues for the top fixes
      coachingCues: (normalizedResults.coaching_cues || []).map((cueData, idx) => ({
        priority: idx + 1,
        cue: typeof cueData === 'string' ? cueData : cueData.cue || '',
        title: typeof cueData === 'string' ? cueData : cueData.cue || '',
        description: typeof cueData === 'string' ? cueData : cueData.why || cueData.description || '',
        drill: typeof cueData === 'object' ? cueData.drill : null,
        drillDescription: typeof cueData === 'object' ? cueData.drill_description : null,
        metric: typeof cueData === 'object' ? cueData.metric : null,
        currentValue: typeof cueData === 'object' ? cueData.current_value : null,
        optimalRange: typeof cueData === 'object' ? cueData.optimal_range : null,
        visualCue: typeof cueData === 'object' ? cueData.visual_cue : null,
        commonMistakes: typeof cueData === 'object' ? cueData.common_mistakes : null
      })),

      // Improvement suggestions
      improvements: improvements,
      strengths: normalizedResults.improvement_summary?.strengths || [],
      summary: this._buildCoachingSummary(normalizedResults, metricsArray, overallScore),

      // Overlay / visualization video URLs from API
      overlayVideoUrl,
      visualizationVideoUrl: overlayVideoUrl || normalizedResults.visualization_video_url || normalizedResults.annotated_video_url || null,

      // Phases data if available
      phases: normalizedResults.phases || {},

      // Quality/visibility data
      quality: normalizedResults.quality || {},

      // Metadata
      metadata: normalizedResults.metadata || {},

      analyzedAt: normalizedResults.analyzed_at || new Date().toISOString()
    };

    console.log('✅ Formatted results:', JSON.stringify(formattedResults, null, 2));

    return formattedResults;
  }

  /**
   * Map API metrics object to array format for UI
   */
  _mapMetricsToArray(metrics) {
    const metricsArray = [];

    const metricConfig = {
      release_angle: { name: 'Release Angle', ideal: '45-55°', unit: '°', valueField: 'angle_deg' },
      elbow_flare: { name: 'Elbow Alignment', ideal: '<10° flare', unit: '°', valueField: 'angle_deg' },
      knee_load: { name: 'Knee Bend', ideal: '45-65°', unit: '°', valueField: 'angle_deg' },
      hip_shoulder_alignment: { name: 'Body Alignment', ideal: 'Aligned', unit: '°', valueField: 'angle_deg' },
      base_width: { name: 'Stance Width', ideal: 'Shoulder-width base', unit: '', valueField: 'ratio' },
      lateral_sway: { name: 'Balance & Stability', ideal: '<3cm sway', unit: 'cm', valueField: 'sway_cm' },
      arc_trajectory: { name: 'Shot Arc', ideal: '45-52°', unit: '°', valueField: 'angle_deg' },
      time_load_to_release: { name: 'Release Timing', ideal: '240-320ms', unit: 'ms', valueField: 'ms' },
      release_timing: { name: 'Release Timing', ideal: '240-320ms', unit: 'ms', valueField: 'ms' }
    };

    const metricEntries = Array.isArray(metrics)
      ? metrics.map((m, idx) => [m.id || m.metric || `metric_${idx}`, m])
      : Object.entries(metrics);

    for (const [rawKey, data] of metricEntries) {
      const key = this._normalizeMetricKey(rawKey);
      if (data && metricConfig[key]) {
        const config = metricConfig[key];
        const rawQuality = data.quality_score ?? data.score ?? data.metric_score;
        const qualityScore = typeof rawQuality === 'number'
          ? (rawQuality > 1 ? rawQuality / 100 : rawQuality)
          : 0.5;

        // API may return 'in_range' or 'in_optimal_range'
        const inOptimalRange = data.in_range !== undefined ? data.in_range : data.in_optimal_range;
        const status = inOptimalRange === true ? 'good' : (qualityScore >= 0.7 ? 'improve' : 'poor');
        const metricValue = this._extractMetricValue(data, config.valueField);
        const idealText = this._formatIdealRange(data, config.ideal, config.unit);

        metricsArray.push({
          id: key,
          name: config.name,
          score: Math.max(1, Math.min(10, Math.round(qualityScore * 10))),
          value: this._formatMetricValue(key, metricValue, config.unit),
          ideal: idealText,
          feedback: this._buildMetricFeedback(key, data, metricValue, idealText, inOptimalRange, qualityScore),
          status
        });
      }
    }

    return metricsArray;
  }

  /**
   * Extract improvement suggestions from API response
   */
  _extractImprovements(apiResults, metricsArray = []) {
    const improvements = [];

    // Add from improvement_summary if available
    if (apiResults.improvement_summary?.areas_to_improve) {
      improvements.push(...apiResults.improvement_summary.areas_to_improve);
    }

    // Add from coaching_cues if we need more (extract string cues, not full objects)
    if (improvements.length < 3 && apiResults.coaching_cues) {
      const additionalCues = apiResults.coaching_cues
        .slice(0, 3 - improvements.length)
        .map(cue => typeof cue === 'string' ? cue : cue.cue || cue.description || '');
      improvements.push(...additionalCues.filter(c => c)); // Filter out empty strings
    }

    if (improvements.length < 3 && metricsArray.length > 0) {
      const derivedImprovements = metricsArray
        .filter(metric => metric.status !== 'good')
        .sort((a, b) => a.score - b.score)
        .map(metric => this._metricToImprovementCue(metric))
        .filter(Boolean);

      improvements.push(...derivedImprovements.slice(0, 3 - improvements.length));
    }

    // Fallback if no improvements found
    if (improvements.length === 0) {
      improvements.push(
        'Focus on consistent follow-through',
        'Work on balance throughout your shot',
        'Practice your release timing'
      );
    }

    return [...new Set(improvements.map(text => this._cleanCoachingText(text)).filter(Boolean))].slice(0, 5);
  }

  _normalizeMetricKey(key) {
    const aliases = {
      release_angle_deg: 'release_angle',
      elbow_flare_deg: 'elbow_flare',
      knee_flexion: 'knee_load',
      knee_load_deg: 'knee_load',
      stance_width: 'base_width',
      base_width_ratio: 'base_width',
      body_alignment: 'hip_shoulder_alignment',
      hip_shoulder_alignment_deg: 'hip_shoulder_alignment',
      lateral_sway_cm: 'lateral_sway',
      sway: 'lateral_sway',
      shot_arc: 'arc_trajectory',
      release_timing_ms: 'time_load_to_release',
      release_speed: 'time_load_to_release'
    };

    return aliases[key] || key;
  }

  _extractMetricValue(data, preferredField) {
    const fields = [
      preferredField,
      'angle_deg',
      'sway_cm',
      'ms',
      'ratio',
      'value',
      'measured_value',
      'current_value'
    ].filter(Boolean);

    for (const field of fields) {
      if (data[field] !== undefined && data[field] !== null) {
        return data[field];
      }
    }

    return null;
  }

  _formatMetricValue(metricKey, rawValue, unit) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return 'Not available';
    }

    if (typeof rawValue === 'number') {
      if (metricKey === 'base_width') {
        return rawValue <= 1 ? `${Math.round(rawValue * 100)}% shoulder width` : `${rawValue.toFixed(1)}`;
      }
      return `${rawValue.toFixed(1)}${unit}`;
    }

    return `${rawValue}${unit}`;
  }

  _formatIdealRange(data, fallbackIdeal, unit) {
    const range = data.optimal_range || data.target_range || data.recommended_range;
    if (Array.isArray(range) && range.length >= 2) {
      return `${range[0]}-${range[1]}${unit}`;
    }
    if (typeof range === 'string') {
      return range;
    }
    return fallbackIdeal;
  }

  _buildMetricFeedback(metricKey, data, rawValue, idealText, inOptimalRange, qualityScore) {
    const backendText = (data.coaching_feedback || data.coaching_tip || data.description || data.status || '').trim();
    if (backendText) {
      return this._humanizeBackendFeedback(backendText, idealText, inOptimalRange);
    }

    const coachText = {
      release_angle: {
        good: 'Good release arc. Keep finishing high for a soft entry into the rim.',
        improve: 'Arc is close. Finish a little higher and hold your follow-through.',
        poor: 'Arc needs work. Practice a higher finish so the ball gets a softer entry angle.'
      },
      elbow_flare: {
        good: 'Elbow alignment looks solid. Keep the elbow under the ball through release.',
        improve: 'Elbow is drifting some. Focus on stacking elbow under the ball before lift-off.',
        poor: 'Elbow flare is affecting your shot path. Start tucked and finish straight up.'
      },
      knee_load: {
        good: 'Good leg load. You are getting power from your base.',
        improve: 'Knee bend is a little inconsistent. Try to load the same amount each rep.',
        poor: 'Build a stronger base first. Sit into your legs before starting the shot.'
      },
      hip_shoulder_alignment: {
        good: 'Body alignment looks clean. Keep your line organized to the basket.',
        improve: 'Alignment is slightly off. Set your base and shoulders earlier before release.',
        poor: 'Body alignment is hurting consistency. Reset your stance and line up before lifting.'
      },
      base_width: {
        good: 'Your stance width supports balance. Keep that base throughout the shot.',
        improve: 'Base is a little inconsistent. Aim for a comfortable shoulder-width stance.',
        poor: 'Your base needs work. Start every rep from a stable shoulder-width stance.'
      },
      lateral_sway: {
        good: 'Balance looks strong with minimal sway. Great job staying centered.',
        improve: 'There is extra sway. Focus on going straight up and landing in the same spot.',
        poor: 'Too much side-to-side movement. Prioritize balance and vertical lift first.'
      },
      arc_trajectory: {
        good: 'Shot arc looks good. Keep that soft, repeatable trajectory.',
        improve: 'Arc is close. A slightly higher release finish should help consistency.',
        poor: 'Shot arc needs work. Focus on a higher finish and full follow-through.'
      },
      time_load_to_release: {
        good: 'Release timing looks efficient. Keep the shot smooth and connected.',
        improve: 'Timing is close. Smooth out the move from load to release.',
        poor: 'Release timing needs work. Practice one-motion rhythm to connect legs and release.'
      }
    };

    const bandHint = typeof rawValue === 'number' && Array.isArray(data.optimal_range) && data.optimal_range.length >= 2
      ? (rawValue < data.optimal_range[0]
        ? ` You are a little below the target (${idealText}).`
        : rawValue > data.optimal_range[1]
          ? ` You are a little above the target (${idealText}).`
          : '')
      : '';

    const level = inOptimalRange === true ? 'good' : (qualityScore >= 0.7 ? 'improve' : 'poor');
    return (coachText[metricKey]?.[level] || (level === 'good' ? 'This part of your shot looks solid.' : 'This area needs more work for consistency.')) + bandHint;
  }

  _humanizeBackendFeedback(text, idealText, inOptimalRange) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (inOptimalRange === true && !/good|great|solid|nice|strong/i.test(cleaned)) {
      return `Looks good here. ${cleaned}`;
    }
    if (inOptimalRange === false && idealText && !/target|aim/i.test(cleaned)) {
      return `${cleaned} Target: ${idealText}.`;
    }
    return cleaned;
  }

  _deriveOverallScore(apiResults, metricsArray) {
    if (typeof apiResults.overall_score === 'number') {
      return Math.round(apiResults.overall_score);
    }

    const metricScores = metricsArray.map(m => m.score).filter(s => typeof s === 'number');
    if (!metricScores.length) return 0;
    return Math.round((metricScores.reduce((sum, score) => sum + score, 0) / metricScores.length) * 10);
  }

  _buildCoachingSummary(apiResults, metricsArray, overallScore) {
    const strengths = apiResults.improvement_summary?.strengths || [];
    const topFocus = apiResults.improvement_summary?.areas_to_improve?.[0];

    if (strengths[0] && topFocus) {
      return `Strongest area: ${strengths[0]}. Next focus: ${topFocus}.`;
    }

    const goodCount = metricsArray.filter(m => m.status === 'good').length;
    if (metricsArray.length && overallScore >= 80) {
      return `${goodCount}/${metricsArray.length} key areas are in a good range. Focus on one small adjustment and retest.`;
    }
    if (metricsArray.length) {
      return 'You have a good foundation. Fix one or two priorities first, then re-record to track progress.';
    }
    return 'Analysis complete. Use the coaching notes below for your next reps.';
  }

  _normalizeAnalysisResults(raw) {
    if (!raw || typeof raw !== 'object') return raw;

    const nestedCandidates = [
      raw.result,
      raw.results,
      raw.output,
      raw.outputs,
      raw.analysis_result,
      raw.analysis_results,
      raw.payload,
      raw.data,
      raw.final_result
    ];

    for (const candidate of nestedCandidates) {
      if (candidate && typeof candidate === 'object' && (candidate.metrics || candidate.overall_score || candidate.coaching_cues)) {
        return {
          ...candidate,
          session_id: raw.session_id || raw.id || candidate.session_id,
          analyzed_at: candidate.analyzed_at || raw.completed_at || raw.updated_at || raw.created_at,
          metadata: {
            ...(candidate.metadata || {}),
            session_status: raw.status || candidate.metadata?.session_status
          }
        };
      }
    }

    for (const key of ['result_json', 'results_json', 'output_json', 'analysis_json']) {
      const jsonPayload = raw[key];
      if (typeof jsonPayload === 'string') {
        try {
          const parsed = JSON.parse(jsonPayload);
          if (parsed && typeof parsed === 'object') {
            return {
              ...parsed,
              session_id: raw.session_id || raw.id || parsed.session_id,
              analyzed_at: parsed.analyzed_at || raw.completed_at || raw.updated_at || raw.created_at
            };
          }
        } catch (error) {
          console.warn('⚠️ Could not parse nested JSON analysis payload:', error?.message);
        }
      }
    }

    return raw;
  }

  _extractOverlayVideoUrl(results) {
    if (!results || typeof results !== 'object') return null;

    const directCandidates = [
      results.overlay_video_url,
      results.overlayVideoUrl,
      results.annotated_video_url,
      results.annotatedVideoUrl,
      results.visualization_video_url,
      results.visualizationVideoUrl,
      results.analysis_video_url,
      results.analysisVideoUrl,
      results.rendered_video_url,
      results.renderedVideoUrl,
      results.output_video_url,
      results.outputVideoUrl,
      results.video_overlay_url,
      results.videoOverlayUrl
    ];

    const objectCandidates = [
      results.overlay,
      results.visualization,
      results.render,
      results.artifacts,
      results.output
    ].filter(Boolean);

    const nestedCandidates = objectCandidates.flatMap((obj) => [
      obj.url,
      obj.video_url,
      obj.videoUrl,
      obj.overlay_video_url,
      obj.overlayVideoUrl,
      obj.annotated_video_url,
      obj.annotatedVideoUrl
    ]);

    const allCandidates = [...directCandidates, ...nestedCandidates];
    return allCandidates.find((value) => typeof value === 'string' && value.startsWith('http')) || null;
  }

  _metricToImprovementCue(metric) {
    const suggestions = {
      'Release Angle': 'Work on a higher, more consistent release finish for a softer arc.',
      'Elbow Alignment': 'Keep your elbow under the ball to create a straighter shot path.',
      'Knee Bend': 'Load your legs the same way each rep for better power and rhythm.',
      'Body Alignment': 'Set your hips and shoulders earlier so your shot line stays consistent.',
      'Stance Width': 'Start from a stable shoulder-width base to improve balance.',
      'Balance & Stability': 'Focus on going straight up and landing in the same spot.',
      'Shot Arc': 'Practice finishing high to improve entry angle and consistency.',
      'Release Timing': 'Smooth out the load-to-release motion for a cleaner rhythm.'
    };
    return suggestions[metric.name] || null;
  }

  _cleanCoachingText(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/\s+/g, ' ').replace(/^[-•]\s*/, '').trim();
  }

  /**
   * Get grade from score
   */
  getGradeFromScore(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Simulate comprehensive form analysis for development/offline mode
   * Returns data in the same format as the real API
   */
  async simulateComprehensiveAnalysis(videoData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const overallScore = 70 + Math.random() * 25; // 70-95 range

        // Simulate API response format matching /analyze/shot endpoint
        const apiResponse = {
          video_id: 'simulated_' + Date.now(),
          success: true,
          overall_score: Math.round(overallScore),
          overall_grade: this.getGradeFromScore(overallScore),
          confidence: 0.85 + Math.random() * 0.1,

          // Metrics matching API format
          metrics: {
            release_angle: {
              value: 45 + Math.random() * 15,
              quality_score: 0.7 + Math.random() * 0.3,
              optimal_range: [45, 55],
              in_optimal_range: Math.random() > 0.3,
              status: 'Good arc on your shot'
            },
            elbow_flare: {
              value: Math.random() * 15,
              quality_score: 0.6 + Math.random() * 0.4,
              optimal_range: [0, 10],
              in_optimal_range: Math.random() > 0.4,
              status: 'Elbow alignment is solid'
            },
            knee_load: {
              value: 45 + Math.random() * 25,
              quality_score: 0.65 + Math.random() * 0.35,
              optimal_range: [45, 65],
              in_optimal_range: Math.random() > 0.35,
              status: 'Good power generation from legs'
            },
            hip_shoulder_alignment: {
              value: Math.random() * 10,
              quality_score: 0.7 + Math.random() * 0.3,
              optimal_range: [0, 5],
              in_optimal_range: Math.random() > 0.3,
              status: 'Body is well aligned'
            },
            base_width: {
              value: 0.18 + Math.random() * 0.12,
              quality_score: 0.7 + Math.random() * 0.3,
              optimal_range: [0.18, 0.28],
              in_optimal_range: Math.random() > 0.3,
              status: 'Good stance width'
            },
            lateral_sway: {
              value: Math.random() * 5,
              quality_score: 0.6 + Math.random() * 0.4,
              optimal_range: [0, 3],
              in_optimal_range: Math.random() > 0.4,
              status: 'Maintain better balance'
            },
            arc_trajectory: {
              value: 45 + Math.random() * 10,
              quality_score: 0.7 + Math.random() * 0.3,
              optimal_range: [45, 52],
              in_optimal_range: Math.random() > 0.3,
              status: 'Nice arc trajectory'
            }
          },

          // Coaching cues as simple strings (matching API format)
          coaching_cues: [
            'Focus on keeping your elbow tucked under the ball',
            'Try to maintain a consistent release point',
            'Work on your follow-through extension'
          ],

          // Improvement summary
          improvement_summary: {
            strengths: [
              'Good release angle',
              'Solid base positioning'
            ],
            areas_to_improve: [
              'Work on balance throughout the shot',
              'Focus on consistent follow-through',
              'Improve knee bend for more power'
            ]
          },

          // Quality metrics
          quality: {
            visibility_ratio: 0.85,
            confidence: 0.9,
            warning: null
          },

          // Metadata
          metadata: {
            duration_seconds: 2.5,
            fps: 30,
            total_frames: 75,
            processed_frames: 60
          },

          // Simulated visualization video URL (for testing)
          visualization_video_url: null, // No visualization in simulation mode

          analyzed_at: new Date().toISOString()
        };

        // Format the response using the same formatter as real API responses
        const formattedResults = this.formatFormAnalysisResults(apiResponse);
        resolve(formattedResults);
      }, 3000); // 3 second delay
    });
  }
}

export default new AIAnalysisService();
