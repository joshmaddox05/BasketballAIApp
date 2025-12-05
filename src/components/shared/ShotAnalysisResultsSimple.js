// ShotAnalysisResultsSimple.js - Player-friendly shot analysis with actionable feedback
import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
    ActivityIndicator
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { getScoreColor, getConfidenceTip } from '../../utils/shotAnalysisMapper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Actionable feedback messages for each metric based on status
const METRIC_FEEDBACK = {
    release_angle: {
        good: { message: "Great release angle!", tip: "Keep shooting with this same motion." },
        improve: { message: "Release could be higher", tip: "Try to release the ball at the top of your jump for better arc." },
        poor: { message: "Release angle needs work", tip: "Focus on getting more arc - aim for the ball to drop into the basket from above." }
    },
    elbow_flare: {
        good: { message: "Elbow nicely tucked!", tip: "Your alignment is creating a straight shot path." },
        improve: { message: "Elbow drifting outward", tip: "Practice keeping your elbow directly under the ball as you shoot." },
        poor: { message: "Elbow flaring out", tip: "Your elbow is causing the ball to curve. Try the 'Wall Elbow Slides' drill." }
    },
    knee_load: {
        good: { message: "Strong leg power!", tip: "You're generating good power from your legs." },
        improve: { message: "Could use more leg power", tip: "Bend your knees a bit more before shooting to add power." },
        poor: { message: "Not enough leg drive", tip: "Your shot is mostly arms. Bend deeper and push up through your legs." }
    },
    hip_shoulder_alignment: {
        good: { message: "Body well aligned!", tip: "Your shoulders and hips are square to the basket." },
        improve: { message: "Slight body rotation", tip: "Try to keep your shoulders square to the basket." },
        poor: { message: "Body twisting during shot", tip: "Face the basket directly and keep your core stable." }
    },
    base_width: {
        good: { message: "Stable stance!", tip: "Your feet are well positioned for balance." },
        improve: { message: "Stance slightly off", tip: "Position your feet about shoulder-width apart." },
        poor: { message: "Unstable base", tip: "Your stance is affecting your balance. Set feet shoulder-width, shooting foot slightly forward." }
    },
    lateral_sway: {
        good: { message: "Rock solid balance!", tip: "You're staying centered throughout your shot." },
        improve: { message: "Some side movement", tip: "Focus on going straight up and down." },
        poor: { message: "Too much lateral movement", tip: "You're drifting sideways. Practice shooting while focusing on landing in the same spot." }
    },
    arc_trajectory: {
        good: { message: "Beautiful arc!", tip: "Your shot has great trajectory into the basket." },
        improve: { message: "Arc could be higher", tip: "Aim for the ball to peak above the rim and drop in." },
        poor: { message: "Shot is too flat", tip: "Line drives are hard to make. Focus on 'shooting over the rim' for better arc." }
    }
};

// Get status label for display
const getStatusLabel = (status) => {
    switch(status) {
        case 'good': return 'Great';
        case 'improve': return 'Work on it';
        case 'poor': return 'Focus here';
        default: return 'Check';
    }
};

// Get status icon
const getStatusIcon = (status) => {
    switch(status) {
        case 'good': return 'checkmark-circle';
        case 'improve': return 'arrow-up-circle';
        case 'poor': return 'alert-circle';
        default: return 'help-circle';
    }
};

// Get status color
const getStatusColor = (status) => {
    switch(status) {
        case 'good': return '#10B981';
        case 'improve': return '#F59E0B';
        case 'poor': return '#EF4444';
        default: return '#6B7280';
    }
};

