// TrainingFiltersScreen.js
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TrainingFiltersScreen = ({ route, navigation }) => {
    const { category } = route.params || {};
    
    // Filter states
    const [selectedLevel, setSelectedLevel] = useState('All'); // All, Beginner, Intermediate, Advanced
    const [selectedDuration, setSelectedDuration] = useState('All'); // All, <15min, 15-30min, 30-60min, >60min
    const [equipment, setEquipment] = useState({
        basketball: false,
        hoop: false,
        cones: false,
        ladder: false,
        resistanceBands: false,
        weights: false
    });
    const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
    const [showNewOnly, setShowNewOnly] = useState(false);
    
    // Filter Options
    const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'];
    const durations = ['All', 'Under 15 min', '15-30 min', '30-60 min', 'Over 60 min'];
    
    const applyFilters = () => {
        // In a real app, this would pass the filter values back to the WorkoutsScreen
        // For now, we'll just navigate back
        navigation.goBack();
    };
    
    const resetFilters = () => {
        setSelectedLevel('All');
        setSelectedDuration('All');
        setEquipment({
            basketball: false,
            hoop: false,
            cones: false,
            ladder: false,
            resistanceBands: false,
            weights: false
        });
        setShowFeaturedOnly(false);
        setShowNewOnly(false);
    };
    
    const toggleEquipment = (key) => {
        setEquipment({
            ...equipment,
            [key]: !equipment[key]
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
            
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Filter Workouts</Text>
                <TouchableOpacity
                    style={styles.resetButton}
                    onPress={resetFilters}
                >
                    <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.container}>
                {/* Level Filter */}
                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Skill Level</Text>
                    <View style={styles.optionsContainer}>
                        {levels.map((level) => (
                            <TouchableOpacity
                                key={level}
                                style={[
                                    styles.optionChip,
                                    selectedLevel === level && styles.selectedOptionChip
                                ]}
                                onPress={() => setSelectedLevel(level)}
                            >
                                <Text
                                    style={[
                                        styles.optionChipText,
                                        selectedLevel === level && styles.selectedOptionChipText
                                    ]}
                                >
                                    {level}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                
                {/* Duration Filter */}
                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Duration</Text>
                    <View style={styles.optionsContainer}>
                        {durations.map((duration) => (
                            <TouchableOpacity
                                key={duration}
                                style={[
                                    styles.optionChip,
                                    selectedDuration === duration && styles.selectedOptionChip
                                ]}
                                onPress={() => setSelectedDuration(duration)}
                            >
                                <Text
                                    style={[
                                        styles.optionChipText,
                                        selectedDuration === duration && styles.selectedOptionChipText
                                    ]}
                                >
                                    {duration}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                
                {/* Equipment Filter */}
                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Equipment Required</Text>
                    <View style={styles.equipmentList}>
                        <TouchableOpacity
                            style={styles.equipmentItem}
                            onPress={() => toggleEquipment('basketball')}
                        >
                            <View style={styles.equipmentCheckbox}>
                                {equipment.basketball && (
                                    <Ionicons name="checkmark" size={18} color="#FFF" />
                                )}
                            </View>
                            <View style={styles.equipmentIconContainer}>
                                <Ionicons name="basketball" size={20} color="#FF6B00" />
                            </View>
                            <Text style={styles.equipmentText}>Basketball</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.equipmentItem}
                            onPress={() => toggleEquipment('hoop')}
                        >
                            <View style={styles.equipmentCheckbox}>
                                {equipment.hoop && (
                                    <Ionicons name="checkmark" size={18} color="#FFF" />
                                )}
                            </View>
                            <View style={styles.equipmentIconContainer}>
                                <Ionicons name="basketball-outline" size={20} color="#FF6B00" />
                            </View>
                            <Text style={styles.equipmentText}>Hoop</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.equipmentItem}
                            onPress={() => toggleEquipment('cones')}
                        >
                            <View style={styles.equipmentCheckbox}>
                                {equipment.cones && (
                                    <Ionicons name="checkmark" size={18} color="#FFF" />
                                )}
                            </View>
                            <View style={styles.equipmentIconContainer}>
                                <Ionicons name="triangle" size={20} color="#FF6B00" />
                            </View>
                            <Text style={styles.equipmentText}>Cones</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.equipmentItem}
                            onPress={() => toggleEquipment('ladder')}
                        >
                            <View style={styles.equipmentCheckbox}>
                                {equipment.ladder && (
                                    <Ionicons name="checkmark" size={18} color="#FFF" />
                                )}
                            </View>
                            <View style={styles.equipmentIconContainer}>
                                <Ionicons name="grid" size={20} color="#FF6B00" />
                            </View>
                            <Text style={styles.equipmentText}>Agility Ladder</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.equipmentItem}
                            onPress={() => toggleEquipment('resistanceBands')}
                        >
                            <View style={styles.equipmentCheckbox}>
                                {equipment.resistanceBands && (
                                    <Ionicons name="checkmark" size={18} color="#FFF" />
                                )}
                            </View>
                            <View style={styles.equipmentIconContainer}>
                                <Ionicons name="infinite" size={20} color="#FF6B00" />
                            </View>
                            <Text style={styles.equipmentText}>Resistance Bands</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.equipmentItem}
                            onPress={() => toggleEquipment('weights')}
                        >
                            <View style={styles.equipmentCheckbox}>
                                {equipment.weights && (
                                    <Ionicons name="checkmark" size={18} color="#FFF" />
                                )}
                            </View>
                            <View style={styles.equipmentIconContainer}>
                                <Ionicons name="barbell" size={20} color="#FF6B00" />
                            </View>
                            <Text style={styles.equipmentText}>Weights</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                
                {/* Additional Filters */}
                <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Additional Filters</Text>
                    
                    <View style={styles.switchItem}>
                        <Text style={styles.switchLabel}>Featured workouts only</Text>
                        <Switch
                            value={showFeaturedOnly}
                            onValueChange={setShowFeaturedOnly}
                            trackColor={{ false: '#DEE4E7', true: '#FFD3B6' }}
                            thumbColor={showFeaturedOnly ? '#FF6B00' : '#F5F5F5'}
                        />
                    </View>
                    
                    <View style={styles.switchItem}>
                        <Text style={styles.switchLabel}>New workouts only</Text>
                        <Switch
                            value={showNewOnly}
                            onValueChange={setShowNewOnly}
                            trackColor={{ false: '#DEE4E7', true: '#FFD3B6' }}
                            thumbColor={showNewOnly ? '#FF6B00' : '#F5F5F5'}
                        />
                    </View>
                </View>
            </ScrollView>
            
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.applyButton}
                    onPress={applyFilters}
                >
                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
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
    closeButton: {
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
    resetButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    resetButtonText: {
        color: '#FF6B00',
        fontSize: 14,
        fontWeight: '500',
    },
    container: {
        flex: 1,
    },
    filterSection: {
        backgroundColor: '#FFF',
        padding: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    optionChip: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },
    selectedOptionChip: {
        backgroundColor: '#FF6B00',
    },
    optionChipText: {
        color: '#666',
        fontSize: 14,
    },
    selectedOptionChipText: {
        color: '#FFF',
        fontWeight: '500',
    },
    equipmentList: {
        marginBottom: 8,
    },
    equipmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    equipmentCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#FF6B00',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: equipment => equipment ? '#FF6B00' : 'transparent',
    },
    equipmentIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    equipmentText: {
        fontSize: 16,
        color: '#333',
    },
    switchItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    switchLabel: {
        fontSize: 16,
        color: '#333',
    },
    footer: {
        padding: 16,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    applyButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default TrainingFiltersScreen;
