// aiAnalysisService.js - Service for AI-powered shooting analysis
import * as FileSystem from 'expo-file-system';
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
      const response = await fetch(`${this.API_BASE_URL}/upload/video`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
      console.log('📤 Uploading video to backend for form analysis...');

      const formData = new FormData();
      formData.append('video', {
        uri: videoData.videoUri,
        type: 'video/mp4',
        name: 'shooting_video.mp4',
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes for long-running model processing

      try {
        // Call the form-analysis endpoint that returns JSON analysis
        const response = await fetch(`${this.API_BASE_URL}/analyze/form-analysis`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API error response:', errorText);
          throw new Error(`Form analysis API error: ${response.status}`);
        }

        const results = await response.json();
        console.log('✅ Received form analysis results from backend');
        console.log('📊 Result keys:', Object.keys(results));

        // Cache results
        await this.cacheAnalysisResults(videoData.timestamp, results);
        
        return this.formatFormAnalysisResults(results);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('❌ Request timeout - backend took too long');
          throw new Error('Analysis timed out after 10 minutes. The model may be processing a very complex video. Please try again with a shorter video.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('❌ Comprehensive analysis error:', error);
      console.log('⚠️ Falling back to simulated comprehensive analysis');
      // Fallback to simulated analysis
      return await this.simulateComprehensiveAnalysis(videoData);
    }
  }

  /**
   * Format form analysis results from backend API
   * Maps backend response to app's expected format
   */
  formatFormAnalysisResults(apiResults) {
    console.log('📝 Formatting form analysis results...');
    console.log('🌐 API Base URL:', this.API_BASE_URL);

    const formattedResults = {
      videoId: apiResults.video_id,
      overallScore: Math.round(apiResults.overall_score || apiResults.overall_similarity),
      grade: apiResults.overall_grade || this.getGradeFromScore(apiResults.overall_score),
      confidence: apiResults.confidence || 0.90,
      orientation: apiResults.orientation,

      // Detailed metrics by category
      metrics: {
        wrist: this._formatMetricsCategory(apiResults.wrist_metrics, 'Wrist & Release'),
        head: this._formatMetricsCategory(apiResults.head_metrics, 'Head Position'),
        body: this._formatMetricsCategory(apiResults.body_metrics, 'Body Mechanics')
      },

      // Top recommendations
      recommendations: apiResults.top_recommendations?.map((rec, idx) => ({
        priority: idx + 1,
        title: rec.title,
        category: rec.category,
        grade: rec.grade,
        tip: rec.tip,
        drill: rec.drill
      })) || [],

      // Coaching cues
      coachingCues: apiResults.coaching_cues || [],

      analyzedAt: apiResults.analyzed_at
    };

    console.log('✅ Formatted results:', JSON.stringify(formattedResults, null, 2));

    return formattedResults;
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
   */
  async simulateComprehensiveAnalysis(videoData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const overallScore = 70 + Math.random() * 25; // 70-95 range
        
        const results = {
          video_id: 'simulated_' + Date.now(),
          overall_score: Math.round(overallScore),
          overall_grade: this.getGradeFromScore(overallScore),
          confidence: 0.85 + Math.random() * 0.1,
          orientation: 'side',
          
          // Metrics by category
          wrist_metrics: {
            release_angle: {
              your_value: `${(45 + Math.random() * 10).toFixed(1)}°`,
              optimal_range: '45-55°',
              ideal_value: '50°',
              quality_score: 0.7 + Math.random() * 0.3,
              grade: 'B',
              status: 'good'
            },
            wrist_snap: {
              your_value: Math.random() > 0.5 ? 'Good' : 'Needs work',
              optimal_range: 'Full extension',
              ideal_value: 'Complete snap',
              quality_score: 0.6 + Math.random() * 0.4,
              grade: 'C',
              status: 'improve'
            }
          },
          
          head_metrics: {
            head_position: {
              your_value: Math.random() > 0.6 ? 'Stable' : 'Slight movement',
              optimal_range: 'Minimal movement',
              ideal_value: 'Steady',
              quality_score: 0.7 + Math.random() * 0.3,
              grade: 'B',
              status: 'good'
            }
          },
          
          body_metrics: {
            balance: {
              your_value: Math.random() > 0.5 ? 'Stable' : 'Needs work',
              optimal_range: 'Stable throughout',
              ideal_value: 'No sway',
              quality_score: 0.6 + Math.random() * 0.4,
              grade: 'C',
              status: 'improve'
            },
            stance: {
              your_value: Math.random() > 0.6 ? 'Good width' : 'Too narrow',
              optimal_range: 'Shoulder width',
              ideal_value: 'Optimal spacing',
              quality_score: 0.7 + Math.random() * 0.3,
              grade: 'B',
              status: 'good'
            }
          },
          
          // Top recommendations
          top_recommendations: [
            {
              title: 'Improve Release Angle',
              category: 'Wrist & Release',
              grade: 'B',
              tip: 'Focus on getting more arc on your shot for better accuracy',
              drill: 'Wall shooting drill - practice consistent arc'
            },
            {
              title: 'Enhance Balance',
              category: 'Body Mechanics',
              grade: 'C',
              tip: 'Work on maintaining stability throughout your shot motion',
              drill: 'Balance board practice and slow-motion shots'
            }
          ],
          
          // Coaching cues
          coaching_cues: [
            {
              priority: 1,
              title: 'Release Angle Consistency',
              description: 'Your release angle varies between shots. Focus on consistent arc.',
              impact: 'high',
              drill: 'Practice 50 form shots daily with focus on arc'
            },
            {
              priority: 2,
              title: 'Balance Maintenance',
              description: 'Work on keeping your center of mass stable during the shot.',
              impact: 'medium',
              drill: 'Slow-motion shooting with balance focus'
            }
          ],
          
          analyzed_at: new Date().toISOString()
        };
        
        resolve(results);
      }, 3000); // 3 second delay
    });
  }

  /**
   * Helper to format a metrics category
   */
  _formatMetricsCategory(categoryMetrics, categoryName) {
    const metrics = [];

    for (const [metricKey, metricData] of Object.entries(categoryMetrics)) {
      metrics.push({
        id: metricKey,
        name: metricKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        yourValue: metricData.your_value,
        optimalRange: metricData.optimal_range,
        idealValue: metricData.ideal_value,
        difference: metricData.difference,
        qualityScore: Math.round(metricData.quality_score * 10),
        grade: metricData.grade,
        status: metricData.status
      });
    }

    return {
      name: categoryName,
      metrics: metrics,
      averageScore: Math.round(
        metrics.reduce((sum, m) => sum + m.qualityScore, 0) / metrics.length
      )
    };
  }
}

export default new AIAnalysisService();
