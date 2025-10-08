// ProgressScreen.js
import React, { useState, useRef } from 'react';
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
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { LineChart, BarChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

// Tab options for progress screen
const TABS = [
    { id: 'overview', label: 'Overview' },
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
        historicalData
    } = useAppContext();

    const [activeTab, setActiveTab] = useState('overview');
    const [expandedGoalId, setExpandedGoalId] = useState(null);
    const [selectedTimeframe, setSelectedTimeframe] = useState('week'); // week, month, year
    const [selectedSkill, setSelectedSkill] = useState('shooting'); // shooting, dribbling, etc.

    // Animation value for tab indicator
    const tabIndicatorPosition = useRef(new Animated.Value(0)).current;

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

    // Calculate workout streak
    const calculateStreak = () => {
        // This would be more sophisticated in a real app
        return userData.stats.streak || 0;
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

    // Get activity data for charts
    const getActivityData = () => {
        // In a real app, this would come from backend based on selected timeframe
        return {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    data: [30, 45, 0, 60, 20, 50, 15],
                    color: (opacity = 1) => `rgba(255, 107, 0, ${opacity})`,
                    strokeWidth: 2
                }
            ]
        };
    };

    // Chart configuration
    const chartConfig = {
        backgroundGradientFrom: '#FFFFFF',
        backgroundGradientTo: '#FFFFFF',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
        style: {
            borderRadius: 16
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: '#FF6B00'
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
        return (
            <View style={styles.tabContent}>
                {/* Progress Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryHeader}>
                        <Text style={styles.summaryTitle}>Progress Summary</Text>
                        <TouchableOpacity style={styles.timeframeSelector}>
                            <Text style={styles.timeframeText}>{selectedTimeframe === 'week' ? 'This Week' : selectedTimeframe === 'month' ? 'This Month' : 'This Year'}</Text>
                            <Ionicons name="chevron-down" size={16} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.metricsRow}>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricValue}>{activities.length}</Text>
                            <Text style={styles.metricLabel}>Workouts</Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricValue}>{calculateStreak()}</Text>
                            <Text style={styles.metricLabel}>Day Streak</Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricValue}>{goals.filter(g => calculateGoalProgress(g) === 100).length}</Text>
                            <Text style={styles.metricLabel}>Goals Met</Text>
                        </View>
                    </View>
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
        // Sample workout history data
        const workoutHistory = [
            { id: '1', date: '2023-06-15', title: 'Jump Shot Training', duration: '45 min', score: 85 },
            { id: '2', date: '2023-06-13', title: 'Dribbling Drill', duration: '30 min', score: 92 },
            { id: '3', date: '2023-06-11', title: 'Full Court Practice', duration: '60 min', score: 78 },
            { id: '4', date: '2023-06-09', title: 'Shooting Analysis', duration: '20 min', score: 83 },
            { id: '5', date: '2023-06-07', title: 'Agility Workout', duration: '40 min', score: 88 },
        ];

        return (
            <View style={styles.tabContent}>
                <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>Training History</Text>
                    <TouchableOpacity style={styles.historyFilterButton}>
                        <Ionicons name="options-outline" size={20} color="#666" />
                        <Text style={styles.historyFilterText}>Filter</Text>
                    </TouchableOpacity>
                </View>

                {workoutHistory.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No workout history found.</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.calendarContainer}>
                            <Text style={styles.calendarTitle}>Activity Calendar</Text>
                            <View style={styles.monthSelector}>
                                <TouchableOpacity>
                                    <Ionicons name="chevron-back" size={20} color="#666" />
                                </TouchableOpacity>
                                <Text style={styles.monthText}>June 2023</Text>
                                <TouchableOpacity>
                                    <Ionicons name="chevron-forward" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>

                            {/* Simple calendar UI - would be a full calendar component in real app */}
                            <View style={styles.calendarGrid}>
                                <View style={styles.calendarRow}>
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                        <Text key={index} style={styles.calendarDayHeader}>{day}</Text>
                                    ))}
                                </View>

                                <View style={styles.calendarDays}>
                                    {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
                                        const hasWorkout = workoutHistory.some(
                                            workout => new Date(workout.date).getDate() === day
                                        );
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
                            <Text style={styles.workoutHistoryTitle}>Recent Workouts</Text>

                            {workoutHistory.map(workout => (
                                <TouchableOpacity
                                    key={workout.id}
                                    style={styles.historyItem}
                                    onPress={() => {
                                        // Navigate to workout details in a real app
                                        Alert.alert('Workout Details', `View details for ${workout.title}`);
                                    }}
                                >
                                    <View style={styles.historyItemLeft}>
                                        <Text style={styles.historyItemDate}>
                                            {new Date(workout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </Text>
                                    </View>

                                    <View style={styles.historyItemContent}>
                                        <Text style={styles.historyItemTitle}>{workout.title}</Text>
                                        <View style={styles.historyItemMeta}>
                                            <View style={styles.historyItemMetaItem}>
                                                <Ionicons name="time-outline" size={14} color="#666" />
                                                <Text style={styles.historyItemMetaText}>{workout.duration}</Text>
                                            </View>
                                            <View style={styles.historyItemMetaItem}>
                                                <Ionicons name="analytics-outline" size={14} color="#666" />
                                                <Text style={styles.historyItemMetaText}>Score: {workout.score}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <Ionicons name="chevron-forward" size={20} color="#666" />
                                </TouchableOpacity>
                            ))}

                            <TouchableOpacity style={styles.viewMoreButton}>
                                <Text style={styles.viewMoreText}>View All History</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Your Progress</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                        onPress={() => handleTabChange(tab.id)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === tab.id && styles.activeTabText
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
                <Animated.View
                    style={[
                        styles.tabIndicator,
                        {
                            left: tabIndicatorPosition,
                            width: width / TABS.length,
                        }
                    ]}
                />
            </View>

            {/* Tab Content */}
            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {activeTab === 'overview' && renderOverviewTab()}
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
        backgroundColor: '#F8F9FA',
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
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
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
});

export default ProgressScreen;
