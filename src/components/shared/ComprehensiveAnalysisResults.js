// ComprehensiveAnalysisResults.js - Display comprehensive shot analysis with phases, biomechanics, and NBA comparison
import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ComprehensiveAnalysisResults = ({ results, onClose, onTryAgain }) => {
    const [activeTab, setActiveTab] = useState('overview'); // overview, phases, metrics, coaching
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const getScoreColor = (score) => {
        if (score >= 85) return '#10B981'; // Green
        if (score >= 70) return '#F59E0B'; // Amber
        if (score >= 50) return '#F97316'; // Orange
        return '#EF4444'; // Red
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'good':
                return 'checkmark-circle';
            case 'improve':
                return 'alert-circle';
            default:
                return 'information-circle';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'good':
                return '#10B981';
            case 'improve':
                return '#F59E0B';
            default:
                return '#6B7280';
        }
    };

    const renderOverviewTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {/* Overall Score Card */}
            <View style={styles.scoreCard}>
                <LinearGradient
                    colors={[getScoreColor(results.overallScore), getScoreColor(results.overallScore) + '90']}
                    style={styles.scoreGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.scoreLabel}>Overall Score</Text>
                    <Text style={styles.scoreValue}>{results.overallScore}</Text>
                    <Text style={styles.scoreSubtext}>out of 100</Text>
                    <View style={styles.confidenceBadge}>
                        <Ionicons name="shield-checkmark" size={14} color="#fff" />
                        <Text style={styles.confidenceText}>
                            {Math.round(results.confidence * 100)}% Confidence
                        </Text>
                    </View>
                </LinearGradient>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStatsRow}>
                <View style={styles.quickStatCard}>
                    <Ionicons name="timer-outline" size={24} color="#6366F1" />
                    <Text style={styles.quickStatValue}>
                        {results.phases?.release?.timestamp_ms ? 
                            `${(results.phases.release.timestamp_ms / 1000).toFixed(2)}s` : 
                            'N/A'}
                    </Text>
                    <Text style={styles.quickStatLabel}>Release Time</Text>
                </View>
                <View style={styles.quickStatCard}>
                    <Ionicons name="analytics-outline" size={24} color="#8B5CF6" />
                    <Text style={styles.quickStatValue}>{results.metrics?.length || 0}</Text>
                    <Text style={styles.quickStatLabel}>Metrics Tracked</Text>
                </View>
                <View style={styles.quickStatCard}>
                    <Ionicons name="trophy-outline" size={24} color="#F59E0B" />
                    <Text style={styles.quickStatValue}>
                        {results.metrics?.length || 0}
                    </Text>
                    <Text style={styles.quickStatLabel}>Areas Analyzed</Text>
                </View>
            </View>

            {/* Top Coaching Cues Preview */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Priority</Text>
                {results.coachingCues && results.coachingCues.length > 0 ? (
                    <View style={styles.priorityCueCard}>
                        <View style={styles.priorityBadge}>
                            <Text style={styles.priorityText}>#{results.coachingCues[0].priority}</Text>
                        </View>
                        <View style={styles.priorityCueContent}>
                            <Text style={styles.priorityCueTitle}>{results.coachingCues[0].title}</Text>
                            <Text style={styles.priorityCueDescription}>
                                {results.coachingCues[0].description}
                            </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={20} color="#6366F1" />
                    </View>
                ) : (
                    <Text style={styles.noDataText}>No coaching cues available</Text>
                )}
            </View>

            {/* Phase Summary */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Shot Phases Detected</Text>
                <View style={styles.phasesGrid}>
                    {renderPhaseIndicator('Dip', results.phases?.dip)}
                    {renderPhaseIndicator('Load', results.phases?.load)}
                    {renderPhaseIndicator('Release', results.phases?.release)}
                    {renderPhaseIndicator('Follow', results.phases?.follow_through)}
                </View>
            </View>
        </ScrollView>
    );

    const renderPhaseIndicator = (name, phase) => {
        const detected = phase?.detected || false;
        const quality = phase?.quality_score || 0;
        
        return (
            <View style={styles.phaseIndicator}>
                <Ionicons 
                    name={detected ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={detected ? '#10B981' : '#EF4444'} 
                />
                <Text style={styles.phaseName}>{name}</Text>
                {detected && (
                    <View style={styles.qualityBadge}>
                        <Text style={styles.qualityText}>{quality.toFixed(1)}</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderPhasesTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.tabDescription}>
                Your shot broken down into biomechanical phases
            </Text>
            
            {results.phases && Object.entries(results.phases).map(([phaseName, phaseData], index) => (
                <View key={phaseName} style={styles.phaseCard}>
                    <View style={styles.phaseHeader}>
                        <View style={styles.phaseIconContainer}>
                            <Ionicons 
                                name={phaseData.detected ? "checkmark-circle" : "close-circle"} 
                                size={28} 
                                color={phaseData.detected ? '#10B981' : '#EF4444'} 
                            />
                        </View>
                        <View style={styles.phaseInfo}>
                            <Text style={styles.phaseTitle}>{formatPhaseName(phaseName)}</Text>
                            <Text style={styles.phaseStatus}>
                                {phaseData.detected ? 'Detected' : 'Not Detected'}
                            </Text>
                        </View>
                        {phaseData.quality_score && (
                            <View style={styles.phaseScoreContainer}>
                                <Text style={styles.phaseScoreValue}>
                                    {phaseData.quality_score.toFixed(1)}
                                </Text>
                                <Text style={styles.phaseScoreLabel}>/ 10</Text>
                            </View>
                        )}
                    </View>
                    
                    {phaseData.detected && (
                        <View style={styles.phaseDetails}>
                            {phaseData.duration_ms && (
                                <View style={styles.phaseDetailRow}>
                                    <Ionicons name="timer-outline" size={16} color="#6B7280" />
                                    <Text style={styles.phaseDetailText}>
                                        Duration: {phaseData.duration_ms}ms
                                    </Text>
                                </View>
                            )}
                            {phaseData.timestamp_ms && (
                                <View style={styles.phaseDetailRow}>
                                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                                    <Text style={styles.phaseDetailText}>
                                        At: {(phaseData.timestamp_ms / 1000).toFixed(2)}s
                                    </Text>
                                </View>
                            )}
                            {phaseData.start_frame && phaseData.end_frame && (
                                <View style={styles.phaseDetailRow}>
                                    <Ionicons name="film-outline" size={16} color="#6B7280" />
                                    <Text style={styles.phaseDetailText}>
                                        Frames: {phaseData.start_frame} - {phaseData.end_frame}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            ))}
        </ScrollView>
    );

    const renderMetricsTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.tabDescription}>
                7 core biomechanical metrics with quality scoring
            </Text>
            
            {results.metrics && results.metrics.map((metric, index) => (
                <View key={metric.id} style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                        <View>
                            <Text style={styles.metricName}>{metric.name}</Text>
                            <View style={styles.metricValueRow}>
                                <Text style={styles.metricValue}>{metric.value}</Text>
                                {metric.unit && <Text style={styles.metricUnit}>{metric.unit}</Text>}
                            </View>
                        </View>
                        <View style={styles.metricScoreContainer}>
                            <View style={[
                                styles.metricScoreCircle,
                                { backgroundColor: getScoreColor(metric.quality_score * 10) }
                            ]}>
                                <Text style={styles.metricScoreText}>
                                    {metric.quality_score.toFixed(1)}
                                </Text>
                            </View>
                            <Ionicons 
                                name={getStatusIcon(metric.status)} 
                                size={20} 
                                color={getStatusColor(metric.status)}
                                style={styles.metricStatusIcon}
                            />
                        </View>
                    </View>
                    
                    {/* Baseline Comparison */}
                    <View style={styles.metricComparison}>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Your Value:</Text>
                            <Text style={styles.comparisonValue}>
                                {metric.value}{metric.unit}
                            </Text>
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Optimal Range:</Text>
                            <Text style={styles.comparisonValue}>
                                {metric.optimal_range || '45-55°'}
                            </Text>
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Status:</Text>
                            <Text style={[
                                styles.comparisonValue,
                                { color: metric.status === 'good' ? '#10B981' : metric.status === 'improve' ? '#F59E0B' : '#EF4444' }
                            ]}>
                                {metric.status === 'good' ? 'Good' : metric.status === 'improve' ? 'Needs Work' : 'Poor'}
                            </Text>
                        </View>
                    </View>
                    
                    {/* Progress Bar */}
                    <View style={styles.metricProgressContainer}>
                        <View style={styles.metricProgressBar}>
                            <View 
                                style={[
                                    styles.metricProgressFill,
                                    { 
                                        width: `${metric.quality_score * 10}%`,
                                        backgroundColor: getScoreColor(metric.quality_score * 10)
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.metricProgressText}>
                            {Math.round(metric.quality_score * 10)}%
                        </Text>
                    </View>
                    
                    {/* Feedback */}
                    <View style={styles.metricFeedback}>
                        <Ionicons name="bulb-outline" size={16} color="#6366F1" />
                        <Text style={styles.metricFeedbackText}>{metric.feedback}</Text>
                    </View>
                </View>
            ))}
        </ScrollView>
    );

    // Removed renderComparisonTab - no longer comparing to NBA players

    const renderCoachingTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.tabDescription}>
                Prioritized coaching recommendations based on your analysis
            </Text>
            
            {results.coachingCues && results.coachingCues.map((cue, index) => (
                <View key={index} style={styles.coachingCard}>
                    <View style={styles.coachingHeader}>
                        <View style={[
                            styles.coachingPriorityBadge,
                            { backgroundColor: cue.priority === 1 ? '#EF4444' : cue.priority === 2 ? '#F59E0B' : '#10B981' }
                        ]}>
                            <Text style={styles.coachingPriorityText}>#{cue.priority}</Text>
                        </View>
                        <View style={styles.coachingImpactBadge}>
                            <Text style={styles.coachingImpactText}>
                                {cue.impact.toUpperCase()} IMPACT
                            </Text>
                        </View>
                    </View>
                    
                    <Text style={styles.coachingTitle}>{cue.title}</Text>
                    <Text style={styles.coachingDescription}>{cue.description}</Text>
                    
                    {cue.drill && (
                        <View style={styles.drillContainer}>
                            <View style={styles.drillHeader}>
                                <Ionicons name="basketball-outline" size={18} color="#6366F1" />
                                <Text style={styles.drillLabel}>Recommended Drill</Text>
                            </View>
                            <Text style={styles.drillText}>{cue.drill}</Text>
                        </View>
                    )}
                </View>
            ))}
        </ScrollView>
    );

    const formatPhaseName = (name) => {
        return name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <Animated.View 
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }
            ]}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Shot Analysis</Text>
                <TouchableOpacity onPress={onTryAgain} style={styles.retryButton}>
                    <Ionicons name="refresh" size={24} color="#6366F1" />
                </TouchableOpacity>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabBar}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
                    onPress={() => setActiveTab('overview')}
                >
                    <Ionicons 
                        name="speedometer-outline" 
                        size={20} 
                        color={activeTab === 'overview' ? '#6366F1' : '#9CA3AF'} 
                    />
                    <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
                        Overview
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'phases' && styles.activeTab]}
                    onPress={() => setActiveTab('phases')}
                >
                    <Ionicons 
                        name="stats-chart-outline" 
                        size={20} 
                        color={activeTab === 'phases' ? '#6366F1' : '#9CA3AF'} 
                    />
                    <Text style={[styles.tabText, activeTab === 'phases' && styles.activeTabText]}>
                        Phases
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'metrics' && styles.activeTab]}
                    onPress={() => setActiveTab('metrics')}
                >
                    <Ionicons 
                        name="analytics-outline" 
                        size={20} 
                        color={activeTab === 'metrics' ? '#6366F1' : '#9CA3AF'} 
                    />
                    <Text style={[styles.tabText, activeTab === 'metrics' && styles.activeTabText]}>
                        Metrics
                    </Text>
                </TouchableOpacity>
                
                {/* Removed NBA comparison tab */}
                
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'coaching' && styles.activeTab]}
                    onPress={() => setActiveTab('coaching')}
                >
                    <Ionicons 
                        name="trophy-outline" 
                        size={20} 
                        color={activeTab === 'coaching' ? '#6366F1' : '#9CA3AF'} 
                    />
                    <Text style={[styles.tabText, activeTab === 'coaching' && styles.activeTabText]}>
                        Coach
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'phases' && renderPhasesTab()}
            {activeTab === 'metrics' && renderMetricsTab()}
            {activeTab === 'coaching' && renderCoachingTab()}
        </Animated.View>
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
        paddingBottom: 20,
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
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    retryButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#EEF2FF',
    },
    tabText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9CA3AF',
        marginTop: 4,
    },
    activeTabText: {
        color: '#6366F1',
    },
    tabContent: {
        flex: 1,
        padding: 20,
    },
    tabDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
        textAlign: 'center',
    },
    scoreCard: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    scoreGradient: {
        padding: 30,
        alignItems: 'center',
    },
    scoreLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        opacity: 0.9,
        marginBottom: 8,
    },
    scoreValue: {
        fontSize: 64,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    scoreSubtext: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.8,
    },
    confidenceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
    },
    confidenceText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 6,
    },
    quickStatsRow: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
    },
    quickStatCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    quickStatValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 8,
    },
    quickStatLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 4,
        textAlign: 'center',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
    },
    priorityCueCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#6366F1',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    priorityBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    priorityText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
    priorityCueContent: {
        flex: 1,
    },
    priorityCueTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    priorityCueDescription: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    phasesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    phaseIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    phaseName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
    },
    qualityBadge: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    qualityText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6366F1',
    },
    phaseCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    phaseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    phaseIconContainer: {
        marginRight: 12,
    },
    phaseInfo: {
        flex: 1,
    },
    phaseTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    phaseStatus: {
        fontSize: 13,
        color: '#6B7280',
    },
    phaseScoreContainer: {
        alignItems: 'center',
    },
    phaseScoreValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#6366F1',
    },
    phaseScoreLabel: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    phaseDetails: {
        gap: 8,
    },
    phaseDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    phaseDetailText: {
        fontSize: 13,
        color: '#6B7280',
    },
    metricCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    metricName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    metricValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#6366F1',
    },
    metricUnit: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9CA3AF',
        marginLeft: 4,
    },
    metricScoreContainer: {
        alignItems: 'center',
    },
    metricScoreCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    metricScoreText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    metricStatusIcon: {
        marginTop: 2,
    },
    metricComparison: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    comparisonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    comparisonLabel: {
        fontSize: 13,
        color: '#6B7280',
    },
    comparisonValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
    },
    metricProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    metricProgressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
        marginRight: 12,
    },
    metricProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    metricProgressText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        minWidth: 35,
        textAlign: 'right',
    },
    metricFeedback: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#EEF2FF',
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    metricFeedbackText: {
        flex: 1,
        fontSize: 13,
        color: '#4F46E5',
        lineHeight: 18,
    },
    // Removed NBA player card and comparison styles
    coachingCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    coachingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    coachingPriorityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    coachingPriorityText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    coachingImpactBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    coachingImpactText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
    },
    coachingTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    coachingDescription: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 12,
    },
    drillContainer: {
        backgroundColor: '#EEF2FF',
        borderRadius: 12,
        padding: 12,
    },
    drillHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    drillLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4F46E5',
        textTransform: 'uppercase',
    },
    drillText: {
        fontSize: 13,
        color: '#4F46E5',
        lineHeight: 18,
    },
    noDataContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    noDataText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
});

export default ComprehensiveAnalysisResults;
