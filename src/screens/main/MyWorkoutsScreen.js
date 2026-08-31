// MyWorkoutsScreen.js - View and manage custom workouts and favorites
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import {
  getUserCustomWorkouts,
  getFavoriteWorkouts,
  deleteCustomWorkout,
  removeWorkoutFromFavorites,
} from '../../services/firestoreService';
import { getAllWorkoutTemplates } from '../../data/workoutTemplates';
import { useToast } from '../../components/dbe';

const MyWorkoutsScreen = ({ navigation }) => {
  const { userData } = useAppContext();
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState('custom'); // 'custom', 'favorites', 'templates'
  const [customWorkouts, setCustomWorkouts] = useState([]);
  const [favoriteWorkouts, setFavoriteWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load workouts on screen focus
  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [userData?.uid])
  );

  const loadWorkouts = async () => {
    if (!userData?.uid) return;

    setLoading(true);
    try {
      const [custom, favorites] = await Promise.all([
        getUserCustomWorkouts(userData.uid),
        getFavoriteWorkouts(userData.uid),
      ]);

      setCustomWorkouts(custom);
      setFavoriteWorkouts(favorites);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = (workoutId) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this custom workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomWorkout(userData.uid, workoutId);
              loadWorkouts();
              showToast('Workout deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete workout');
            }
          },
        },
      ]
    );
  };

  const handleUnfavorite = (workoutId, isCustom) => {
    Alert.alert(
      'Remove Favorite',
      'Remove this workout from your favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeWorkoutFromFavorites(userData.uid, workoutId, isCustom);
              loadWorkouts();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove favorite');
            }
          },
        },
      ]
    );
  };

  const renderWorkoutCard = ({ item, showActions = true, isFavorite = false }) => {
    const categoryColors = {
      Shooting: '#8A1C22',
      Dribbling: '#4CAF50',
      Physical: '#2196F3',
      Defense: '#9C27B0',
      Passing: '#FF9800',
      Custom: '#666',
    };

    const color = categoryColors[item.category] || '#666';

    return (
      <TouchableOpacity
        style={styles.workoutCard}
        onPress={() => {
          if (item.isCustom) {
            navigation.navigate('WorkoutDetail', {
              workout: item,
              isCustom: true,
            });
          } else {
            navigation.navigate('WorkoutDetail', {
              workoutId: item.id,
            });
          }
        }}
      >
        <View style={styles.workoutHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: color + '20' }]}>
            <Ionicons name="basketball" size={20} color={color} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutName}>{item.name || item.title}</Text>
            <Text style={styles.workoutDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </View>

        <View style={styles.workoutMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{item.estimatedDuration || item.duration} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="list-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{item.steps?.length || 0} steps</Text>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: color + '15' }]}>
            <Text style={[styles.difficultyText, { color }]}>
              {item.difficulty || item.level}
            </Text>
          </View>
        </View>

        {showActions && (
          <View style={styles.workoutActions}>
            {isFavorite && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleUnfavorite(item.id, item.isCustom)}
              >
                <Ionicons name="heart-dislike-outline" size={20} color="#F44336" />
                <Text style={[styles.actionButtonText, { color: '#F44336' }]}>Unfavorite</Text>
              </TouchableOpacity>
            )}
            {item.isCustom && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    navigation.navigate('CustomWorkoutCreator', { workoutId: item.id })
                  }
                >
                  <Ionicons name="create-outline" size={20} color="#2196F3" />
                  <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteWorkout(item.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#F44336" />
                  <Text style={[styles.actionButtonText, { color: '#F44336' }]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTemplateCard = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.templateCard}
        onPress={() => {
          navigation.navigate('CustomWorkoutCreator', { template: item });
        }}
      >
        <View style={styles.templateHeader}>
          <View style={styles.templateIconContainer}>
            <Ionicons name="document-text-outline" size={28} color="#8A1C22" />
          </View>
          <View style={styles.templateInfo}>
            <Text style={styles.templateName}>{item.name}</Text>
            <Text style={styles.templateDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        </View>
        <View style={styles.templateMeta}>
          <Text style={styles.templateMetaText}>
            {item.estimatedDuration} min • {item.steps.length} steps
          </Text>
          <View style={styles.templateBadge}>
            <Text style={styles.templateBadgeText}>{item.difficulty}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const emptyStates = {
      custom: {
        icon: 'create-outline',
        title: 'No Custom Workouts',
        subtitle: 'Create your first custom workout or use a template',
        action: 'Create Workout',
        onPress: () => navigation.navigate('CustomWorkoutCreator', {}),
      },
      favorites: {
        icon: 'heart-outline',
        title: 'No Favorites Yet',
        subtitle: 'Tap the heart icon on any workout to add it to favorites',
        action: null,
      },
      templates: {
        icon: 'document-text-outline',
        title: 'No Templates',
        subtitle: 'Templates help you quickly create custom workouts',
        action: null,
      },
    };

    const state = emptyStates[activeTab];

    return (
      <View style={styles.emptyState}>
        <Ionicons name={state.icon} size={64} color="#CCC" />
        <Text style={styles.emptyStateTitle}>{state.title}</Text>
        <Text style={styles.emptyStateSubtitle}>{state.subtitle}</Text>
        {state.action && (
          <TouchableOpacity style={styles.emptyStateButton} onPress={state.onPress}>
            <Text style={styles.emptyStateButtonText}>{state.action}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const workoutTemplates = getAllWorkoutTemplates();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Workouts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CustomWorkoutCreator', {})}
        >
          <Ionicons name="add" size={28} color="#8A1C22" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'custom' && styles.tabActive]}
          onPress={() => setActiveTab('custom')}
        >
          <Ionicons
            name="create"
            size={20}
            color={activeTab === 'custom' ? '#8A1C22' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'custom' && styles.tabTextActive]}>
            Custom ({customWorkouts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
          onPress={() => setActiveTab('favorites')}
        >
          <Ionicons
            name="heart"
            size={20}
            color={activeTab === 'favorites' ? '#8A1C22' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>
            Favorites ({favoriteWorkouts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'templates' && styles.tabActive]}
          onPress={() => setActiveTab('templates')}
        >
          <Ionicons
            name="document-text"
            size={20}
            color={activeTab === 'templates' ? '#8A1C22' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'templates' && styles.tabTextActive]}>
            Templates
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8A1C22" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'custom' && (
            <>
              {customWorkouts.length === 0 ? (
                renderEmptyState()
              ) : (
                <FlatList
                  data={customWorkouts}
                  renderItem={({ item }) => renderWorkoutCard({ item, showActions: true })}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.listContent}
                />
              )}
            </>
          )}

          {activeTab === 'favorites' && (
            <>
              {favoriteWorkouts.length === 0 ? (
                renderEmptyState()
              ) : (
                <FlatList
                  data={favoriteWorkouts}
                  renderItem={({ item }) =>
                    renderWorkoutCard({ item, showActions: true, isFavorite: true })
                  }
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.listContent}
                />
              )}
            </>
          )}

          {activeTab === 'templates' && (
            <FlatList
              data={workoutTemplates}
              renderItem={renderTemplateCard}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#8A1C22',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#8A1C22',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  workoutCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  workoutHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  categoryBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  workoutDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  workoutActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  templateCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#8A1C2230',
    borderStyle: 'dashed',
  },
  templateHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  templateIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8A1C2215',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateMetaText: {
    fontSize: 13,
    color: '#666',
  },
  templateBadge: {
    backgroundColor: '#8A1C2215',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  templateBadgeText: {
    fontSize: 12,
    color: '#8A1C22',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateButton: {
    marginTop: 20,
    backgroundColor: '#8A1C22',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default MyWorkoutsScreen;
