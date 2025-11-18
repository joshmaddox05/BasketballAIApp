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
    getAchievementProgress
} from '../../services/firestoreService';
import { ACHIEVEMENT_CATEGORIES } from '../../data/achievements';
import UpgradePrompt from '../../components/shared/UpgradePrompt';
import LockedFeatureCard from '../../components/features/LockedFeatureCard';
import { canAccessFeature } from '../../utils/subscription';

const { width } = Dimensions.get('window');

// Tab options for progress screen
const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'skills', label: 'Skills' },
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

    const [activeTab, setActiveTab] = useState('overview');
    const [expandedGoalId, setExpandedGoalId] = useState(null);
    const [selectedTimeframe, setSelectedTimeframe] = useState('month'); // week, month, year
    const [selectedSkill, setSelectedSkill] = useState('shooting'); // shooting, dribbling, etc.
    const [selectedCategory, setSelectedCategory] = useState('all'); // all, shooting, dribbling, physical, etc.

    // Real analytics data
    const [workoutStats, setWorkoutStats] = useState(null);
    const [workoutHistory, setWorkoutHistory] = useState([]);
    const [categoryBreakdown, setCategoryBreakdown] = useState({});
    const [currentStreak, setCurrentStreak] = useState(0);
    const [recommendations, setRecommendations] = useState(null);
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
            const [stats, history, breakdown, streak, recs, gamification, achievements] = await Promise.all([
                getWorkoutStats(userData.uid, selectedTimeframe),
                getWorkoutHistory(userData.uid, { limitCount: 100 }),
                getCategoryBreakdown(userData.uid, selectedTimeframe),
                getWorkoutStreak(userData.uid),
                getWorkoutRecommendations(userData.uid),
                getGamificationStats(userData.uid),
                getAchievementProgress(userData.uid)
            ]);

            setWorkoutStats(stats);
            setWorkoutHistory(history);
            setCategoryBreakdown(breakdown);
            setCurrentStreak(streak);
            setRecommendations(recs);
            setGamificationStats(gamification);
            setAchievementProgress(achievements);
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

    // Get skill data for charts
    const getSkillData = () => {
        // In a real app, this would come from backend
        switch(selectedSkill) {
            case 'shooting':
                return {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                        {
                            data: [65, 68, 72, 74, 78, userData.stats.shooting || 80],
                            color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
                            strokeWidth: 2
                        }
                    ]
                };
            case 'dribbling':
                return {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                        {
                            data: [60, 63, 65, 68, 70, userData.stats.dribbling || 75],
                            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                            strokeWidth: 2
                        }
                    ]
                };
            case 'physical':
                return {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                        {
                            data: [55, 60, 65, 70, 75, 80],
                            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                            strokeWidth: 2
                        }
                    ]
                };
            default:
                return {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                        {
                            data: [50, 55, 60, 65, 70, 75],
                            color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
                            strokeWidth: 2
                        }
                    ]
                };
        }
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

    // Renders the Overview tab content
    const renderOverviewTab = () => {
        if (loading) {
            return (
                <View style={[styles.tabContent, styles.loadingContainer]}>
                    <ActivityIndicator size="large" color="#FF6B00" />
                    <Text style={styles.loadingText}>Loading your progress...</Text>
                </View>
            );
        }

        const totalWorkouts = workoutStats?.totalWorkouts || 0;
        const totalCalories = workoutStats?.totalCalories || 0;
        const avgDuration = workoutStats?.averageDuration || 0;

        return (
            <View style={styles.tabContent}>
                {/* Progress Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryHeader}>
                        <Text style={styles.summaryTitle}>Progress Summary</Text>
                        <TouchableOpacity
                            style={styles.timeframeSelector}
                            onPress={() => {
                                const timeframes = ['week', 'month', 'year'];
                                const currentIndex = timeframes.indexOf(selectedTimeframe);
                                const nextIndex = (currentIndex + 1) % timeframes.length;
                                setSelectedTimeframe(timeframes[nextIndex]);
                            }}
                        >
                            <Text style={styles.timeframeText}>
                                {selectedTimeframe === 'week' ? 'This Week' : selectedTimeframe === 'month' ? 'This Month' : 'This Year'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.metricsRow}>
                        <View style={styles.metricCard}>
                            <Ionicons name="fitness" size={24} color="#FF6B00" style={styles.metricIcon} />
                            <Text style={styles.metricValue}>{totalWorkouts}</Text>
                            <Text style={styles.metricLabel}>Workouts</Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Ionicons name="flame" size={24} color="#FF6B00" style={styles.metricIcon} />
                            <Text style={styles.metricValue}>{calculateStreak()}</Text>
                            <Text style={styles.metricLabel}>Day Streak</Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Ionicons name="time" size={24} color="#FF6B00" style={styles.metricIcon} />
                            <Text style={styles.metricValue}>{avgDuration}</Text>
                            <Text style={styles.metricLabel}>Avg Minutes</Text>
                        </View>
                    </View>

                    {totalCalories > 0 && (
                        <View style={styles.caloriesCard}>
                            <Ionicons name="nutrition" size={20} color="#4CAF50" />
                            <Text style={styles.caloriesText}>
                                ~{totalCalories} calories burned this {selectedTimeframe}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Activity Chart */}
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Activity Minutes</Text>
                    <BarChart
                        data={getActivityData()}
                        width={width - 32}
                        height={180}
                        yAxisSuffix=" min"
                        chartConfig={chartConfig}
                        style={styles.chart}
                        showBarTops={false}
                        fromZero
                    />
                </View>

                {/* Skills Snapshot */}
                <View style={styles.skillsSnapshotContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Skills Progress</Text>
                        <TouchableOpacity onPress={() => handleTabChange('skills')}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.skillProgressRow}>
                        <View style={styles.skillProgress}>
                            <View style={styles.skillHeader}>
                                <Text style={styles.skillName}>Shooting</Text>
                                <Text style={styles.skillValue}>{userData.stats.shooting || 0}%</Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View
                                    style={[styles.progressFill, { width: `${userData.stats.shooting || 0}%`, backgroundColor: '#FF6B00' }]}
                                />
                            </View>
                        </View>

                        <View style={styles.skillProgress}>
                            <View style={styles.skillHeader}>
                                <Text style={styles.skillName}>Dribbling</Text>
                                <Text style={styles.skillValue}>{userData.stats.dribbling || 0}%</Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View
                                    style={[styles.progressFill, { width: `${userData.stats.dribbling || 0}%`, backgroundColor: '#4CAF50' }]}
                                />
                            </View>
                        </View>

                        <View style={styles.skillProgress}>
                            <View style={styles.skillHeader}>
                                <Text style={styles.skillName}>Physical</Text>
                                <Text style={styles.skillValue}>70%</Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View
                                    style={[styles.progressFill, { width: '70%', backgroundColor: '#2196F3' }]}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Goals Snapshot */}
                <View style={styles.goalsSnapshotContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Goals</Text>
                        <TouchableOpacity onPress={() => handleTabChange('goals')}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {goals.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No active goals yet.</Text>
                            <TouchableOpacity
                                style={styles.emptyStateButton}
                                onPress={() => navigation.navigate('AddGoal')}
                            >
                                <Text style={styles.emptyStateButtonText}>Create Goal</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {goals.slice(0, 2).map(goal => (
                                <View key={goal.id} style={styles.goalItem}>
                                    <View style={styles.goalInfo}>
                                        <Text style={styles.goalName}>{goal.name}</Text>
                                        <View style={styles.goalProgress}>
                                            <View
                                                style={[
                                                    styles.goalProgressFill,
                                                    {
                                                        width: `${calculateGoalProgress(goal)}%`,
                                                        backgroundColor: isGoalOnTrack(goal) ? '#4CAF50' : '#FF9800'
                                                    }
                                                ]}
                                            />
                                        </View>
                                    </View>
                                    <View style={styles.goalStats}>
                                        <Text style={styles.goalPercentage}>{calculateGoalProgress(goal)}%</Text>
                                        {goal.deadline && (
                                            <Text style={styles.goalDeadline}>
                                                {new Date(goal.deadline).toLocaleDateString()}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}

                            {goals.length > 2 && (
                                <Text style={styles.moreIndicator}>+{goals.length - 2} more goals</Text>
                            )}
                        </>
                    )}
                </View>

                {/* Achievements */}
                <View style={styles.achievementsContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Achievements</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.achievementsScroll}
                    >
                        {achievements.map(achievement => (
                            <View
                                key={achievement.id}
                                style={[
                                    styles.achievementBadge,
                                    !achievement.unlocked && styles.lockedAchievement
                                ]}
                            >
                                <View style={styles.badgeIconContainer}>
                                    <Ionicons
                                        name={achievement.icon}
                                        size={24}
                                        color={achievement.unlocked ? '#FF6B00' : '#BBB'}
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.badgeName,
                                        !achievement.unlocked && styles.lockedBadgeName
                                    ]}
                                >
                                    {achievement.name}
                                </Text>
                                {!achievement.unlocked && (
                                    <View style={styles.lockIconContainer}>
                                        <Ionicons name="lock-closed" size={12} color="#FFF" />
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Smart Recommendations */}
                {recommendations && (
                    <View style={styles.recommendationsContainer}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="bulb" size={20} color="#FF6B00" />
                            <Text style={styles.sectionTitle}>Recommended For You</Text>
                        </View>

                        <View style={styles.recommendationCard}>
                            <View style={styles.recommendationHeader}>
                                <View style={styles.recommendationIconContainer}>
                                    <Ionicons name="trophy" size={24} color="#FF6B00" />
                                </View>
                                <View style={styles.recommendationInfo}>
                                    <Text style={styles.recommendationTitle}>
                                        Try {recommendations.nextWorkout} Next
                                    </Text>
                                    <Text style={styles.recommendationReason}>
                                        {recommendations.reason}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.recommendationButton}
                                onPress={() => {
                                    navigation.navigate('Train', {
                                        screen: 'TrainMain',
                                        params: { filterCategory: recommendations.nextWorkout }
                                    });
                                }}
                            >
                                <Text style={styles.recommendationButtonText}>
                                    Browse {recommendations.nextWorkout} Workouts
                                </Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFF" />
                            </TouchableOpacity>

                            {recommendations.alternativeWorkouts && recommendations.alternativeWorkouts.length > 0 && (
                                <View style={styles.alternativesSection}>
                                    <Text style={styles.alternativesLabel}>Or try:</Text>
                                    <View style={styles.alternativesChips}>
                                        {recommendations.alternativeWorkouts.map((alt, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.alternativeChip}
                                                onPress={() => {
                                                    navigation.navigate('Train', {
                                                        screen: 'TrainMain',
                                                        params: { filterCategory: alt }
                                                    });
                                                }}
                                            >
                                                <Text style={styles.alternativeChipText}>{alt}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}
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
                    <ActivityIndicator size="large" color="#FF6B00" />
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
                <View style={styles.xpLevelCard}>
                    <View style={styles.xpLevelHeader}>
                        <View style={styles.levelBadge}>
                            <Text style={styles.levelNumber}>{levelInfo.level}</Text>
                        </View>
                        <View style={styles.xpLevelInfo}>
                            <Text style={styles.levelTitle}>{levelInfo.title}</Text>
                            <Text style={styles.xpText}>{gamificationStats.totalXP} XP</Text>
                        </View>
                        <TouchableOpacity style={styles.achievementsTrophyIcon}>
                            <Ionicons name="trophy" size={28} color="#FFD700" />
                            <Text style={styles.achievementCount}>
                                {unlockedAchievements.length}/{achievementProgress.length}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* XP Progress Bar */}
                    {levelInfo.xpForNextLevel && (
                        <View style={styles.xpProgressSection}>
                            <View style={styles.xpProgressBar}>
                                <View
                                    style={[
                                        styles.xpProgressFill,
                                        { width: `${levelInfo.progressToNextLevel}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.xpProgressText}>
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
                            selectedAchievementCategory === 'all' && styles.achievementCategoryChipActive
                        ]}
                        onPress={() => setSelectedAchievementCategory('all')}
                    >
                        <Ionicons
                            name="apps"
                            size={16}
                            color={selectedAchievementCategory === 'all' ? '#FF6B00' : '#666'}
                        />
                        <Text style={[
                            styles.achievementCategoryChipText,
                            selectedAchievementCategory === 'all' && styles.achievementCategoryChipTextActive
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
                                    isSelected && styles.achievementCategoryChipActive
                                ]}
                                onPress={() => setSelectedAchievementCategory(category)}
                            >
                                <Ionicons
                                    name={categoryIcons[category]}
                                    size={16}
                                    color={isSelected ? '#FF6B00' : '#666'}
                                />
                                <Text style={[
                                    styles.achievementCategoryChipText,
                                    isSelected && styles.achievementCategoryChipTextActive
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
                            <Ionicons name="trophy-outline" size={64} color="#CCC" />
                            <Text style={styles.emptyAchievementsText}>No achievements in this category</Text>
                        </View>
                    ) : (
                        filteredAchievements.map((achievement, index) => (
                            <View
                                key={achievement.id}
                                style={[
                                    styles.achievementCard,
                                    achievement.unlocked && styles.achievementCardUnlocked
                                ]}
                            >
                                <View style={styles.achievementIconContainer}>
                                    <View
                                        style={[
                                            styles.achievementIcon,
                                            achievement.unlocked && styles.achievementIconUnlocked,
                                            { backgroundColor: achievement.tier.color + '20' }
                                        ]}
                                    >
                                        <Ionicons
                                            name={achievement.icon}
                                            size={28}
                                            color={achievement.unlocked ? achievement.tier.color : '#CCC'}
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
                                        !achievement.unlocked && styles.achievementTitleLocked
                                    ]}>
                                        {achievement.title}
                                    </Text>
                                    <Text style={styles.achievementDescription}>
                                        {achievement.description}
                                    </Text>

                                    {!achievement.unlocked && achievement.progress > 0 && (
                                        <View style={styles.achievementProgressSection}>
                                            <View style={styles.achievementProgressBar}>
                                                <View
                                                    style={[
                                                        styles.achievementProgressFill,
                                                        { width: `${achievement.progress}%`, backgroundColor: achievement.tier.color }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.achievementProgressText}>
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
                                    <Text style={styles.achievementXPText}>
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

    // Renders the Skills tab content
    const renderSkillsTab = () => {
        return (
            <View style={styles.tabContent}>
                {/* Skill Selector */}
                <View style={styles.skillSelector}>
                    <TouchableOpacity
                        style={[styles.skillTab, selectedSkill === 'shooting' && styles.selectedSkillTab]}
                        onPress={() => setSelectedSkill('shooting')}
                    >
                        <Ionicons
                            name="basketball"
                            size={18}
                            color={selectedSkill === 'shooting' ? '#FF6B00' : '#666'}
                        />
                        <Text
                            style={[
                                styles.skillTabText,
                                selectedSkill === 'shooting' && styles.selectedSkillTabText
                            ]}
                        >
                            Shooting
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.skillTab, selectedSkill === 'dribbling' && styles.selectedSkillTab]}
                        onPress={() => setSelectedSkill('dribbling')}
                    >
                        <Ionicons
                            name="hand-left"
                            size={18}
                            color={selectedSkill === 'dribbling' ? '#4CAF50' : '#666'}
                        />
                        <Text
                            style={[
                                styles.skillTabText,
                                selectedSkill === 'dribbling' && styles.selectedSkillTabText,
                                selectedSkill === 'dribbling' && { color: '#4CAF50' }
                            ]}
                        >
                            Dribbling
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.skillTab, selectedSkill === 'physical' && styles.selectedSkillTab]}
                        onPress={() => setSelectedSkill('physical')}
                    >
                        <Ionicons
                            name="fitness"
                            size={18}
                            color={selectedSkill === 'physical' ? '#2196F3' : '#666'}
                        />
                        <Text
                            style={[
                                styles.skillTabText,
                                selectedSkill === 'physical' && styles.selectedSkillTabText,
                                selectedSkill === 'physical' && { color: '#2196F3' }
                            ]}
                        >
                            Physical
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Skill Details */}
                <View style={styles.skillDetailContainer}>
                    <View style={styles.skillDetailHeader}>
                        <View>
                            <Text style={styles.skillDetailName}>
                                {selectedSkill === 'shooting' ? 'Shooting Form' :
                                    selectedSkill === 'dribbling' ? 'Dribbling Control' : 'Physical Fitness'}
                            </Text>
                            <Text style={styles.skillDetailRating}>
                                Current Rating:
                                <Text style={{
                                    fontWeight: 'bold',
                                    color: selectedSkill === 'shooting' ? '#FF6B00' :
                                        selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'
                                }}>
                                    {' '}
                                    {selectedSkill === 'shooting' ? userData.stats.shooting || 0 :
                                        selectedSkill === 'dribbling' ? userData.stats.dribbling || 0 : 70}%
                                </Text>
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.timeframeSelector}>
                            <Text style={styles.timeframeText}>6 Months</Text>
                            <Ionicons name="chevron-down" size={16} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Skill Progress Chart */}
                    <LineChart
                        data={getSkillData()}
                        width={width - 32}
                        height={220}
                        chartConfig={{
                            ...chartConfig,
                            color: (opacity = 1) => selectedSkill === 'shooting' ? `rgba(255, 107, 0, ${opacity})` :
                                selectedSkill === 'dribbling' ? `rgba(76, 175, 80, ${opacity})` :
                                    `rgba(33, 150, 243, ${opacity})`,
                            propsForDots: {
                                r: '6',
                                strokeWidth: '2',
                                stroke: selectedSkill === 'shooting' ? '#FF6B00' :
                                    selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'
                            }
                        }}
                        bezier
                        style={styles.chart}
                    />
                </View>

                {/* Skill Breakdown */}
                <View style={styles.skillBreakdownContainer}>
                    <Text style={styles.skillBreakdownTitle}>Skill Breakdown</Text>

                    <View style={styles.skillBreakdownItem}>
                        <View style={styles.skillBreakdownHeader}>
                            <View style={styles.skillBreakdownNameContainer}>
                                <View
                                    style={[
                                        styles.skillBreakdownIcon,
                                        {
                                            backgroundColor: selectedSkill === 'shooting' ? '#FFF0E6' :
                                                selectedSkill === 'dribbling' ? '#E8F5E9' : '#E3F2FD'
                                        }
                                    ]}
                                >
                                    <Ionicons
                                        name={selectedSkill === 'shooting' ? 'analytics' :
                                            selectedSkill === 'dribbling' ? 'hand-left' : 'fitness'}
                                        size={18}
                                        color={selectedSkill === 'shooting' ? '#FF6B00' :
                                            selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'}
                                    />
                                </View>
                                <Text style={styles.skillBreakdownName}>
                                    {selectedSkill === 'shooting' ? 'Form Accuracy' :
                                        selectedSkill === 'dribbling' ? 'Ball Control' : 'Agility'}
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.skillBreakdownValue,
                                    {
                                        color: selectedSkill === 'shooting' ? '#FF6B00' :
                                            selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'
                                    }
                                ]}
                            >
                                85%
                            </Text>
                        </View>
                        <View style={styles.skillBreakdownBar}>
                            <View
                                style={[
                                    styles.skillBreakdownFill,
                                    {
                                        width: '85%',
                                        backgroundColor: selectedSkill === 'shooting' ? '#FF6B00' :
                                            selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'
                                    }
                                ]}
                            />
                        </View>
                    </View>

                    <View style={styles.skillBreakdownItem}>
                        <View style={styles.skillBreakdownHeader}>
                            <View style={styles.skillBreakdownNameContainer}>
                                <View
                                    style={[
                                        styles.skillBreakdownIcon,
                                        {
                                            backgroundColor: selectedSkill === 'shooting' ? '#FFF0E6' :
                                                selectedSkill === 'dribbling' ? '#E8F5E9' : '#E3F2FD'
                                        }
                                    ]}
                                >
                                    <Ionicons
                                        name="speedometer"
                                        size={18}
                                        color={selectedSkill === 'shooting' ? '#FF6B00' :
                                            selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'}
                                    />
                                </View>
                                <Text style={styles.skillBreakdownName}>
                                    {selectedSkill === 'shooting' ? 'Release Speed' :
                                        selectedSkill === 'dribbling' ? 'Speed' : 'Strength'}
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.skillBreakdownValue,
                                    {
                                        color: selectedSkill === 'shooting' ? '#FF6B00' :
                                            selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'
                                    }
                                ]}
                            >
                                70%
                            </Text>
                        </View>
                        <View style={styles.skillBreakdownBar}>
                            <View
                                style={[
                                    styles.skillBreakdownFill,
                                    {
                                        width: '70%',
                                        backgroundColor: selectedSkill === 'shooting' ? '#FF6B00' :
                                            selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'
                                    }
                                ]}
                            />
                        </View>
                    </View>

                    <View style={styles.skillBreakdownItem}>
                        <View style={styles.skillBreakdownHeader}>
                            <View style={styles.skillBreakdownNameContainer}>
                                <View
                                    style={[
                                        styles.skillBreakdownIcon,
                                        {
                                            backgroundColor: selectedSkill === 'shooting' ? '#FFF0E6' :
                                                selectedSkill === 'dribbling' ? '#E8F5E9' : '#E3F2FD'
                                        }
                                    ]}
                                >
                                    <Ionicons
                                        name="repeat"
                                        size={18}
                                        color={selectedSkill === 'shooting' ? '#FF6B00' :
                                            selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'}
                                    />
                                </View>
                                <Text style={styles.skillBreakdownName}>
                                    {selectedSkill === 'shooting' ? 'Consistency' :
                                        selectedSkill === 'dribbling' ? 'Versatility' : 'Endurance'}
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.skillBreakdownValue,
                                    {
                                        color: selectedSkill === 'shooting' ? '#FF6B00' :
                                            selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'
                                    }
                                ]}
                            >
                                75%
                            </Text>
                        </View>
                        <View style={styles.skillBreakdownBar}>
                            <View
                                style={[
                                    styles.skillBreakdownFill,
                                    {
                                        width: '75%',
                                        backgroundColor: selectedSkill === 'shooting' ? '#FF6B00' :
                                            selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'
                                    }
                                ]}
                            />
                        </View>
                    </View>
                </View>

                {/* Category Distribution */}
                {loading ? (
                    <View style={[styles.categoryDistributionContainer, styles.loadingContainer]}>
                        <ActivityIndicator size="small" color="#FF6B00" />
                    </View>
                ) : Object.keys(categoryBreakdown).length > 0 && (
                    <View style={styles.categoryDistributionContainer}>
                        <Text style={styles.sectionTitle}>Training Distribution</Text>
                        <Text style={styles.categorySubtitle}>
                            Your workout focus for this {selectedTimeframe.toLowerCase()}
                        </Text>

                        {Object.entries(categoryBreakdown)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, count]) => {
                                const total = Object.values(categoryBreakdown).reduce((sum, val) => sum + val, 0);
                                const percentage = Math.round((count / total) * 100);

                                // Map category to icon and color
                                const categoryConfig = {
                                    'Shooting': { icon: 'basketball', color: '#FF6B00' },
                                    'Dribbling': { icon: 'hand-left', color: '#4CAF50' },
                                    'Physical': { icon: 'fitness', color: '#2196F3' },
                                    'Defense': { icon: 'shield', color: '#9C27B0' },
                                    'Passing': { icon: 'swap-horizontal', color: '#FF9800' },
                                };

                                const config = categoryConfig[category] || { icon: 'fitness', color: '#666' };

                                return (
                                    <View key={category} style={styles.categoryItem}>
                                        <View style={styles.categoryHeader}>
                                            <View style={styles.categoryNameContainer}>
                                                <View style={[styles.categoryIcon, { backgroundColor: `${config.color}15` }]}>
                                                    <Ionicons name={config.icon} size={20} color={config.color} />
                                                </View>
                                                <View>
                                                    <Text style={styles.categoryName}>{category}</Text>
                                                    <Text style={styles.categoryCount}>{count} workout{count !== 1 ? 's' : ''}</Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.categoryPercentage, { color: config.color }]}>
                                                {percentage}%
                                            </Text>
                                        </View>
                                        <View style={styles.categoryBar}>
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

                {/* Suggested Training */}
                <View style={styles.suggestedTrainingContainer}>
                    <Text style={styles.sectionTitle}>Suggested Training</Text>

                    <TouchableOpacity
                        style={styles.trainingItem}
                        onPress={() => navigation.navigate('WorkoutDetail', { workoutId: '1' })}
                    >
                        <View style={styles.trainingItemContent}>
                            <View
                                style={[
                                    styles.trainingItemIcon,
                                    {
                                        backgroundColor: selectedSkill === 'shooting' ? '#FFF0E6' :
                                            selectedSkill === 'dribbling' ? '#E8F5E9' : '#E3F2FD'
                                    }
                                ]}
                            >
                                <Ionicons
                                    name="basketball"
                                    size={22}
                                    color={selectedSkill === 'shooting' ? '#FF6B00' :
                                        selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'}
                                />
                            </View>
                            <View style={styles.trainingItemInfo}>
                                <Text style={styles.trainingItemTitle}>
                                    {selectedSkill === 'shooting' ? 'Perfect Release Drill' :
                                        selectedSkill === 'dribbling' ? 'Advanced Dribbling Circuit' :
                                            'Agility Ladder Workout'}
                                </Text>
                                <Text style={styles.trainingItemDescription}>
                                    {selectedSkill === 'shooting' ? 'Improve your release angle and consistency' :
                                        selectedSkill === 'dribbling' ? 'Master complex dribbling patterns' :
                                            'Enhance your footwork and agility'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.trainingItem}
                        onPress={() => navigation.navigate('ShootingAnalysis')}
                    >
                        <View style={styles.trainingItemContent}>
                            <View
                                style={[
                                    styles.trainingItemIcon,
                                    {
                                        backgroundColor: selectedSkill === 'shooting' ? '#FFF0E6' :
                                            selectedSkill === 'dribbling' ? '#E8F5E9' : '#E3F2FD'
                                    }
                                ]}
                            >
                                <Ionicons
                                    name="analytics"
                                    size={22}
                                    color={selectedSkill === 'shooting' ? '#FF6B00' :
                                        selectedSkill === 'dribbling' ? '#4CAF50' : '#2196F3'}
                                />
                            </View>
                            <View style={styles.trainingItemInfo}>
                                <Text style={styles.trainingItemTitle}>
                                    {selectedSkill === 'shooting' ? 'AI Shooting Analysis' :
                                        selectedSkill === 'dribbling' ? 'Dribbling Assessment' :
                                            'Fitness Evaluation'}
                                </Text>
                                <Text style={styles.trainingItemDescription}>
                                    {selectedSkill === 'shooting' ? 'Get detailed feedback on your shooting form' :
                                        selectedSkill === 'dribbling' ? 'Analyze your ball handling skills' :
                                            'Measure your physical performance'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Renders the Goals tab content
    const renderGoalsTab = () => {
        return (
            <View style={styles.tabContent}>
                <View style={styles.goalsHeader}>
                    <Text style={styles.goalsTitle}>Your Training Goals</Text>
                    <TouchableOpacity
                        style={styles.addGoalButton}
                        onPress={() => navigation.navigate('AddGoal')}
                    >
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.addGoalText}>Add Goal</Text>
                    </TouchableOpacity>
                </View>

                {goals.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            You haven't set any goals yet. Goals help you stay motivated and track your progress.
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyStateButton}
                            onPress={() => navigation.navigate('AddGoal')}
                        >
                            <Text style={styles.emptyStateButtonText}>Create Your First Goal</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.goalsList}>
                        {goals.map(goal => (
                            <View key={goal.id} style={styles.goalCard}>
                                <TouchableOpacity
                                    style={styles.goalCardHeader}
                                    onPress={() => toggleGoalExpansion(goal.id)}
                                >
                                    <View style={styles.goalCardHeaderContent}>
                                        <View
                                            style={[
                                                styles.goalStatusIndicator,
                                                {
                                                    backgroundColor: isGoalOnTrack(goal) ? '#4CAF50' : '#FF9800'
                                                }
                                            ]}
                                        />
                                        <Text style={styles.goalCardTitle}>{goal.name}</Text>
                                    </View>
                                    <Ionicons
                                        name={expandedGoalId === goal.id ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color="#666"
                                    />
                                </TouchableOpacity>

                                <View style={styles.goalCardProgress}>
                                    <View style={styles.goalCardProgressInfo}>
                                        <Text style={styles.goalCardProgressText}>
                                            {goal.current} / {goal.target}
                                        </Text>
                                        <Text style={styles.goalCardProgressPercentage}>
                                            {calculateGoalProgress(goal)}%
                                        </Text>
                                    </View>
                                    <View style={styles.goalCardProgressBar}>
                                        <View
                                            style={[
                                                styles.goalCardProgressFill,
                                                {
                                                    width: `${calculateGoalProgress(goal)}%`,
                                                    backgroundColor: isGoalOnTrack(goal) ? '#4CAF50' : '#FF9800'
                                                }
                                            ]}
                                        />
                                    </View>
                                </View>

                                {expandedGoalId === goal.id && (
                                    <View style={styles.goalCardDetails}>
                                        {goal.deadline && (
                                            <View style={styles.goalCardDetailItem}>
                                                <Ionicons name="calendar" size={16} color="#666" />
                                                <Text style={styles.goalCardDetailText}>
                                                    Deadline: {new Date(goal.deadline).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.goalCardDetailItem}>
                                            <Ionicons
                                                name={isGoalOnTrack(goal) ? 'trending-up' : 'trending-down'}
                                                size={16}
                                                color={isGoalOnTrack(goal) ? '#4CAF50' : '#FF9800'}
                                            />
                                            <Text
                                                style={[
                                                    styles.goalCardDetailText,
                                                    { color: isGoalOnTrack(goal) ? '#4CAF50' : '#FF9800' }
                                                ]}
                                            >
                                                {isGoalOnTrack(goal) ? 'On track' : 'Falling behind'}
                                            </Text>
                                        </View>

                                        {/* Update Progress Controls */}
                                        <View style={styles.updateProgressContainer}>
                                            <Text style={styles.updateProgressTitle}>Update Progress</Text>
                                            <View style={styles.updateProgressControls}>
                                                <TouchableOpacity
                                                    style={styles.updateProgressButton}
                                                    onPress={() => {
                                                        if (goal.current > 0) {
                                                            updateGoalProgress(goal.id, goal.current - 1);
                                                        }
                                                    }}
                                                >
                                                    <Ionicons name="remove" size={18} color="#666" />
                                                </TouchableOpacity>
                                                <Text style={styles.currentProgressValue}>{goal.current}</Text>
                                                <TouchableOpacity
                                                    style={styles.updateProgressButton}
                                                    onPress={() => {
                                                        if (goal.current < goal.target) {
                                                            updateGoalProgress(goal.id, goal.current + 1);
                                                        }
                                                    }}
                                                >
                                                    <Ionicons name="add" size={18} color="#666" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={styles.goalCardActions}>
                                            <TouchableOpacity
                                                style={styles.goalCardActionButton}
                                                onPress={() => {
                                                    // Navigate to edit goal screen in a real app
                                                    Alert.alert('Edit Goal', 'Edit goal functionality would be implemented in a full app.');
                                                }}
                                            >
                                                <Ionicons name="create-outline" size={16} color="#666" />
                                                <Text style={styles.goalCardActionText}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.goalCardActionButton, styles.goalCardActionDelete]}
                                                onPress={() => {
                                                    Alert.alert(
                                                        'Delete Goal',
                                                        'Are you sure you want to delete this goal?',
                                                        [
                                                            { text: 'Cancel', style: 'cancel' },
                                                            {
                                                                text: 'Delete',
                                                                style: 'destructive',
                                                                onPress: () => {
                                                                    // Delete goal would be implemented in a full app
                                                                    Alert.alert('Delete Goal', 'Goal would be deleted in a full app.');
                                                                }
                                                            }
                                                        ]
                                                    );
                                                }}
                                            >
                                                <Ionicons name="trash-outline" size={16} color="#F44336" />
                                                <Text style={[styles.goalCardActionText, { color: '#F44336' }]}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}
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
                <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>Training History</Text>
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
                                    isSelected && { backgroundColor: config.color + '20', borderColor: config.color }
                                ]}
                                onPress={() => setSelectedCategory(category)}
                            >
                                <Ionicons
                                    name={config.icon}
                                    size={16}
                                    color={isSelected ? config.color : '#666'}
                                />
                                <Text style={[
                                    styles.categoryFilterText,
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
                        <ActivityIndicator size="large" color="#FF6B00" />
                        <Text style={styles.loadingText}>Loading workout history...</Text>
                    </View>
                ) : workoutHistory.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="fitness-outline" size={48} color="#CCC" style={{ marginBottom: 12 }} />
                        <Text style={styles.emptyStateText}>No workout history found.</Text>
                        <Text style={styles.emptyStateSubtext}>
                            Complete your first workout to start tracking your progress!
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.calendarContainer}>
                            <Text style={styles.calendarTitle}>Activity Calendar</Text>
                            <View style={styles.monthSelector}>
                                <TouchableOpacity>
                                    <Ionicons name="chevron-back" size={20} color="#666" />
                                </TouchableOpacity>
                                <Text style={styles.monthText}>{currentMonth}</Text>
                                <TouchableOpacity>
                                    <Ionicons name="chevron-forward" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>

                            {/* Simple calendar UI - simplified activity indicator */}
                            <View style={styles.calendarGrid}>
                                <View style={styles.calendarRow}>
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                        <Text key={index} style={styles.calendarDayHeader}>{day}</Text>
                                    ))}
                                </View>

                                <View style={styles.calendarDays}>
                                    {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
                                        const currentDate = new Date();
                                        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                        const hasWorkout = workoutDates.has(checkDate.toDateString());
                                        return (
                                            <View key={day} style={styles.calendarDay}>
                                                <Text style={styles.calendarDayText}>{day}</Text>
                                                {hasWorkout && <View style={styles.workoutDot} />}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>

                        <View style={styles.workoutHistoryContainer}>
                            <Text style={styles.workoutHistoryTitle}>
                                {selectedCategory === 'all' ? 'Recent Workouts' : `${selectedCategory} Workouts`}
                            </Text>

                            {filteredWorkouts.length === 0 ? (
                                <View style={styles.emptyFilterState}>
                                    <Ionicons name="search-outline" size={40} color="#CCC" />
                                    <Text style={styles.emptyFilterText}>
                                        No {selectedCategory === 'all' ? '' : selectedCategory.toLowerCase()} workouts found
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.clearFilterButton}
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
                                        style={styles.historyItem}
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
                                            <Text style={styles.historyItemTitle}>{workout.title}</Text>
                                            <View style={styles.historyItemMeta}>
                                                <View style={styles.historyItemMetaItem}>
                                                    <Ionicons name="calendar-outline" size={14} color="#666" />
                                                    <Text style={styles.historyItemMetaText}>
                                                        {workoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </Text>
                                                </View>
                                                <View style={styles.historyItemMetaItem}>
                                                    <Ionicons name="time-outline" size={14} color="#666" />
                                                    <Text style={styles.historyItemMetaText}>{durationMinutes} min</Text>
                                                </View>
                                                {completionScore > 0 && (
                                                    <View style={styles.historyItemMetaItem}>
                                                        <Ionicons name="checkmark-circle" size={14} color={config.color} />
                                                        <Text style={[styles.historyItemMetaText, { color: config.color }]}>
                                                            {completionScore}%
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        <Ionicons name="chevron-forward" size={20} color="#666" />
                                    </TouchableOpacity>
                                );
                                    })}

                                    {workoutHistory.length > 10 && (
                                        <TouchableOpacity style={styles.viewMoreButton}>
                                            <Text style={styles.viewMoreText}>View All History ({workoutHistory.length} total)</Text>
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

            {/* Tabs */}
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

            {/* Tab Content */}
            <ScrollView style={[styles.contentContainer, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'achievements' && renderAchievementsTab()}
                {activeTab === 'skills' && renderSkillsTab()}
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
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        position: 'relative',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: '#FFF',
    },
    tabText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
        textAlign: 'center',
    },
    activeTabText: {
        color: '#FF6B00',
        fontWeight: 'bold',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        backgroundColor: '#FF6B00',
    },
    contentContainer: {
        flex: 1,
    },
    tabContent: {
        paddingBottom: 20,
    },

    // Overview Tab Styles
    summaryContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
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
        color: '#333',
    },
    timeframeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    timeframeText: {
        fontSize: 12,
        color: '#666',
        marginRight: 4,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF6B00',
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 12,
        color: '#666',
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
        color: '#666',
    },
    chartContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    chart: {
        borderRadius: 12,
        marginBottom: 8,
    },
    skillsSnapshotContainer: {
        backgroundColor: '#FFF',
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
        color: '#333',
    },
    seeAllText: {
        fontSize: 14,
        color: '#FF6B00',
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
        color: '#333',
        fontWeight: '500',
    },
    skillValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
    },
    progressBar: {
        height: 6,
        backgroundColor: '#F0F0F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    goalsSnapshotContainer: {
        backgroundColor: '#FFF',
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
        color: '#333',
        marginBottom: 8,
    },
    goalProgress: {
        height: 6,
        backgroundColor: '#F0F0F0',
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
        color: '#333',
        marginBottom: 2,
    },
    goalDeadline: {
        fontSize: 12,
        color: '#666',
    },
    moreIndicator: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
    },
    achievementsContainer: {
        backgroundColor: '#FFF',
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
        backgroundColor: '#FFF0E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    badgeName: {
        fontSize: 12,
        color: '#333',
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
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        margin: 16,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
    },
    emptyStateSubtext: {
        fontSize: 13,
        color: '#999',
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
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
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
        backgroundColor: '#FFF0E6',
    },
    skillTabText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 6,
    },
    selectedSkillTabText: {
        color: '#FF6B00',
        fontWeight: '600',
    },
    skillDetailContainer: {
        backgroundColor: '#FFF',
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
        color: '#333',
        marginBottom: 4,
    },
    skillDetailRating: {
        fontSize: 14,
        color: '#666',
    },
    skillBreakdownContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
    },
    skillBreakdownTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
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
        color: '#333',
        fontWeight: '500',
    },
    skillBreakdownValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    skillBreakdownBar: {
        height: 6,
        backgroundColor: '#F0F0F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    skillBreakdownFill: {
        height: '100%',
        borderRadius: 3,
    },
    categoryDistributionContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
    },
    categorySubtitle: {
        fontSize: 13,
        color: '#666',
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
        color: '#333',
    },
    categoryCount: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    categoryPercentage: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    categoryBar: {
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    categoryBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    suggestedTrainingContainer: {
        backgroundColor: '#FFF',
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
        color: '#333',
        marginBottom: 4,
    },
    trainingItemDescription: {
        fontSize: 12,
        color: '#666',
    },

    // Goals Tab Styles
    goalsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    goalsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
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
        backgroundColor: '#FFF',
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
        color: '#333',
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
        color: '#666',
    },
    goalCardProgressPercentage: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    goalCardProgressBar: {
        height: 8,
        backgroundColor: '#F0F0F0',
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
        color: '#666',
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
        color: '#333',
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
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    currentProgressValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        paddingHorizontal: 16,
    },
    goalCardActions: {
        flexDirection: 'row',
        marginTop: 16,
    },
    goalCardActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    goalCardActionText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 4,
    },
    goalCardActionDelete: {
        borderWidth: 1,
        borderColor: '#F44336',
    },

    // History Tab Styles
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    historyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
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
        color: '#666',
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
        color: '#666',
    },
    emptyFilterState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyFilterText: {
        fontSize: 15,
        color: '#666',
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
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
    },
    calendarTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
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
        color: '#333',
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
        color: '#666',
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
        color: '#333',
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
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
    },
    workoutHistoryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
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
        color: '#666',
        textAlign: 'center',
    },
    historyItemContent: {
        flex: 1,
        marginLeft: 10,
    },
    historyItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
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
        color: '#666',
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
        color: '#666',
        fontWeight: '500',
    },

    // Recommendations Styles
    recommendationsContainer: {
        backgroundColor: '#FFF',
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
        color: '#333',
        marginBottom: 6,
    },
    recommendationReason: {
        fontSize: 14,
        color: '#666',
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
        color: '#666',
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
        backgroundColor: '#FFF',
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
        color: '#333',
        marginBottom: 4,
    },
    xpText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    achievementsTrophyIcon: {
        alignItems: 'center',
        gap: 4,
    },
    achievementCount: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    xpProgressSection: {
        gap: 8,
    },
    xpProgressBar: {
        height: 8,
        backgroundColor: '#F0F0F0',
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
        color: '#666',
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
        color: '#666',
        fontWeight: '500',
    },
    achievementCategoryChipTextActive: {
        color: '#FF6B00',
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
        color: '#999',
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
        color: '#333',
    },
    achievementTitleLocked: {
        color: '#999',
    },
    achievementDescription: {
        fontSize: 13,
        color: '#666',
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
        color: '#666',
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
        color: '#666',
        fontWeight: '600',
    },
});

export default ProgressScreen;
