// ProgressScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Dimensions,
    Animated,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import {
    getWorkoutHistory,
    getWorkoutStats,
    getCategoryBreakdown,
    getWorkoutStreak,
    getWorkoutRecommendations,
    getGamificationStats,
    getAchievementProgress,
    getUserShootingStats,
    listenToUserActivities,
    listenToUserProfile
} from '../../services/firestoreService';
import { ACHIEVEMENT_CATEGORIES } from '../../data/achievements';
import UpgradePrompt from '../../components/shared/UpgradePrompt';
import LockedFeatureCard from '../../components/features/LockedFeatureCard';
import { canAccessFeature } from '../../utils/subscription';
import { TourStep } from '../../components/tour';

const { width } = Dimensions.get('window');

// Tab options for progress screen (consolidated Overview + Skills into Stats)
const TABS = [
    { id: 'stats', label: 'Stats' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'goals', label: 'Goals' },
    { id: 'history', label: 'History' },
];

const ProgressScreen = ({ navigation }) => {
    const {
        userData,
        goals,
        activities,
        updateGoalProgress,
        historicalData,
        theme,
        isDarkMode
    } = useAppContext();

    const [activeTab, setActiveTab] = useState('stats');
    const [expandedGoalId, setExpandedGoalId] = useState(null);
    const [selectedTimeframe, setSelectedTimeframe] = useState('month'); // week, month, year
    const [selectedSkill, setSelectedSkill] = useState('shooting'); // shooting, dribbling, etc.
    const [selectedCategory, setSelectedCategory] = useState('all'); // all, shooting, dribbling, physical, etc.
    const [showCompletedGoals, setShowCompletedGoals] = useState(false); // For goals tab

    // Real analytics data
    const [workoutStats, setWorkoutStats] = useState(null);
    const [workoutHistory, setWorkoutHistory] = useState([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState({});
    const [currentStreak, setCurrentStreak] = useState(0);
    const [recommendations, setRecommendations] = useState(null);
    const [shootingStats, setShootingStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Gamification data
    const [gamificationStats, setGamificationStats] = useState(null);
    const [achievementProgress, setAchievementProgress] = useState([]);
    const [selectedAchievementCategory, setSelectedAchievementCategory] = useState('all');

    // Animation value for tab indicator
    const tabIndicatorPosition = useRef(new Animated.Value(0)).current;

    // Fetch analytics data
    const fetchAnalyticsData = async () => {
        if (!userData?.uid) return;

        try {
            setLoading(true);

            // Fetch data in parallel
            const [stats, history, breakdown, streak, recs, gamification, achievements, shooting] = await Promise.all([
                getWorkoutStats(userData.uid, selectedTimeframe),
                getWorkoutHistory(userData.uid, { limitCount: 100 }),
                getCategoryBreakdown(userData.uid, selectedTimeframe),
                getWorkoutStreak(userData.uid),
                getWorkoutRecommendations(userData.uid),
                getGamificationStats(userData.uid),
                getAchievementProgress(userData.uid),
                getUserShootingStats(userData.uid)
            ]);

            setWorkoutStats(stats);
            setWorkoutHistory(history);
            setCategoryBreakdown(breakdown);
            setCurrentStreak(streak);
            setRecommendations(recs);
            setGamificationStats(gamification);
            setAchievementProgress(achievements);
            setShootingStats(shooting);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch data on mount and when timeframe changes
    useEffect(() => {
        fetchAnalyticsData();
    }, [selectedTimeframe, userData?.uid]);

    // Set up real-time listeners for activities
    useEffect(() => {
        if (!userData?.uid) return;

        // Listen to activity updates in real-time
        const unsubscribeActivities = listenToUserActivities(userData.uid, (newActivities) => {
            // When activities update, recalculate stats
            if (newActivities && newActivities.length > 0) {
                // Refresh stats that depend on activities
                Promise.all([
                    getWorkoutStats(userData.uid, selectedTimeframe),
                    getCategoryBreakdown(userData.uid, selectedTimeframe),
                    getWorkoutStreak(userData.uid),
                ]).then(([stats, breakdown, streak]) => {
                    setWorkoutStats(stats);
                    setCategoryBreakdown(breakdown);
                    setCurrentStreak(streak);
                }).catch(err => console.error('Error refreshing stats:', err));
            }
        });

        // Cleanup listener on unmount
        return () => {
            if (unsubscribeActivities) {
                unsubscribeActivities();
            }
        };
    }, [userData?.uid, selectedTimeframe]);

    // Refresh data when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            fetchAnalyticsData();
        }, [selectedTimeframe, userData?.uid])
    );

    // Handle tab change
    const handleTabChange = (tabId) => {
        // Find the index of the selected tab
        const tabIndex = TABS.findIndex(tab => tab.id === tabId);

        // Animate the tab indicator
        Animated.spring(tabIndicatorPosition, {
            toValue: tabIndex * (width / TABS.length),
            useNativeDriver: false,
            friction: 8,
        }).start();

        setActiveTab(tabId);
    };

    // Toggle goal expansion
    const toggleGoalExpansion = (goalId) => {
        if (expandedGoalId === goalId) {
            setExpandedGoalId(null);
        } else {
            setExpandedGoalId(goalId);
        }
    };

    // Calculate workout streak - now using real data
    const calculateStreak = () => {
        return currentStreak || userData.stats.streak || 0;
    };

    // Calculate progress percentage for a goal
    const calculateGoalProgress = (goal) => {
        return Math.min(100, Math.round((goal.current / goal.target) * 100));
    };

    // Determine if a goal is on track
    const isGoalOnTrack = (goal) => {
        if (!goal.deadline) return true;

        const today = new Date();
        const deadline = new Date(goal.deadline);
        const totalDays = (deadline - new Date(goal.startDate || Date.now() - 30*24*60*60*1000)) / (1000 * 60 * 60 * 24);
        const daysElapsed = (today - new Date(goal.startDate || Date.now() - 30*24*60*60*1000)) / (1000 * 60 * 60 * 24);
        const expectedProgress = (daysElapsed / totalDays) * 100;
        const actualProgress = (goal.current / goal.target) * 100;

        return actualProgress >= expectedProgress;
    };

    // Get skill data for charts - now using real workout data
    const getSkillData = () => {
        const skillColors = {
            shooting: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
            dribbling: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            physical: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
            defense: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
            passing: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
        };

        // Calculate skill progress from workout history
        const calculateSkillProgress = () => {
            if (!workoutHistory || workoutHistory.length === 0) {
                // Return default progression if no workouts
                return [50, 50, 50, 50, 50, 50];
            }

            // Get last 6 months of data
            const monthlyData = [];
            const today = new Date();

            for (let i = 5; i >= 0; i--) {
                const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

                // Filter workouts for this month and skill
                const monthWorkouts = workoutHistory.filter(w => {
                    if (!w.createdAt) return false;
                    const wDate = w.createdAt.toDate ? w.createdAt.toDate() : new Date(w.createdAt);
                    const category = (w.category || w.workoutCategory || '').toLowerCase();
                    return wDate >= monthStart && wDate <= monthEnd && category === selectedSkill;
                });

                // Calculate skill score based on:
                // - Number of workouts (frequency)
                // - Average completion rate
                // - Total minutes
                const baseScore = 50;
                const workoutBonus = Math.min(monthWorkouts.length * 5, 25); // Up to 25 points for 5+ workouts
                const completionBonus = monthWorkouts.length > 0
                    ? (monthWorkouts.reduce((sum, w) => sum + (w.completionRate || 80), 0) / monthWorkouts.length) * 0.25
                    : 0;

                const score = Math.min(Math.round(baseScore + workoutBonus + completionBonus), 100);
                monthlyData.push(score || baseScore);
            }

            return monthlyData;
        };

        // Get month labels
        const getMonthLabels = () => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const labels = [];
            const today = new Date();

            for (let i = 5; i >= 0; i--) {
                const monthIndex = (today.getMonth() - i + 12) % 12;
                labels.push(months[monthIndex]);
            }

            return labels;
        };

        const skillData = calculateSkillProgress();
        const color = skillColors[selectedSkill] || skillColors.shooting;

        return {
            labels: getMonthLabels(),
            datasets: [
                {
                    data: skillData,
                    color: color,
                    strokeWidth: 2
                }
            ]
        };
    };

    // Get activity data for charts - now using real data
    const getActivityData = () => {
        if (!workoutHistory || workoutHistory.length === 0) {
            // Return empty data if no workouts
            return {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    data: [0, 0, 0, 0, 0, 0, 0],
                    color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
                    strokeWidth: 2
                }]
            };
        }

        // Group workouts by day of week (last 7 days)
        const today = new Date();
        const last7Days = [];
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const workoutMinutes = [0, 0, 0, 0, 0, 0, 0];

        // Calculate last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            last7Days.push(date.toDateString());
        }

        // Sum workout minutes per day
        workoutHistory.forEach(workout => {
            if (workout.createdAt && workout.createdAt.toDate) {
                const workoutDate = workout.createdAt.toDate().toDateString();
                const dayIndex = last7Days.indexOf(workoutDate);

                if (dayIndex !== -1) {
                    workoutMinutes[dayIndex] += workout.durationMinutes || Math.floor((workout.duration || 0) / 60);
                }
            }
        });

        // Get labels for the last 7 days
        const labels = last7Days.map((dateStr, index) => {
            const date = new Date(dateStr);
            return dayLabels[date.getDay()];
        });

        return {
            labels,
            datasets: [{
                data: workoutMinutes.map(m => m || 0.1), // Ensure at least 0.1 for visibility
                color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
                strokeWidth: 2
            }]
        };
    };

    // Chart configuration - dynamic based on theme
    const chartConfig = {
        backgroundGradientFrom: theme.card,
        backgroundGradientTo: theme.card,
        decimalPlaces: 0,
        color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
        labelColor: (opacity = 1) => isDarkMode ? `rgba(170, 170, 170, ${opacity})` : `rgba(100, 100, 100, ${opacity})`,
        style: {
            borderRadius: 16
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: theme.primary
        }
    };

    // Achievement badges data
    const achievements = [
        { id: '1', name: 'Sharpshooter', icon: 'basketball', unlocked: true },
        { id: '2', name: 'Streak Master', icon: 'flame', unlocked: true },
        { id: '3', name: 'Dribble Expert', icon: 'hand-left', unlocked: false },
        { id: '4', name: 'Consistency', icon: 'calendar', unlocked: true },
        { id: '5', name: 'Workout Warrior', icon: 'fitness', unlocked: false },
    ];

    // Renders the unified Stats tab content (consolidated from Overview + Skills)
    const renderStatsTab = () => {
        if (loading) {
            return (
                <View style={[styles.tabContent, styles.loadingContainer]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your stats...</Text>
                </View>
            );
        }

        const totalWorkouts = workoutStats?.totalWorkouts || 0;
        const avgDuration = workoutStats?.averageDuration || 0;

        // Calculate workouts this week
        const thisWeekWorkouts = workoutHistory.filter(w => {
            if (!w.createdAt) return false;
            const wDate = w.createdAt.toDate ? w.createdAt.toDate() : new Date(w.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return wDate >= weekAgo;
        }).length;

        return (
            <View style={styles.tabContent}>
                {/* Training Summary Card - wrapped with TourStep for onboarding */}
                <TourStep stepId="training-summary-card">
                    <View style={[styles.summaryContainer, { backgroundColor: theme.card }]}>
                        <View style={styles.summaryHeader}>
                            <View style={styles.sectionTitleRow}>
                                <Ionicons name="stats-chart" size={20} color={theme.primary} />
                                <Text style={[styles.summaryTitle, { color: theme.text }]}>Training Summary</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.timeframeSelector, { backgroundColor: theme.backgroundSecondary }]}
                                onPress={() => {
                                    const timeframes = ['week', 'month', 'year'];
                                    const currentIndex = timeframes.indexOf(selectedTimeframe);
                                    const nextIndex = (currentIndex + 1) % timeframes.length;
                                    setSelectedTimeframe(timeframes[nextIndex]);
                                }}
                            >
                                <Text style={[styles.timeframeText, { color: theme.textSecondary }]}>
                                    {selectedTimeframe === 'week' ? 'This Week' : selectedTimeframe === 'month' ? 'This Month' : 'This Year'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.metricsRow}>
                            <View style={[styles.metricCard, { backgroundColor: theme.backgroundSecondary }]}>
                                <Ionicons name="fitness" size={24} color={theme.primary} style={styles.metricIcon} />
                                <Text style={[styles.metricValue, { color: theme.primary }]}>{totalWorkouts}</Text>
                                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Total Workouts</Text>
                            </View>
                            <View style={[styles.metricCard, { backgroundColor: theme.backgroundSecondary }]}>
                                <Ionicons name="flame" size={24} color={theme.primary} style={styles.metricIcon} />
                                <Text style={[styles.metricValue, { color: theme.primary }]}>{calculateStreak()}</Text>
                                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Day Streak</Text>
                            </View>
                        </View>

                        <View style={[styles.metricsRow, { marginTop: 8 }]}>
                            <View style={[styles.metricCard, { backgroundColor: theme.backgroundSecondary }]}>
                                <Ionicons name="calendar" size={24} color={theme.success} style={styles.metricIcon} />
                                <Text style={[styles.metricValue, { color: theme.success }]}>{thisWeekWorkouts}</Text>
                                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>This Week</Text>
                            </View>
                            <View style={[styles.metricCard, { backgroundColor: theme.backgroundSecondary }]}>
                                <Ionicons name="time" size={24} color={theme.info} style={styles.metricIcon} />
                                <Text style={[styles.metricValue, { color: theme.info }]}>{avgDuration}</Text>
                                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Avg Minutes</Text>
                            </View>
                        </View>
                    </View>
                </TourStep>

                {/* Shooting Accuracy Card */}
                <View style={[styles.shootingAccuracyCard, { backgroundColor: theme.card }]}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="basketball" size={20} color={theme.primary} />
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Shooting Accuracy</Text>
                        {shootingStats?.trend !== 0 && shootingStats?.totalShots > 0 && (
                            <View style={[
                                styles.trendBadge,
                                { backgroundColor: shootingStats.trend > 0 ? theme.success + '20' : theme.error + '20' }
                            ]}>
                                <Ionicons
                                    name={shootingStats.trend > 0 ? 'trending-up' : 'trending-down'}
                                    size={14}
                                    color={shootingStats.trend > 0 ? theme.success : theme.error}
                                />
                                <Text style={[
                                    styles.trendText,
                                    { color: shootingStats.trend > 0 ? theme.success : theme.error }
                                ]}>
                                    {shootingStats.trend > 0 ? '+' : ''}{shootingStats.trend}%
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.accuracyContent}>
                        <View style={styles.accuracyMain}>
                            <Text style={[styles.accuracyPercentage, { color: theme.primary }]}>
                                {shootingStats?.totalShots > 0 ? shootingStats.accuracy : '--'}%
                            </Text>
                            <Text style={[styles.accuracyLabel, { color: theme.textSecondary }]}>Overall Accuracy</Text>
                        </View>

                        <View style={[styles.accuracyProgressBar, { backgroundColor: theme.backgroundSecondary }]}>
                            <View
                                style={[
                                    styles.accuracyProgressFill,
                                    {
                                        width: `${shootingStats?.accuracy || 0}%`,
                                        backgroundColor: theme.primary
                                    }
                                ]}
                            />
                        </View>

                        <View style={styles.accuracyStats}>
                            <View style={styles.accuracyStat}>
                                <View style={[styles.accuracyDot, { backgroundColor: theme.success }]} />
                                <Text style={[styles.accuracyStatText, { color: theme.text }]}>
                                    Makes: {shootingStats?.makes || 0}
                                </Text>
                            </View>
                            <View style={styles.accuracyStat}>
                                <View style={[styles.accuracyDot, { backgroundColor: theme.error }]} />
                                <Text style={[styles.accuracyStatText, { color: theme.text }]}>
                                    Misses: {shootingStats?.misses || 0}
                                </Text>
                            </View>
                            <View style={styles.accuracyStat}>
                                <Ionicons name="basketball-outline" size={14} color={theme.textSecondary} />
                                <Text style={[styles.accuracyStatText, { color: theme.textSecondary }]}>
                                    Total: {shootingStats?.totalShots || 0}
                                </Text>
                            </View>
                        </View>

                        {shootingStats?.totalShots > 0 ? (
                            <Text style={[styles.accuracyHint, { color: theme.textSecondary }]}>
                                This week: {shootingStats.recentAccuracy}% accuracy
                            </Text>
                        ) : (
                            <Text style={[styles.accuracyHint, { color: theme.textSecondary }]}>
                                Track makes/misses during shooting workouts to see your stats
                            </Text>
                        )}
                    </View>
                </View>

                {/* Skill Progress Chart */}
                <View style={[styles.skillChartContainer, { backgroundColor: theme.card }]}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="trending-up" size={20} color={theme.primary} />
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Skill Progress</Text>
                        </View>
                        <Text style={[styles.chartPeriod, { color: theme.textSecondary }]}>6 Months</Text>
                    </View>

                    {/* Skill Selector */}
                    <View style={styles.skillSelector}>
                        <TouchableOpacity
                            style={[
                                styles.skillTab,
                                selectedSkill === 'shooting' && styles.selectedSkillTab,
                                selectedSkill === 'shooting' && { borderColor: '#FF6B00' }
                            ]}
                            onPress={() => setSelectedSkill('shooting')}
                        >
                            <Ionicons
                                name="basketball"
                                size={16}
                                color={selectedSkill === 'shooting' ? '#FF6B00' : theme.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.skillTabText,
                                    { color: theme.textSecondary },
                                    selectedSkill === 'shooting' && { color: '#FF6B00', fontWeight: '600' }
                                ]}
                            >
                                Shooting
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.skillTab,
                                selectedSkill === 'dribbling' && styles.selectedSkillTab,
                                selectedSkill === 'dribbling' && { borderColor: '#4CAF50' }
                            ]}
                            onPress={() => setSelectedSkill('dribbling')}
                        >
                            <Ionicons
                                name="hand-left"
                                size={16}
                                color={selectedSkill === 'dribbling' ? '#4CAF50' : theme.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.skillTabText,
                                    { color: theme.textSecondary },
                                    selectedSkill === 'dribbling' && { color: '#4CAF50', fontWeight: '600' }
                                ]}
                            >
                                Dribbling
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.skillTab,
                                selectedSkill === 'physical' && styles.selectedSkillTab,
                                selectedSkill === 'physical' && { borderColor: '#2196F3' }
                            ]}
                            onPress={() => setSelectedSkill('physical')}
                        >
                            <Ionicons
                                name="fitness"
                                size={16}
                                color={selectedSkill === 'physical' ? '#2196F3' : theme.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.skillTabText,
                                    { color: theme.textSecondary },
                                    selectedSkill === 'physical' && { color: '#2196F3', fontWeight: '600' }
                                ]}
                            >
                                Physical
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Skill Progress Chart */}
                    <LineChart
                        data={getSkillData()}
                        width={width - 32}
                        height={200}
                        chartConfig={{
                            ...chartConfig,
                            color: (opacity = 1) => selectedSkill === 'shooting' ? `rgba(255, 107, 0, ${opacity})` :
                                selectedSkill === 'dribbling' ? `rgba(76, 175, 80, ${opacity})` :
                                    `rgba(33, 150, 243, ${opacity})`,
                            propsForDots: {
                                r: '5',
                                strokeWidth: '2',
                                stroke: selectedSkill === 'shooting' ? '#FF6B00' :
                                    selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'
                            }
                        }}
                        bezier
                        style={styles.chart}
                    />
                </View>

                {/* Category Breakdown */}
                {Object.keys(categoryBreakdown).length > 0 && (
                    <View style={[styles.categoryDistributionContainer, { backgroundColor: theme.card }]}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="pie-chart" size={20} color={theme.primary} />
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Category Breakdown</Text>
                        </View>
                        <Text style={[styles.categorySubtitle, { color: theme.textSecondary }]}>
                            Your workout focus for this {selectedTimeframe.toLowerCase()}
                        </Text>

                        {Object.entries(categoryBreakdown)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, count]) => {
                                const total = Object.values(categoryBreakdown).reduce((sum, val) => sum + val, 0);
                                const percentage = Math.round((count / total) * 100);

                                const categoryConfig = {
                                    'Shooting': { icon: 'basketball', color: '#FF6B00' },
                                    'Dribbling': { icon: 'hand-left', color: '#4CAF50' },
                                    'Physical': { icon: 'fitness', color: '#2196F3' },
                                    'Defense': { icon: 'shield', color: '#9C27B0' },
                                    'Passing': { icon: 'swap-horizontal', color: '#FF9800' },
                                };

                                const config = categoryConfig[category] || { icon: 'fitness', color: theme.textSecondary };

                                return (
                                    <View key={category} style={styles.categoryItem}>
                                        <View style={styles.categoryHeader}>
                                            <View style={styles.categoryNameContainer}>
                                                <View style={[styles.categoryIcon, { backgroundColor: `${config.color}15` }]}>
                                                    <Ionicons name={config.icon} size={18} color={config.color} />
                                                </View>
                                                <View>
                                                    <Text style={[styles.categoryName, { color: theme.text }]}>{category}</Text>
                                                    <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>
                                                        {count} workout{count !== 1 ? 's' : ''}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.categoryPercentage, { color: config.color }]}>
                                                {percentage}%
                                            </Text>
                                        </View>
                                        <View style={[styles.categoryBar, { backgroundColor: theme.backgroundSecondary }]}>
                                            <View
                                                style={[
                                                    styles.categoryBarFill,
                                                    { width: `${percentage}%`, backgroundColor: config.color }
                                                ]}
                                            />
                                        </View>
                                    </View>
                                );
                            })}
                    </View>
                )}

                {/* Smart Recommendations */}
                {recommendations && (
                    <View style={[styles.recommendationsContainer, { backgroundColor: theme.card }]}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="bulb" size={20} color={theme.warning} />
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommended For You</Text>
                        </View>

                        <View style={[styles.recommendationCard, { backgroundColor: theme.backgroundSecondary }]}>
                            <View style={styles.recommendationHeader}>
                                <View style={[styles.recommendationIconContainer, { backgroundColor: theme.primary + '20' }]}>
                                    <Ionicons name="trophy" size={24} color={theme.primary} />
                                </View>
                                <View style={styles.recommendationInfo}>
                                    <Text style={[styles.recommendationTitle, { color: theme.text }]}>
                                        Try {recommendations.nextWorkout} Next
                                    </Text>
                                    <Text style={[styles.recommendationReason, { color: theme.textSecondary }]}>
                                        {recommendations.reason}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.recommendationButton, { backgroundColor: theme.primary }]}
                                onPress={() => {
                                    navigation.navigate('Training', {
                                        screen: 'TrainingMain',
                                        params: { filterCategory: recommendations.nextWorkout }
                                    });
                                }}
                            >
                                <Text style={styles.recommendationButtonText}>
                                    Browse {recommendations.nextWorkout} Workouts
                                </Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    // Renders the Achievements tab content
    const renderAchievementsTab = () => {
        if (!gamificationStats || !achievementProgress) {
            return (
                <View style={styles.tabContent}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            );
        }

        const filteredAchievements = selectedAchievementCategory === 'all'
            ? achievementProgress
            : achievementProgress.filter(a => a.category === selectedAchievementCategory);

        const unlockedAchievements = achievementProgress.filter(a => a.unlocked);
        const levelInfo = gamificationStats.levelInfo;

        return (
            <View style={styles.tabContent}>
                {/* XP and Level Header */}
                <View style={[styles.xpLevelCard, { backgroundColor: theme.card }]}>
                    <View style={styles.xpLevelHeader}>
                        <View style={[styles.levelBadge, { backgroundColor: theme.primary }]}>
                            <Text style={styles.levelNumber}>{levelInfo.level}</Text>
                        </View>
                        <View style={styles.xpLevelInfo}>
                            <Text style={[styles.levelTitle, { color: theme.text }]}>{levelInfo.title}</Text>
                            <Text style={[styles.xpText, { color: theme.textSecondary }]}>{gamificationStats.totalXP} XP</Text>
                        </View>
                        <TouchableOpacity style={styles.achievementsTrophyIcon}>
                            <Ionicons name="trophy" size={28} color="#FFD700" />
                            <Text style={[styles.achievementCount, { color: theme.textSecondary }]}>
                                {unlockedAchievements.length}/{achievementProgress.length}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* XP Progress Bar */}
                    {levelInfo.xpForNextLevel && (
                        <View style={styles.xpProgressSection}>
                            <View style={[styles.xpProgressBar, { backgroundColor: theme.backgroundTertiary }]}>
                                <View
                                    style={[
                                        styles.xpProgressFill,
                                        { width: `${levelInfo.progressToNextLevel}%`, backgroundColor: theme.primary }
                                    ]}
                                />
                            </View>
                            <Text style={[styles.xpProgressText, { color: theme.textSecondary }]}>
                                {levelInfo.currentXP - levelInfo.xpForCurrentLevel} / {levelInfo.xpForNextLevel - levelInfo.xpForCurrentLevel} XP to Level {levelInfo.level + 1}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Achievement Category Filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.achievementCategoryFilter}
                    contentContainerStyle={styles.achievementCategoryContent}
                >
                    <TouchableOpacity
                        style={[
                            styles.achievementCategoryChip,
                            { backgroundColor: theme.backgroundTertiary },
                            selectedAchievementCategory === 'all' && [styles.achievementCategoryChipActive, { borderColor: theme.primary }]
                        ]}
                        onPress={() => setSelectedAchievementCategory('all')}
                    >
                        <Ionicons
                            name="apps"
                            size={16}
                            color={selectedAchievementCategory === 'all' ? theme.primary : theme.textSecondary}
                        />
                        <Text style={[
                            styles.achievementCategoryChipText,
                            { color: theme.textSecondary },
                            selectedAchievementCategory === 'all' && [styles.achievementCategoryChipTextActive, { color: theme.primary }]
                        ]}>
                            All
                        </Text>
                    </TouchableOpacity>

                    {Object.values(ACHIEVEMENT_CATEGORIES).map((category) => {
                        const isSelected = selectedAchievementCategory === category;
                        const categoryIcons = {
                            workouts: 'basketball',
                            streaks: 'flame',
                            mastery: 'star',
                            milestones: 'flag',
                            special: 'sparkles'
                        };

                        return (
                            <TouchableOpacity
                                key={category}
                                style={[
                                    styles.achievementCategoryChip,
                                    { backgroundColor: theme.backgroundTertiary },
                                    isSelected && [styles.achievementCategoryChipActive, { borderColor: theme.primary }]
                                ]}
                                onPress={() => setSelectedAchievementCategory(category)}
                            >
                                <Ionicons
                                    name={categoryIcons[category]}
                                    size={16}
                                    color={isSelected ? theme.primary : theme.textSecondary}
                                />
                                <Text style={[
                                    styles.achievementCategoryChipText,
                                    { color: theme.textSecondary },
                                    isSelected && [styles.achievementCategoryChipTextActive, { color: theme.primary }]
                                ]}>
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Achievement List */}
                <View style={styles.achievementsList}>
                    {filteredAchievements.length === 0 ? (
                        <View style={styles.emptyAchievements}>
                            <Ionicons name="trophy-outline" size={64} color={theme.textTertiary} />
                            <Text style={[styles.emptyAchievementsText, { color: theme.textSecondary }]}>No achievements in this category</Text>
                        </View>
                    ) : (
                        filteredAchievements.map((achievement, index) => (
                            <View
                                key={achievement.id}
                                style={[
                                    styles.achievementCard,
                                    { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                                    achievement.unlocked && [styles.achievementCardUnlocked, { backgroundColor: theme.card }]
                                ]}
                            >
                                <View style={styles.achievementIconContainer}>
                                    <View
                                        style={[
                                            styles.achievementIcon,
                                            { borderColor: theme.border },
                                            achievement.unlocked && styles.achievementIconUnlocked,
                                            { backgroundColor: achievement.tier.color + '20' }
                                        ]}
                                    >
                                        <Ionicons
                                            name={achievement.icon}
                                            size={28}
                                            color={achievement.unlocked ? achievement.tier.color : theme.textTertiary}
                                        />
                                    </View>
                                    {achievement.unlocked && (
                                        <View style={styles.unlockedBadge}>
                                            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                        </View>
                                    )}
                                </View>

                                <View style={styles.achievementInfo}>
                                    <Text style={[
                                        styles.achievementTitle,
                                        { color: theme.text },
                                        !achievement.unlocked && [styles.achievementTitleLocked, { color: theme.textTertiary }]
                                    ]}>
                                        {achievement.title}
                                    </Text>
                                    <Text style={[styles.achievementDescription, { color: theme.textSecondary }]}>
                                        {achievement.description}
                                    </Text>

                                    {!achievement.unlocked && achievement.progress > 0 && (
                                        <View style={styles.achievementProgressSection}>
                                            <View style={[styles.achievementProgressBar, { backgroundColor: theme.backgroundTertiary }]}>
                                                <View
                                                    style={[
                                                        styles.achievementProgressFill,
                                                        { width: `${achievement.progress}%`, backgroundColor: achievement.tier.color }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={[styles.achievementProgressText, { color: theme.textSecondary }]}>
                                                {achievement.current} / {achievement.target}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.achievementTierBadge}>
                                    <Text style={[
                                        styles.achievementTierText,
                                        { color: achievement.tier.color }
                                    ]}>
                                        {achievement.tier.name}
                                    </Text>
                                    <Text style={[styles.achievementXPText, { color: theme.textSecondary }]}>
                                        +{achievement.tier.xp} XP
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </View>
        );
    };

    // Renders the Goals tab content - Coming Soon
    const renderGoalsTab = () => {
        const plannedFeatures = [
            {
                icon: 'flag',
                title: 'Custom Goals',
                description: 'Set personalized targets for shooting accuracy, workouts, and more'
            },
            {
                icon: 'analytics',
                title: 'Progress Tracking',
                description: 'Track your progress with visual charts and milestone notifications'
            },
            {
                icon: 'trophy',
                title: 'Achievement Goals',
                description: 'Earn badges and rewards for hitting your training milestones'
            },
            {
                icon: 'calendar',
                title: 'Deadline Reminders',
                description: 'Stay on track with smart reminders as deadlines approach'
            }
        ];

        return (
            <View style={styles.tabContent}>
                {/* Coming Soon Hero */}
                <View style={[styles.goalsSoonHero, { backgroundColor: theme.card }]}>
                    <View style={[styles.goalsSoonIconContainer, { backgroundColor: theme.primary + '20' }]}>
                        <Ionicons name="flag" size={48} color={theme.primary} />
                    </View>
                    <Text style={[styles.goalsSoonTitle, { color: theme.text }]}>Goals Coming Soon</Text>
                    <Text style={[styles.goalsSoonSubtitle, { color: theme.textSecondary }]}>
                        We're building powerful goal-setting tools to help you reach your full potential.
                    </Text>
                    <View style={[styles.goalsSoonBadge, { backgroundColor: theme.primary + '20' }]}>
                        <Ionicons name="construct" size={14} color={theme.primary} />
                        <Text style={[styles.goalsSoonBadgeText, { color: theme.primary }]}>In Development</Text>
                    </View>
                </View>

                {/* Planned Features */}
                <Text style={[styles.goalsSoonSectionTitle, { color: theme.text }]}>What's Coming</Text>
                <View style={styles.goalsSoonFeatures}>
                    {plannedFeatures.map((feature, index) => (
                        <View
                            key={index}
                            style={[styles.goalsSoonFeatureCard, { backgroundColor: theme.card }]}
                        >
                            <View style={[styles.goalsSoonFeatureIcon, { backgroundColor: theme.primary + '15' }]}>
                                <Ionicons name={feature.icon} size={24} color={theme.primary} />
                            </View>
                            <View style={styles.goalsSoonFeatureContent}>
                                <Text style={[styles.goalsSoonFeatureTitle, { color: theme.text }]}>
                                    {feature.title}
                                </Text>
                                <Text style={[styles.goalsSoonFeatureDesc, { color: theme.textSecondary }]}>
                                    {feature.description}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Get Notified CTA */}
                <View style={[styles.goalsSoonCta, { backgroundColor: theme.card }]}>
                    <Text style={[styles.goalsSoonCtaTitle, { color: theme.text }]}>
                        Want to be notified?
                    </Text>
                    <Text style={[styles.goalsSoonCtaText, { color: theme.textSecondary }]}>
                        Enable notifications in Settings to know when Goals launches!
                    </Text>
                    <TouchableOpacity
                        style={[styles.goalsSoonCtaButton, { backgroundColor: theme.primary }]}
                        onPress={() => navigation.navigate('Profile', {
                            screen: 'Settings',
                            initial: false
                        })}
                    >
                        <Ionicons name="notifications" size={18} color="#FFF" />
                        <Text style={styles.goalsSoonCtaButtonText}>Go to Settings</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Renders the History tab content
    const renderHistoryTab = () => {
        // Group workouts by date for calendar
        const getWorkoutDates = () => {
            const dates = new Set();
            workoutHistory.forEach(workout => {
                if (workout.createdAt && workout.createdAt.toDate) {
                    const date = workout.createdAt.toDate();
                    dates.add(date.toDateString());
                }
            });
            return dates;
        };

        const workoutDates = getWorkoutDates();
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Get the most recent workouts (limit to 10 for display)
        const recentWorkouts = workoutHistory.slice(0, 10);

        // Filter workouts by category
        const filteredWorkouts = selectedCategory === 'all'
            ? recentWorkouts
            : recentWorkouts.filter(w => w.category === selectedCategory);

        // Get unique categories from workout history
        const availableCategories = ['all', ...new Set(workoutHistory.map(w => w.category).filter(Boolean))];

        return (
            <View style={styles.tabContent}>
                <View style={[styles.historyHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                    <Text style={[styles.historyTitle, { color: theme.text }]}>Training History</Text>
                </View>

                {/* Category Filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryFilterContainer}
                    contentContainerStyle={styles.categoryFilterContent}
                >
                    {availableCategories.map((category) => {
                        const isSelected = selectedCategory === category;
                        const categoryConfig = {
                            'all': { icon: 'apps', color: '#666', label: 'All' },
                            'Shooting': { icon: 'basketball', color: '#FF6B00', label: 'Shooting' },
                            'Dribbling': { icon: 'hand-left', color: '#4CAF50', label: 'Dribbling' },
                            'Physical': { icon: 'fitness', color: '#2196F3', label: 'Physical' },
                            'Defense': { icon: 'shield', color: '#9C27B0', label: 'Defense' },
                            'Passing': { icon: 'swap-horizontal', color: '#FF9800', label: 'Passing' },
                        };
                        const config = categoryConfig[category] || { icon: 'fitness', color: '#666', label: category };

                        return (
                            <TouchableOpacity
                                key={category}
                                style={[
                                    styles.categoryFilterChip,
                                    { backgroundColor: theme.backgroundTertiary },
                                    isSelected && { backgroundColor: config.color + '20', borderColor: config.color }
                                ]}
                                onPress={() => setSelectedCategory(category)}
                            >
                                <Ionicons
                                    name={config.icon}
                                    size={16}
                                    color={isSelected ? config.color : theme.textSecondary}
                                />
                                <Text style={[
                                    styles.categoryFilterText,
                                    { color: theme.textSecondary },
                                    isSelected && { color: config.color, fontWeight: '600' }
                                ]}>
                                    {config.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading workout history...</Text>
                    </View>
                ) : workoutHistory.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                        <Ionicons name="fitness-outline" size={48} color={theme.textTertiary} style={{ marginBottom: 12 }} />
                        <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>No workout history found.</Text>
                        <Text style={[styles.emptyStateSubtext, { color: theme.textTertiary }]}>
                            Complete your first workout to start tracking your progress!
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={[styles.calendarContainer, { backgroundColor: theme.card }]}>
                            <Text style={[styles.calendarTitle, { color: theme.text }]}>Activity Calendar</Text>
                            <View style={styles.monthSelector}>
                                <TouchableOpacity>
                                    <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
                                </TouchableOpacity>
                                <Text style={[styles.monthText, { color: theme.text }]}>{currentMonth}</Text>
                                <TouchableOpacity>
                                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Simple calendar UI - simplified activity indicator */}
                            <View style={styles.calendarGrid}>
                                <View style={styles.calendarRow}>
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                        <Text key={index} style={[styles.calendarDayHeader, { color: theme.textSecondary }]}>{day}</Text>
                                    ))}
                                </View>

                                <View style={styles.calendarDays}>
                                    {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
                                        const currentDate = new Date();
                                        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                        const hasWorkout = workoutDates.has(checkDate.toDateString());
                                        return (
                                            <View key={day} style={styles.calendarDay}>
                                                <Text style={[styles.calendarDayText, { color: theme.text }]}>{day}</Text>
                                                {hasWorkout && <View style={[styles.workoutDot, { backgroundColor: theme.primary }]} />}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>

                        <View style={[styles.workoutHistoryContainer, { backgroundColor: theme.card }]}>
                            <Text style={[styles.workoutHistoryTitle, { color: theme.text }]}>
                                {selectedCategory === 'all' ? 'Recent Workouts' : `${selectedCategory} Workouts`}
                            </Text>

                            {filteredWorkouts.length === 0 ? (
                                <View style={styles.emptyFilterState}>
                                    <Ionicons name="search-outline" size={40} color={theme.textTertiary} />
                                    <Text style={[styles.emptyFilterText, { color: theme.textSecondary }]}>
                                        No {selectedCategory === 'all' ? '' : selectedCategory.toLowerCase()} workouts found
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.clearFilterButton, { backgroundColor: theme.primary }]}
                                        onPress={() => setSelectedCategory('all')}
                                    >
                                        <Text style={styles.clearFilterText}>Clear Filter</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    {filteredWorkouts.map(workout => {
                                const workoutDate = workout.createdAt && workout.createdAt.toDate ? workout.createdAt.toDate() : new Date();
                                const durationMinutes = workout.durationMinutes || Math.floor((workout.duration || 0) / 60);
                                const completionScore = workout.completionPercentage || 0;

                                // Map category to icon and color
                                const categoryConfig = {
                                    'Shooting': { icon: 'basketball', color: '#FF6B00' },
                                    'Dribbling': { icon: 'hand-left', color: '#4CAF50' },
                                    'Physical': { icon: 'fitness', color: '#2196F3' },
                                    'Defense': { icon: 'shield', color: '#9C27B0' },
                                    'Passing': { icon: 'swap-horizontal', color: '#FF9800' },
                                };

                                const config = categoryConfig[workout.category] || { icon: 'fitness', color: '#666' };

                                return (
                                    <TouchableOpacity
                                        key={workout.id}
                                        style={[styles.historyItem, { borderBottomColor: theme.border }]}
                                        onPress={() => {
                                            // Navigate to workout details
                                            navigation.navigate('WorkoutDetail', { workoutId: workout.workoutId });
                                        }}
                                    >
                                        <View style={styles.historyItemLeft}>
                                            <View style={[styles.historyItemIcon, { backgroundColor: `${config.color}15` }]}>
                                                <Ionicons name={config.icon} size={20} color={config.color} />
                                            </View>
                                        </View>

                                        <View style={styles.historyItemContent}>
                                            <Text style={[styles.historyItemTitle, { color: theme.text }]}>{workout.title}</Text>
                                            <View style={styles.historyItemMeta}>
                                                <View style={styles.historyItemMetaItem}>
                                                    <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                                                    <Text style={[styles.historyItemMetaText, { color: theme.textSecondary }]}>
                                                        {workoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </Text>
                                                </View>
                                                <View style={styles.historyItemMetaItem}>
                                                    <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                                                    <Text style={[styles.historyItemMetaText, { color: theme.textSecondary }]}>{durationMinutes} min</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                );
                                    })}

                                    {workoutHistory.length > 10 && (
                                        <TouchableOpacity style={[styles.viewMoreButton, { backgroundColor: theme.backgroundTertiary }]}>
                                            <Text style={[styles.viewMoreText, { color: theme.textSecondary }]}>View All History ({workoutHistory.length} total)</Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}
                        </View>
                    </>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Your Progress</Text>
            </View>

            {/* Tabs - wrapped with TourStep for onboarding */}
            <TourStep stepId="progress-tabs">
                <View style={[styles.tabsContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                            onPress={() => handleTabChange(tab.id)}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    { color: theme.textSecondary },
                                    activeTab === tab.id && [styles.activeTabText, { color: theme.primary }]
                                ]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <Animated.View
                        style={[
                            styles.tabIndicator,
                            { backgroundColor: theme.primary },
                            {
                                left: tabIndicatorPosition,
                                width: width / TABS.length,
                            }
                        ]}
                    />
                </View>
            </TourStep>

            {/* Tab Content */}
            <ScrollView style={[styles.contentContainer, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
                {activeTab === 'stats' && renderStatsTab()}
                {activeTab === 'achievements' && renderAchievementsTab()}
                {activeTab === 'goals' && renderGoalsTab()}
                {activeTab === 'history' && renderHistoryTab()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        position: 'relative',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
    },
    tabText: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    activeTabText: {
        fontWeight: 'bold',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
    },
    contentContainer: {
        flex: 1,
    },
    tabContent: {
        paddingBottom: 20,
    },

    // Overview Tab Styles
    summaryContainer: {
        padding: 16,
        borderBottomWidth: 1,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    timeframeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    timeframeText: {
        fontSize: 12,
        marginRight: 4,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricCard: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 12,
    },
    metricIcon: {
        marginBottom: 8,
    },
    caloriesCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
        gap: 8,
    },
    caloriesText: {
        fontSize: 14,
        color: '#2E7D32',
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
    },
    chartContainer: {
        padding: 16,
        marginTop: 8,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    chart: {
        borderRadius: 12,
        marginBottom: 8,
    },
    // Stats Tab Styles
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chartPeriod: {
        fontSize: 12,
        fontWeight: '500',
    },
    shootingAccuracyCard: {
        padding: 16,
        marginTop: 8,
    },
    accuracyContent: {
        marginTop: 16,
    },
    accuracyMain: {
        alignItems: 'center',
        marginBottom: 16,
    },
    accuracyPercentage: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    accuracyLabel: {
        fontSize: 14,
        marginTop: 4,
    },
    accuracyProgressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16,
    },
    accuracyProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    accuracyStats: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 12,
    },
    accuracyStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    accuracyDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    accuracyStatText: {
        fontSize: 14,
        fontWeight: '500',
    },
    accuracyHint: {
        fontSize: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 'auto',
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600',
    },
    skillChartContainer: {
        padding: 16,
        marginTop: 8,
    },
    skillsSnapshotContainer: {
        padding: 16,
        marginTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '500',
    },
    skillProgressRow: {
        marginBottom: 8,
    },
    skillProgress: {
        marginBottom: 16,
    },
    skillHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    skillName: {
        fontSize: 14,
        fontWeight: '500',
    },
    skillValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    goalsSnapshotContainer: {
        padding: 16,
        marginTop: 8,
    },
    goalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    goalInfo: {
        flex: 1,
        marginRight: 16,
    },
    goalName: {
        fontSize: 14,
        marginBottom: 8,
    },
    goalProgress: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    goalProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    goalStats: {
        alignItems: 'flex-end',
    },
    goalPercentage: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    goalDeadline: {
        fontSize: 12,
    },
    moreIndicator: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
    achievementsContainer: {
        padding: 16,
        marginTop: 8,
    },
    achievementsScroll: {
        paddingVertical: 8,
    },
    achievementBadge: {
        width: 90,
        marginRight: 16,
        alignItems: 'center',
        position: 'relative',
    },
    badgeIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    badgeName: {
        fontSize: 12,
        textAlign: 'center',
    },
    lockedAchievement: {
        opacity: 0.7,
    },
    lockedBadgeName: {
        color: '#999',
    },
    lockIconContainer: {
        position: 'absolute',
        top: 0,
        right: 15,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#666',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        margin: 16,
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    emptyStateSubtext: {
        fontSize: 13,
        textAlign: 'center',
    },
    emptyStateButton: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    emptyStateButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },

    // Skills Tab Styles
    skillSelector: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    skillTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
    },
    selectedSkillTab: {
    },
    skillTabText: {
        fontSize: 14,
        marginLeft: 6,
    },
    selectedSkillTabText: {
        fontWeight: '600',
    },
    skillDetailContainer: {
        padding: 16,
        marginTop: 8,
    },
    skillDetailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    skillDetailName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    skillDetailRating: {
        fontSize: 14,
    },
    skillBreakdownContainer: {
        padding: 16,
        marginTop: 8,
    },
    skillBreakdownTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    skillBreakdownItem: {
        marginBottom: 16,
    },
    skillBreakdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    skillBreakdownNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    skillBreakdownIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    skillBreakdownName: {
        fontSize: 14,
        fontWeight: '500',
    },
    skillBreakdownValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    skillBreakdownBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    skillBreakdownFill: {
        height: '100%',
        borderRadius: 3,
    },
    categoryDistributionContainer: {
        padding: 16,
        marginTop: 8,
    },
    categorySubtitle: {
        fontSize: 13,
        marginBottom: 16,
    },
    categoryItem: {
        marginBottom: 16,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryName: {
        fontSize: 15,
        fontWeight: '600',
    },
    categoryCount: {
        fontSize: 12,
        marginTop: 2,
    },
    categoryPercentage: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    categoryBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    categoryBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    suggestedTrainingContainer: {
        padding: 16,
        marginTop: 8,
    },
    trainingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    trainingItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    trainingItemIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    trainingItemInfo: {
        flex: 1,
    },
    trainingItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    trainingItemDescription: {
        fontSize: 12,
    },

    // Goals Tab Styles
    goalsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    goalsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    addGoalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF6B00',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addGoalText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    goalsList: {
        padding: 16,
    },
    goalCard: {
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        overflow: 'hidden',
    },
    goalCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    goalCardHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    goalStatusIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    goalCardTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    goalCardProgress: {
        padding: 16,
    },
    goalCardProgressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    goalCardProgressText: {
        fontSize: 14,
    },
    goalCardProgressPercentage: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    goalCardProgressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    goalCardProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    goalCardDetails: {
        padding: 16,
        backgroundColor: '#F5F5F5',
    },
    goalCardDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    goalCardDetailText: {
        fontSize: 14,
        marginLeft: 8,
    },
    updateProgressContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    updateProgressTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    updateProgressControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    updateProgressButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    currentProgressValue: {
        fontSize: 18,
        fontWeight: 'bold',
        paddingHorizontal: 16,
    },
    goalCardActions: {
        flexDirection: 'row',
        marginTop: 16,
    },
    goalCardActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    goalCardActionText: {
        fontSize: 14,
        marginLeft: 4,
    },
    goalCardActionDelete: {
        borderWidth: 1,
        borderColor: '#F44336',
    },
    // Goal icon container
    goalIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    goalHeaderInfo: {
        flex: 1,
    },
    goalMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 8,
    },
    goalTimeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    goalTimeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    goalStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    emptyGoalIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    // Completed goals section
    completedGoalsSection: {
        borderRadius: 12,
        marginTop: 16,
        overflow: 'hidden',
    },
    completedGoalsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    completedGoalsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    completedGoalsTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    completedGoalsList: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    completedGoalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    completedGoalIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    completedGoalName: {
        flex: 1,
        fontSize: 14,
    },
    completedGoalValue: {
        fontSize: 13,
    },
    // Goals Coming Soon Styles
    goalsSoonHero: {
        borderRadius: 16,
        padding: 24,
        margin: 16,
        alignItems: 'center',
    },
    goalsSoonIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    goalsSoonTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    goalsSoonSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    goalsSoonBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    goalsSoonBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    goalsSoonSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginHorizontal: 16,
        marginBottom: 12,
    },
    goalsSoonFeatures: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    goalsSoonFeatureCard: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
    },
    goalsSoonFeatureIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    goalsSoonFeatureContent: {
        flex: 1,
    },
    goalsSoonFeatureTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    goalsSoonFeatureDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    goalsSoonCta: {
        borderRadius: 16,
        padding: 20,
        margin: 16,
        alignItems: 'center',
    },
    goalsSoonCtaTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    goalsSoonCtaText: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
    },
    goalsSoonCtaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    goalsSoonCtaButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },

    // History Tab Styles
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    historyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    historyFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    historyFilterText: {
        fontSize: 14,
        marginLeft: 4,
    },
    categoryFilterContainer: {
        marginTop: 12,
        marginBottom: 8,
    },
    categoryFilterContent: {
        paddingHorizontal: 16,
        gap: 10,
    },
    categoryFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: 'transparent',
        gap: 6,
    },
    categoryFilterText: {
        fontSize: 14,
    },
    emptyFilterState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyFilterText: {
        fontSize: 15,
        marginTop: 12,
        marginBottom: 16,
        textAlign: 'center',
    },
    clearFilterButton: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    clearFilterText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    calendarContainer: {
        padding: 16,
        marginTop: 8,
    },
    calendarTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    monthText: {
        fontSize: 16,
        fontWeight: '500',
    },
    calendarGrid: {},
    calendarRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
    calendarDayHeader: {
        width: 30,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '500',
    },
    calendarDays: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    calendarDay: {
        width: width / 7 - 10,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 5,
        position: 'relative',
    },
    calendarDayText: {
        fontSize: 14,
    },
    workoutDot: {
        position: 'absolute',
        bottom: 2,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FF6B00',
    },
    workoutHistoryContainer: {
        padding: 16,
        marginTop: 8,
    },
    workoutHistoryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    historyItemLeft: {
        width: 50,
        alignItems: 'center',
    },
    historyItemIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyItemDate: {
        fontSize: 12,
        textAlign: 'center',
    },
    historyItemContent: {
        flex: 1,
        marginLeft: 10,
    },
    historyItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    historyItemMeta: {
        flexDirection: 'row',
    },
    historyItemMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    historyItemMetaText: {
        fontSize: 12,
        marginLeft: 4,
    },
    viewMoreButton: {
        backgroundColor: '#F5F5F5',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    viewMoreText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Recommendations Styles
    recommendationsContainer: {
        padding: 16,
        marginTop: 8,
        marginBottom: 20,
    },
    recommendationCard: {
        backgroundColor: '#FFF9F5',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: '#FF6B00',
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    recommendationHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    recommendationIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.15,
    },
    recommendationInfo: {
        flex: 1,
    },
    recommendationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    recommendationReason: {
        fontSize: 14,
        lineHeight: 20,
    },
    recommendationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF6B00',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    recommendationButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    alternativesSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#FFE5D4',
    },
    alternativesLabel: {
        fontSize: 13,
        marginBottom: 10,
    },
    alternativesChips: {
        flexDirection: 'row',
        gap: 8,
    },
    alternativeChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#FF6B00',
    },
    alternativeChipText: {
        fontSize: 13,
        color: '#FF6B00',
        fontWeight: '500',
    },

    // ==================== ACHIEVEMENTS TAB STYLES ====================
    xpLevelCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    xpLevelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    levelBadge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    levelNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    xpLevelInfo: {
        flex: 1,
    },
    levelTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    xpText: {
        fontSize: 14,
        fontWeight: '500',
    },
    achievementsTrophyIcon: {
        alignItems: 'center',
        gap: 4,
    },
    achievementCount: {
        fontSize: 12,
        fontWeight: '600',
    },
    xpProgressSection: {
        gap: 8,
    },
    xpProgressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    xpProgressFill: {
        height: '100%',
        backgroundColor: '#FF6B00',
        borderRadius: 4,
    },
    xpProgressText: {
        fontSize: 12,
        textAlign: 'center',
    },
    achievementCategoryFilter: {
        marginBottom: 16,
        flexGrow: 0,
    },
    achievementCategoryContent: {
        paddingHorizontal: 4,
        gap: 8,
    },
    achievementCategoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    achievementCategoryChipActive: {
        backgroundColor: '#FF6B0015',
        borderColor: '#FF6B00',
    },
    achievementCategoryChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    achievementCategoryChipTextActive: {
        fontWeight: '600',
    },
    achievementsList: {
        gap: 12,
    },
    emptyAchievements: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyAchievementsText: {
        fontSize: 14,
        textAlign: 'center',
    },
    achievementCard: {
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    achievementCardUnlocked: {
        backgroundColor: '#FFF',
        borderColor: '#4CAF5030',
    },
    achievementIconContainer: {
        position: 'relative',
    },
    achievementIcon: {
        width: 56,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    achievementIconUnlocked: {
        borderColor: 'transparent',
    },
    unlockedBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 2,
    },
    achievementInfo: {
        flex: 1,
        gap: 4,
    },
    achievementTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    achievementTitleLocked: {
    },
    achievementDescription: {
        fontSize: 13,
        lineHeight: 18,
    },
    achievementProgressSection: {
        marginTop: 8,
        gap: 4,
    },
    achievementProgressBar: {
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    achievementProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    achievementProgressText: {
        fontSize: 11,
        fontWeight: '500',
    },
    achievementTierBadge: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 2,
    },
    achievementTierText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    achievementXPText: {
        fontSize: 11,
        fontWeight: '600',
    },
});

export default ProgressScreen;
