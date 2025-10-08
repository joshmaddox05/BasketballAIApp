// AllActivitiesScreen.js
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const AllActivitiesScreen = ({ navigation }) => {
    const { activities, loading } = useAppContext();
    const [filteredActivities, setFilteredActivities] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState('all'); // all, workouts, analysis, challenges

    // Apply filter to activities
    useEffect(() => {
        if (!activities) return;

        let filtered = [...activities];
        
        // In a real app, activities would have a type property
        // Here we're simulating filtering by looking at the title
        if (selectedFilter !== 'all') {
            filtered = filtered.filter(activity => {
                const title = activity.title.toLowerCase();
                switch (selectedFilter) {
                    case 'workouts':
                        return title.includes('workout') || title.includes('training') || title.includes('drill');
                    case 'analysis':
                        return title.includes('analysis') || title.includes('form') || title.includes('shooting');
                    case 'challenges':
                        return title.includes('challenge') || title.includes('contest') || title.includes('competition');
                    default:
                        return true;
                }
            });
        }
        
        setFilteredActivities(filtered);
    }, [activities, selectedFilter]);

    // Get activity icon based on title
    const getActivityIcon = (title) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('workout') || lowerTitle.includes('training') || lowerTitle.includes('drill')) {
            return 'barbell';
        } else if (lowerTitle.includes('analysis') || lowerTitle.includes('form') || lowerTitle.includes('shooting')) {
            return 'analytics';
        } else if (lowerTitle.includes('challenge') || lowerTitle.includes('contest')) {
            return 'trophy';
        } else {
            return 'basketball';
        }
    };

    // Get activity color based on progress
    const getActivityColor = (progress) => {
        if (progress >= 80) return '#4CAF50'; // Green for high progress
        if (progress >= 50) return '#FF9800'; // Orange for medium progress
        return '#F44336'; // Red for low progress
    };

    const renderActivityItem = ({ item }) => (
        <TouchableOpacity
            style={styles.activityItem}
            onPress={() => {
                // In a real app, we would navigate to a detail screen
                // For now just show some info
                alert(`Activity: ${item.title}\nProgress: ${item.progress}%\nDate: ${item.date}`);
            }}
        >
            <View
                style={[
                    styles.activityIconContainer,
                    { backgroundColor: `${getActivityColor(item.progress)}20` }
                ]}
            >
                <Ionicons
                    name={getActivityIcon(item.title)}
                    size={24}
                    color={getActivityColor(item.progress)}
                />
            </View>
            
            <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityDate}>{item.date}</Text>
            </View>
            
            <View style={styles.activityProgress}>
                <View style={styles.progressCircle}>
                    <Text style={styles.progressText}>{item.progress}%</Text>
                </View>
                <Text style={styles.progressLabel}>Complete</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
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
                <Text style={styles.headerTitle}>Activity History</Text>
                <View style={styles.headerRight} />
            </View>
            
            <View style={styles.filterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterButtons}
                >
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedFilter === 'all' && styles.activeFilterButton
                        ]}
                        onPress={() => setSelectedFilter('all')}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                selectedFilter === 'all' && styles.activeFilterButtonText
                            ]}
                        >
                            All Activities
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedFilter === 'workouts' && styles.activeFilterButton
                        ]}
                        onPress={() => setSelectedFilter('workouts')}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                selectedFilter === 'workouts' && styles.activeFilterButtonText
                            ]}
                        >
                            Workouts
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedFilter === 'analysis' && styles.activeFilterButton
                        ]}
                        onPress={() => setSelectedFilter('analysis')}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                selectedFilter === 'analysis' && styles.activeFilterButtonText
                            ]}
                        >
                            Analysis
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            selectedFilter === 'challenges' && styles.activeFilterButton
                        ]}
                        onPress={() => setSelectedFilter('challenges')}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                selectedFilter === 'challenges' && styles.activeFilterButtonText
                            ]}
                        >
                            Challenges
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
            
            {filteredActivities.length > 0 ? (
                <FlatList
                    data={filteredActivities}
                    renderItem={renderActivityItem}
                    keyExtractor={(item, index) => `activity-${index}`}
                    contentContainerStyle={styles.activitiesList}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="fitness" size={60} color="#DDD" />
                    <Text style={styles.emptyTitle}>No Activities Found</Text>
                    <Text style={styles.emptyMessage}>
                        {selectedFilter === 'all' 
                            ? "You haven't completed any activities yet. Start a workout to see your progress here!" 
                            : `No ${selectedFilter} activities found. Try a different filter or complete a ${selectedFilter.slice(0, -1)} activity.`}
                    </Text>
                    <TouchableOpacity
                        style={styles.startWorkoutButton}
                        onPress={() => navigation.navigate('Training')}
                    >
                        <Text style={styles.startWorkoutButtonText}>Find Workouts</Text>
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
    headerRight: {
        width: 40,
    },
    filterContainer: {
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    filterButtons: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        marginRight: 8,
    },
    activeFilterButton: {
        backgroundColor: '#FF6B00',
    },
    filterButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    activeFilterButtonText: {
        color: '#FFF',
    },
    activitiesList: {
        padding: 16,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    activityIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    activityDate: {
        fontSize: 14,
        color: '#666',
    },
    activityProgress: {
        alignItems: 'center',
    },
    progressCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    progressLabel: {
        fontSize: 12,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        marginBottom: 24,
    },
    startWorkoutButton: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    startWorkoutButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default AllActivitiesScreen;
