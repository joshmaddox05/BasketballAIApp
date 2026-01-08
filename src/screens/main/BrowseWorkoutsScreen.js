// BrowseWorkoutsScreen.js - Browse workouts by category
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { CATEGORIES, UNCATEGORIZED_CATEGORY } from '../../data/taxonomy';
import { getTheme } from '../../utils/theme';

const BrowseWorkoutsScreen = ({ navigation }) => {
    const { isDarkMode, theme: contextTheme, getWorkoutsByCategory } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

    // Get workout count per category
    const getCategoryWorkoutCount = (categoryId) => {
        const workouts = getWorkoutsByCategory(categoryId);
        return workouts.length;
    };

    // Combine main categories with uncategorized if there are uncategorized workouts
    const categoriesWithCounts = CATEGORIES.map(category => ({
        ...category,
        workoutCount: getCategoryWorkoutCount(category.id),
    }));

    // Add uncategorized if there are any
    const uncategorizedCount = getCategoryWorkoutCount('uncategorized');
    if (uncategorizedCount > 0) {
        categoriesWithCounts.push({
            ...UNCATEGORIZED_CATEGORY,
            workoutCount: uncategorizedCount,
        });
    }

    const handleCategoryPress = (category) => {
        navigation.navigate('CategoryWorkouts', {
            categoryId: category.id,
            categoryName: category.name,
            categoryColor: category.color,
        });
    };

    const renderCategoryCard = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.categoryCard,
                {
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                },
            ]}
            onPress={() => handleCategoryPress(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={32} color={item.color} />
            </View>
            <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: theme.text }]}>
                    {item.name}
                </Text>
                <Text style={[styles.workoutCount, { color: theme.textSecondary }]}>
                    {item.workoutCount} {item.workoutCount === 1 ? 'workout' : 'workouts'}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
        </TouchableOpacity>
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
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    Browse by Type
                </Text>
                <View style={styles.headerRight} />
            </View>

            {/* Description */}
            <View style={styles.descriptionContainer}>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                    Choose a category to find workouts that match your training goals.
                </Text>
            </View>

            {/* Categories List */}
            <FlatList
                data={categoriesWithCounts}
                keyExtractor={(item) => item.id}
                renderItem={renderCategoryCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
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
        fontSize: 18,
        fontWeight: '600',
    },
    headerRight: {
        width: 32,
    },
    descriptionContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    categoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryInfo: {
        flex: 1,
        marginLeft: 16,
    },
    categoryName: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
    },
    workoutCount: {
        fontSize: 14,
    },
    separator: {
        height: 12,
    },
});

export default BrowseWorkoutsScreen;
