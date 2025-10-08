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

const TrainingScreen = ({ navigation }) => {
    const { workouts, loading, userData, trainingVideos, setTrainingVideosData } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredWorkouts, setFilteredWorkouts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loadingVideos, setLoadingVideos] = useState(false);

    const trainingCategories = [
        { id: '1', title: 'Shooting', icon: 'basketball-outline', color: '#FF6B00' },
        { id: '2', title: 'Dribbling', icon: 'hand-left-outline', color: '#4CAF50' },
        { id: '3', title: 'Physical', icon: 'fitness-outline', color: '#2196F3' },
        { id: '4', title: 'Strategy', icon: 'clipboard-outline', color: '#9C27B0' },
        { id: '5', title: 'Mental', icon: 'brain-outline', color: '#FF9800' },
        { id: '6', title: 'Nutrition', icon: 'nutrition-outline', color: '#00BCD4' },
    ];

    // Filter workouts based on search and category selection
    useFocusEffect(
        useCallback(() => {
            if (!workouts) return;

            let filtered = workouts;

            // Filter by category if not 'All'
            if (selectedCategory !== 'All') {
                filtered = filtered.filter(workout =>
                    workout.category === selectedCategory.toLowerCase()
                );
            }

            // Filter by search query
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
        }, [workouts, searchQuery, selectedCategory])
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

    const handleCategoryPress = (category) => {
        setSelectedCategory(category);
        navigation.navigate('TrainingCategory', { category });
    };

    const renderCategoryItem = ({ item }) => (
        <TouchableOpacity
            style={styles.categoryCard}
            onPress={() => handleCategoryPress(item.title)}
        >
            <View style={[styles.categoryIcon, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon} size={32} color={item.color} />
            </View>
            <Text style={styles.categoryTitle}>{item.title}</Text>
        </TouchableOpacity>
    );

    const renderWorkoutItem = ({ item }) => (
        <TouchableOpacity
            style={styles.workoutItem}
            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
        >
            {/* Left: Workout Image */}
            <View style={styles.workoutImageContainer}>
                {item.image ? (
                    <Image source={item.image} style={styles.workoutImage} />
                ) : (
                    <View style={[styles.workoutImage, { backgroundColor: '#EEE' }]}>
                        <Ionicons name="basketball-outline" size={24} color="#AAA" />
                    </View>
                )}
            </View>

            {/* Middle: Title and Info */}
            <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle}>{item.title}</Text>
                <View style={styles.workoutMeta}>
                    <Text style={styles.workoutLevel}>{item.level}</Text>
                    <View style={styles.workoutDuration}>
                        <Ionicons name="time-outline" size={14} color="#666" />
                        <Text style={styles.workoutDurationText}>{item.duration}</Text>
                    </View>
                </View>
            </View>

            {/* Right: Action Button */}
            <TouchableOpacity
                style={styles.startButton}
                onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id, autoStart: true })}
            >
                <Ionicons name="play" size={18} color="#FFF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

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
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Training Programs</Text>
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => navigation.navigate('TrainingFilters')}
                    >
                        <Ionicons name="options-outline" size={22} color="#666" />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search workouts"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Categories */}
                    <View style={styles.categoriesSection}>
                        <Text style={styles.sectionTitle}>Training Categories</Text>
                        <FlatList
                            data={trainingCategories}
                            renderItem={renderCategoryItem}
                            keyExtractor={item => item.id}
                            numColumns={3}
                            scrollEnabled={false}
                            contentContainerStyle={styles.categoriesGrid}
                        />
                    </View>

                    {/* AI-Powered Analysis Feature */}
                    <View style={styles.analysisSection}>
                        <View style={styles.analysisCard}>
                            <View style={styles.analysisContent}>
                                <Text style={styles.analysisTitle}>AI Shooting Analysis</Text>
                                <Text style={styles.analysisDescription}>
                                    Get personalized feedback on your shooting form with our AI-powered analysis
                                </Text>
                                <TouchableOpacity
                                    style={styles.analysisButton}
                                    onPress={() => navigation.navigate('ShootingAnalysis')}
                                >
                                    <Text style={styles.analysisButtonText}>Analyze Your Shot</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.analysisImageContainer}>
                                <View style={styles.analysisImage}>
                                    <Ionicons name="analytics" size={40} color="#FFF" />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Recommended for You */}
                    <View style={styles.recommendedSection}>
                        <Text style={styles.sectionTitle}>Recommended for You</Text>
                        {recommendedWorkouts.length > 0 ? (
                            <FlatList
                                data={recommendedWorkouts.slice(0, 3)}
                                renderItem={renderWorkoutItem}
                                keyExtractor={item => item.id}
                                scrollEnabled={false}
                            />
                        ) : (
                            <View style={styles.emptyStateContainer}>
                                <Text style={styles.emptyStateText}>
                                    No recommendations available for your level yet.
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Challenge Yourself */}
                    {nextLevelWorkouts.length > 0 && (
                        <View style={styles.challengeSection}>
                            <Text style={styles.sectionTitle}>Challenge Yourself</Text>
                            <View style={styles.challengeCard}>
                                <Text style={styles.challengeTitle}>Ready for the next level?</Text>
                                <Text style={styles.challengeDescription}>
                                    Try these workouts to push your skills to the next level
                                </Text>

                                {nextLevelWorkouts.map((workout, index) => (
                                    <TouchableOpacity
                                        key={workout.id}
                                        style={[
                                            styles.challengeWorkout,
                                            index < nextLevelWorkouts.length - 1 && styles.challengeWorkoutBorder
                                        ]}
                                        onPress={() => navigation.navigate('WorkoutDetail', { workoutId: workout.id })}
                                    >
                                        <Text style={styles.challengeWorkoutTitle}>{workout.title}</Text>
                                        <Ionicons name="chevron-forward" size={18} color="#666" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Training Programs */}
                    <View style={styles.trainingProgramsSection}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>All Training Programs</Text>
                            <TouchableOpacity onPress={() => setSelectedCategory('All')}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {searchQuery && filteredWorkouts.length === 0 ? (
                            <View style={styles.emptyStateContainer}>
                                <Text style={styles.emptyStateText}>
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
                                style={styles.viewMoreButton}
                                onPress={() => navigation.navigate('AllWorkouts')}
                            >
                                <Text style={styles.viewMoreText}>View More Workouts</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* YouTube Training Videos Section */}
                    <View style={styles.videoSection}>
                        <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>Training Videos</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('VideoLibrary')}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingVideos ? (
                            <View style={styles.videoLoadingContainer}>
                                <ActivityIndicator size="small" color="#FF6B00" />
                                <Text style={styles.loadingVideoText}>Loading videos...</Text>
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
                            <View style={styles.emptyStateContainer}>
                                <Text style={styles.emptyStateText}>
                                    Unable to load training videos. Check your connection.
                                </Text>
                                <TouchableOpacity
                                    style={styles.retryButton}
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
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 24,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 16,
        color: '#333',
    },
    categoriesSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
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
        color: '#FF6B00',
        fontWeight: '500',
    },
    categoriesGrid: {
        justifyContent: 'space-between',
    },
    categoryCard: {
        width: '30%',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    categoryIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    analysisSection: {
        marginBottom: 24,
    },
    analysisCard: {
        backgroundColor: '#FF6B00',
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
        color: '#FF6B00',
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
        backgroundColor: '#FFF',
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
        color: '#333',
        marginBottom: 6,
    },
    workoutMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutLevel: {
        fontSize: 14,
        color: '#FF6B00',
        marginRight: 12,
    },
    workoutDuration: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutDurationText: {
        fontSize: 14,
        color: '#666',
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
    emptyStateContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    challengeSection: {
        marginBottom: 24,
    },
    challengeCard: {
        backgroundColor: '#FFF',
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
        color: '#333',
        marginBottom: 8,
    },
    challengeDescription: {
        fontSize: 14,
        color: '#666',
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
        borderBottomColor: '#F0F0F0',
    },
    challengeWorkoutTitle: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    trainingProgramsSection: {
        marginBottom: 24,
    },
    viewMoreButton: {
        backgroundColor: '#F0F0F0',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    viewMoreText: {
        color: '#666',
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
        color: '#666',
        fontSize: 14,
    },
    retryButton: {
        backgroundColor: '#FF6B00',
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
});

export default TrainingScreen;