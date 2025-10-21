// PasswordResetScreen.js - Password reset functionality
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../../services/authService';
import { getTheme } from '../../utils/theme';

const PasswordResetScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const validateEmail = (email) => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    const handlePasswordReset = async () => {
        // Validate email
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setIsLoading(true);

        try {
            await resetPassword(email.trim());
            setEmailSent(true);
            
            Alert.alert(
                'Password Reset Sent',
                'Check your email for instructions to reset your password. If you don\'t see the email, check your spam folder.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Password reset error:', error);
            Alert.alert('Error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigation.goBack();
    };

    if (emailSent) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
                
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBackToLogin}
                    >
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.successContainer}>
                        <View style={styles.successIconContainer}>
                            <Ionicons name="mail" size={60} color="#4CAF50" />
                        </View>
                        
                        <Text style={styles.successTitle}>Check Your Email</Text>
                        <Text style={styles.successMessage}>
                            We've sent password reset instructions to:
                        </Text>
                        <Text style={styles.emailText}>{email}</Text>
                        
                        <Text style={styles.instructionsText}>
                            Click the link in the email to reset your password. If you don't see the email, check your spam folder.
                        </Text>

                        <TouchableOpacity
                            style={styles.backToLoginButton}
                            onPress={handleBackToLogin}
                        >
                            <Text style={styles.backToLoginButtonText}>Back to Sign In</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resendButton}
                            onPress={() => {
                                setEmailSent(false);
                                handlePasswordReset();
                            }}
                        >
                            <Text style={styles.resendButtonText}>Resend Email</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.subtitle}>
                            Enter your email address and we'll send you instructions to reset your password
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={handlePasswordReset}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.resetButtonText}>Send Reset Instructions</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.helpContainer}>
                        <Text style={styles.helpText}>
                            Remember your password?{' '}
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <Text style={styles.helpLink}>Sign In</Text>
                            </TouchableOpacity>
                        </Text>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    titleContainer: {
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
    },
    form: {
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: '#333',
    },
    resetButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    helpContainer: {
        alignItems: 'center',
    },
    helpText: {
        fontSize: 14,
        color: '#666',
    },
    helpLink: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF6B00',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    successIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E8F5E8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 8,
    },
    emailText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B00',
        marginBottom: 20,
    },
    instructionsText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 40,
    },
    backToLoginButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginBottom: 16,
        minWidth: 200,
        alignItems: 'center',
    },
    backToLoginButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    resendButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    resendButtonText: {
        fontSize: 14,
        color: '#FF6B00',
        fontWeight: '600',
    },
});

export default PasswordResetScreen;
