// ShootingAnalysisScreen.js — DBE burgundy redesign (mock 11a).
// Presentation only: camera/AI analysis pipeline untouched.
import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Animated,
    Easing,
    Alert,
    SafeAreaView,
    StatusBar,
    FlatList,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Svg from 'react-native-svg';
import { useAppContext } from '../../context/AppContext';
import AICameraCapture from '../../components/shared/AICameraCapture';
import ShotAnalysisResultsSimple from '../../components/shared/ShotAnalysisResultsSimple';
import UpgradePrompt from '../../components/shared/UpgradePrompt';
import aiAnalysisService from '../../services/aiAnalysisService';
import { canAccessFeature, getRequiredSubscription } from '../../utils/subscription';
import { TYPE, FONTS, SHAPE, MOTION } from '../../utils/typography';
import {
    ScreenHeader,
    SectionLabel,
    PrimaryButton,
    OutlineButton,
    Entrance,
    Shimmer,
    DrawnPath,
} from '../../components/dbe';
import { track, EVENTS } from '../../services/analytics';

// Default improvement suggestions when none are provided
const getDefaultImprovements = () => [
    "Focus on consistent follow-through with wrist snap",
    "Maintain balanced stance throughout your shot motion",
    "Keep your shooting elbow aligned directly under the ball",
    "Work on smooth, fluid motion from set point to release",
    "Practice consistent arc for optimal shooting angle"
];

const SCAN_TILE_HEIGHT = 164;

