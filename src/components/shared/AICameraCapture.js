import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Device from 'expo-device';
import { Svg, Circle, Line, Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Key pose detection points for basketball shooting analysis
const POSE_POINTS = {
  // Head
  nose: { x: 0.5, y: 0.15, visible: true },
  
  // Upper body
  leftShoulder: { x: 0.4, y: 0.25, visible: true },
  rightShoulder: { x: 0.6, y: 0.25, visible: true },
  leftElbow: { x: 0.35, y: 0.35, visible: true },
  rightElbow: { x: 0.65, y: 0.35, visible: true },
  leftWrist: { x: 0.3, y: 0.45, visible: true },
  rightWrist: { x: 0.7, y: 0.45, visible: true },
  
  // Core
  leftHip: { x: 0.45, y: 0.55, visible: true },
  rightHip: { x: 0.55, y: 0.55, visible: true },
  
  // Lower body
  leftKnee: { x: 0.44, y: 0.7, visible: true },
  rightKnee: { x: 0.56, y: 0.7, visible: true },
  leftAnkle: { x: 0.43, y: 0.85, visible: true },
  rightAnkle: { x: 0.57, y: 0.85, visible: true }
};

// Skeleton connections for drawing
const SKELETON_CONNECTIONS = [
  // Head to shoulders
  ['nose', 'leftShoulder'],
  ['nose', 'rightShoulder'],
  
  // Arms
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  
  // Torso
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  
  // Legs
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle']
];

const AICameraCapture = ({ 
  isVisible, 
  onCapture, 
  onClose, 
  analysisMode = 'shooting' // shooting, form, balance
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showPoseOverlay, setShowPoseOverlay] = useState(true);
  const [detectedPose, setDetectedPose] = useState(POSE_POINTS);
  const [analysisPhase, setAnalysisPhase] = useState('setup'); // setup, ready, countdown, recording, processing
  const [countdown, setCountdown] = useState(5);
  const [cameraType, setCameraType] = useState('back');
  const [isSimulator, setIsSimulator] = useState(false);
  
  const cameraRef = useRef(null);
  const recordingTimer = useRef(null);
  const countdownTimer = useRef(null);
  const poseAnimation = useRef(new Animated.Value(1)).current;

  // Check if running on simulator/emulator
  useEffect(() => {
    const checkDevice = async () => {
      // Check if device is physical or simulator
      const isPhysical = await Device.isDevice;
      setIsSimulator(!isPhysical);
      
      if (!isPhysical) {
        console.log('⚠️ Running on simulator - Camera features will be simulated');
      }
    };
    
    checkDevice();
  }, []);

  useEffect(() => {
    if (isRecording) {
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 0.1;
          if (newDuration >= 5.0) { // Auto-stop at 5 seconds
            console.log('⏰ Auto-stopping recording at 5 seconds...');
            stopRecording();
            return 5.0;
          }
          return newDuration;
        });
      }, 100);
    } else {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
    }

    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    // Animate pose overlay
    Animated.loop(
      Animated.sequence([
        Animated.timing(poseAnimation, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(poseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const requestPermissions = async () => {
    const cameraResult = await requestPermission();
    const mediaResult = await requestMediaPermission();
    
    if (!cameraResult.granted) {
      Alert.alert('Camera Permission', 'Camera access is required for shooting analysis.');
      return false;
    }
    
    if (!mediaResult.granted) {
      Alert.alert('Media Permission', 'Media library access is required to save recordings.');
      return false;
    }
    
    return true;
  };

  const startRecording = async () => {
    // Check if running on simulator
    if (isSimulator) {
      Alert.alert(
        'Simulator Detected',
        'Camera recording is not available on simulators/emulators. This feature requires a physical device.\n\nFor testing purposes, we\'ll simulate a recording',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => setAnalysisPhase('ready')
          },
          {
            text: 'Simulate Recording',
            onPress: () => startCountdown()
          }
        ]
      );
      return;
    }

    if (!cameraRef.current) return;

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    // Start countdown before recording
    startCountdown();
  };

  const startCountdown = () => {
    console.log('⏰ Starting 5-second countdown...');
    setAnalysisPhase('countdown');
    setCountdown(5);

    // Countdown timer
    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Countdown finished, start recording
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
          beginRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const beginRecording = async () => {
    if (isSimulator) {
      simulateRecording();
      return;
    }

    try {
      console.log('🎬 Starting camera recording after countdown...');
      setIsRecording(true);
      setRecordingDuration(0);
      setAnalysisPhase('recording');

      // Start recording - this will complete when maxDuration is reached or stopRecording is called
      const video = await cameraRef.current.recordAsync({
        quality: '720p',
        maxDuration: 5,
        mute: false,
      });

      console.log('✅ Recording completed:', video);
      
      // Process the completed recording
      if (video && video.uri) {
        await handleRecordingEnd(video);
      } else {
        console.error('❌ No video returned from recording');
        setAnalysisPhase('ready');
        Alert.alert('Recording Error', 'Video recording failed. Please try again.');
      }

    } catch (error) {
      console.error('❌ Recording error:', error);
      setIsRecording(false);
      setAnalysisPhase('ready');
      Alert.alert(
        'Recording Error', 
        'Failed to start recording. This typically happens on simulators/emulators which don\'t have camera access.\n\nPlease test on a physical device.',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsRecording(false);
              setAnalysisPhase('ready');
            }
          }
        ]
      );
    }
  };

  // Simulate recording for testing on simulators
  const simulateRecording = () => {
    console.log('🎬 Starting simulated recording...');
    setIsRecording(true);
    setRecordingDuration(0);
    setAnalysisPhase('recording');

    // Simulate 5 second recording
    const simulatedTimer = setInterval(() => {
      setRecordingDuration(prev => {
        const newDuration = prev + 0.1;
        if (newDuration >= 5.0) {
          clearInterval(simulatedTimer);
          console.log('⏰ Simulated recording complete, calling stopSimulatedRecording...');
          stopSimulatedRecording();
          return 5.0;
        }
        return newDuration;
      });
    }, 100);
  };

  const stopSimulatedRecording = async () => {
    console.log('🛑 Stopping simulated recording...');
    setIsRecording(false);
    
    const simulatedVideo = {
      uri: `file://simulated_recording_${Date.now()}.mp4`,
      duration: 5.0,
      timestamp: Date.now()
    };
    
    console.log('📹 Simulated video created:', simulatedVideo);
    await handleRecordingEnd(simulatedVideo);
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) {
      console.log('❌ Cannot stop recording - no camera ref or not recording');
      return;
    }

    try {
      console.log('🛑 Stopping recording manually...');
      
      // Stop the camera recording - this should return the video object
      const video = await cameraRef.current.stopRecording();
      
      setIsRecording(false);
      console.log('✅ Recording stopped, video object:', video);
      
      if (video && video.uri) {
        await handleRecordingEnd(video);
      } else {
        console.error('❌ No video returned from stopRecording');
        setAnalysisPhase('ready');
        Alert.alert('Recording Error', 'Failed to complete recording. Please try again.');
      }
      
    } catch (error) {
      console.error('❌ Stop recording error:', error);
      setIsRecording(false);
      setAnalysisPhase('ready');
      setRecordingDuration(0);
      Alert.alert('Recording Error', `Stop recording failed: ${error.message}`);
    }
  };

  const handleRecordingEnd = async (video) => {
    try {
      console.log('🎬 Recording ended, processing video...');
      console.log('📹 Video object:', video);
      
      // Set processing phase to show loading overlay
      setAnalysisPhase('processing');
      
      if (video && video.uri) {
        console.log('💾 Attempting to save to media library...');
        
        let asset = null;
        try {
          // Try to save to media library (may fail in some environments)
          asset = await MediaLibrary.createAssetAsync(video.uri);
          console.log('✅ Saved to media library:', asset);
        } catch (mediaError) {
          console.warn('⚠️ Media library save failed:', mediaError.message);
          console.warn('📝 Proceeding with video URI directly...');
          // Continue anyway - we can still analyze the video using the URI
        }
        
        // Prepare data for analysis
        const analysisData = {
          videoUri: video.uri,
          duration: recordingDuration,
          timestamp: Date.now(),
          analysisMode,
          pose: detectedPose,
          cameraType,
          mediaAsset: asset // Include asset if available
        };

        console.log('📤 Calling onCapture with data:', analysisData);
        
        // Call onCapture - this triggers the parent's analysis and stage transition
        onCapture(analysisData);
        
        console.log('✅ onCapture called successfully - parent should handle stage transition');
        
      } else {
        console.error('❌ No video or video.uri found:', video);
        setAnalysisPhase('ready'); // Reset phase
        Alert.alert('Recording Error', 'Video was not recorded properly. Please try again.');
      }
    } catch (error) {
      console.error('❌ Save video error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
      setAnalysisPhase('ready'); // Reset phase on error
      Alert.alert('Save Error', `Failed to save video: ${error.message}\n\nPlease try again.`);
    }
  };

  const renderPoseOverlay = () => {
    if (!showPoseOverlay) return null;

    const overlayWidth = width;
    const overlayHeight = height * 0.7; // Adjust based on camera view height

    return (
      <Animated.View 
        style={[
          styles.poseOverlay,
          { opacity: poseAnimation }
        ]}
        pointerEvents="none"
      >
        <Svg width={overlayWidth} height={overlayHeight}>
          {/* Positioning Frame Guide - Rectangle showing where user should stand */}
          <Path
            d={`
              M ${overlayWidth * 0.15} ${overlayHeight * 0.1}
              L ${overlayWidth * 0.85} ${overlayHeight * 0.1}
              L ${overlayWidth * 0.85} ${overlayHeight * 0.9}
              L ${overlayWidth * 0.15} ${overlayHeight * 0.9}
              Z
            `}
            stroke="#4CAF50"
            strokeWidth="3"
            fill="none"
            strokeDasharray="15,10"
            opacity="0.8"
          />

          {/* Corner markers for better visibility */}
          <Line x1={overlayWidth * 0.15} y1={overlayHeight * 0.1} x2={overlayWidth * 0.15 + 30} y2={overlayHeight * 0.1} stroke="#4CAF50" strokeWidth="4" />
          <Line x1={overlayWidth * 0.15} y1={overlayHeight * 0.1} x2={overlayWidth * 0.15} y2={overlayHeight * 0.1 + 30} stroke="#4CAF50" strokeWidth="4" />

          <Line x1={overlayWidth * 0.85} y1={overlayHeight * 0.1} x2={overlayWidth * 0.85 - 30} y2={overlayHeight * 0.1} stroke="#4CAF50" strokeWidth="4" />
          <Line x1={overlayWidth * 0.85} y1={overlayHeight * 0.1} x2={overlayWidth * 0.85} y2={overlayHeight * 0.1 + 30} stroke="#4CAF50" strokeWidth="4" />

          <Line x1={overlayWidth * 0.15} y1={overlayHeight * 0.9} x2={overlayWidth * 0.15 + 30} y2={overlayHeight * 0.9} stroke="#4CAF50" strokeWidth="4" />
          <Line x1={overlayWidth * 0.15} y1={overlayHeight * 0.9} x2={overlayWidth * 0.15} y2={overlayHeight * 0.9 - 30} stroke="#4CAF50" strokeWidth="4" />

          <Line x1={overlayWidth * 0.85} y1={overlayHeight * 0.9} x2={overlayWidth * 0.85 - 30} y2={overlayHeight * 0.9} stroke="#4CAF50" strokeWidth="4" />
          <Line x1={overlayWidth * 0.85} y1={overlayHeight * 0.9} x2={overlayWidth * 0.85} y2={overlayHeight * 0.9 - 30} stroke="#4CAF50" strokeWidth="4" />

          {/* Center line for alignment */}
          <Line
            x1={overlayWidth * 0.5}
            y1={overlayHeight * 0.1}
            x2={overlayWidth * 0.5}
            y2={overlayHeight * 0.9}
            stroke="#4CAF50"
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.4"
          />

          {/* Instruction text inside the box */}
          {/* Note: SVG Text doesn't work well in React Native, we'll add a View overlay instead */}
        </Svg>

        {/* Text instructions as a View overlay */}
        <View style={styles.positioningTextContainer}>
          <View style={styles.positioningTextBox}>
            <Text style={styles.positioningText}>Position your full body within the frame</Text>
            <Text style={styles.positioningSubtext}>Stand in center • Head to feet visible</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderAnalysisGuide = () => {
    const guides = {
      shooting: [
        "📱 Record in PORTRAIT mode (vertical)",
        "🧍 Stand sideways, full body visible",
        "🏀 Ball should be visible throughout",
        "🎬 Record complete shot motion (5 sec)"
      ],
      form: [
        "📱 Record in PORTRAIT mode (vertical)",
        "🧍 Stand facing camera, full body",
        "💪 Arms visible clearly",
        "🎬 Record shooting form (5 sec)"
      ],
      balance: [
        "📱 Record in PORTRAIT mode (vertical)",
        "🧍 Side view, full body visible",
        "⚖️ Show stance and balance",
        "🎬 Record movement (5 sec)"
      ]
    };

    return (
      <View style={styles.guideContainer}>
        <Text style={styles.guideTitle}>
          {analysisMode.charAt(0).toUpperCase() + analysisMode.slice(1)} Analysis
        </Text>
        <View style={styles.portraitNotice}>
          <Ionicons name="phone-portrait-outline" size={24} color="#FF6B35" />
          <Text style={styles.portraitNoticeText}>Hold phone vertically for best results</Text>
        </View>
        {guides[analysisMode].map((guide, index) => (
          <View key={index} style={styles.guideItem}>
            <Text style={styles.guideText}>{guide}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRecordingStats = () => {
    if (!isRecording) return null;

    return (
      <View style={styles.recordingStats}>
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>REC</Text>
        </View>
        <Text style={styles.durationText}>
          {recordingDuration.toFixed(1)}s / 5.0s
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(recordingDuration / 5.0) * 100}%` }
            ]} 
          />
        </View>
      </View>
    );
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={60} color="#666" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Please grant camera access to use shooting analysis
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
        mode="video"
      >
        {/* Pose Overlay */}
        {renderPoseOverlay()}
        
        {/* Analysis Guide */}
        {analysisPhase === 'setup' && (
          <View style={styles.setupOverlay}>
            {renderAnalysisGuide()}
            <TouchableOpacity 
              style={styles.readyButton}
              onPress={() => setAnalysisPhase('ready')}
            >
              <Text style={styles.readyButtonText}>I'm Ready</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recording Stats */}
        {renderRecordingStats()}

        {/* Countdown Overlay */}
        {analysisPhase === 'countdown' && (
          <View style={styles.countdownOverlay}>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </View>
            <Text style={styles.countdownText}>Get Ready!</Text>
            <Text style={styles.countdownSubtext}>Recording starts in {countdown}...</Text>
          </View>
        )}

        {/* Processing Overlay */}
        {analysisPhase === 'processing' && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.processingText}>Processing video...</Text>
          </View>
        )}
      </CameraView>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.analysisType}>
            <Text style={styles.analysisTypeText}>
              {analysisMode.toUpperCase()} ANALYSIS
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.overlayToggle}
            onPress={() => setShowPoseOverlay(!showPoseOverlay)}
          >
            <Ionicons 
              name={showPoseOverlay ? "eye" : "eye-off"} 
              size={24} 
              color="#FFF" 
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity 
            style={styles.flipButton}
            onPress={() => setCameraType(cameraType === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Record Button */}
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={analysisPhase === 'setup' || analysisPhase === 'processing'}
          >
            <View style={[
              styles.recordButtonInner,
              isRecording && styles.recordButtonInnerActive
            ]} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => {
              // Debug: Force trigger analysis with fake data
              console.log('🧪 Debug: Simulating video capture...');
              const testData = {
                videoUri: 'test://fake-video.mp4',
                duration: 3.5,
                timestamp: Date.now(),
                analysisMode: analysisMode,
                pose: detectedPose,
                cameraType: cameraType,
                isDebugMode: true
              };
              
              setAnalysisPhase('processing');
              setTimeout(() => {
                onCapture(testData);
              }, 1000);
            }}
          >
            <Ionicons name="bug" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  poseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  setupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  guideContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    width: '100%',
    maxWidth: 300,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guideBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guideBulletText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  guideText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  readyButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  readyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordingStats: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
    marginRight: 8,
  },
  recordingText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  durationText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F44336',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 16,
  },
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisType: {
    backgroundColor: 'rgba(255,107,53,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  analysisTypeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  overlayToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 60,
    paddingHorizontal: 20,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(244,67,54,0.3)',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F44336',
  },
  recordButtonInnerActive: {
    borderRadius: 8,
    width: 30,
    height: 30,
  },
  settingsButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  positioningTextContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -0.5 * width }, { translateY: -0.5 * height }],
    width: width,
    height: height * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  positioningTextBox: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  positioningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  positioningSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  portraitNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  portraitNoticeText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  countdownCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownNumber: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  countdownText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  countdownSubtext: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AICameraCapture;
