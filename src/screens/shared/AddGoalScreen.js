// Add a form to create new goals
// Create a new file: src/screens/AddGoalScreen.js

import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useAppContext } from '../../context/AppContext';

const AddGoalScreen = ({ navigation }) => {
    const { addGoal } = useAppContext();
    const [goalName, setGoalName] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [targetValue, setTargetValue] = useState('');
    const [deadline, setDeadline] = useState('');

    const handleSubmit = () => {
        // Validate inputs
        if (!goalName.trim()) {
            Alert.alert('Error', 'Please enter a goal name');
            return;
        }

        if (!currentValue || !targetValue) {
            Alert.alert('Error', 'Please enter current and target values');
            return;
        }

        const current = parseInt(currentValue);
        const target = parseInt(targetValue);

        if (isNaN(current) || isNaN(target)) {
            Alert.alert('Error', 'Current and target values must be numbers');
            return;
        }

        if (current > target) {
            Alert.alert('Error', 'Target value should be greater than current value');
            return;
        }

        // Create new goal and add it
        const newGoal = {
            name: goalName,
            current,
            target,
            deadline: deadline || null
        };

        addGoal(newGoal);

        // Show success message and navigate back
        Alert.alert(
            'Goal Added',
            'Your new goal has been created!',
            [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView style={styles.formContainer}>
                <Text style={styles.title}>Create New Goal</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Goal Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Improve free throw accuracy"
                        value={goalName}
                        onChangeText={setGoalName}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Current Value</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 70"
                        value={currentValue}
                        onChangeText={setCurrentValue}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Target Value</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 90"
                        value={targetValue}
                        onChangeText={setTargetValue}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Deadline (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        value={deadline}
                        onChangeText={setDeadline}
                    />
                </View>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                >
                    <Text style={styles.submitButtonText}>Create Goal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    formContainer: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    submitButton: {
        backgroundColor: '#FF6B00',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#F0F0F0',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default AddGoalScreen;