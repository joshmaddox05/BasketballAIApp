// TrainingCategoryScreen.js
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const TrainingCategoryScreen = ({ route, navigation }) => {
    const { category } = route.params;
    const { workouts, loading } = useAppContext();
    const [filteredWorkouts, setFilteredWorkouts] = useState([]);
    
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
                return 'brain-outline';
            case 'nutrition':
                return 'nutrition-outline';
            default:
                return 'basketball-outline';
        }
    };

    // Filter workouts based on category
    useEffect(() => {
        if (workouts) {
            const filtered = workouts.filter(workout => 
                workout.category && workout.category.toLowerCase() === category.toLowerCase()
            );
            setFilteredWorkouts(filtered);
        }
    }, [workouts, category]);

    const renderWorkoutItem = ({ item }) => (
        <TouchableOpacity
            style={styles.workoutItem}
            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
        >
            <View style={styles.workoutImageContainer}>
                {item.image ? (
                    <Image source={item.image} style={styles.workoutImage} />
                ) : (
                    <View style={[styles.workoutImage, { backgroundColor: '#EEE' }]}>
                        <Ionicons name={getCategoryIcon()} size={24} color="#AAA" />
                    </View>
                )}
            </View>

            <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle}>{item.title}</Text>
                <View style={styles.workoutMeta}>
                    <Text style={styles.workoutLevel}>{item.level}</Text>
                    <View style={styles.workoutDuration}>
                        <Ionicons name="time-outline" size={14} color="#666" />
                        <Text style={styles.workoutDurationText}>{item.duration}</Text>
                    </View>
                </View>
                {item.description && (
                    <Text style={styles.workoutDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}
            </View>

            <TouchableOpacity
                style={styles.startButton}
                onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id, autoStart: true })}
            >
                <Ionicons name="play" size={18} color="#FFF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

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
    workoutItem: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        flexDirection: 'row',
        padding: 12,
    },
    workoutImageContainer: {
        width: 80,
        height: 80,
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
        marginRight: 8,
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
        marginBottom: 6,
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
    workoutDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    startButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
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
