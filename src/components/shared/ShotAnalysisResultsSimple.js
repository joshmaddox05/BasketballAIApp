// ShotAnalysisResultsSimple.js - HS/College friendly shot analysis results with progressive disclosure
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
import { mapAnalysisToUI, getDrillDetails, getScoreColor, getConfidenceTip } from '../../utils/shotAnalysisMapper';

const { width } = Dimensions.get('window');

const ShotAnalysisResultsSimple = ({ results, onClose, onTryAgain, history = [] }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    
    // Map API results to UI model
    const uiModel = mapAnalysisToUI(results, history);
    
    useEffect(() => {
        // Entrance animation
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
    
    const scoreColor = getScoreColor(uiModel.score);
    const confidenceTip = getConfidenceTip(uiModel.confidence, uiModel.warnings);
    
    const getHighlightColor = (status) => {
        switch(status) {
            case 'good': return '#10B981';
            case 'ok': return '#F59E0B';
            case 'needs work': return '#EF4444';
            default: return '#6B7280';
        }
    };
    
    const renderSummaryCard = () => (
        <Animated.View 
            style={[
                styles.summaryCard,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
        >
            {/* Score Circle */}
            <View style={styles.scoreSection}>
                <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                    <Text style={[styles.scoreValue, { color: scoreColor }]}>
                        {uiModel.score}
                    </Text>
                    <Text style={styles.scoreLabel}>SHOT SCORE</Text>
                </View>
            </View>
            
            {/* Verdict */}
            <Text style={styles.verdict}>{uiModel.verdict}</Text>
            
            {/* Confidence Badge */}
            <View style={styles.confidenceRow}>
                <View style={[
                    styles.confidenceBadge,
                    { 
                        backgroundColor: uiModel.confidence === 'High' ? '#10B98120' : 
                                       uiModel.confidence === 'Medium' ? '#F59E0B20' : '#EF444420'
                    }
                ]}>
                    <Ionicons 
                        name="shield-checkmark" 
                        size={14} 
                        color={uiModel.confidence === 'High' ? '#10B981' : 
                               uiModel.confidence === 'Medium' ? '#F59E0B' : '#EF4444'} 
                    />
                    <Text style={[
                        styles.confidenceText,
                        { 
                            color: uiModel.confidence === 'High' ? '#10B981' : 
                                   uiModel.confidence === 'Medium' ? '#F59E0B' : '#EF4444'
                        }
                    ]}>
                        {uiModel.confidence} Confidence
                    </Text>
                </View>
            </View>
            
            {/* Low confidence tip */}
            {confidenceTip && (
                <View style={styles.tipBanner}>
                    <Ionicons name="information-circle" size={16} color="#F59E0B" />
                    <Text style={styles.tipText}>{confidenceTip}</Text>
                </View>
            )}
            
            {/* Badges */}
            {uiModel.badges.length > 0 && (
                <View style={styles.badgesRow}>
                    {uiModel.badges.map((badge, index) => (
                        <View key={badge.id} style={styles.badge}>
                            <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                            <Text style={styles.badgeName}>{badge.name}</Text>
                        </View>
                    ))}
                </View>
            )}
        </Animated.View>
    );
    
    const renderKeyFixes = () => (
        <View style={styles.keyFixesSection}>
            <View style={styles.sectionHeader}>
                <Ionicons name="construct" size={20} color="#1F2937" />
                <Text style={styles.sectionTitle}>Your Top 3 Fixes</Text>
            </View>
            
            {uiModel.topCues.map((cue, index) => (
                <View key={index} style={styles.cueCard}>
                    <View style={styles.cueHeader}>
                        <View style={[
                            styles.cuePriority,
                            { backgroundColor: index === 0 ? '#EF4444' : index === 1 ? '#F59E0B' : '#10B981' }
                        ]}>
                            <Text style={styles.cuePriorityText}>#{cue.priority}</Text>
                        </View>
                        <Text style={styles.cueText}>{cue.shortCue}</Text>
                    </View>
                    
                    {cue.why && showDetails && (
                        <Text style={styles.cueWhy}>{cue.why}</Text>
                    )}
                    
                    {cue.drill && (
                        <TouchableOpacity style={styles.drillButton}>
                            <Ionicons name="play-circle" size={16} color="#6366F1" />
                            <Text style={styles.drillButtonText}>
                                Try: {cue.drill.name} ({cue.drill.duration})
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            ))}
        </View>
    );
    
    const renderHighlights = () => (
        <View style={styles.highlightsSection}>
            <Text style={styles.sectionSubtitle}>Quick Glance</Text>
            <View style={styles.highlightsRow}>
                {uiModel.highlights.map((highlight, index) => (
                    <TouchableOpacity 
                        key={index}
                        style={[
                            styles.highlightChip,
                            { borderColor: getHighlightColor(highlight.status) }
                        ]}
                        onPress={() => setShowDetails(!showDetails)}
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
    
    const renderMetricCards = () => {
        if (!showDetails) return null;
        
        return (
            <View style={styles.metricsSection}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="analytics" size={20} color="#1F2937" />
                    <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
                </View>
                
                {uiModel.metrics.map((metric, index) => (
                    <View key={metric.id} style={styles.metricCard}>
                        <View style={styles.metricHeader}>
                            <Text style={styles.metricLabel}>{metric.label}</Text>
                            <View style={[
                                styles.metricGrade,
                                { backgroundColor: metric.gradeColor + '20' }
                            ]}>
                                <Text style={[
                                    styles.metricGradeText,
                                    { color: metric.gradeColor }
                                ]}>
                                    {metric.grade}
                                </Text>
                            </View>
                        </View>
                        
                        {/* Value Display */}
                        <View style={styles.metricValueRow}>
                            <View>
                                <Text style={styles.metricValueLabel}>Your Value</Text>
                                <Text style={styles.metricValue}>
                                    {metric.value}{metric.units}
                                </Text>
                            </View>
                            <View style={styles.metricArrow}>
                                <Ionicons 
                                    name={Math.abs(metric.delta) < 5 ? "checkmark-circle" : "arrow-forward"}
                                    size={20} 
                                    color="#9CA3AF" 
                                />
                            </View>
                            <View>
                                <Text style={styles.metricValueLabel}>Target</Text>
                                <Text style={styles.metricTarget}>{metric.target}</Text>
                            </View>
                        </View>
                        
                        {/* Gauge Bar */}
                        <View style={styles.gaugeContainer}>
                            <View style={styles.gaugeBar}>
                                <View 
                                    style={[
                                        styles.gaugeTargetBand,
                                        { left: '30%', width: '40%' }
                                    ]} 
                                />
                                <View 
                                    style={[
                                        styles.gaugeMarker,
                                        { 
                                            left: `${Math.min(Math.max(metric.delta + 50, 0), 100)}%`,
                                            backgroundColor: metric.gradeColor
                                        }
                                    ]} 
                                />
                            </View>
                        </View>
                        
                        {/* Why */}
                        <View style={styles.metricWhy}>
                            <Ionicons name="information-circle" size={14} color="#6366F1" />
                            <Text style={styles.metricWhyText}>{metric.why}</Text>
                        </View>
                        
                        {/* Drill CTA */}
                        {metric.drill && (
                            <TouchableOpacity 
                                style={styles.metricDrillButton}
                                onPress={() => {
                                    const drill = getDrillDetails(metric.drill);
                                    if (drill) {
                                        // Open drill modal/screen
                                        console.log('Open drill:', drill);
                                    }
                                }}
                            >
                                <Ionicons name="fitness" size={16} color="#fff" />
                                <Text style={styles.metricDrillText}>
                                    Try: {getDrillDetails(metric.drill)?.name || 'Practice Drill'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </View>
        );
    };
    
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={26} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Shot Analysis</Text>
                <TouchableOpacity onPress={onTryAgain} style={styles.retryButton}>
                    <Ionicons name="refresh" size={22} color="#6366F1" />
                </TouchableOpacity>
            </View>
            
            {/* Content */}
            <ScrollView 
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                {renderSummaryCard()}
                {renderHighlights()}
                {renderKeyFixes()}
                
                {/* Toggle Details */}
                <TouchableOpacity 
                    style={styles.toggleButton}
                    onPress={() => setShowDetails(!showDetails)}
                >
                    <Text style={styles.toggleButtonText}>
                        {showDetails ? 'Hide' : 'See'} Details
                    </Text>
                    <Ionicons 
                        name={showDetails ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#6366F1" 
                    />
                </TouchableOpacity>
                
                {renderMetricCards()}
                
                {/* Action Buttons */}
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
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
        justifyContent: 'center',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    badgeEmoji: {
        fontSize: 16,
    },
    badgeName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4F46E5',
    },
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
        padding: 14,
        marginBottom: 10,
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
        alignItems: 'center',
        marginBottom: 8,
    },
    cuePriority: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    cuePriorityText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    cueText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        lineHeight: 18,
    },
    cueWhy: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 8,
        lineHeight: 18,
    },
    drillButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
        alignSelf: 'flex-start',
    },
    drillButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4F46E5',
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    metricLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    metricGrade: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricGradeText: {
        fontSize: 18,
        fontWeight: '800',
    },
    metricValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    metricValueLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        marginBottom: 4,
        fontWeight: '600',
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    metricArrow: {
        paddingHorizontal: 12,
    },
    metricTarget: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6366F1',
    },
    gaugeContainer: {
        marginBottom: 12,
    },
    gaugeBar: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        position: 'relative',
        overflow: 'visible',
    },
    gaugeTargetBand: {
        position: 'absolute',
        height: 8,
        backgroundColor: '#10B98140',
        borderRadius: 4,
    },
    gaugeMarker: {
        position: 'absolute',
        width: 4,
        height: 16,
        top: -4,
        borderRadius: 2,
        marginLeft: -2,
    },
    metricWhy: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F9FAFB',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        gap: 6,
    },
    metricWhyText: {
        flex: 1,
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 16,
    },
    metricDrillButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366F1',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    metricDrillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
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
