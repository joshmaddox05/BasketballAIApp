// AllGoalsScreen.js - View and manage all goals
import React, { useState, useMemo, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { deleteGoal, updateGoal, getUserGoals } from '../../services/firestoreService';
import { getTheme } from '../../utils/theme';

const GOAL_CATEGORIES = [
    { id: 'all', label: 'All Goals', icon: 'flag' },
    { id: 'shooting', label: 'Shooting', icon: 'basketball' },
    { id: 'dribbling', label: 'Dribbling', icon: 'hand-left' },
    { id: 'physical', label: 'Physical', icon: 'fitness' },
    { id: 'defense', label: 'Defense', icon: 'shield' },
    { id: 'passing', label: 'Passing', icon: 'swap-horizontal' },
];

const AllGoalsScreen = ({ navigation }) => {
    const { goals, user, isDarkMode, theme: contextTheme } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedFilter, setSelectedFilter] = useState('active'); // 'active', 'completed', 'all'
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [processingIds, setProcessingIds] = useState([]);

    // Filter goals
    const filteredGoals = useMemo(() => {
        let filtered = [...goals];

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(g =>
                g.category?.toLowerCase() === selectedCategory ||
                g.type?.toLowerCase() === selectedCategory
            );
        }

        // Filter by status
        if (selectedFilter === 'active') {
            filtered = filtered.filter(g => !g.completed && g.isActive !== false);
        } else if (selectedFilter === 'completed') {
            filtered = filtered.filter(g => g.completed || g.current >= g.target);
        }

        // Sort by progress (closest to completion first for active, most recent for completed)
        return filtered.sort((a, b) => {
            if (selectedFilter === 'completed') {
                const dateA = a.completedAt?.toDate?.() || new Date(0);
                const dateB = b.completedAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            }
            const progressA = (a.current / a.target) * 100;
            const progressB = (b.current / b.target) * 100;
            return progressB - progressA;
        });
    }, [goals, selectedCategory, selectedFilter]);

    // Calculate stats
    const stats = useMemo(() => {
        const activeGoals = goals.filter(g => !g.completed && g.isActive !== false);
        const completedGoals = goals.filter(g => g.completed || g.current >= g.target);
        const totalProgress = activeGoals.length > 0
            ? activeGoals.reduce((sum, g) => sum + Math.min((g.current / g.target) * 100, 100), 0) / activeGoals.length
            : 0;

        return {
            active: activeGoals.length,
            completed: completedGoals.length,
            avgProgress: Math.round(totalProgress),
        };
    }, [goals]);

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            // Goals are managed by AppContext, which will refresh automatically
            await new Promise(resolve => setTimeout(resolve, 500));
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    const handleDeleteGoal = (goalId, goalTitle) => {
        Alert.alert(
            'Delete Goal',
            `Are you sure you want to delete "${goalTitle}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessingIds(prev => [...prev, goalId]);
                        try {
                            await deleteGoal(user.uid, goalId);
                        } catch (error) {
                            console.error('Error deleting goal:', error);
                            Alert.alert('Error', 'Failed to delete goal. Please try again.');
                        } finally {
                            setProcessingIds(prev => prev.filter(id => id !== goalId));
                        }
                    }
                }
            ]
        );
    };

    const handleMarkComplete = async (goalId) => {
        setProcessingIds(prev => [...prev, goalId]);
        try {
            await updateGoal(user.uid, goalId, {
                completed: true,
                completedAt: new Date(),
            });
        } catch (error) {
            console.error('Error marking goal complete:', error);
            Alert.alert('Error', 'Failed to update goal. Please try again.');
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== goalId));
        }
    };

    const getProgressColor = (progress) => {
        if (progress >= 100) return '#4CAF50';
        if (progress >= 75) return '#8BC34A';
        if (progress >= 50) return '#FFC107';
        if (progress >= 25) return '#FF9800';
        return theme.primary;
    };

    const getCategoryIcon = (category) => {
        const cat = GOAL_CATEGORIES.find(c => c.id === category?.toLowerCase());
        return cat?.icon || 'flag';
    };

    const renderGoal = ({ item }) => {
        const progress = Math.min((item.current / item.target) * 100, 100);
        const isCompleted = item.completed || progress >= 100;
        const isProcessing = processingIds.includes(item.id);
        const progressColor = getProgressColor(progress);

        return (
            <View style={[styles.goalCard, { backgroundColor: theme.card }]}>
                <View style={styles.goalHeader}>
                    <View style={[styles.categoryIcon, { backgroundColor: progressColor + '20' }]}>
                        <Ionicons
                            name={getCategoryIcon(item.category || item.type)}
                            size={20}
                            color={progressColor}
                        />
                    </View>
                    <View style={styles.goalInfo}>
                        <Text style={[styles.goalTitle, { color: theme.text }]} numberOfLines={1}>
                            {item.title || item.name}
                        </Text>
                        <Text style={[styles.goalCategory, { color: theme.textSecondary }]}>
                            {item.category || item.type || 'General'}
                        </Text>
                    </View>
                    {isCompleted && (
                        <View style={styles.completedBadge}>
                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        </View>
                    )}
                </View>

                {/* Progress Section */}
                <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                        <Text style={[styles.progressText, { color: theme.text }]}>
                            {item.current || 0} / {item.target}
                        </Text>
                        <Text style={[styles.progressPercent, { color: progressColor }]}>
                            {Math.round(progress)}%
                        </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
                        <View
                            style={[
                                styles.progressFill,
                                { backgroundColor: progressColor, width: `${progress}%` }
                            ]}
                        />
                    </View>
                </View>

                {/* Description */}
                {item.description && (
                    <Text style={[styles.goalDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                {/* Actions */}
                <View style={styles.actionRow}>
                    {!isCompleted && (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.primary }]}
                            onPress={() => handleMarkComplete(item.id)}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={16} color="#FFF" />
                                    <Text style={styles.actionButtonText}>Complete</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton, { borderColor: theme.error }]}
                        onPress={() => handleDeleteGoal(item.id, item.title || item.name)}
                        disabled={isProcessing}
                    >
                        <Ionicons name="trash-outline" size={16} color={theme.error} />
                    </TouchableOpacity>
                </View>

                {/* Date Info */}
                <View style={styles.dateRow}>
                    {item.startDate && (
                        <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                            Started: {new Date(item.startDate).toLocaleDateString()}
                        </Text>
                    )}
                    {item.targetDate && (
                        <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                            Target: {new Date(item.targetDate).toLocaleDateString()}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {selectedFilter === 'completed' ? 'No Completed Goals' : 'No Active Goals'}
            </Text>
            <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
                {selectedFilter === 'completed'
                    ? 'Complete your active goals to see them here.'
                    : 'Set new goals to track your basketball progress.'}
            </Text>
            <TouchableOpacity
                style={[styles.addGoalButton, { backgroundColor: theme.primary }]}
                onPress={() => navigation.navigate('AddGoal')}
            >
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={styles.addGoalButtonText}>Add New Goal</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Goals</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('AddGoal')}
                    style={styles.addButton}
                >
                    <Ionicons name="add" size={24} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {/* Stats Summary */}
            <View style={[styles.statsContainer, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                    style={[
                        styles.statItem,
                        selectedFilter === 'active' && { backgroundColor: theme.primary + '15' }
                    ]}
                    onPress={() => setSelectedFilter('active')}
                >
                    <Text style={[styles.statValue, { color: theme.primary }]}>{stats.active}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active</Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <TouchableOpacity
                    style={[
                        styles.statItem,
                        selectedFilter === 'completed' && { backgroundColor: '#4CAF50' + '15' }
                    ]}
                    onPress={() => setSelectedFilter('completed')}
                >
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.completed}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completed</Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>{stats.avgProgress}%</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Avg Progress</Text>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {['active', 'completed', 'all'].map(filter => (
                    <TouchableOpacity
                        key={filter}
                        style={[
                            styles.filterTab,
                            {
                                backgroundColor: selectedFilter === filter
                                    ? theme.primary
                                    : theme.card,
                                borderColor: selectedFilter === filter
                                    ? theme.primary
                                    : theme.border
                            }
                        ]}
                        onPress={() => setSelectedFilter(filter)}
                    >
                        <Text style={[
                            styles.filterText,
                            { color: selectedFilter === filter ? '#FFF' : theme.text }
                        ]}>
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Goals List */}
            <FlatList
                data={filteredGoals}
                keyExtractor={(item) => item.id}
                renderItem={renderGoal}
                contentContainerStyle={[
                    styles.listContent,
                    filteredGoals.length === 0 && styles.emptyListContent
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.primary}
                    />
                }
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '600',
    },
    addButton: {
        padding: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
        borderRadius: 8,
    },
    statValue: {
        fontSize: 25,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 14,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: '100%',
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 12,
        gap: 8,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    filterText: {
        fontSize: 16,
        fontWeight: '500',
    },
    listContent: {
        padding: 16,
    },
    emptyListContent: {
        flex: 1,
        justifyContent: 'center',
    },
    goalCard: {
        padding: 16,
        borderRadius: 12,
    },
    goalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    goalInfo: {
        flex: 1,
    },
    goalTitle: {
        fontSize: 17.5,
        fontWeight: '600',
    },
    goalCategory: {
        fontSize: 14,
        marginTop: 2,
        textTransform: 'capitalize',
    },
    completedBadge: {
        marginLeft: 8,
    },
    progressSection: {
        marginBottom: 12,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressText: {
        fontSize: 16,
        fontWeight: '500',
    },
    progressPercent: {
        fontSize: 16,
        fontWeight: '600',
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    goalDescription: {
        fontSize: 16,
        lineHeight: 21,
        marginBottom: 12,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    actionButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
    deleteButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateText: {
        fontSize: 13,
    },
    separator: {
        height: 12,
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 21,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 17.5,
        textAlign: 'center',
        lineHeight: 23,
        marginBottom: 24,
    },
    addGoalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
    },
    addGoalButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 17.5,
    },
});

export default AllGoalsScreen;
