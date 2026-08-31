// AllWorkoutsScreen.js
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const AllWorkoutsScreen = ({ navigation }) => {
    const { workouts, loading } = useAppContext();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSort, setSelectedSort] = useState('recommended'); // recommended, newest, duration, level
    const [filteredWorkouts, setFilteredWorkouts] = useState([]);
    const [showLevelFilter, setShowLevelFilter] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState('All');
    
    // Filter and sort workouts
    useEffect(() => {
        if (!workouts) return;
        
        let filtered = [...workouts];
        
        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(workout => 
                workout.title.toLowerCase().includes(query) ||
                (workout.description && workout.description.toLowerCase().includes(query))
            );
        }
        
        // Apply level filter if not 'All'
        if (selectedLevel !== 'All') {
            filtered = filtered.filter(workout => 
                workout.level === selectedLevel
            );
        }
        
        // Apply sorting
        switch (selectedSort) {
            case 'newest':
                // In a real app, you would sort by date
                // For this demo, we'll just reverse the array to simulate newest first
                filtered = [...filtered].reverse();
                break;
            case 'duration':
                // Sort by duration (would need to parse duration strings in a real app)
                // For this demo, we'll sort by the numerical part of the duration string
                filtered = [...filtered].sort((a, b) => {
                    const getDurationMinutes = (duration) => {
                        const match = duration.match(/\d+/);
                        return match ? parseInt(match[0], 10) : 0;
                    };
                    return getDurationMinutes(a.duration) - getDurationMinutes(b.duration);
                });
                break;
            case 'level':
                // Sort by level (Beginner, Intermediate, Advanced)
                const levelOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
                filtered = [...filtered].sort((a, b) => {
                    return levelOrder[a.level] - levelOrder[b.level];
                });
                break;
            case 'recommended':
            default:
                // For recommended, we'll prioritize featured workouts
                filtered = [...filtered].sort((a, b) => {
                    if (a.featured && !b.featured) return -1;
                    if (!a.featured && b.featured) return 1;
                    return 0;
                });
                break;
        }
        
        setFilteredWorkouts(filtered);
    }, [workouts, searchQuery, selectedSort, selectedLevel]);
    
    const renderWorkoutItem = ({ item }) => (
        <TouchableOpacity
            style={styles.workoutItem}
            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
        >
            <View style={styles.workoutImageContainer}>
                {item.image ? (
                    <Image source={item.image} style={styles.workoutImage} />
                ) : (
                    <View style={[styles.workoutImage, styles.workoutImagePlaceholder]}>
                        <Ionicons name="basketball-outline" size={30} color="#CCC" />
                    </View>
                )}
                
                {item.level && (
                    <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>{item.level}</Text>
                    </View>
                )}
                
                {item.featured && (
                    <View style={styles.featuredBadge}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.featuredText}>Featured</Text>
                    </View>
                )}
            </View>
            
            <View style={styles.workoutContent}>
                <Text style={styles.workoutTitle}>{item.title}</Text>
                
                <View style={styles.workoutMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.metaText}>{item.duration}</Text>
                    </View>
                    
                    {item.category && (
                        <View style={styles.metaItem}>
                            <Ionicons 
                                name={
                                    item.category === 'shooting' ? 'basketball-outline' :
                                    item.category === 'dribbling' ? 'hand-left-outline' :
                                    'fitness-outline'
                                } 
                                size={16} 
                                color="#666" 
                            />
                            <Text style={styles.metaText}>
                                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                            </Text>
                        </View>
                    )}
                </View>
                
                {item.description && (
                    <Text style={styles.workoutDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}
                
                <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id, autoStart: true })}
                >
                    <Text style={styles.startButtonText}>Start</Text>
                    <Ionicons name="play" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
    
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8A1C22" />
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
                <Text style={styles.headerTitle}>All Workouts</Text>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => navigation.navigate('TrainingFilters')}
                >
                    <Ionicons name="options-outline" size={24} color="#333" />
                </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search workouts"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery !== '' && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={() => setSearchQuery('')}
                        >
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            
            <View style={styles.filtersContainer}>
                {/* Sort buttons */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.sortOptions}
                >
                    <TouchableOpacity
                        style={[
                            styles.sortButton,
                            selectedSort === 'recommended' && styles.activeSortButton
                        ]}
                        onPress={() => setSelectedSort('recommended')}
                    >
                        <Text 
                            style={[
                                styles.sortButtonText,
                                selectedSort === 'recommended' && styles.activeSortButtonText
                            ]}
                        >
                            Recommended
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.sortButton,
                            selectedSort === 'newest' && styles.activeSortButton
                        ]}
                        onPress={() => setSelectedSort('newest')}
                    >
                        <Text 
                            style={[
                                styles.sortButtonText,
                                selectedSort === 'newest' && styles.activeSortButtonText
                            ]}
                        >
                            Newest
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.sortButton,
                            selectedSort === 'duration' && styles.activeSortButton
                        ]}
                        onPress={() => setSelectedSort('duration')}
                    >
                        <Text 
                            style={[
                                styles.sortButtonText,
                                selectedSort === 'duration' && styles.activeSortButtonText
                            ]}
                        >
                            Duration
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.sortButton,
                            selectedSort === 'level' && styles.activeSortButton
                        ]}
                        onPress={() => setSelectedSort('level')}
                    >
                        <Text 
                            style={[
                                styles.sortButtonText,
                                selectedSort === 'level' && styles.activeSortButtonText
                            ]}
                        >
                            Level
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
                
                {/* Level filter */}
                <TouchableOpacity
                    style={styles.levelFilterButton}
                    onPress={() => setShowLevelFilter(!showLevelFilter)}
                >
                    <Text style={styles.levelFilterText}>
                        Level: {selectedLevel}
                    </Text>
                    <Ionicons
                        name={showLevelFilter ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#666"
                    />
                </TouchableOpacity>
                
                {/* Level filter dropdown */}
                {showLevelFilter && (
                    <View style={styles.levelDropdown}>
                        {['All', 'Beginner', 'Intermediate', 'Advanced'].map(level => (
                            <TouchableOpacity
                                key={level}
                                style={[
                                    styles.levelOption,
                                    selectedLevel === level && styles.selectedLevelOption
                                ]}
                                onPress={() => {
                                    setSelectedLevel(level);
                                    setShowLevelFilter(false);
                                }}
                            >
                                <Text 
                                    style={[
                                        styles.levelOptionText,
                                        selectedLevel === level && styles.selectedLevelOptionText
                                    ]}
                                >
                                    {level}
                                </Text>
                                {selectedLevel === level && (
                                    <Ionicons name="checkmark" size={18} color="#8A1C22" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
            
            <FlatList
                data={filteredWorkouts}
                renderItem={renderWorkoutItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.workoutsList}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="basketball" size={60} color="#DDD" />
                        <Text style={styles.emptyTitle}>No Workouts Found</Text>
                        <Text style={styles.emptyMessage}>
                            Try changing your filters or search for something else.
                        </Text>
                    </View>
                }
            />
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: 16,
        color: '#333',
    },
    clearButton: {
        padding: 4,
    },
    filtersContainer: {
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 8,
    },
    sortOptions: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    sortButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        marginRight: 8,
    },
    activeSortButton: {
        backgroundColor: '#8A1C22',
    },
    sortButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    activeSortButtonText: {
        color: '#FFF',
    },
    levelFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    levelFilterText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    levelDropdown: {
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingHorizontal: 16,
    },
    levelOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    selectedLevelOption: {
        // No visual difference except for the text
    },
    levelOptionText: {
        fontSize: 14,
        color: '#333',
    },
    selectedLevelOptionText: {
        color: '#8A1C22',
        fontWeight: '600',
    },
    workoutsList: {
        padding: 16,
    },
    workoutItem: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    workoutImageContainer: {
        position: 'relative',
        height: 160,
    },
    workoutImage: {
        width: '100%',
        height: '100%',
    },
    workoutImagePlaceholder: {
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    levelText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
    },
    featuredBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    featuredText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    workoutContent: {
        padding: 16,
    },
    workoutTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    workoutMeta: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    metaText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 4,
    },
    workoutDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 16,
    },
    startButton: {
        backgroundColor: '#8A1C22',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
    },
    startButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});

export default AllWorkoutsScreen;