const ShotAnalysisResultsSimple = ({ results, onClose, onTryAgain }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [videoStatus, setVideoStatus] = useState({});
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const videoRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Extract data from results
    const score = results.overallScore || 0;
    const grade = results.grade || 'C';
    const confidence = results.confidence || 0.85;
    const metrics = results.metrics || [];
    const coachingCues = results.coachingCues || [];
    const visualizationUrl = results.visualizationVideoUrl;
    const improvements = results.improvements || [];

    // Build UI-friendly data
    const getVerdictFromScore = (score) => {
        if (score >= 90) return "Pure stroke! Keep stacking reps.";
        if (score >= 80) return "Game-ready form. Small tweaks left.";
        if (score >= 70) return "Solid base. Focus on consistency.";
        if (score >= 60) return "Good start. Keep practicing!";
        return "Let's work on the fundamentals.";
    };

    const mapConfidenceScore = (score) => {
        if (score >= 0.8) return 'High';
        if (score >= 0.6) return 'Medium';
        return 'Low';
    };

    const confidenceLabel = mapConfidenceScore(confidence);
    const scoreColor = getScoreColor(score);
    const confidenceTip = getConfidenceTip(confidenceLabel, []);

    // Group metrics by category for highlights
    const buildHighlights = () => {
        const getAvgStatus = (ids) => {
            const relevant = metrics.filter(m => ids.includes(m.id));
            if (relevant.length === 0) return 'ok';
            const goodCount = relevant.filter(m => m.status === 'good').length;
            const poorCount = relevant.filter(m => m.status === 'poor').length;
            if (goodCount === relevant.length) return 'good';
            if (poorCount > 0) return 'needs work';
            return 'ok';
        };

        return [
            { label: 'Base', emoji: '🦵', status: getAvgStatus(['knee_load', 'base_width', 'hip_shoulder_alignment']) },
            { label: 'Release', emoji: '🏀', status: getAvgStatus(['release_angle', 'arc_trajectory']) },
            { label: 'Control', emoji: '🎯', status: getAvgStatus(['lateral_sway', 'elbow_flare']) }
        ];
    };

    const highlights = buildHighlights();

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const getHighlightColor = (status) => {
        switch(status) {
            case 'good': return '#10B981';
            case 'ok': return '#F59E0B';
            case 'needs work': return '#EF4444';
            default: return '#6B7280';
        }
    };

    // Render visualization video section
    const renderVisualizationVideo = () => {
        if (!visualizationUrl) return null;

        return (
            <View style={styles.videoSection}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="videocam" size={20} color="#1F2937" />
                    <Text style={styles.sectionTitle}>Your Shot Analysis</Text>
                </View>
                <View style={styles.videoContainer}>
                    {isVideoLoading && (
                        <View style={styles.videoLoading}>
                            <ActivityIndicator size="large" color="#6366F1" />
                            <Text style={styles.videoLoadingText}>Loading analysis...</Text>
                        </View>
                    )}
                    <Video
                        ref={videoRef}
                        source={{ uri: visualizationUrl }}
                        style={styles.video}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping
                        onLoadStart={() => setIsVideoLoading(true)}
                        onLoad={() => setIsVideoLoading(false)}
                        onPlaybackStatusUpdate={status => setVideoStatus(status)}
                        onError={(error) => {
                            console.log('Video error:', error);
                            setIsVideoLoading(false);
                        }}
                    />
                </View>
                <Text style={styles.videoHint}>
                    Watch how the AI tracked your form throughout the shot
                </Text>
            </View>
        );
    };

    const renderSummaryCard = () => (
        <Animated.View
            style={[
                styles.summaryCard,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
        >
            <View style={styles.scoreSection}>
                <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                    <Text style={[styles.scoreValue, { color: scoreColor }]}>{score}</Text>
                    <Text style={styles.scoreLabel}>SHOT SCORE</Text>
                </View>
            </View>

            <Text style={styles.verdict}>{getVerdictFromScore(score)}</Text>

            <View style={styles.confidenceRow}>
                <View style={[
                    styles.confidenceBadge,
                    { backgroundColor: confidenceLabel === 'High' ? '#10B98120' :
                                     confidenceLabel === 'Medium' ? '#F59E0B20' : '#EF444420' }
                ]}>
                    <Ionicons
                        name="shield-checkmark"
                        size={14}
                        color={confidenceLabel === 'High' ? '#10B981' :
                               confidenceLabel === 'Medium' ? '#F59E0B' : '#EF4444'}
                    />
                    <Text style={[
                        styles.confidenceText,
                        { color: confidenceLabel === 'High' ? '#10B981' :
                                 confidenceLabel === 'Medium' ? '#F59E0B' : '#EF4444' }
                    ]}>
                        {confidenceLabel} Confidence
                    </Text>
                </View>
            </View>

            {confidenceTip && (
                <View style={styles.tipBanner}>
                    <Ionicons name="information-circle" size={16} color="#F59E0B" />
                    <Text style={styles.tipText}>{confidenceTip}</Text>
                </View>
            )}
        </Animated.View>
    );

    const renderHighlights = () => (
        <View style={styles.highlightsSection}>
            <Text style={styles.sectionSubtitle}>Quick Glance</Text>
            <View style={styles.highlightsRow}>
                {highlights.map((highlight, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.highlightChip,
                            { borderColor: getHighlightColor(highlight.status) }
                        ]}
                        onPress={() => setShowDetails(true)}
                    >
                        <Text style={styles.highlightEmoji}>{highlight.emoji}</Text>
                        <Text style={styles.highlightLabel}>{highlight.label}</Text>
                        <View style={[
                            styles.highlightDot,
                            { backgroundColor: getHighlightColor(highlight.status) }
                        ]} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    // Render coaching cues with full drill info
    const renderKeyFixes = () => {
        const topCues = coachingCues.slice(0, 3);

        if (topCues.length === 0) return null;

        return (
            <View style={styles.keyFixesSection}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="bulb" size={20} color="#1F2937" />
                    <Text style={styles.sectionTitle}>Your Top Fixes</Text>
                </View>

                {topCues.map((cue, index) => (
                    <View key={index} style={styles.cueCard}>
                        <View style={styles.cueHeader}>
                            <View style={[
                                styles.cuePriority,
                                { backgroundColor: index === 0 ? '#EF4444' : index === 1 ? '#F59E0B' : '#10B981' }
                            ]}>
                                <Text style={styles.cuePriorityText}>#{index + 1}</Text>
                            </View>
                            <Text style={styles.cueText}>{cue.cue || cue.title}</Text>
                        </View>

                        {cue.description && (
                            <Text style={styles.cueWhy}>{cue.description}</Text>
                        )}

                        {cue.drill && (
                            <View style={styles.drillCard}>
                                <View style={styles.drillHeader}>
                                    <Ionicons name="fitness" size={16} color="#6366F1" />
                                    <Text style={styles.drillName}>{cue.drill}</Text>
                                </View>
                                {cue.drillDescription && (
                                    <Text style={styles.drillDescription}>{cue.drillDescription}</Text>
                                )}
                            </View>
                        )}

                        {cue.visualCue && (
                            <View style={styles.visualCueRow}>
                                <Ionicons name="eye" size={14} color="#6B7280" />
                                <Text style={styles.visualCueText}>{cue.visualCue}</Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>
        );
    };

    // Render actionable metric cards (no raw numbers)
    const renderMetricCards = () => {
        if (!showDetails) return null;

        return (
            <View style={styles.metricsSection}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="body" size={20} color="#1F2937" />
                    <Text style={styles.sectionTitle}>Form Breakdown</Text>
                </View>

                {metrics.map((metric) => {
                    const feedback = METRIC_FEEDBACK[metric.id] || {};
                    const statusFeedback = feedback[metric.status] || { message: metric.feedback, tip: '' };
                    const statusColor = getStatusColor(metric.status);
                    const statusIcon = getStatusIcon(metric.status);
                    const statusLabel = getStatusLabel(metric.status);

                    return (
                        <View key={metric.id} style={styles.metricCard}>
                            <View style={styles.metricHeader}>
                                <View style={styles.metricTitleRow}>
                                    <View style={[styles.metricIcon, { backgroundColor: statusColor + '20' }]}>
                                        <Ionicons name={statusIcon} size={18} color={statusColor} />
                                    </View>
                                    <View style={styles.metricTitleContainer}>
                                        <Text style={styles.metricLabel}>{metric.name}</Text>
                                        <Text style={[styles.metricStatus, { color: statusColor }]}>
                                            {statusLabel}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.metricMessage}>{statusFeedback.message}</Text>

                            {statusFeedback.tip && metric.status !== 'good' && (
                                <View style={styles.metricTipBox}>
                                    <Ionicons name="bulb-outline" size={16} color="#6366F1" />
                                    <Text style={styles.metricTipText}>{statusFeedback.tip}</Text>
                                </View>
                            )}

                            {/* Progress indicator */}
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${Math.min(metric.score * 10, 100)}%`,
                                                backgroundColor: statusColor
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    // Render strengths section
    const renderStrengths = () => {
        const goodMetrics = metrics.filter(m => m.status === 'good');
        if (goodMetrics.length === 0) return null;

        return (
            <View style={styles.strengthsSection}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="trophy" size={20} color="#10B981" />
                    <Text style={styles.sectionTitle}>What You're Doing Well</Text>
                </View>
                <View style={styles.strengthsList}>
                    {goodMetrics.map((metric) => (
                        <View key={metric.id} style={styles.strengthItem}>
                            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                            <Text style={styles.strengthText}>{metric.name}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={26} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Shot Analysis</Text>
                <TouchableOpacity onPress={onTryAgain} style={styles.retryButton}>
                    <Ionicons name="refresh" size={22} color="#6366F1" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                {renderSummaryCard()}
                {renderVisualizationVideo()}
                {renderHighlights()}
                {renderStrengths()}
                {renderKeyFixes()}

                <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => setShowDetails(!showDetails)}
                >
                    <Text style={styles.toggleButtonText}>
                        {showDetails ? 'Hide' : 'See'} Full Breakdown
                    </Text>
                    <Ionicons
                        name={showDetails ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#6366F1"
                    />
                </TouchableOpacity>

                {renderMetricCards()}

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.retryFullButton}
                        onPress={onTryAgain}
                    >
                        <Ionicons name="refresh" size={18} color="#6366F1" />
                        <Text style={styles.retryFullButtonText}>New Analysis</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={onClose}
                    >
                        <Text style={styles.saveButtonText}>Save & Exit</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    retryButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    // Video Section
    videoSection: {
        marginBottom: 20,
    },
    videoContainer: {
        backgroundColor: '#000',
        borderRadius: 16,
        overflow: 'hidden',
        aspectRatio: 16 / 9,
        position: 'relative',
    },
    video: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    videoLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1F2937',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    videoLoadingText: {
        color: '#9CA3AF',
        fontSize: 14,
        marginTop: 12,
    },
    videoHint: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
    },
    // Summary Card
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    scoreSection: {
        marginBottom: 16,
    },
    scoreCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
    },
    scoreValue: {
        fontSize: 44,
        fontWeight: '800',
        marginBottom: 4,
    },
    scoreLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 0.5,
    },
    verdict: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 12,
    },
    confidenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    confidenceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    confidenceText: {
        fontSize: 13,
        fontWeight: '600',
    },
    tipBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 8,
        gap: 8,
    },
    tipText: {
        flex: 1,
        fontSize: 12,
        color: '#92400E',
        lineHeight: 16,
    },
    // Highlights
    highlightsSection: {
        marginBottom: 16,
    },
    sectionSubtitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 12,
    },
    highlightsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    highlightChip: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        padding: 12,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    highlightEmoji: {
        fontSize: 24,
        marginBottom: 6,
    },
    highlightLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
    },
    highlightDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    // Strengths
    strengthsSection: {
        backgroundColor: '#ECFDF5',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    strengthsList: {
        gap: 8,
    },
    strengthItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    strengthText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#065F46',
    },
    // Key Fixes
    keyFixesSection: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    cueCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    cueHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cuePriority: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cuePriorityText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    cueText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        lineHeight: 20,
    },
    cueWhy: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 12,
        lineHeight: 20,
        marginLeft: 40,
    },
    drillCard: {
        backgroundColor: '#EEF2FF',
        borderRadius: 10,
        padding: 12,
        marginLeft: 40,
        marginBottom: 8,
    },
    drillHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    drillName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4F46E5',
    },
    drillDescription: {
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
    },
    visualCueRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginLeft: 40,
        marginTop: 4,
    },
    visualCueText: {
        flex: 1,
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    // Toggle Button
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    toggleButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366F1',
    },
    // Metrics Section
    metricsSection: {
        marginBottom: 16,
    },
    metricCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    metricHeader: {
        marginBottom: 10,
    },
    metricTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metricIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    metricTitleContainer: {
        flex: 1,
    },
    metricLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    metricStatus: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    metricMessage: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
        marginBottom: 8,
    },
    metricTipBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#EEF2FF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
    },
    metricTipText: {
        flex: 1,
        fontSize: 13,
        color: '#4338CA',
        lineHeight: 18,
    },
    progressContainer: {
        marginTop: 4,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    // Action Buttons
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    retryFullButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#6366F1',
        gap: 6,
    },
    retryFullButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6366F1',
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#6366F1',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});

export default ShotAnalysisResultsSimple;
