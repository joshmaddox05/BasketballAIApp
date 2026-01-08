// CategoryWorkoutsScreen.js - View workouts in a specific category
import React, { useState, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import {
    getCategoryById,
    getSubcategoriesForCategory,
    UNCATEGORIZED_CATEGORY,
} from '../../data/taxonomy';
import { getTheme } from '../../utils/theme';

const CategoryWorkoutsScreen = ({ navigation, route }) => {
    const { categoryId, categoryName, categoryColor } = route.params;
    const { isDarkMode, theme: contextTheme, searchWorkouts, userData } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);

    // Get category info
    const category = getCategoryById(categoryId) || UNCATEGORIZED_CATEGORY;
    const subcategories = getSubcategoriesForCategory(categoryId);
    const color = categoryColor || category.color;

    // Filter workouts based on search and subcategory
    const filteredWorkouts = useMemo(() => {
        return searchWorkouts(searchQuery, categoryId, selectedSubCategory);
    }, [searchQuery, categoryId, selectedSubCategory, searchWorkouts]);

    const handleSubCategoryPress = (subCategoryId) => {
        if (selectedSubCategory === subCategoryId) {
            setSelectedSubCategory(null); // Deselect if already selected
        } else {
            setSelectedSubCategory(subCategoryId);
        }
    };

    const handleWorkoutPress = (workout) => {
        navigation.navigate('WorkoutDetail', { workoutId: workout.id });
    };

    const renderSubCategoryChip = (subcategory) => {
        const isSelected = selectedSubCategory === subcategory.id;
        return (
            <TouchableOpacity
                key={subcategory.id}
                style={[
                    styles.chip,
                    {
                        backgroundColor: isSelected ? color : theme.backgroundTertiary,
                        borderColor: isSelected ? color : theme.border,
                    },
                ]}
                onPress={() => handleSubCategoryPress(subcategory.id)}
            >
                <Text
                    style={[
                        styles.chipText,
                        { color: isSelected ? '#FFFFFF' : theme.text },
                    ]}
                >
                    {subcategory.name}
                </Text>
                {isSelected && (
                    <Ionicons name="close-circle" size={16} color="#FFFFFF" style={styles.chipIcon} />
                )}
            </TouchableOpacity>
        );
    };

    const renderWorkoutItem = ({ item }) => {
        const isLocked = item.requiredTier && item.requiredTier !== 'free' &&
            userData?.subscription === 'free';

        return (
            <TouchableOpacity
                style={[
                    styles.workoutCard,
                    {
                        backgroundColor: theme.card,
                        borderColor: theme.cardBorder,
                    },
                ]}
                onPress={() => handleWorkoutPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.workoutIconContainer, { backgroundColor: color + '20' }]}>
                    <Ionicons
                        name={category.icon || 'basketball-outline'}
                        size={24}
                        color={color}
                    />
                </View>

                <View style={styles.workoutInfo}>
                    <View style={styles.workoutTitleRow}>
                        <Text
                            style={[styles.workoutTitle, { color: theme.text }]}
                            numberOfLines={1}
                        >
                            {item.title}
                        </Text>
                        {isLocked && (
                            <Ionicons name="lock-closed" size={14} color={theme.textTertiary} />
                        )}
                    </View>

                    <View style={styles.workoutMeta}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                                {item.duration}
                            </Text>
                        </View>

                        {item.level && (
                            <View style={[
                                styles.levelBadge,
                                {
                                    backgroundColor: item.level === 'Beginner' ? '#4CAF50' :
                                        item.level === 'Intermediate' ? '#FF9800' : '#F44336',
                                },
                            ]}>
                                <Text style={styles.levelText}>{item.level}</Text>
                            </View>
                        )}
                    </View>

                    {item.description && (
                        <Text
                            style={[styles.workoutDescription, { color: theme.textSecondary }]}
                            numberOfLines={2}
                        >
                            {item.description}
                        </Text>
                    )}
                </View>

                <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No workouts found
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>
                {searchQuery
                    ? 'Try adjusting your search or filters'
                    : 'No workouts available in this category yet'}
            </Text>
            {(searchQuery || selectedSubCategory) && (
                <TouchableOpacity
                    style={[styles.clearButton, { backgroundColor: color }]}
                    onPress={() => {
                        setSearchQuery('');
                        setSelectedSubCategory(null);
                    }}
                >
                    <Text style={styles.clearButtonText}>Clear Filters</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <View style={[styles.headerIcon, { backgroundColor: color + '20' }]}>
                        <Ionicons name={category.icon} size={18} color={color} />
                    </View>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>
                        {categoryName || category.name}
                    </Text>
                </View>
                <View style={styles.headerRight} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
                    <Ionicons name="search" size={20} color={theme.textTertiary} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search workouts..."
                        placeholderTextColor={theme.inputPlaceholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Subcategory Chips */}
            {subcategories.length > 0 && (
                <View style={styles.chipsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipsScroll}
                    >
                        {subcategories.map(renderSubCategoryChip)}
                    </ScrollView>
                </View>
            )}

            {/* Results Count */}
            <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
                    {filteredWorkouts.length} {filteredWorkouts.length === 1 ? 'workout' : 'workouts'}
                    {selectedSubCategory && ' in selected filter'}
                </Text>
            </View>

            {/* Workouts List */}
            <FlatList
                data={filteredWorkouts}
                keyExtractor={(item) => item.id}
                renderItem={renderWorkoutItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={renderEmptyState}
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
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerRight: {
        width: 32,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        marginLeft: 8,
    },
    chipsContainer: {
        paddingBottom: 8,
    },
    chipsScroll: {
        paddingHorizontal: 16,
        gap: 8,
        flexDirection: 'row',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    chipIcon: {
        marginLeft: 4,
    },
    resultsHeader: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    resultsCount: {
        fontSize: 14,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    workoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    workoutIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    workoutInfo: {
        flex: 1,
        marginLeft: 12,
    },
    workoutTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    workoutTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    workoutMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 13,
    },
    levelBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    levelText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    workoutDescription: {
        fontSize: 13,
        marginTop: 6,
        lineHeight: 18,
    },
    separator: {
        height: 10,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptyDescription: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    clearButton: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    clearButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default CategoryWorkoutsScreen;
