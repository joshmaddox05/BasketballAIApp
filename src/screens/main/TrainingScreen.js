// TrainingScreen.js
import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    FlatList,
    Image,
    TextInput,
    ActivityIndicator,
    SafeAreaView,
    StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import VideoPlayer from '../../components/shared/VideoPlayer';
import YouTubeService from '../../services/youtubeService';
import { hasAccess } from '../../utils/subscription';
import SubscriptionModal from '../../components/shared/SubscriptionModal';
import { getActiveCustomPlan, getCustomPlans } from '../../services/firestoreService';
import { auth } from '../../config/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { TourStep } from '../../components/tour';

// Import thumbnail images for workouts
const shootingThumbnail = require('../../../assets/shooting-thumbnail.jpg');
const dribblingThumbnail = require('../../../assets/dribbling-thumbnail.png');

// Map workout IDs to their thumbnail images
const workoutThumbnails = {
    'shooting_1': shootingThumbnail,  // Beginner Shooting Basics
    'dribbling_1': dribblingThumbnail, // Ball Handling Fundamentals
};

const TrainingScreen = ({ navigation }) => {
    const { workouts, loading, userData, trainingVideos, setTrainingVideosData, theme, isDarkMode, getAccessibleWorkouts } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredWorkouts, setFilteredWorkouts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loadingVideos, setLoadingVideos] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [activePlan, setActivePlan] = useState(null);
    const [myPlans, setMyPlans] = useState([]);

    const trainingCategories = [
        { id: '1', title: 'Shooting', icon: 'basketball-outline', color: '#FF6B00' },
        { id: '2', title: 'Dribbling', icon: 'hand-left-outline', color: '#4CAF50' },
        { id: '3', title: 'Physical', icon: 'fitness-outline', color: '#2196F3' },
        { id: '4', title: 'Defense', icon: 'shield-outline', color: '#9C27B0' },
        { id: '5', title: 'Passing', icon: 'swap-horizontal-outline', color: '#FF9800' },
    ];

    // Filter workouts based on search and category selection
    useFocusEffect(
        useCallback(() => {
            if (!workouts) return;

            const userSubscription = userData?.subscription || 'free';

            // SHOW ALL WORKOUTS - Don't filter by subscription
            // Instead, we'll mark them as locked in the UI
            let filtered = workouts;

            console.log(`Total workouts: ${workouts.length}, Subscription: ${userSubscription}`);

            // FIRST: Filter by category if not 'All'
            if (selectedCategory !== 'All') {
                filtered = filtered.filter(workout =>
                    workout.category === selectedCategory.toLowerCase()
                );
            }

            // SECOND: Filter by search query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(workout =>
                    workout.title.toLowerCase().includes(query) ||
                    workout.description?.toLowerCase().includes(query)
                );
            }

            setFilteredWorkouts(filtered);
            
            // Load training videos if not already loaded
            if (trainingVideos.length === 0) {
                loadTrainingVideos();
            }

            // Load custom plans
            loadCustomPlans();
        }, [workouts, searchQuery, selectedCategory, userData])
    );

    const loadTrainingVideos = async () => {
        try {
            setLoadingVideos(true);
            const videos = await YouTubeService.getPopularTrainingVideos(6);
            setTrainingVideosData(videos);
        } catch (error) {
            console.error('Error loading training videos:', error);
        } finally {
            setLoadingVideos(false);
        }
    };

    const loadCustomPlans = async () => {
        try {
            const uid = auth.currentUser?.uid;
            if (!uid) return;

            // Get active plan (only plans with status 'active')
            const activeResult = await getActiveCustomPlan(uid);
            if (activeResult.success && activeResult.plan) {
                // Double check it's actually active and not completed
                if (activeResult.plan.status === 'active') {
                    setActivePlan(activeResult.plan);
                } else {
                    setActivePlan(null);
                }
            } else {
                setActivePlan(null);
            }

            // Get all plans
            const plansResult = await getCustomPlans(uid);
            if (plansResult.success) {
                setMyPlans(plansResult.plans);
            }
        } catch (error) {
            console.error('Error loading custom plans:', error);
        }
    };

    const handleCategoryPress = (category) => {
        setSelectedCategory(category);
        navigation.navigate('TrainingCategory', { category });
    };

    const renderCategoryItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.categoryCard, { backgroundColor: item.color }]}
            onPress={() => handleCategoryPress(item.title)}
            activeOpacity={0.8}
        >
            <View style={styles.categoryContent}>
                <View style={styles.categoryIconContainer}>
                    <Ionicons name={item.icon} size={28} color="#FFF" />
                </View>
                <Text style={styles.categoryTitle}>{item.title}</Text>
            </View>
            <View style={styles.categoryArrow}>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </View>
        </TouchableOpacity>
    );

    const renderWorkoutItem = ({ item }) => {
        const userSubscription = userData?.subscription || 'free';
        const isLocked = item.requiredTier && !hasAccess(userSubscription, item.requiredTier);

        const handleWorkoutPress = () => {
            if (isLocked) {
                setShowSubscriptionModal(true);
            } else {
                navigation.navigate('WorkoutDetail', { workoutId: item.id });
            }
        };

        return (
            <TouchableOpacity
                style={[styles.workoutItem, { backgroundColor: theme.card }, isLocked && styles.lockedWorkout]}
                onPress={handleWorkoutPress}
            >
                {/* Lock Badge */}
                {isLocked && (
                    <View style={styles.lockBadge}>
                        <Ionicons name="lock-closed" size={16} color="#FFF" />
                    </View>
                )}

                {/* Left: Workout Image */}
                <View style={styles.workoutImageContainer}>
                    {(item.image || workoutThumbnails[item.id]) ? (
                        <Image source={item.image || workoutThumbnails[item.id]} style={styles.workoutImage} />
                    ) : (
                        <View style={[styles.workoutImage, { backgroundColor: theme.backgroundSecondary }]}>
                            <Ionicons name="basketball-outline" size={24} color={theme.textSecondary} />
                        </View>
                    )}
                </View>

                {/* Middle: Title and Info */}
                <View style={styles.workoutInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.workoutTitle, { color: theme.text }]}>{item.title}</Text>
                        {isLocked && (
                            <View style={styles.premiumBadge}>
                                <Text style={styles.premiumBadgeText}>PRO</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.workoutMeta}>
                        <Text style={[styles.workoutLevel, { color: theme.textSecondary }]}>{item.level}</Text>
                        <View style={styles.workoutDuration}>
                            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                            <Text style={[styles.workoutDurationText, { color: theme.textSecondary }]}>{item.duration}</Text>
                        </View>
                    </View>
                </View>

                {/* Right: Action Button */}
                <TouchableOpacity
                    style={[styles.startButton, isLocked && styles.lockedButton]}
                    onPress={handleWorkoutPress}
                >
                    <Ionicons name={isLocked ? "lock-closed" : "play"} size={18} color="#FFF" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const renderVideoItem = ({ item }) => (
        <View style={styles.videoCard}>
            <VideoPlayer
                video={item}
                onVideoPress={(video) => navigation.navigate('VideoDetail', { video })}
                showControls={false}
            />
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    // Personalized recommendations based on user's level
    const recommendedWorkouts = workouts.filter(workout =>
        workout.level.toLowerCase() === userData.level.toLowerCase()
    );

    // Get user's skill level as a number (Beginner: 1, Intermediate: 2, Advanced: 3)
    const getLevelValue = (level) => {
        switch(level.toLowerCase()) {
            case 'beginner': return 1;
            case 'intermediate': return 2;
            case 'advanced': return 3;
            default: return 1;
        }
    };

    // Get available next level workouts (slightly above user's current level)
    const nextLevelWorkouts = workouts.filter(workout => {
        const userLevel = getLevelValue(userData.level);
        const workoutLevel = getLevelValue(workout.level);
        return workoutLevel === userLevel + 1;
    }).slice(0, 3); // Limit to 3

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Training Programs</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={[styles.headerButton, { backgroundColor: theme.highlight }]}
                            onPress={() => navigation.navigate('MyWorkouts')}
                        >
                            <Ionicons name="folder-outline" size={22} color={theme.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterButton, { backgroundColor: theme.backgroundTertiary }]}
                            onPress={() => navigation.navigate('TrainingFilters')}
                        >
                            <Ionicons name="options-outline" size={22} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search workouts"
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Build Your Workout Card */}
                    <TourStep stepId="build-workout-card">
                        <TouchableOpacity
                            style={styles.buildWorkoutCard}
                            onPress={() => navigation.navigate('BuildWorkout')}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#FF6B00', '#FF8C33']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.buildWorkoutGradient}
                            >
                                <View style={styles.buildWorkoutContent}>
                                    <View style={styles.buildWorkoutLeft}>
                                        <Text style={styles.buildWorkoutTitle}>Build Your Workout</Text>
                                        <Text style={styles.buildWorkoutSubtitle}>
                                            Create a personalized training plan for today, this week, or this month
                                        </Text>
                                        <View style={styles.buildWorkoutButton}>
                                            <Text style={styles.buildWorkoutButtonText}>Get Started</Text>
                                            <Ionicons name="arrow-forward" size={16} color="#FF6B00" />
                                        </View>
                                    </View>
                                    <View style={styles.buildWorkoutIcon}>
                                        <Ionicons name="create-outline" size={48} color="rgba(255,255,255,0.9)" />
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </TourStep>

                    {/* Active Plan Card */}
                    {activePlan && (
                        <TouchableOpacity
                            style={[styles.activePlanCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={() => navigation.navigate('CustomPlanDetail', { planId: activePlan.id })}
                            activeOpacity={0.8}
                        >
                            <View style={styles.activePlanHeader}>
                                <View style={[styles.activePlanBadge, { backgroundColor: theme.warning + '20' }]}>
                                    <Ionicons name="flash" size={14} color={theme.warning} />
                                    <Text style={[styles.activePlanBadgeText, { color: theme.warning }]}>Active Plan</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                            </View>
                            <Text style={[styles.activePlanTitle, { color: theme.text }]}>{activePlan.title}</Text>
                            <View style={styles.activePlanProgress}>
                                <View style={[styles.activePlanProgressBar, { backgroundColor: theme.progressBar }]}>
                                    <View
                                        style={[
                                            styles.activePlanProgressFill,
                                            { width: `${activePlan.overallProgress || 0}%`, backgroundColor: theme.primary }
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.activePlanProgressText, { color: theme.textSecondary }]}>
                                    {activePlan.completedDays?.length || 0}/{activePlan.durationDays} days
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Categories */}
                    <View style={styles.categoriesSection}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Training Categories</Text>
                        <FlatList
                            data={trainingCategories}
                            renderItem={renderCategoryItem}
                            keyExtractor={item => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoriesList}
                        />
                    </View>

                    {/* AI-Powered Analysis Feature */}
                    <TourStep stepId="ai-analysis-card">
                        <View style={styles.analysisSection}>
                            <View style={[styles.analysisCard, { backgroundColor: theme.primary }]}>
                                <View style={styles.analysisContent}>
                                    <Text style={styles.analysisTitle}>AI Shooting Analysis</Text>
                                    <Text style={styles.analysisDescription}>
                                        Get personalized feedback on your shooting form with our AI-powered analysis
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.analysisButton}
                                        onPress={() => navigation.navigate('ShootingAnalysis')}
                                    >
                                        <Text style={[styles.analysisButtonText, { color: theme.primary }]}>Analyze Your Shot</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.analysisImageContainer}>
                                    <View style={styles.analysisImage}>
                                        <Ionicons name="analytics" size={40} color="#FFF" />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </TourStep>

                    {/* Recommended for You */}
                    <View style={styles.recommendedSection}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommended for You</Text>
                        {recommendedWorkouts.length > 0 ? (
                            <FlatList
                                data={recommendedWorkouts.slice(0, 3)}
                                renderItem={renderWorkoutItem}
                                keyExtractor={item => item.id}
                                scrollEnabled={false}
                            />
                        ) : (
                            <View style={styles.emptyStateContainer}>
                                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                                    No recommendations available for your level yet.
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Challenge Yourself */}
                    {nextLevelWorkouts.length > 0 && (
                        <View style={styles.challengeSection}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Challenge Yourself</Text>
                            <View style={[styles.challengeCard, { backgroundColor: theme.card }]}>
                                <Text style={[styles.challengeTitle, { color: theme.text }]}>Ready for the next level?</Text>
                                <Text style={[styles.challengeDescription, { color: theme.textSecondary }]}>
                                    Try these workouts to push your skills to the next level
                                </Text>

                                {nextLevelWorkouts.map((workout, index) => (
                                    <TouchableOpacity
                                        key={workout.id}
                                        style={[
                                            styles.challengeWorkout,
                                            { borderBottomColor: theme.border },
                                            index < nextLevelWorkouts.length - 1 && styles.challengeWorkoutBorder
                                        ]}
                                        onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.id })}
                                    >
                                        <Text style={[styles.challengeWorkoutTitle, { color: theme.text }]}>{workout.title}</Text>
                                        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Training Programs */}
                    <View style={styles.trainingProgramsSection}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>All Training Programs</Text>
                            <TouchableOpacity onPress={() => setSelectedCategory('All')}>
                                <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {searchQuery && filteredWorkouts.length === 0 ? (
                            <View style={styles.emptyStateContainer}>
                                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                                    No workouts found for "{searchQuery}"
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredWorkouts.slice(0, 5)}
                                renderItem={renderWorkoutItem}
                                keyExtractor={item => item.id}
                                scrollEnabled={false}
                            />
                        )}

                        {filteredWorkouts.length > 5 && (
                            <TouchableOpacity
                                style={[styles.viewMoreButton, { backgroundColor: theme.backgroundTertiary }]}
                                onPress={() => navigation.navigate('AllWorkouts')}
                            >
                                <Text style={[styles.viewMoreText, { color: theme.textSecondary }]}>View More Workouts</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* YouTube Training Videos Section */}
                    <View style={styles.videoSection}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Training Videos</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('VideoLibrary')}>
                                <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingVideos ? (
                            <View style={styles.videoLoadingContainer}>
                                <ActivityIndicator size="small" color={theme.primary} />
                                <Text style={[styles.loadingVideoText, { color: theme.textSecondary }]}>Loading videos...</Text>
                            </View>
                        ) : trainingVideos.length > 0 ? (
                            <FlatList
                                data={trainingVideos.slice(0, 4)}
                                renderItem={renderVideoItem}
                                keyExtractor={item => item.youtubeId}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.videosList}
                            />
                        ) : (
                            <View style={[styles.emptyStateContainer, { backgroundColor: theme.card }]}>
                                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                                    Unable to load training videos. Check your connection.
                                </Text>
                                <TouchableOpacity
                                    style={[styles.retryButton, { backgroundColor: theme.primary }]}
                                    onPress={loadTrainingVideos}
                                >
                                    <Text style={styles.retryButtonText}>Retry</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Spacer at bottom for better scrolling */}
                    <View style={{ height: 20 }} />
                </ScrollView>
            </View>

            {/* Subscription Modal for Locked Workouts */}
            <SubscriptionModal
                visible={showSubscriptionModal}
                onClose={() => setShowSubscriptionModal(false)}
                onUpgrade={() => {
                    setShowSubscriptionModal(false);
                    // Workouts will automatically update when subscription changes
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 24,
        borderWidth: 1,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 16,
    },
    categoriesSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '500',
    },
    categoriesList: {
        paddingRight: 16,
    },
    categoryCard: {
        width: 140,
        height: 80,
        borderRadius: 16,
        padding: 14,
        marginRight: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    categoryContent: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    categoryIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    categoryTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    categoryArrow: {
        opacity: 0.8,
    },
    analysisSection: {
        marginBottom: 24,
    },
    analysisCard: {
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    analysisContent: {
        flex: 1,
        paddingRight: 12,
    },
    analysisTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    analysisDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 12,
        lineHeight: 20,
    },
    analysisButton: {
        backgroundColor: '#FFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    analysisButtonText: {
        fontWeight: 'bold',
    },
    analysisImageContainer: {
        width: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    analysisImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recommendedSection: {
        marginBottom: 24,
    },
    workoutItem: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    workoutImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 12,
    },
    workoutImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    workoutInfo: {
        flex: 1,
    },
    workoutTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    workoutMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutLevel: {
        fontSize: 14,
        marginRight: 12,
    },
    workoutDuration: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutDurationText: {
        fontSize: 14,
        marginLeft: 4,
    },
    startButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    lockedWorkout: {
        opacity: 0.75,
    },
    lockBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#9C27B0',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    premiumBadge: {
        backgroundColor: '#9C27B0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 8,
    },
    premiumBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    lockedButton: {
        backgroundColor: '#9C27B0',
    },
    emptyStateContainer: {
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: 'center',
    },
    challengeSection: {
        marginBottom: 24,
    },
    challengeCard: {
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    challengeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    challengeDescription: {
        fontSize: 14,
        marginBottom: 16,
        lineHeight: 20,
    },
    challengeWorkout: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    challengeWorkoutBorder: {
        borderBottomWidth: 1,
    },
    challengeWorkoutTitle: {
        fontSize: 15,
        fontWeight: '500',
    },
    trainingProgramsSection: {
        marginBottom: 24,
    },
    viewMoreButton: {
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    viewMoreText: {
        fontWeight: '600',
    },
    
    // Video Section Styles
    videoSection: {
        marginBottom: 24,
    },
    videosList: {
        paddingHorizontal: 16,
    },
    videoCard: {
        width: 280,
        marginRight: 12,
    },
    videoLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingVideoText: {
        marginLeft: 8,
        fontSize: 14,
    },
    retryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        marginTop: 8,
    },
    retryButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    // Build Your Workout Card Styles
    buildWorkoutCard: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buildWorkoutGradient: {
        padding: 20,
    },
    buildWorkoutContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    buildWorkoutLeft: {
        flex: 1,
        paddingRight: 16,
    },
    buildWorkoutTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    buildWorkoutSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 20,
        marginBottom: 14,
    },
    buildWorkoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 25,
        alignSelf: 'flex-start',
    },
    buildWorkoutButtonText: {
        color: '#FF6B00',
        fontWeight: '700',
        fontSize: 14,
        marginRight: 6,
    },
    buildWorkoutIcon: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Active Plan Card Styles
    activePlanCard: {
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    activePlanHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    activePlanBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activePlanBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    activePlanTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 12,
    },
    activePlanProgress: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activePlanProgressBar: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        marginRight: 12,
        overflow: 'hidden',
    },
    activePlanProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    activePlanProgressText: {
        fontSize: 13,
        fontWeight: '500',
    },
});

export default TrainingScreen;