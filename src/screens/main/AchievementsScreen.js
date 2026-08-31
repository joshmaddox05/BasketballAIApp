// AchievementsScreen.js - View all achievements and progress
import React, { useState, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Entrance, BarFill } from '../../components/dbe';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import {
    ACHIEVEMENTS,
    ACHIEVEMENT_CATEGORIES,
    ACHIEVEMENT_TIERS,
    getAllAchievements,
    getLevelFromXP,
    LEVELS
} from '../../data/achievements';
import { getTheme } from '../../utils/theme';

const AchievementsScreen = ({ navigation }) => {
    const { userData, achievements: userAchievements, isDarkMode, theme: contextTheme } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [selectedCategory, setSelectedCategory] = useState('all');

    // Get all achievement definitions
    const allAchievements = useMemo(() => getAllAchievements(), []);

    // Map user achievements by ID for quick lookup
    const unlockedAchievementsMap = useMemo(() => {
        const map = {};
        if (userAchievements) {
            userAchievements.forEach(ua => {
                map[ua.id] = ua;
            });
        }
        return map;
    }, [userAchievements]);

    // Merge achievement definitions with user progress
    const achievementsWithProgress = useMemo(() => {
        return allAchievements.map(achievement => {
            const userProgress = unlockedAchievementsMap[achievement.id];
            return {
                ...achievement,
                unlocked: !!userProgress,
                unlockedAt: userProgress?.unlockedAt,
                progress: userProgress?.progress || 0,
            };
        });
    }, [allAchievements, unlockedAchievementsMap]);

    // Filter by category
    const filteredAchievements = useMemo(() => {
        if (selectedCategory === 'all') {
            return achievementsWithProgress;
        }
        return achievementsWithProgress.filter(a => a.category === selectedCategory);
    }, [achievementsWithProgress, selectedCategory]);

    // Sort: unlocked first, then by tier
    const sortedAchievements = useMemo(() => {
        const tierOrder = ['DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];
        return [...filteredAchievements].sort((a, b) => {
            // Unlocked achievements first
            if (a.unlocked && !b.unlocked) return -1;
            if (!a.unlocked && b.unlocked) return 1;
            // Then sort by tier
            const tierA = tierOrder.indexOf(Object.keys(ACHIEVEMENT_TIERS).find(k => ACHIEVEMENT_TIERS[k] === a.tier));
            const tierB = tierOrder.indexOf(Object.keys(ACHIEVEMENT_TIERS).find(k => ACHIEVEMENT_TIERS[k] === b.tier));
            return tierA - tierB;
        });
    }, [filteredAchievements]);

    // Calculate stats
    const stats = useMemo(() => {
        const total = allAchievements.length;
        const unlocked = achievementsWithProgress.filter(a => a.unlocked).length;
        const totalXP = achievementsWithProgress
            .filter(a => a.unlocked)
            .reduce((sum, a) => sum + (a.tier?.xp || 0), 0);

        return { total, unlocked, totalXP };
    }, [allAchievements, achievementsWithProgress]);

    const levelInfo = useMemo(() => getLevelFromXP(userData?.totalXP || stats.totalXP), [userData?.totalXP, stats.totalXP]);

    const categories = [
        { id: 'all', label: 'All', icon: 'apps' },
        { id: ACHIEVEMENT_CATEGORIES.WORKOUTS, label: 'Workouts', icon: 'basketball' },
        { id: ACHIEVEMENT_CATEGORIES.STREAKS, label: 'Streaks', icon: 'flame' },
        { id: ACHIEVEMENT_CATEGORIES.MASTERY, label: 'Mastery', icon: 'ribbon' },
        { id: ACHIEVEMENT_CATEGORIES.MILESTONES, label: 'Milestones', icon: 'flag' },
        { id: ACHIEVEMENT_CATEGORIES.SPECIAL, label: 'Special', icon: 'star' },
    ];

    const getTierColor = (tier) => {
        if (!tier) return theme.textSecondary;
        return tier.color || theme.textSecondary;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString();
    };

    const renderAchievement = ({ item, index }) => {
        const tierColor = getTierColor(item.tier);
        const isUnlocked = item.unlocked;

        return (
            // Decorative stagger only — the entrance wraps the card, it never gates
            // onPress. The index is capped so a long list does not tail off into a
            // multi-second cascade.
            <Entrance variant="cellIn" delay={Math.min(index, 8) * 60}>
            <View style={[
                styles.achievementCard,
                { backgroundColor: theme.card },
                !isUnlocked && styles.lockedCard
            ]}>
                <View style={[
                    styles.achievementIconContainer,
                    { backgroundColor: isUnlocked ? tierColor + '20' : theme.backgroundSecondary }
                ]}>
                    <Ionicons
                        name={item.icon || 'trophy'}
                        size={28}
                        color={isUnlocked ? tierColor : theme.textSecondary + '50'}
                    />
                    {!isUnlocked && (
                        <View style={styles.lockOverlay}>
                            <Ionicons name="lock-closed" size={14} color={theme.textSecondary} />
                        </View>
                    )}
                </View>

                <View style={styles.achievementContent}>
                    <View style={styles.achievementHeader}>
                        <Text style={[
                            styles.achievementTitle,
                            { color: isUnlocked ? theme.text : theme.textSecondary }
                        ]}>
                            {item.title}
                        </Text>
                        <View style={[styles.tierBadge, { backgroundColor: tierColor + '20' }]}>
                            <Text style={[styles.tierText, { color: tierColor }]}>
                                {item.tier?.name || 'Bronze'}
                            </Text>
                        </View>
                    </View>

                    <Text style={[
                        styles.achievementDescription,
                        { color: isUnlocked ? theme.textSecondary : theme.textSecondary + '80' }
                    ]}>
                        {item.description}
                    </Text>

                    <View style={styles.achievementFooter}>
                        <View style={styles.xpBadge}>
                            <Ionicons name="star" size={12} color="#FFD700" />
                            <Text style={[styles.xpText, { color: theme.textSecondary }]}>
                                {item.tier?.xp || 0} XP
                            </Text>
                        </View>
                        {isUnlocked && item.unlockedAt && (
                            <Text style={[styles.unlockedDate, { color: theme.textSecondary }]}>
                                Unlocked {formatDate(item.unlockedAt)}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
            </Entrance>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Achievements</Text>
                <View style={styles.headerRight} />
            </View>

            {/* Stats Summary */}
            <View style={[styles.statsContainer, { backgroundColor: theme.card }]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.primary }]}>{stats.unlocked}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Unlocked</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.text }]}>{stats.total}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#FFD700' }]}>{stats.totalXP}</Text>
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>XP Earned</Text>
                </View>
            </View>

            {/* Level Progress */}
            <View style={[styles.levelContainer, { backgroundColor: theme.card }]}>
                <View style={styles.levelHeader}>
                    <View style={styles.levelInfo}>
                        <Text style={[styles.levelTitle, { color: theme.text }]}>
                            Level {levelInfo.level}
                        </Text>
                        <Text style={[styles.levelName, { color: theme.primary }]}>
                            {levelInfo.title}
                        </Text>
                    </View>
                    {levelInfo.xpForNextLevel && (
                        <Text style={[styles.xpProgress, { color: theme.textSecondary }]}>
                            {levelInfo.currentXP} / {levelInfo.xpForNextLevel} XP
                        </Text>
                    )}
                </View>
                <BarFill
                    pct={Math.min(levelInfo.progressToNextLevel, 100) / 100}
                    color={theme.primary}
                    trackColor={theme.backgroundSecondary}
                    height={8}
                    radius={4}
                />
            </View>

            {/* Category Filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContainer}
            >
                {categories.map(category => (
                    <TouchableOpacity
                        key={category.id}
                        style={[
                            styles.categoryButton,
                            {
                                backgroundColor: selectedCategory === category.id
                                    ? theme.primary
                                    : theme.card,
                                borderColor: selectedCategory === category.id
                                    ? theme.primary
                                    : theme.border
                            }
                        ]}
                        onPress={() => setSelectedCategory(category.id)}
                    >
                        <Ionicons
                            name={category.icon}
                            size={16}
                            color={selectedCategory === category.id ? '#FFF' : theme.textSecondary}
                        />
                        <Text style={[
                            styles.categoryText,
                            { color: selectedCategory === category.id ? '#FFF' : theme.text }
                        ]}>
                            {category.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Achievements List */}
            <FlatList
                data={sortedAchievements}
                keyExtractor={(item) => item.id}
                renderItem={renderAchievement}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="trophy-outline" size={48} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                            No achievements in this category
                        </Text>
                    </View>
                }
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
        fontSize: 18,
        fontWeight: '600',
    },
    headerRight: {
        width: 32,
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
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: '100%',
    },
    levelContainer: {
        marginHorizontal: 16,
        marginTop: 12,
        padding: 16,
        borderRadius: 12,
    },
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    levelInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    levelTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    levelName: {
        fontSize: 14,
        fontWeight: '500',
    },
    xpProgress: {
        fontSize: 12,
    },
    categoryScroll: {
        maxHeight: 50,
        marginTop: 12,
    },
    categoryContainer: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '500',
    },
    listContent: {
        padding: 16,
    },
    achievementCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
    },
    lockedCard: {
        opacity: 0.7,
    },
    achievementIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    lockOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 10,
        padding: 2,
    },
    achievementContent: {
        flex: 1,
    },
    achievementHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    achievementTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    tierBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
    },
    tierText: {
        fontSize: 11,
        fontWeight: '600',
    },
    achievementDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    achievementFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    xpText: {
        fontSize: 12,
        fontWeight: '500',
    },
    unlockedDate: {
        fontSize: 11,
    },
    separator: {
        height: 12,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
    },
});

export default AchievementsScreen;
