// ShootingAnalysisScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Animated,
    Alert,
    SafeAreaView,
    StatusBar,
    Dimensions,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useAppContext } from '../../context/AppContext';
import AICameraCapture from '../../components/shared/AICameraCapture';
import ShotAnalysisResultsSimple from '../../components/shared/ShotAnalysisResultsSimple';
import UpgradePrompt from '../../components/shared/UpgradePrompt';
import aiAnalysisService from '../../services/aiAnalysisService';
import { canAccessFeature, getRequiredSubscription } from '../../utils/subscription';

const { width } = Dimensions.get('window');

// Default improvement suggestions when none are provided
const getDefaultImprovements = () => [
    "Focus on consistent follow-through with wrist snap",
    "Maintain balanced stance throughout your shot motion", 
    "Keep your shooting elbow aligned directly under the ball",
    "Work on smooth, fluid motion from set point to release",
    "Practice consistent arc for optimal shooting angle"
];

const ShootingAnalysisScreen = ({ navigation }) => {
    const { updateUserStats, addActivity, userData, theme } = useAppContext();

    // State management
    const [currentStage, setCurrentStage] = useState('intro'); // intro, recording, analyzing, results
    const [capturedVideoData, setCapturedVideoData] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [historicalData, setHistoricalData] = useState([
        { date: '2023-03-01', score: 68 },
        { date: '2023-03-15', score: 72 },
        { date: '2023-04-02', score: 75 },
    ]);

    // Feature gate state
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
    const [lockedFeature, setLockedFeature] = useState(null);

    // Video player state
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const videoRef = useRef(null);

    // Animation values
    const analysisProgressAnim = useRef(new Animated.Value(0)).current;

    // Monitor stage changes for debugging
    useEffect(() => {
        console.log('🎯 Stage changed to:', currentStage);
    }, [currentStage]);

    // Handle camera capture
    const handleCameraCapture = async (videoData) => {
        try {
            console.log('📹 Video captured, starting analysis...');
            console.log('📊 Video data:', {
                uri: videoData.videoUri,
                duration: videoData.duration,
                mode: videoData.analysisMode
            });
            console.log('🎯 Current stage before transition:', currentStage);
            
            setCapturedVideoData(videoData);
            console.log('🔄 Setting stage to analyzing...');
            setCurrentStage('analyzing');
            console.log('✅ Stage set to analyzing');

            // Start analysis progress animation
            Animated.timing(analysisProgressAnim, {
                toValue: 100,
                duration: 8000, // 8 seconds for realistic analysis time
                useNativeDriver: false,
            }).start();

            // Perform comprehensive AI analysis with phase detection and biomechanics
            console.log('🏀 Using comprehensive analysis for feedback-based improvement');
            const results = await aiAnalysisService.analyzeComprehensive(videoData);
            
            console.log('✅ Comprehensive analysis complete!');
            console.log('📊 Results:', results);
            
            setAnalysisResults(results);
            setCurrentStage('results');

            // Update user stats
            const score = results.overallScore || results.overall_score || 0;
            updateUserStats({
                shooting: Math.min(100, score)
            });

            // Add to activities
            addActivity({
                title: 'AI Shooting Analysis',
                progress: score,
                date: 'Today'
            });

            // Update historical data
            const today = new Date().toISOString().split('T')[0];
            setHistoricalData(prev => [...prev, { date: today, score: score }]);

        } catch (error) {
            console.error('❌ Analysis error:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                apiError: error.apiError,
                tips: error.tips
            });

            // Reset animation and stage
            analysisProgressAnim.setValue(0);
            setCurrentStage('intro');

            // Check if this is the "Could not detect complete shooting motion" error
            const isMotionDetectionError = error.message?.includes('Could not detect complete shooting motion');

            if (isMotionDetectionError) {
                // Show specific prompt for retaking the video
                const tipsMessage = error.tips && error.tips.length > 0
                    ? '\n\nTips:\n' + error.tips.map(tip => `• ${tip}`).join('\n')
                    : '\n\nTips:\n• Make sure your full body is visible in the frame\n• Record from a side angle\n• Include the complete shooting motion from start to finish\n• Ensure good lighting';

                Alert.alert(
                    'Unable to Detect Shot',
                    `We couldn't detect a complete shooting motion in your video.${tipsMessage}\n\nWould you like to try again?`,
                    [
                        {
                            text: 'Retake Video',
                            onPress: () => {
                                setTimeout(() => startCapture(), 500);
                            }
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        }
                    ]
                );
            } else {
                // Generic error handling for other errors
                Alert.alert(
                    'Analysis Failed',
                    `Unable to analyze your shooting form.\n\nError: ${error.message}\n\nPlease check your internet connection and try again.`,
                    [
                        {
                            text: 'Try Again',
                            onPress: () => {
                                setTimeout(() => startCapture(), 500);
                            }
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        }
                    ]
                );
            }
        }
    };

    // Start camera capture with subscription check
    const startCapture = () => {
        // Check if user has access to AI shot analysis (requires Basic or higher)
        const userSubscription = userData?.subscription || 'free';
        const hasAccess = canAccessFeature('aiShotAnalysis', userSubscription);

        if (!hasAccess) {
            const requiredTier = getRequiredSubscription('feature', 'aiShotAnalysis');
            setLockedFeature({
                name: 'AI Shot Analysis',
                requiredTier,
                customMessage: 'Unlock AI-powered shooting form analysis with personalized feedback to improve your shot. Get detailed insights on your technique and track your improvements over time.'
            });
            setShowUpgradePrompt(true);
            return;
        }

        setCurrentStage('recording');
    };

    // Handle upgrade navigation
    const handleUpgrade = (requiredTier) => {
        setShowUpgradePrompt(false);
        setLockedFeature(null);
        navigation.navigate('Profile', { screen: 'Settings', params: { openSubscription: true }, initial: false });
    };

    // Handle modal close
    const handleCloseUpgradePrompt = () => {
        setShowUpgradePrompt(false);
        setLockedFeature(null);
    };

    const resetAnalysis = () => {
        setCurrentStage('intro');
        setCapturedVideoData(null);
        setAnalysisResults(null);
        analysisProgressAnim.setValue(0);
    };

    const renderMetricItem = ({ item }) => {
        let statusColor;
        let statusIcon;

        switch (item.status) {
            case 'good':
                statusColor = '#4CAF50';
                statusIcon = 'checkmark-circle';
                break;
            case 'improve':
                statusColor = '#FF9800';
                statusIcon = 'alert-circle';
                break;
            case 'poor':
                statusColor = '#F44336';
                statusIcon = 'close-circle';
                break;
            default:
                statusColor = '#4CAF50';
                statusIcon = 'checkmark-circle';
        }

        return (
            <View
                style={[
                    styles.metricItem,
                    item.id !== analysisResults.metrics[analysisResults.metrics.length - 1].id &&
                    styles.metricItemWithBorder
                ]}
            >
                <View style={styles.metricHeader}>
                    <Text style={styles.metricName}>{item.name}</Text>
                    <View style={[styles.metricScoreContainer, { backgroundColor: `${statusColor}20` }]}>
                        <Text style={[styles.metricScore, { color: statusColor }]}>{item.score}/10</Text>
                    </View>
                </View>

                <View style={styles.metricDetails}>
                    <View style={styles.metricValue}>
                        <Text style={styles.metricLabel}>Your Value</Text>
                        <Text style={styles.metricValueText}>{item.value}</Text>
                    </View>
                    <View style={styles.metricIdeal}>
                        <Text style={styles.metricLabel}>Ideal</Text>
                        <Text style={styles.metricIdealText}>{item.ideal}</Text>
                    </View>
                </View>

                <View style={[styles.metricFeedback, { borderLeftColor: statusColor }]}>
                    <View style={styles.metricFeedbackHeader}>
                        <Ionicons name={statusIcon} size={16} color={statusColor} />
                        <Text style={[styles.metricFeedbackTitle, { color: statusColor }]}>
                            {item.status === 'good' ? 'Good' : item.status === 'improve' ? 'Needs Improvement' : 'Needs Work'}
                        </Text>
                    </View>
                    <Text style={styles.metricFeedbackText}>{item.feedback}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        if (currentStage === 'results' || currentStage === 'intro') {
                            navigation.goBack();
                        } else {
                            Alert.alert(
                                'Cancel Analysis',
                                'Are you sure you want to cancel the current analysis?',
                                [
                                    { text: 'No', style: 'cancel' },
                                    { text: 'Yes', onPress: () => navigation.goBack() }
                                ]
                            );
                        }
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Shooting Analysis</Text>
                <View style={styles.headerRight} />
            </View>

            {/* Introduction Screen */}
            {currentStage === 'intro' && (
                <ScrollView style={styles.container}>
                    <View style={styles.introContainer}>
                        <View style={styles.introImageContainer}>
                            <View style={styles.introImage}>
                                <Ionicons name="analytics" size={60} color="#FFF" />
                            </View>
                        </View>

                        <Text style={styles.introTitle}>AI Shooting Analysis</Text>
                        <Text style={styles.introDescription}>
                            Our AI technology analyzes your shooting form and provides personalized feedback to help you improve.
                            Record a video of your shooting form from the side angle for best results.
                        </Text>

                        <View style={styles.tipContainer}>
                            <View style={styles.tipHeader}>
                                <Ionicons name="bulb" size={20} color="#FFD700" />
                                <Text style={styles.tipTitle}>Pro Tip</Text>
                            </View>
                            <Text style={styles.tipText}>
                                Make sure you're recording in a well-lit area with a clear background.
                                Stand at a 90° angle to the camera for optimal analysis.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={startCapture}
                        >
                            <Text style={styles.startButtonText}>Start Recording</Text>
                        </TouchableOpacity>

                        {historicalData.length > 0 && (
                            <TouchableOpacity
                                style={styles.historyButton}
                                onPress={() => navigation.navigate('Progress', { screen: 'ShootingHistory' })}
                            >
                                <Text style={styles.historyButtonText}>View Analysis History</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            )}

            {/* Recording Screen - Real Camera Capture */}
            {currentStage === 'recording' && (
                <AICameraCapture
                    isVisible={currentStage === 'recording'}
                    analysisMode="shooting"
                    onCapture={handleCameraCapture}
                    onClose={() => {
                        console.log('🚪 Camera onClose called, setting stage to intro');
                        setCurrentStage('intro');
                    }}
                />
            )}

            {/* Analyzing Screen */}
            {currentStage === 'analyzing' && (
                <View style={styles.analyzingContainer}>
                    <View style={styles.analyzingVideoContainer}>
                        <View style={styles.userVideo}>
                            {capturedVideoData?.videoUri && !capturedVideoData.videoUri.includes('test://') ? (
                                <View style={styles.videoThumbnailContainer}>
                                    <View style={styles.videoPlaceholder}>
                                        <Ionicons name="videocam" size={40} color="#666" />
                                        <Text style={styles.videoPlaceholderText}>Your Recording</Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.videoPlaceholder}>
                                    <Ionicons name="person" size={40} color="#666" />
                                    <Text style={styles.videoPlaceholderText}>Your Form</Text>
                                </View>
                            )}
                            <Text style={styles.videoLabel}>Your Form</Text>
                        </View>
                    </View>

                    <View style={styles.analysisProgressContainer}>
                        <Text style={styles.analysisText}>Analyzing your shooting form...</Text>
                        <View style={styles.analysisProgressBar}>
                            <Animated.View
                                style={[
                                    styles.analysisProgressFill,
                                    {
                                        width: analysisProgressAnim.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['0%', '100%']
                                        })
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.analysisSteps}>Analyzing key metrics</Text>
                    </View>

                    <View style={styles.analysisDetails}>
                        <View style={styles.analysisStep}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            <Text style={styles.analysisStepText}>Detecting body position</Text>
                        </View>
                        <View style={styles.analysisStep}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            <Text style={styles.analysisStepText}>Evaluating release angle</Text>
                        </View>
                        <View style={styles.analysisStep}>
                            <Animated.View
                                style={{
                                    opacity: analysisProgressAnim.interpolate({
                                        inputRange: [0, 30, 40],
                                        outputRange: [0, 0, 1],
                                        extrapolate: 'clamp'
                                    })
                                }}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            </Animated.View>
                            <Text style={styles.analysisStepText}>Analyzing elbow alignment</Text>
                        </View>
                        <View style={styles.analysisStep}>
                            <Animated.View
                                style={{
                                    opacity: analysisProgressAnim.interpolate({
                                        inputRange: [0, 60, 70],
                                        outputRange: [0, 0, 1],
                                        extrapolate: 'clamp'
                                    })
                                }}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            </Animated.View>
                            <Text style={styles.analysisStepText}>Measuring follow-through</Text>
                        </View>
                        <View style={styles.analysisStep}>
                            <Animated.View
                                style={{
                                    opacity: analysisProgressAnim.interpolate({
                                        inputRange: [0, 80, 90],
                                        outputRange: [0, 0, 1],
                                        extrapolate: 'clamp'
                                    })
                                }}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            </Animated.View>
                            <Text style={styles.analysisStepText}>Generating feedback</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Results Screen */}
            {currentStage === 'results' && analysisResults && (
                <ScrollView style={styles.container}>
                    {/* Simple Progressive Disclosure Analysis Results */}
                    <ShotAnalysisResultsSimple
                        results={analysisResults}
                        onClose={() => navigation.goBack()}
                        onTryAgain={resetAnalysis}
                        history={historicalData}
                    />

                    {/* Visualization Video Section */}
                    {analysisResults.visualizationVideoUrl && (
                        <View style={styles.visualizationContainer}>
                            <View style={styles.visualizationHeader}>
                                <Ionicons name="eye" size={20} color="#FF6B00" />
                                <Text style={styles.visualizationTitle}>Shot Breakdown Video</Text>
                            </View>
                            <Text style={styles.visualizationDescription}>
                                Watch your shot with AI overlays showing form analysis
                            </Text>

                            <View style={styles.videoPlayerContainer}>
                                {videoLoading && (
                                    <View style={styles.videoLoadingOverlay}>
                                        <ActivityIndicator size="large" color="#FF6B00" />
                                        <Text style={styles.videoLoadingText}>Loading video...</Text>
                                    </View>
                                )}
                                <Video
                                    ref={videoRef}
                                    source={{ uri: analysisResults.visualizationVideoUrl }}
                                    style={styles.videoPlayer}
                                    useNativeControls
                                    resizeMode="contain"
                                    isLooping
                                    onLoadStart={() => setVideoLoading(true)}
                                    onLoad={() => setVideoLoading(false)}
                                    onError={(error) => {
                                        console.error('Video playback error:', error);
                                        setVideoLoading(false);
                                        Alert.alert(
                                            'Video Error',
                                            'Unable to load the visualization video. Please try again.',
                                            [{ text: 'OK' }]
                                        );
                                    }}
                                    onPlaybackStatusUpdate={(status) => {
                                        if (status.isLoaded) {
                                            setIsVideoPlaying(status.isPlaying);
                                        }
                                    }}
                                />
                            </View>

                            <View style={styles.videoControls}>
                                <TouchableOpacity
                                    style={styles.videoControlButton}
                                    onPress={async () => {
                                        if (videoRef.current) {
                                            if (isVideoPlaying) {
                                                await videoRef.current.pauseAsync();
                                            } else {
                                                await videoRef.current.playAsync();
                                            }
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name={isVideoPlaying ? 'pause' : 'play'}
                                        size={20}
                                        color="#FFF"
                                    />
                                    <Text style={styles.videoControlText}>
                                        {isVideoPlaying ? 'Pause' : 'Play'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.videoControlButton}
                                    onPress={async () => {
                                        if (videoRef.current) {
                                            await videoRef.current.replayAsync();
                                        }
                                    }}
                                >
                                    <Ionicons name="refresh" size={20} color="#FFF" />
                                    <Text style={styles.videoControlText}>Replay</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Detailed Metrics */}
                    <View style={styles.metricsContainer}>
                        <Text style={styles.resultSectionTitle}>Detailed Analysis</Text>
                        <FlatList
                            data={analysisResults.metrics || []}
                            renderItem={renderMetricItem}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                        />
                    </View>

                    {/* Improvement Suggestions */}
                    <View style={styles.improvementsContainer}>
                        <Text style={styles.resultSectionTitle}>Focus Areas for Improvement</Text>
                        <View style={styles.improvementsList}>
                            {(analysisResults.improvements || getDefaultImprovements()).map((improvement, index) => (
                                <View key={`imp-${index}`} style={styles.improvementItem}>
                                    <View style={styles.improvementBullet}>
                                        <Text style={styles.improvementBulletText}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.improvementContent}>
                                        <Text style={styles.improvementText}>{improvement}</Text>
                                        {index === 0 && (
                                            <Text style={styles.improvementDetail}>
                                                Practice: Hold follow-through for 2 seconds after release
                                            </Text>
                                        )}
                                        {index === 1 && (
                                            <Text style={styles.improvementDetail}>
                                                Drill: Square shooting stance with feet shoulder-width apart
                                            </Text>
                                        )}
                                        {index === 2 && (
                                            <Text style={styles.improvementDetail}>
                                                Focus: Keep shooting elbow under the ball throughout motion
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                        
                        {/* Practice Recommendations */}
                        <View style={styles.practiceSection}>
                            <View style={styles.practiceTitle}>
                                <Ionicons name="fitness" size={16} color="#FF6B35" />
                                <Text style={styles.practiceTitleText}>Recommended Practice</Text>
                            </View>
                            <View style={styles.practiceItems}>
                                <Text style={styles.practiceItem}>• 50 form shots daily focusing on follow-through</Text>
                                <Text style={styles.practiceItem}>• Mirror work for proper elbow alignment</Text>
                                <Text style={styles.practiceItem}>• Wall shooting to improve arc consistency</Text>
                                <Text style={styles.practiceItem}>• Record yourself weekly to track progress</Text>
                            </View>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={styles.tryAgainButton}
                            onPress={resetAnalysis}
                        >
                            <Ionicons name="refresh" size={18} color="#FF6B00" />
                            <Text style={styles.tryAgainButtonText}>New Analysis</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={() => {
                                Alert.alert(
                                    'Analysis Saved',
                                    'Your shooting analysis has been saved to your profile.',
                                    [{
                                        text: 'OK',
                                        onPress: () => {
                                            // Reset navigation to main tab with Home screen
                                            navigation.reset({
                                                index: 0,
                                                routes: [{ name: 'Training', params: { screen: 'TrainingMain' } }],
                                            });
                                        }
                                    }]
                                );
                            }}
                        >
                            <Text style={styles.saveButtonText}>Save & Exit</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Suggested Drills */}
                    <View style={styles.suggestedDrillsContainer}>
                        <Text style={styles.resultSectionTitle}>Recommended Drills</Text>
                        <TouchableOpacity
                            style={styles.drillItem}
                            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: '1' })}
                        >
                            <View style={styles.drillIconContainer}>
                                <Ionicons name="basketball" size={24} color="#FF6B00" />
                            </View>
                            <View style={styles.drillInfo}>
                                <Text style={styles.drillTitle}>Perfect Release Drill</Text>
                                <Text style={styles.drillDescription}>Improve your release angle and follow-through</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.drillItem}
                            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: '2' })}
                        >
                            <View style={styles.drillIconContainer}>
                                <Ionicons name="fitness" size={24} color="#FF6B00" />
                            </View>
                            <View style={styles.drillInfo}>
                                <Text style={styles.drillTitle}>Wrist Strengthening</Text>
                                <Text style={styles.drillDescription}>Build wrist flexibility and strength for better control</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}

            {/* Upgrade Prompt for Locked Features */}
            <UpgradePrompt
                visible={showUpgradePrompt && lockedFeature !== null}
                onClose={handleCloseUpgradePrompt}
                onUpgrade={handleUpgrade}
                featureName={lockedFeature?.name || ''}
                requiredTier={lockedFeature?.requiredTier || 'basic'}
                customMessage={lockedFeature?.customMessage}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    container: {
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    headerRight: {
        width: 40,
    },

    // Introduction Screen
    introContainer: {
        padding: 16,
    },
    introImageContainer: {
        alignItems: 'center',
        marginVertical: 24,
    },
    introImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
    },
    introTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 16,
    },
    introDescription: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    proModelSection: {
        marginBottom: 20,
    },
    proModelTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    proModelSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    selectedProModel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedProModelImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    proModelInitials: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    selectedProModelName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    selectedProModelDetails: {
        fontSize: 14,
        color: '#666',
    },
    tipContainer: {
        backgroundColor: '#FFF8E1',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderLeftWidth: 4,
        borderLeftColor: '#FFD700',
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 8,
    },
    tipText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    startButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    historyButton: {
        backgroundColor: '#F0F0F0',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    historyButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },

    // Recording Screen
    recordingContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    videoPreviewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    videoPreview: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoPreviewText: {
        color: '#FFF',
        fontSize: 16,
        opacity: 0.8,
    },
    videoInstructions: {
        color: '#FFF',
        fontSize: 14,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 8,
    },
    recordingIndicatorContainer: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    recordingIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#F44336',
        marginBottom: 8,
    },
    recordingText: {
        color: '#FFF',
        fontSize: 14,
        marginBottom: 8,
    },
    recordingProgress: {
        width: 200,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    recordingProgressFill: {
        height: '100%',
        backgroundColor: '#F44336',
    },
    recordingControls: {
        paddingVertical: 40,
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    recordButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 4,
        borderColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordButtonInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#F44336',
    },
    stopButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 4,
        borderColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopButtonInner: {
        width: 30,
        height: 30,
        backgroundColor: '#F44336',
    },
    cameraInstructions: {
        backgroundColor: '#121212',
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    instructionItem: {
        alignItems: 'center',
    },
    instructionText: {
        color: '#FFF',
        fontSize: 12,
        marginTop: 4,
    },

    // Analyzing Screen
    analyzingContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        padding: 16,
    },
    analyzingVideoContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    videoComparisonContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        height: 240,
    },
    userVideoContainer: {
        flex: 1,
        marginRight: 4,
    },
    userVideo: {
        backgroundColor: '#DDD',
        borderRadius: 12,
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    proVideoContainer: {
        flex: 1,
        marginLeft: 4,
    },
    proVideo: {
        backgroundColor: '#DDD',
        borderRadius: 12,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoLabel: {
        position: 'absolute',
        bottom: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#FFF',
        fontSize: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    analysisProgressContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    analysisText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    analysisProgressBar: {
        width: '100%',
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden',
    },
    analysisProgressFill: {
        height: '100%',
        backgroundColor: '#FF6B00',
        borderRadius: 4,
    },
    analysisSteps: {
        fontSize: 14,
        color: '#666',
    },
    analysisDetails: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
    },
    analysisStep: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    analysisStepText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },

    // Results Screen
    scoreContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    scoreCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    scoreValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    scoreLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },
    scoreDetails: {
        flex: 1,
    },
    scoreTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    scoreDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    resultVideoContainer: {
        padding: 16,
        backgroundColor: '#FFF',
        marginTop: 8,
    },
    resultSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    videoComparisonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    videoThumbnail: {
        width: '48%',
        position: 'relative',
    },
    videoFrame: {
        height: 150,
        backgroundColor: '#EEE',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoFrameText: {
        color: '#666',
    },
    videoTimestamp: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    videoControls: {
        position: 'absolute',
        bottom: 8,
        right: 8,
    },
    videoControlButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    metricsContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
    },
    metricItem: {
        marginBottom: 16,
    },
    metricItemWithBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingBottom: 16,
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    metricName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    metricScoreContainer: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    metricScore: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    metricDetails: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    metricValue: {
        flex: 1,
        marginRight: 8,
    },
    metricIdeal: {
        flex: 1,
        marginLeft: 8,
    },
    metricLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    metricValueText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    metricIdealText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    metricFeedback: {
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
    },
    metricFeedbackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    metricFeedbackTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    metricFeedbackText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    improvementsContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
    },
    improvementsList: {
        marginBottom: 8,
    },
    improvementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    improvementBullet: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    improvementBulletText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    improvementText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFF',
        marginTop: 8,
    },
    tryAgainButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#FF6B00',
    },
    tryAgainButtonText: {
        color: '#FF6B00',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#FF6B00',
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    suggestedDrillsContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
        marginBottom: 24,
    },
    drillItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    drillIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,107,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    drillInfo: {
        flex: 1,
    },
    drillTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    drillDescription: {
        fontSize: 14,
        color: '#666',
    },

    // Pro Model Selection Modal
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 24,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalCloseButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    proModelItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    selectedProModelItem: {
        backgroundColor: 'rgba(255,107,0,0.05)',
    },
    proModelImageContainer: {
        marginRight: 12,
    },
    proModelImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#DDD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    proModelName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    proModelDetails: {
        fontSize: 14,
        color: '#666',
    },

    // Curry Comparison Styles
    curryComparisonContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    curryComparisonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    curryComparisonTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 8,
    },
    similarityScoreCard: {
        backgroundColor: '#F8F9FA',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    similarityLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    similarityScore: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FF6B00',
        marginBottom: 8,
    },
    similarityDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    metricBreakdownContainer: {
        marginBottom: 16,
    },
    metricBreakdownTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    metricComparisonRow: {
        marginBottom: 16,
    },
    metricName: {
        fontSize: 14,
        color: '#333',
        marginBottom: 6,
        fontWeight: '500',
    },
    metricBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metricBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        marginRight: 12,
        overflow: 'hidden',
    },
    metricBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    metricPercentage: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        width: 45,
        textAlign: 'right',
    },
    curryFeedbackContainer: {
        marginTop: 8,
    },
    feedbackSection: {
        marginBottom: 16,
    },
    feedbackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    feedbackHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
    },
    feedbackItem: {
        fontSize: 14,
        color: '#666',
        marginLeft: 28,
        marginBottom: 6,
        lineHeight: 20,
    },
    
    // Enhanced video display styles
    videoIcon: {
        marginBottom: 8,
    },
    videoDuration: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    videoButtonText: {
        color: '#FFF',
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '500',
    },
    curryVideoPlaceholder: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    proVideoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginTop: 8,
    },
    proVideoStats: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    comparisonStats: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        alignItems: 'center',
    },
    comparisonStatsText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    
    // Enhanced improvement styles
    improvementContent: {
        flex: 1,
    },
    improvementDetail: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        marginTop: 4,
        lineHeight: 16,
    },
    practiceSection: {
        marginTop: 16,
        padding: 16,
        backgroundColor: 'rgba(255,107,53,0.05)',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B35',
    },
    practiceTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    practiceTitleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
    },
    practiceItems: {
        marginLeft: 8,
    },
    practiceItem: {
        fontSize: 14,
        color: '#555',
        marginBottom: 6,
        lineHeight: 20,
    },
    
    // Video player styles
    videoPlayer: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        backgroundColor: '#000',
    },
    videoPlaceholder: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
    },
    videoPlaceholderText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        fontWeight: '500',
    },
    videoOverlay: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 4,
        padding: 6,
    },
    curryVideoContainer: {
        position: 'relative',
        width: '100%',
        height: 120,
    },
    videoSourceText: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // Visualization Video Styles
    visualizationContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
        borderRadius: 12,
        marginHorizontal: 16,
    },
    visualizationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    visualizationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 8,
    },
    visualizationDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        lineHeight: 20,
    },
    videoPlayerContainer: {
        width: '100%',
        height: 300,
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    videoLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    videoLoadingText: {
        color: '#FFF',
        marginTop: 12,
        fontSize: 14,
    },
    videoControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 16,
    },
    videoControlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF6B00',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    videoControlText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default ShootingAnalysisScreen;