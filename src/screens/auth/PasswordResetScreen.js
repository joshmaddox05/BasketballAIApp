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
import { useAppContext } from '../../context/AppContext';
import { getTheme } from '../../utils/theme';

const PasswordResetScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const { theme: contextTheme, isDarkMode } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

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
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />

                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBackToLogin}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.successContainer}>
                        <View style={[styles.successIconContainer, { backgroundColor: theme.success + '20' }]}>
                            <Ionicons name="mail" size={60} color={theme.success} />
                        </View>

                        <Text style={[styles.successTitle, { color: theme.text }]}>Check Your Email</Text>
                        <Text style={[styles.successMessage, { color: theme.textSecondary }]}>
                            We've sent password reset instructions to:
                        </Text>
                        <Text style={[styles.emailText, { color: theme.primary }]}>{email}</Text>

                        <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
                            Click the link in the email to reset your password. If you don't see the email, check your spam folder.
                        </Text>

                        <TouchableOpacity
                            style={[styles.backToLoginButton, { backgroundColor: theme.primary }]}
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
                            <Text style={[styles.resendButtonText, { color: theme.primary }]}>Resend Email</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />

                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    <View style={styles.titleContainer}>
                        <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            Enter your email address and we'll send you instructions to reset your password
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={[styles.inputContainer, { backgroundColor: theme.input }]}>
                            <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Email"
                                placeholderTextColor={theme.inputPlaceholder}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.resetButton, { backgroundColor: theme.primary }]}
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
                        <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                            Remember your password?{' '}
                        </Text>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text style={[styles.helpLink, { color: theme.primary }]}>Sign In</Text>
                        </TouchableOpacity>
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
        fontSize: 17.5,
        color: '#666',
        lineHeight: 25,
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
        fontSize: 17.5,
        color: '#333',
    },
    resetButton: {
        backgroundColor: '#8A1C22',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    resetButtonText: {
        fontSize: 17.5,
        fontWeight: 'bold',
        color: '#FFF',
    },
    helpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpText: {
        fontSize: 16,
    },
    helpLink: {
        fontSize: 16,
        fontWeight: 'bold',
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
        fontSize: 25,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: 17.5,
        color: '#666',
        textAlign: 'center',
        marginBottom: 8,
    },
    emailText: {
        fontSize: 17.5,
        fontWeight: 'bold',
        color: '#8A1C22',
        marginBottom: 20,
    },
    instructionsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 40,
    },
    backToLoginButton: {
        backgroundColor: '#8A1C22',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginBottom: 16,
        minWidth: 200,
        alignItems: 'center',
    },
    backToLoginButtonText: {
        fontSize: 17.5,
        fontWeight: 'bold',
        color: '#FFF',
    },
    resendButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    resendButtonText: {
        fontSize: 16,
        color: '#8A1C22',
        fontWeight: '600',
    },
});

export default PasswordResetScreen;
