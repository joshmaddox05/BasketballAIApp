// TrainingCategoryScreen.js
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    ActivityIndicator,
    Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { hasAccess, SUBSCRIPTION_TIERS } from '../../utils/subscription';

// Import thumbnail images for workouts
const shootingThumbnail = require('../../../assets/shooting-thumbnail.jpg');
const dribblingThumbnail = require('../../../assets/dribbling-thumbnail.png');

// Map workout IDs to their thumbnail images
const workoutThumbnails = {
    'shooting_1': shootingThumbnail,  // Beginner Shooting Basics
    'dribbling_1': dribblingThumbnail, // Ball Handling Fundamentals
};

const TrainingCategoryScreen = ({ route, navigation }) => {
    const { category } = route.params;
    const { workouts, loading, userData } = useAppContext();
    const [filteredWorkouts, setFilteredWorkouts] = useState([]);

    const userSubscription = userData?.subscription || SUBSCRIPTION_TIERS.FREE;

    // Check if a workout is locked (premium)
    const isWorkoutLocked = (workout) => {
        const requiredTier = workout.requiredTier || SUBSCRIPTION_TIERS.FREE;
        return !hasAccess(userSubscription, requiredTier);
    };

    // Get display name for required tier
    const getTierDisplayName = (tier) => {
        switch (tier) {
            case SUBSCRIPTION_TIERS.BASIC: return 'Basic';
            case SUBSCRIPTION_TIERS.PREMIUM: return 'Premium';
            case SUBSCRIPTION_TIERS.PRO: return 'Pro';
            default: return 'Premium';
        }
    };

    // Check if a workout is recommended for the current user
    const isRecommendedForUser = (workout) => {
        if (!userData) return false;

        const userLevel = userData?.level?.toLowerCase();
        const workoutLevel = workout?.level?.toLowerCase();
        const focusAreas = userData?.preferences?.focusAreas || [];

        // Match by skill level (allow workouts at or below user level)
        const levelMatch = userLevel === workoutLevel ||
            (userLevel === 'intermediate' && workoutLevel === 'beginner') ||
            (userLevel === 'advanced');

        // Match by focus area
        const focusMatch = focusAreas.some(area =>
            area.toLowerCase() === workout.category?.toLowerCase()
        );

        return levelMatch || focusMatch;
    };
    
    // Set up colors based on category
    const getCategoryColor = () => {
        switch(category.toLowerCase()) {
            case 'shooting':
                return '#FF6B00';
            case 'dribbling':
                return '#4CAF50';
            case 'physical':
                return '#2196F3';
            case 'strategy':
                return '#9C27B0';
            case 'mental':
                return '#FF9800';
            case 'nutrition':
                return '#00BCD4';
            default:
                return '#FF6B00';
        }
    };
    
    const getCategoryIcon = () => {
        switch(category.toLowerCase()) {
            case 'shooting':
                return 'basketball-outline';
            case 'dribbling':
                return 'hand-left-outline';
            case 'physical':
                return 'fitness-outline';
            case 'strategy':
                return 'clipboard-outline';
            case 'mental':
                return 'fitness-outline';
            case 'nutrition':
                return 'nutrition-outline';
            default:
                return 'basketball-outline';
        }
    };

    // Filter workouts based on category and sort by recommendation
    useEffect(() => {
        if (workouts) {
            const filtered = workouts.filter(workout =>
                workout.category && workout.category.toLowerCase() === category.toLowerCase()
            );
            // Sort: free workouts first (with recommended at top), then locked workouts
            const sorted = [...filtered].sort((a, b) => {
                const aLocked = isWorkoutLocked(a);
                const bLocked = isWorkoutLocked(b);

                // Locked workouts go to the bottom
                if (aLocked && !bLocked) return 1;
                if (!aLocked && bLocked) return -1;

                // Within each group, recommended workouts first
                const aRecommended = isRecommendedForUser(a);
                const bRecommended = isRecommendedForUser(b);
                if (aRecommended && !bRecommended) return -1;
                if (!aRecommended && bRecommended) return 1;
                return 0;
            });
            setFilteredWorkouts(sorted);
        }
    }, [workouts, category, userData, userSubscription]);

    const renderWorkoutItem = ({ item }) => {
        const isLocked = isWorkoutLocked(item);
        const tierName = getTierDisplayName(item.requiredTier);

        return (
            <TouchableOpacity
                style={[styles.workoutCard, isLocked && styles.lockedWorkoutCard]}
                onPress={() => isLocked
                    ? navigation.navigate('Profile', { screen: 'Settings', params: { openSubscription: true }, initial: false })
                    : navigation.navigate('WorkoutDetail', { workoutId: item.id })
                }
                activeOpacity={isLocked ? 0.8 : 0.9}
            >
                {/* Premium banner for locked workouts */}
                {isLocked && (
                    <View style={styles.premiumBanner}>
                        <Ionicons name="diamond" size={14} color="#FFF" />
                        <Text style={styles.premiumBannerText}>{tierName} Workout</Text>
                    </View>
                )}

                {/* Full-width image section */}
                <View style={[styles.workoutImageContainer, isLocked && { marginTop: 28 }]}>
                    {(item.image || workoutThumbnails[item.id]) ? (
                        <Image
                            source={item.image || workoutThumbnails[item.id]}
                            style={styles.workoutImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.workoutImage, styles.workoutImagePlaceholder]}>
                            <Ionicons name={getCategoryIcon()} size={48} color="#CCC" />
                        </View>
                    )}
                    {/* Level badge overlay */}
                    <View style={[styles.levelBadge, { backgroundColor: getCategoryColor() }]}>
                        <Text style={styles.levelBadgeText}>{item.level}</Text>
                    </View>
                    {/* Recommended badge - only show for unlocked workouts */}
                    {!isLocked && isRecommendedForUser(item) && (
                        <View style={styles.recommendedBadge}>
                            <Ionicons name="star" size={12} color="#FFF" />
                            <Text style={styles.recommendedBadgeText}>For You</Text>
                        </View>
                    )}
                </View>

                {/* Content section */}
                <View style={styles.workoutContent}>
                    <Text style={styles.workoutTitle}>{item.title}</Text>
                    {item.description && (
                        <Text style={styles.workoutDescription} numberOfLines={2}>
                            {item.description}
                        </Text>
                    )}

                    {/* Footer with duration and action button */}
                    <View style={styles.workoutFooter}>
                        <View style={styles.workoutDuration}>
                            <Ionicons name="time-outline" size={16} color="#666" />
                            <Text style={styles.workoutDurationText}>{item.duration}</Text>
                        </View>
                        {isLocked ? (
                            <TouchableOpacity
                                style={styles.unlockButton}
                                onPress={() => navigation.navigate('Profile', { screen: 'Settings', params: { openSubscription: true }, initial: false })}
                            >
                                <Ionicons name="lock-open-outline" size={14} color="#FFF" />
                                <Text style={styles.unlockButtonText}>Upgrade</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.startButton, { backgroundColor: getCategoryColor() }]}
                                onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id, autoStart: true })}
                            >
                                <Text style={styles.startButtonText}>Start</Text>
                                <Ionicons name="play" size={16} color="#FFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={getCategoryColor()} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
            
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{category} Training</Text>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => navigation.navigate('TrainingFilters', { category })}
                >
                    <Ionicons name="options-outline" size={22} color="#666" />
                </TouchableOpacity>
            </View>

            <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: `${getCategoryColor()}20` }]}>
                    <Ionicons name={getCategoryIcon()} size={32} color={getCategoryColor()} />
                </View>
                <View style={styles.categoryInfo}>
                    <Text style={styles.categoryTitle}>{category} Training</Text>
                    <Text style={styles.workoutCount}>
                        {filteredWorkouts.length} {filteredWorkouts.length === 1 ? 'workout' : 'workouts'} available
                    </Text>
                </View>
            </View>

            {filteredWorkouts.length > 0 ? (
                <FlatList
                    data={filteredWorkouts}
                    renderItem={renderWorkoutItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.workoutsList}
                />
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name={getCategoryIcon()} size={60} color="#CCC" />
                    <Text style={styles.emptyStateTitle}>No Workouts Available</Text>
                    <Text style={styles.emptyStateDescription}>
                        There are currently no {category.toLowerCase()} workouts available. 
                        Check back later or explore other categories.
                    </Text>
                    <TouchableOpacity
                        style={styles.exploreButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.exploreButtonText}>Explore Categories</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    categoryIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    categoryInfo: {
        flex: 1,
    },
    categoryTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    workoutCount: {
        fontSize: 14,
        color: '#666',
    },
    workoutsList: {
        padding: 16,
    },
    workoutCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    lockedWorkoutCard: {
        borderWidth: 1.5,
        borderColor: '#9C27B0',
        opacity: 0.9,
    },
    premiumBanner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#9C27B0',
        paddingVertical: 6,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        zIndex: 10,
    },
    premiumBannerText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    unlockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#9C27B0',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    unlockButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    workoutImageContainer: {
        width: '100%',
        height: 160,
        position: 'relative',
        backgroundColor: '#F5F5F5',
    },
    workoutImage: {
        width: '100%',
        height: '100%',
    },
    workoutImagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
    },
    levelBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    levelBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    recommendedBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    recommendedBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '600',
    },
    workoutContent: {
        padding: 16,
    },
    workoutTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
    },
    workoutDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 16,
    },
    workoutFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    workoutDuration: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutDurationText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#666',
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    exploreButton: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    exploreButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default TrainingCategoryScreen;