// ScanTile — surf2 tile with a drawn pose polyline and a sweeping accent scan
// line (mock 11a "Analyzing mechanics"). Pure chrome; no analysis logic.
const ScanTile = ({ theme }) => {
    const scanY = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(scanY, {
                    toValue: 1,
                    duration: 1100,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(scanY, {
                    toValue: 0,
                    duration: 1100,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <View
            style={{
                borderRadius: 20,
                backgroundColor: theme.surface2,
                height: SCAN_TILE_HEIGHT,
                overflow: 'hidden',
            }}
        >
            <Svg width="100%" height="100%" viewBox="0 0 300 164" style={StyleSheet.absoluteFill}>
                <DrawnPath
                    d="M40 136 L110 58 L170 92 L260 28"
                    pathLength={340}
                    stroke={theme.steel}
                    strokeOpacity={0.45}
                    strokeWidth={2}
                />
            </Svg>
            <Animated.View
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: theme.primaryLight,
                    transform: [
                        {
                            translateY: scanY.interpolate({
                                inputRange: [0, 1],
                                outputRange: [8, SCAN_TILE_HEIGHT - 10],
                            }),
                        },
                    ],
                }}
            />
            <View
                style={{
                    position: 'absolute',
                    left: 12,
                    bottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: theme.overlay,
                    paddingHorizontal: 9,
                    paddingVertical: 5,
                    borderRadius: SHAPE.radiusBadge,
                }}
            >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary }} />
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12.5, letterSpacing: 0.4, color: '#FFFFFF' }}>
                    Analyzing mechanics
                </Text>
            </View>
        </View>
    );
};

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
    // Measured width of the progress track, so the fill can be slid with translateX
    // instead of animating `width` off the native driver.
    const [analysisTrackW, setAnalysisTrackW] = useState(0);

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

            // Start analysis progress animation.
            // Everything this value drives is now native-driver safe (a transform on
            // the bar, opacity on the phase checkmarks), so it runs off the JS thread.
            // NOTE: the 8s duration is still a fixed guess while the work it depicts
            // (analyzeComprehensive, below) takes a variable time. Driving this from
            // real analysis phases is a separate, product-level change.
            Animated.timing(analysisProgressAnim, {
                toValue: 100,
                duration: 8000, // 8 seconds for realistic analysis time
                easing: MOTION.linear,
                useNativeDriver: true,
            }).start();

            // Perform comprehensive AI analysis with phase detection and biomechanics
            console.log('🏀 Using comprehensive analysis for feedback-based improvement');
            track(EVENTS.SHOT_ANALYSIS_RUN);
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

    const statusColorFor = (status) =>
        status === 'good' ? theme.success : status === 'improve' ? theme.warning : theme.error;

    const renderMetricItem = ({ item }) => {
        const statusColor = statusColorFor(item.status);
        const statusIcon =
            item.status === 'good' ? 'checkmark-circle' : item.status === 'improve' ? 'alert-circle' : 'close-circle';

        return (
            <View
                style={{
                    backgroundColor: theme.surface,
                    borderRadius: SHAPE.radiusTile,
                    padding: SHAPE.cardPadding,
                    marginBottom: SHAPE.cardGap,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[TYPE.rowTitle, { color: theme.text }]}>{item.name}</Text>
                    <View
                        style={{
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            borderRadius: 6,
                            backgroundColor: `${statusColor}20`,
                        }}
                    >
                        <Text style={{ fontFamily: FONTS.bodyExtraBold, fontSize: 13, color: statusColor }}>
                            {item.score}/10
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', marginTop: 8, gap: 14 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={[TYPE.statCaption, { color: theme.textDim }]}>Yours</Text>
                        <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 15, color: theme.text, marginTop: 2 }}>
                            {item.value}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[TYPE.statCaption, { color: theme.textDim }]}>Ideal</Text>
                        <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 15, color: theme.text, marginTop: 2 }}>
                            {item.ideal}
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
                    <Ionicons name={statusIcon} size={14} color={statusColor} style={{ marginTop: 1 }} />
                    <Text style={[TYPE.rowMeta, { color: theme.textMuted, flex: 1, marginTop: 0, lineHeight: 16.5 }]}>
                        {item.feedback}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.background} />

            {/* Header */}
            <ScreenHeader
                title="Shot Analysis"
                onBack={() => {
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
            />

            {/* Introduction Screen */}
            {currentStage === 'intro' && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SHAPE.screenPadding }}>
                    <Entrance variant="up" style={{ alignItems: 'center', marginTop: 14 }}>
                        <View style={{ borderRadius: SHAPE.radiusHero, overflow: 'hidden' }}>
                            <LinearGradient
                                colors={theme.heroGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={{
                                    width: 84,
                                    height: 84,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="analytics" size={40} color="#FFFFFF" />
                                <Shimmer />
                            </LinearGradient>
                        </View>
                        <Text style={[TYPE.screenTitle, { color: theme.text, marginTop: 16 }]}>
                            AI Shot Analysis
                        </Text>
                        <Text
                            style={{
                                fontFamily: FONTS.body,
                                fontSize: 14.5,
                                lineHeight: 19,
                                color: theme.textMuted,
                                textAlign: 'center',
                                marginTop: 8,
                            }}
                        >
                            Record your shot from the side. The AI scores your form and shows what to fix.
                        </Text>
                    </Entrance>

                    <Entrance
                        variant="cardIn"
                        delay={120}
                        style={{
                            marginTop: 22,
                            backgroundColor: theme.surface,
                            borderRadius: SHAPE.radiusTile,
                            padding: SHAPE.cardPadding,
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            gap: 10,
                        }}
                    >
                        <View
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 9,
                                backgroundColor: theme.badgeFill,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="bulb" size={15} color={theme.accentText} />
                        </View>
                        <Text style={[TYPE.rowMeta, { color: theme.textMuted, flex: 1, marginTop: 0, lineHeight: 17.5 }]}>
                            Well-lit space, clear background, 90° side angle. Full body in frame.
                        </Text>
                    </Entrance>

                    <Entrance variant="cardIn" delay={220} style={{ marginTop: 18 }}>
                        <PrimaryButton label="Start Recording" icon="videocam" onPress={startCapture} />
                        {historicalData.length > 0 && (
                            <OutlineButton
                                label="Analysis History"
                                onPress={() => navigation.navigate('Progress', { screen: 'ShootingHistory' })}
                                style={{ marginTop: SHAPE.cardGap }}
                            />
                        )}
                    </Entrance>
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
                <View style={{ flex: 1, padding: SHAPE.screenPadding }}>
                    <ScanTile theme={theme} />

                    <View style={{ marginTop: 22 }}>
                        <View
                            onLayout={(e) => setAnalysisTrackW(e.nativeEvent.layout.width)}
                            style={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: theme.track,
                                overflow: 'hidden',
                            }}
                        >
                            {/* Full-width fill slid left by the unfilled remainder, rather
                                than an animated `width`. `width` is a layout property: it
                                re-ran layout+paint+composite every frame, off the native
                                driver, for eight uninterrupted seconds. */}
                            <Animated.View
                                style={{
                                    height: '100%',
                                    width: '100%',
                                    borderRadius: 3,
                                    backgroundColor: theme.primary,
                                    opacity: analysisTrackW ? 1 : 0,
                                    transform: [{
                                        translateX: analysisProgressAnim.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: [-analysisTrackW, 0]
                                        })
                                    }]
                                }}
                            />
                        </View>
                        <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 8, textAlign: 'center' }]}>
                            Analyzing key metrics
                        </Text>
                    </View>

                    <View
                        style={{
                            marginTop: 20,
                            backgroundColor: theme.surface,
                            borderRadius: SHAPE.radiusTile,
                            padding: SHAPE.cardPadding,
                            gap: 11,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="checkmark-circle" size={18} color={theme.accentText} />
                            <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginTop: 0 }]}>Detecting body position</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="checkmark-circle" size={18} color={theme.accentText} />
                            <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginTop: 0 }]}>Evaluating release angle</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Animated.View
                                style={{
                                    opacity: analysisProgressAnim.interpolate({
                                        inputRange: [0, 30, 40],
                                        outputRange: [0, 0, 1],
                                        extrapolate: 'clamp'
                                    })
                                }}
                            >
                                <Ionicons name="checkmark-circle" size={18} color={theme.accentText} />
                            </Animated.View>
                            <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginTop: 0 }]}>Analyzing elbow alignment</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Animated.View
                                style={{
                                    opacity: analysisProgressAnim.interpolate({
                                        inputRange: [0, 60, 70],
                                        outputRange: [0, 0, 1],
                                        extrapolate: 'clamp'
                                    })
                                }}
                            >
                                <Ionicons name="checkmark-circle" size={18} color={theme.accentText} />
                            </Animated.View>
                            <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginTop: 0 }]}>Measuring follow-through</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Animated.View
                                style={{
                                    opacity: analysisProgressAnim.interpolate({
                                        inputRange: [0, 80, 90],
                                        outputRange: [0, 0, 1],
                                        extrapolate: 'clamp'
                                    })
                                }}
                            >
                                <Ionicons name="checkmark-circle" size={18} color={theme.accentText} />
                            </Animated.View>
                            <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginTop: 0 }]}>Generating feedback</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Results Screen */}
            {currentStage === 'results' && analysisResults && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 28 }}>
                    {/* Simple Progressive Disclosure Analysis Results */}
                    <ShotAnalysisResultsSimple
                        results={analysisResults}
                        onClose={() => navigation.goBack()}
                        onTryAgain={resetAnalysis}
                        history={historicalData}
                    />

                    {/* Visualization Video Section */}
                    {(analysisResults.overlayVideoUrl || analysisResults.visualizationVideoUrl) && (
                        <View style={{ paddingHorizontal: SHAPE.screenPadding, marginTop: SHAPE.sectionGap }}>
                            <SectionLabel>
                                {analysisResults.overlayVideoUrl ? 'AI overlay replay' : 'AI replay'}
                            </SectionLabel>

                            {!!analysisResults.summary && (
                                <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginBottom: 10, lineHeight: 17.5 }]}>
                                    {analysisResults.summary}
                                </Text>
                            )}

                            {!!analysisResults.quality?.warning && (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        gap: 7,
                                        backgroundColor: theme.surface,
                                        borderRadius: SHAPE.radiusBadge,
                                        padding: 10,
                                        marginBottom: 10,
                                    }}
                                >
                                    <Ionicons name="warning-outline" size={14} color={theme.warning} />
                                    <Text style={[TYPE.rowMeta, { color: theme.textMuted, flex: 1, marginTop: 0, lineHeight: 16.5 }]}>
                                        {analysisResults.quality.warning}
                                    </Text>
                                </View>
                            )}

                            {analysisResults.phases && Object.keys(analysisResults.phases).length > 0 && (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                    {Object.keys(analysisResults.phases).slice(0, 4).map((phaseKey) => (
                                        <View
                                            key={phaseKey}
                                            style={{
                                                backgroundColor: theme.steelFill,
                                                borderRadius: SHAPE.radiusPill,
                                                paddingHorizontal: 9,
                                                paddingVertical: 4,
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    TYPE.chip,
                                                    { color: theme.steel, textTransform: 'capitalize' },
                                                ]}
                                            >
                                                {phaseKey.replace(/_/g, ' ')}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <View
                                style={{
                                    width: '100%',
                                    height: 300,
                                    backgroundColor: '#000',
                                    borderRadius: SHAPE.radiusCard,
                                    overflow: 'hidden',
                                }}
                            >
                                {videoLoading && (
                                    <View
                                        style={{
                                            ...StyleSheet.absoluteFillObject,
                                            backgroundColor: theme.surface2,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            zIndex: 10,
                                        }}
                                    >
                                        <ActivityIndicator size="large" color={theme.primary} />
                                    </View>
                                )}
                                <Video
                                    ref={videoRef}
                                    source={{ uri: analysisResults.overlayVideoUrl || analysisResults.visualizationVideoUrl }}
                                    style={{ width: '100%', height: '100%' }}
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

                            <View style={{ flexDirection: 'row', gap: SHAPE.cardGap, marginTop: 10 }}>
                                <OutlineButton
                                    icon={isVideoPlaying ? 'pause' : 'play'}
                                    label={isVideoPlaying ? 'Pause' : 'Play'}
                                    style={{ flex: 1 }}
                                    onPress={async () => {
                                        if (videoRef.current) {
                                            if (isVideoPlaying) {
                                                await videoRef.current.pauseAsync();
                                            } else {
                                                await videoRef.current.playAsync();
                                            }
                                        }
                                    }}
                                />
                                <OutlineButton
                                    icon="refresh"
                                    label="Replay"
                                    style={{ flex: 1 }}
                                    onPress={async () => {
                                        if (videoRef.current) {
                                            await videoRef.current.replayAsync();
                                        }
                                    }}
                                />
                            </View>
                        </View>
                    )}

                    {/* Detailed Metrics */}
                    {(analysisResults.metrics || []).length > 0 && (
                        <View style={{ paddingHorizontal: SHAPE.screenPadding, marginTop: SHAPE.sectionGap }}>
                            <SectionLabel>Detailed analysis</SectionLabel>
                            <FlatList
                                data={analysisResults.metrics || []}
                                renderItem={renderMetricItem}
                                keyExtractor={item => item.id}
                                scrollEnabled={false}
                            />
                        </View>
                    )}

                    {/* Improvement Suggestions */}
                    <View style={{ paddingHorizontal: SHAPE.screenPadding, marginTop: 9 }}>
                        <SectionLabel>Focus areas</SectionLabel>
                        <View style={{ gap: 10 }}>
                            {(analysisResults.improvements || getDefaultImprovements()).map((improvement, index) => (
                                <View key={`imp-${index}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                    <View
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: index === 0 ? theme.primary : theme.badgeFill,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Text style={[TYPE.chip, { color: index === 0 ? '#FFFFFF' : theme.accentText }]}>
                                            {index + 1}
                                        </Text>
                                    </View>
                                    <Text
                                        style={{
                                            fontFamily: FONTS.bodySemiBold,
                                            fontSize: 14.5,
                                            lineHeight: 18,
                                            color: theme.text,
                                            flex: 1,
                                            marginTop: 3,
                                        }}
                                    >
                                        {improvement}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Practice Recommendations */}
                        <View
                            style={{
                                marginTop: 14,
                                backgroundColor: theme.surface,
                                borderRadius: SHAPE.radiusTile,
                                padding: SHAPE.cardPadding,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                                <Ionicons name="fitness" size={14} color={theme.accentText} />
                                <Text style={[TYPE.rowTitle, { color: theme.text }]}>Practice plan</Text>
                            </View>
                            <View style={{ gap: 5 }}>
                                <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginTop: 0 }]}>• 50 form shots daily focusing on follow-through</Text>
                                <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginTop: 0 }]}>• Mirror work for proper elbow alignment</Text>
                                <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginTop: 0 }]}>• Wall shooting to improve arc consistency</Text>
                                <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginTop: 0 }]}>• Record yourself weekly to track progress</Text>
                            </View>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View
                        style={{
                            flexDirection: 'row',
                            gap: SHAPE.cardGap,
                            paddingHorizontal: SHAPE.screenPadding,
                            marginTop: SHAPE.sectionGap,
                        }}
                    >
                        <OutlineButton icon="refresh" label="New Analysis" style={{ flex: 1 }} onPress={resetAnalysis} />
                        <PrimaryButton
                            label="Save & Exit"
                            style={{ flex: 1 }}
                            onPress={() => {
                                Alert.alert(
                                    'Analysis Saved',
                                    'Your shooting analysis has been saved to your profile.',
                                    [{
                                        text: 'OK',
                                        onPress: () => {
                                            // Land the user in the Training browser (now a pushed
                                            // screen folded under Blueprint360, not a tab).
                                            navigation.navigate('Training');
                                        }
                                    }]
                                );
                            }}
                        />
                    </View>

                    {/* Suggested Drills */}
                    <View style={{ paddingHorizontal: SHAPE.screenPadding, marginTop: SHAPE.sectionGap }}>
                        <SectionLabel>Recommended drills</SectionLabel>
                        <View style={{ gap: SHAPE.cardGap }}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('WorkoutDetail', { workoutId: '1' })}
                                style={{
                                    backgroundColor: theme.surface,
                                    borderRadius: SHAPE.radiusCard,
                                    padding: SHAPE.cardPadding,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 11,
                                }}
                            >
                                <View
                                    style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 11,
                                        backgroundColor: theme.badgeFill,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="basketball" size={19} color={theme.accentText} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[TYPE.rowTitle, { color: theme.text }]}>Perfect Release Drill</Text>
                                    <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>Release angle & follow-through</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('WorkoutDetail', { workoutId: '2' })}
                                style={{
                                    backgroundColor: theme.surface,
                                    borderRadius: SHAPE.radiusCard,
                                    padding: SHAPE.cardPadding,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 11,
                                }}
                            >
                                <View
                                    style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 11,
                                        backgroundColor: theme.badgeFill,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Ionicons name="fitness" size={19} color={theme.accentText} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[TYPE.rowTitle, { color: theme.text }]}>Wrist Strengthening</Text>
                                    <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>Flexibility & control</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
                            </TouchableOpacity>
                        </View>
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

export default ShootingAnalysisScreen;
