// ShotComparisonResults.js - Display shot comparison with side-by-side videos
import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Animated,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

const { width } = Dimensions.get('window');

const ShotComparisonResults = ({ results, onClose, onTryAgain }) => {
    const [activeTab, setActiveTab] = useState('videos'); // videos, metrics, recommendations
    const [isLoadingVideos, setIsLoadingVideos] = useState(true);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Get video URLs with fallback
    const userVideoUrl = results.videos?.userVideo || results.videos?.user_video;
    const baselineVideoUrl = results.videos?.baselineVideo || results.videos?.baseline_video;

    // Log video URLs for debugging
    useEffect(() => {
        console.log('🎬 ShotComparisonResults mounted with videos:', {
            userVideo: userVideoUrl,
            baselineVideo: baselineVideoUrl,
            hasUserVideo: !!userVideoUrl,
            hasBaselineVideo: !!baselineVideoUrl
        });
    }, [userVideoUrl, baselineVideoUrl]);

    // Video players - only create if we have valid URLs
    const userVideoPlayer = useVideoPlayer(
        userVideoUrl ? userVideoUrl : null,
        (player) => {
            if (player && userVideoUrl) {
                player.loop = true;
                player.muted = false;
                console.log('✅ User video player initialized with URI:', userVideoUrl);
            }
        }
    );

    const baselineVideoPlayer = useVideoPlayer(
        baselineVideoUrl ? baselineVideoUrl : null,
        (player) => {
            if (player && baselineVideoUrl) {
                player.loop = true;
                player.muted = false;
                console.log('✅ Baseline video player initialized with URI:', baselineVideoUrl);
            }
        }
    );

    const [isPlayingUser, setIsPlayingUser] = useState(false);
    const [isPlayingBaseline, setIsPlayingBaseline] = useState(false);

    useEffect(() => {
        // Entrance animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        // Check if videos are available
        const hasVideos = !!userVideoUrl && !!baselineVideoUrl;

        if (hasVideos) {
            console.log('✅ Videos available, setting loading to false after delay');
            // Give players time to initialize
            const loadingTimer = setTimeout(() => {
                console.log('⏱️ Loading timer complete, showing videos');
                setIsLoadingVideos(false);
            }, 1500);

            return () => clearTimeout(loadingTimer);
        } else {
            console.warn('⚠️ Video URLs not found in results:', {
                userVideoUrl,
                baselineVideoUrl,
                fullResults: results.videos
            });
            setIsLoadingVideos(false);
        }
    }, [userVideoUrl, baselineVideoUrl]);

    // Video playback controls
    const handlePlayUser = () => {
        if (isPlayingUser) {
            userVideoPlayer.pause();
        } else {
            userVideoPlayer.play();
        }
        setIsPlayingUser(!isPlayingUser);
    };

    const handlePlayBaseline = () => {
        if (isPlayingBaseline) {
            baselineVideoPlayer.pause();
        } else {
            baselineVideoPlayer.play();
        }
        setIsPlayingBaseline(!isPlayingBaseline);
    };

    const handlePlayBoth = () => {
        if (isPlayingUser && isPlayingBaseline) {
            userVideoPlayer.pause();
            baselineVideoPlayer.pause();
            setIsPlayingUser(false);
            setIsPlayingBaseline(false);
        } else {
            userVideoPlayer.play();
            baselineVideoPlayer.play();
            setIsPlayingUser(true);
            setIsPlayingBaseline(true);
        }
    };

    const getGradeColor = (grade) => {
        switch(grade) {
            case 'A': return '#10B981';
            case 'B': return '#3B82F6';
            case 'C': return '#F59E0B';
            case 'D': return '#F97316';
            case 'F': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'excellent': return '#10B981';
            case 'good': return '#3B82F6';
            case 'needs_work': return '#F59E0B';
            case 'poor': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Shot Comparison</Text>
                <Text style={styles.headerSubtitle}>You vs {results.baselinePlayer}</Text>
            </View>
            <View style={styles.scoreCircle}>
                <Text style={[styles.scoreText, { color: getGradeColor(results.grade) }]}>
                    {results.overallScore}%
                </Text>
                <Text style={styles.gradeText}>Grade {results.grade}</Text>
            </View>
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
                onPress={() => setActiveTab('videos')}
            >
                <Ionicons
                    name="videocam"
                    size={20}
                    color={activeTab === 'videos' ? '#6366F1' : '#6B7280'}
                />
                <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
                    Videos
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'metrics' && styles.activeTab]}
                onPress={() => setActiveTab('metrics')}
            >
                <Ionicons
                    name="analytics"
                    size={20}
                    color={activeTab === 'metrics' ? '#6366F1' : '#6B7280'}
                />
                <Text style={[styles.tabText, activeTab === 'metrics' && styles.activeTabText]}>
                    Metrics
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tab, activeTab === 'recommendations' && styles.activeTab]}
                onPress={() => setActiveTab('recommendations')}
            >
                <Ionicons
                    name="bulb"
                    size={20}
                    color={activeTab === 'recommendations' ? '#6366F1' : '#6B7280'}
                />
                <Text style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>
                    Tips
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderVideosTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {/* Video Comparison Section */}
            <View style={styles.videosSection}>
                <Text style={styles.sectionTitle}>Compare Your Form</Text>
                <Text style={styles.sectionSubtitle}>
                    Watch your shot alongside {results.baselinePlayer}'s perfect form
                </Text>

                {/* Your Shot Video */}
                <View style={styles.videoCard}>
                    <View style={styles.videoHeader}>
                        <Text style={styles.videoLabel}>Your Shot</Text>
                        <View style={styles.orientationBadge}>
                            <Text style={styles.orientationText}>{results.orientation} view</Text>
                        </View>
                    </View>
                    <View style={styles.videoContainer}>
                        {isLoadingVideos ? (
                            <View style={styles.videoPlaceholder}>
                                <ActivityIndicator size="large" color="#6366F1" />
                                <Text style={styles.loadingText}>Loading video...</Text>
                            </View>
                        ) : (
                            <>
                                <VideoView
                                    player={userVideoPlayer}
                                    style={styles.video}
                                    contentFit="contain"
                                    nativeControls={false}
                                />
                                <TouchableOpacity
                                    style={styles.playButton}
                                    onPress={handlePlayUser}
                                >
                                    <Ionicons
                                        name={isPlayingUser ? "pause" : "play"}
                                        size={32}
                                        color="#fff"
                                    />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                {/* Curry's Shot Video */}
                <View style={styles.videoCard}>
                    <View style={styles.videoHeader}>
                        <Text style={styles.videoLabel}>{results.baselinePlayer}'s Form</Text>
                        <View style={[styles.orientationBadge, styles.curryBadge]}>
                            <Ionicons name="star" size={12} color="#F59E0B" />
                            <Text style={styles.orientationText}>Pro Reference</Text>
                        </View>
                    </View>
                    <View style={styles.videoContainer}>
                        {isLoadingVideos ? (
                            <View style={styles.videoPlaceholder}>
                                <ActivityIndicator size="large" color="#6366F1" />
                                <Text style={styles.loadingText}>Loading video...</Text>
                            </View>
                        ) : (
                            <>
                                <VideoView
                                    player={baselineVideoPlayer}
                                    style={styles.video}
                                    contentFit="contain"
                                    nativeControls={false}
                                />
                                <TouchableOpacity
                                    style={styles.playButton}
                                    onPress={handlePlayBaseline}
                                >
                                    <Ionicons
                                        name={isPlayingBaseline ? "pause" : "play"}
                                        size={32}
                                        color="#fff"
                                    />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                {/* Play Both Button */}
                {!isLoadingVideos && (
                    <TouchableOpacity style={styles.playBothButton} onPress={handlePlayBoth}>
                        <Ionicons name="play-circle" size={24} color="#fff" />
                        <Text style={styles.playBothText}>
                            {isPlayingUser && isPlayingBaseline ? 'Pause Both' : 'Play Both'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );

    const renderMetricsTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {/* Metrics by Category */}
            {Object.entries(results.metrics || {}).map(([categoryKey, category]) => (
                <View key={categoryKey} style={styles.metricsCategory}>
                    <View style={styles.categoryHeader}>
                        <Text style={styles.categoryTitle}>{category.name}</Text>
                        <View style={styles.categoryScore}>
                            <Text style={styles.categoryScoreText}>{category.averageScore}%</Text>
                        </View>
                    </View>

                    {category.metrics.map((metric) => (
                        <View key={metric.id} style={styles.metricCard}>
                            <View style={styles.metricHeader}>
                                <Text style={styles.metricName}>{metric.name}</Text>
                                <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(metric.grade) }]}>
                                    <Text style={styles.gradeLabel}>{metric.grade}</Text>
                                </View>
                            </View>

                            <View style={styles.metricComparison}>
                                <View style={styles.comparisonItem}>
                                    <Text style={styles.comparisonLabel}>You</Text>
                                    <Text style={styles.comparisonValue}>
                                        {typeof metric.yourValue === 'number'
                                            ? metric.yourValue.toFixed(1)
                                            : metric.yourValue}
                                    </Text>
                                </View>
                                <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />
                                <View style={styles.comparisonItem}>
                                    <Text style={styles.comparisonLabel}>Curry Avg</Text>
                                    <Text style={styles.comparisonValue}>
                                        {typeof metric.curryAverage === 'number'
                                            ? metric.curryAverage.toFixed(1)
                                            : metric.curryAverage}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.similarityBar}>
                                <View
                                    style={[
                                        styles.similarityFill,
                                        {
                                            width: `${metric.similarityPercent}%`,
                                            backgroundColor: getStatusColor(metric.status)
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.similarityText}>
                                {metric.similarityPercent}% match
                            </Text>
                        </View>
                    ))}
                </View>
            ))}
        </ScrollView>
    );

    const renderRecommendationsTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.recommendationsSection}>
                <Text style={styles.sectionTitle}>Top 3 Focus Areas</Text>
                <Text style={styles.sectionSubtitle}>
                    Work on these areas to improve your shot
                </Text>

                {results.recommendations?.map((rec) => (
                    <View key={rec.priority} style={styles.recommendationCard}>
                        <View style={styles.recommendationHeader}>
                            <View style={[
                                styles.priorityBadge,
                                { backgroundColor: rec.priority === 1 ? '#EF4444' : rec.priority === 2 ? '#F59E0B' : '#10B981' }
                            ]}>
                                <Text style={styles.priorityText}>#{rec.priority}</Text>
                            </View>
                            <View style={styles.recommendationTitle}>
                                <Text style={styles.recommendationName}>{rec.title}</Text>
                                <Text style={styles.recommendationCategory}>{rec.category}</Text>
                            </View>
                            <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(rec.grade) }]}>
                                <Text style={styles.gradeLabel}>{rec.grade}</Text>
                            </View>
                        </View>

                        <View style={styles.tipBox}>
                            <Ionicons name="bulb-outline" size={18} color="#6366F1" />
                            <Text style={styles.tipText}>{rec.tip}</Text>
                        </View>

                        {rec.drill && (
                            <View style={styles.drillBox}>
                                <Ionicons name="fitness-outline" size={16} color="#10B981" />
                                <Text style={styles.drillText}>{rec.drill}</Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>
        </ScrollView>
    );

    const renderFooter = () => (
        <View style={styles.footer}>
            <TouchableOpacity style={styles.tryAgainButton} onPress={onTryAgain}>
                <Ionicons name="refresh" size={20} color="#6366F1" />
                <Text style={styles.tryAgainText}>Analyze Another Shot</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            {renderHeader()}
            {renderTabs()}

            <View style={styles.content}>
                {activeTab === 'videos' && renderVideosTab()}
                {activeTab === 'metrics' && renderMetricsTab()}
                {activeTab === 'recommendations' && renderRecommendationsTab()}
            </View>

            {renderFooter()}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        backgroundColor: '#fff',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
    },
    closeButton: {
        padding: 8,
    },
    headerContent: {
        flex: 1,
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 21,
        fontWeight: '700',
        color: '#1F2937',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 2,
    },
    scoreCircle: {
        alignItems: 'center',
    },
    scoreText: {
        fontSize: 25,
        fontWeight: '800',
    },
    gradeText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        marginHorizontal: 4,
    },
    activeTab: {
        backgroundColor: '#EEF2FF',
    },
    tabText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600',
        marginLeft: 6,
    },
    activeTabText: {
        color: '#6366F1',
    },
    content: {
        flex: 1,
    },
    tabContent: {
        flex: 1,
        padding: 20,
    },
    videosSection: {
        gap: 20,
    },
    sectionTitle: {
        fontSize: 21,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 16,
    },
    videoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    videoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    videoLabel: {
        fontSize: 17.5,
        fontWeight: '700',
        color: '#1F2937',
    },
    orientationBadge: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    curryBadge: {
        backgroundColor: '#FEF3C7',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    orientationText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    videoContainer: {
        width: '100%',
        height: 300,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#000',
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1F2937',
    },
    loadingText: {
        color: '#fff',
        marginTop: 12,
        fontSize: 16,
    },
    playButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -28 }, { translateY: -28 }],
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(99, 102, 241, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playBothButton: {
        backgroundColor: '#6366F1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    playBothText: {
        color: '#fff',
        fontSize: 17.5,
        fontWeight: '700',
    },
    metricsCategory: {
        marginBottom: 24,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: '#1F2937',
    },
    categoryScore: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryScoreText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6366F1',
    },
    metricCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    metricName: {
        fontSize: 16.5,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    gradeBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradeLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    metricComparison: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    comparisonItem: {
        flex: 1,
    },
    comparisonLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 2,
    },
    comparisonValue: {
        fontSize: 17.5,
        fontWeight: '700',
        color: '#1F2937',
    },
    similarityBar: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6,
    },
    similarityFill: {
        height: '100%',
        borderRadius: 4,
    },
    similarityText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'right',
    },
    recommendationsSection: {
        gap: 16,
    },
    recommendationCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    recommendationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    priorityBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    priorityText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
    recommendationTitle: {
        flex: 1,
    },
    recommendationName: {
        fontSize: 16.5,
        fontWeight: '700',
        color: '#1F2937',
    },
    recommendationCategory: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    tipBox: {
        flexDirection: 'row',
        backgroundColor: '#EEF2FF',
        padding: 12,
        borderRadius: 8,
        gap: 10,
        marginBottom: 8,
    },
    tipText: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
        lineHeight: 21,
    },
    drillBox: {
        flexDirection: 'row',
        backgroundColor: '#ECFDF5',
        padding: 12,
        borderRadius: 8,
        gap: 10,
    },
    drillText: {
        flex: 1,
        fontSize: 15,
        color: '#065F46',
        lineHeight: 19,
    },
    footer: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    tryAgainButton: {
        backgroundColor: '#EEF2FF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    tryAgainText: {
        color: '#6366F1',
        fontSize: 17.5,
        fontWeight: '700',
    },
});

export default ShotComparisonResults;

