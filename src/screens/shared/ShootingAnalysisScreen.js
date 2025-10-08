// ShootingAnalysisScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Animated,
    Alert,
    SafeAreaView,
    StatusBar,
    Dimensions,
    Modal,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import AICameraCapture from '../../components/shared/AICameraCapture';
import aiAnalysisService from '../../services/aiAnalysisService';

const { width } = Dimensions.get('window');

// Professional model reference images (would come from assets in real app)
const PRO_MODELS = [
    { id: '1', name: 'Stephen Curry', position: 'PG', team: 'Warriors' },
    { id: '2', name: 'Kevin Durant', position: 'SF', team: 'Suns' },
    { id: '3', name: 'LeBron James', position: 'SF', team: 'Lakers' },
];

const ShootingAnalysisScreen = ({ navigation }) => {
    const { updateUserStats, addActivity } = useAppContext();

    // State management
    const [currentStage, setCurrentStage] = useState('intro'); // intro, recording, analyzing, results
    const [selectedProModel, setSelectedProModel] = useState(PRO_MODELS[0]);
    const [capturedVideoData, setCapturedVideoData] = useState(null);
    const [showProSelection, setShowProSelection] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [historicalData, setHistoricalData] = useState([
        { date: '2023-03-01', score: 68 },
        { date: '2023-03-15', score: 72 },
        { date: '2023-04-02', score: 75 },
    ]);

    // Animation values
    const analysisProgressAnim = useRef(new Animated.Value(0)).current;

    // Handle camera capture
    const handleCameraCapture = async (videoData) => {
        try {
            setCapturedVideoData(videoData);
            setCurrentStage('analyzing');

            // Start analysis progress animation
            Animated.timing(analysisProgressAnim, {
                toValue: 100,
                duration: 8000, // 8 seconds for realistic analysis time
                useNativeDriver: false,
            }).start();

            // Perform AI analysis
            const results = await aiAnalysisService.analyzeShootingForm(videoData);
            
            setAnalysisResults(results);
            setCurrentStage('results');

            // Update user stats
            updateUserStats({
                shooting: Math.min(100, results.overallScore)
            });

            // Add to activities
            addActivity({
                title: 'AI Shooting Analysis',
                progress: results.overallScore,
                date: 'Today'
            });

            // Update historical data
            const today = new Date().toISOString().split('T')[0];
            setHistoricalData(prev => [...prev, { date: today, score: results.overallScore }]);

        } catch (error) {
            console.error('Analysis error:', error);
            Alert.alert(
                'Analysis Failed', 
                'Unable to analyze your shooting form. Please try recording again.',
                [
                    { text: 'OK', onPress: () => setCurrentStage('intro') }
                ]
            );
        }
    };

    // Start camera capture
    const startCapture = () => {
        setCurrentStage('recording');
    };

    const resetAnalysis = () => {
        setCurrentStage('intro');
        setCapturedVideoData(null);
        setAnalysisResults(null);
        analysisProgressAnim.setValue(0);
    };

    const renderProModelItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.proModelItem,
                selectedProModel.id === item.id && styles.selectedProModelItem
            ]}
            onPress={() => {
                setSelectedProModel(item);
                setShowProSelection(false);
            }}
        >
            <View style={styles.proModelImageContainer}>
                <View style={styles.proModelImage}>
                    <Text style={styles.proModelInitials}>
                        {item.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                </View>
            </View>
            <Text style={styles.proModelName}>{item.name}</Text>
            <Text style={styles.proModelDetails}>{item.position} • {item.team}</Text>
        </TouchableOpacity>
    );

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

                        <View style={styles.proModelSection}>
                            <Text style={styles.proModelTitle}>Compare with Pro Form:</Text>
                            <TouchableOpacity
                                style={styles.proModelSelector}
                                onPress={() => setShowProSelection(true)}
                            >
                                <View style={styles.selectedProModel}>
                                    <View style={styles.selectedProModelImage}>
                                        <Text style={styles.proModelInitials}>
                                            {selectedProModel.name.split(' ').map(n => n[0]).join('')}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.selectedProModelName}>{selectedProModel.name}</Text>
                                        <Text style={styles.selectedProModelDetails}>
                                            {selectedProModel.position} • {selectedProModel.team}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-down" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

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
                                onPress={() => navigation.navigate('ShootingHistory')}
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
                    isVisible={true}
                    analysisMode="shooting"
                    onCapture={handleCameraCapture}
                    onClose={() => setCurrentStage('intro')}
                />
            )}

            {/* Analyzing Screen */}
            {currentStage === 'analyzing' && (
                <View style={styles.analyzingContainer}>
                    <View style={styles.videoComparisonContainer}>
                        <View style={styles.userVideoContainer}>
                            <View style={styles.userVideo}>
                                <Text style={styles.videoLabel}>Your Form</Text>
                            </View>
                        </View>
                        <View style={styles.proVideoContainer}>
                            <View style={styles.proVideo}>
                                <Text style={styles.videoLabel}>{selectedProModel.name}</Text>
                            </View>
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
                                    opacity: analysisProgress.interpolate({
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
                                    opacity: analysisProgress.interpolate({
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
                                    opacity: analysisProgress.interpolate({
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
                    {/* Overall Score */}
                    <View style={styles.scoreContainer}>
                        <View style={styles.scoreCircle}>
                            <Text style={styles.scoreValue}>{analysisResults.overallScore}</Text>
                            <Text style={styles.scoreLabel}>SCORE</Text>
                        </View>
                        <View style={styles.scoreDetails}>
                            <Text style={styles.scoreTitle}>Very Good Form</Text>
                            <Text style={styles.scoreDescription}>
                                You're on track! Your shooting form shows good fundamentals with a few areas for improvement.
                            </Text>
                        </View>
                    </View>

                    {/* Video Comparison */}
                    <View style={styles.resultVideoContainer}>
                        <Text style={styles.resultSectionTitle}>Your Form vs Pro Form</Text>
                        <View style={styles.videoComparisonRow}>
                            <View style={styles.videoThumbnail}>
                                <View style={styles.videoFrame}>
                                    <Text style={styles.videoFrameText}>Your Form</Text>
                                    {capturedVideoData?.videoUri && (
                                        <Text style={styles.videoTimestamp}>
                                            {new Date(capturedVideoData.timestamp).toLocaleTimeString()}
                                        </Text>
                                    )}
                                </View>
                                <View style={styles.videoControls}>
                                    <TouchableOpacity 
                                        style={styles.videoControlButton}
                                        onPress={() => {
                                            if (capturedVideoData?.videoUri) {
                                                Alert.alert(
                                                    'Play Video', 
                                                    'Video playback functionality will be available soon!',
                                                    [
                                                        { text: 'OK' },
                                                        { 
                                                            text: 'View Details', 
                                                            onPress: () => console.log('Video URI:', capturedVideoData.videoUri)
                                                        }
                                                    ]
                                                );
                                            }
                                        }}
                                    >
                                        <Ionicons name="play" size={16} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.videoThumbnail}>
                                <View style={styles.videoFrame}>
                                    <Text style={styles.videoFrameText}>{selectedProModel.name}</Text>
                                </View>
                                <View style={styles.videoControls}>
                                    <TouchableOpacity style={styles.videoControlButton}>
                                        <Ionicons name="play" size={16} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Detailed Metrics */}
                    <View style={styles.metricsContainer}>
                        <Text style={styles.resultSectionTitle}>Detailed Analysis</Text>
                        <FlatList
                            data={analysisResults.metrics}
                            renderItem={renderMetricItem}
                            keyExtractor={item => item.id}
                            scrollEnabled={false}
                        />
                    </View>

                    {/* Improvement Suggestions */}
                    <View style={styles.improvementsContainer}>
                        <Text style={styles.resultSectionTitle}>Focus Areas</Text>
                        <View style={styles.improvementsList}>
                            {analysisResults.improvements.map((improvement, index) => (
                                <View key={`imp-${index}`} style={styles.improvementItem}>
                                    <View style={styles.improvementBullet}>
                                        <Text style={styles.improvementBulletText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.improvementText}>{improvement}</Text>
                                </View>
                            ))}
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

            {/* Pro Model Selection Modal */}
            <Modal
                visible={showProSelection}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowProSelection(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Pro Player</Text>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowProSelection(false)}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={PRO_MODELS}
                            renderItem={renderProModelItem}
                            keyExtractor={item => item.id}
                        />
                    </View>
                </View>
            </Modal>
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
        flex: 1,
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
});

export default ShootingAnalysisScreen;