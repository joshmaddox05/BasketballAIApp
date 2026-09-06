// LoginScreen.js
import React, { useState, useEffect } from 'react';
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
import { useAppContext } from '../../context/AppContext';
import { signInWithEmail, resetPassword } from '../../services/authService';
import { signInWithGoogle } from '../../services/googleAuthService';
import { signInWithApple, isAppleSignInAvailable } from '../../services/appleAuthService';
import { getTheme } from '../../utils/theme';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState(''); // Remove demo data for production
    const [password, setPassword] = useState(''); // Remove demo data for production
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);

    const { theme: contextTheme, isDarkMode } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

    // Check if Apple Sign-In is available on mount
    useEffect(() => {
        const checkAppleSignIn = async () => {
            const available = await isAppleSignInAvailable();
            setAppleSignInAvailable(available);
        };
        checkAppleSignIn();
    }, []);

    const validateEmail = (email) => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    const handleLogin = async () => {
        // Validate inputs
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email');
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        // Show loading state
        setIsLoading(true);

        try {
            // Firebase authentication
            const result = await signInWithEmail(email.trim(), password);
            
            if (result.user && result.profile) {
                console.log('Login successful!', result.user.email);
                // AppContext will handle the auth state change automatically
                // AppNavigator will navigate to the appropriate screen
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Login Failed', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const result = await signInWithGoogle();

            if (result.user && result.profile) {
                console.log('Google Sign-In successful!', result.user.email);
                // AppContext will handle the auth state change automatically
                // AppNavigator will navigate to the appropriate screen
            }
        } catch (error) {
            console.error('Google sign-in error:', error);
            // Don't show alert for cancelled sign-in
            if (!error.message?.includes('cancelled')) {
                Alert.alert('Sign-In Failed', error.message || 'Google Sign-In failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAppleSignIn = async () => {
        if (!appleSignInAvailable) {
            Alert.alert('Not Available', 'Apple Sign-In is not available on this device.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await signInWithApple();

            if (result.user && result.profile) {
                console.log('Apple Sign-In successful!', result.user.email);
                // AppContext will handle the auth state change automatically
                // AppNavigator will navigate to the appropriate screen
            }
        } catch (error) {
            console.error('Apple sign-in error:', error);
            // Don't show alert for cancelled sign-in
            if (!error.message?.includes('cancelled')) {
                Alert.alert('Sign-In Failed', error.message || 'Apple Sign-In failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        navigation.navigate('PasswordReset');
    };

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
                        <Text style={[styles.title, { color: theme.text }]}>Welcome back!</Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Sign in to continue your training journey</Text>
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
                            />
                        </View>

                        <View style={[styles.inputContainer, { backgroundColor: theme.input }]}>
                            <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Password"
                                placeholderTextColor={theme.inputPlaceholder}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!isPasswordVisible}
                            />
                            <TouchableOpacity
                                style={styles.visibilityToggle}
                                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                            >
                                <Ionicons
                                    name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color={theme.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.optionsRow}>
                            <TouchableOpacity
                                style={styles.rememberMeContainer}
                                onPress={() => setRememberMe(!rememberMe)}
                            >
                                <View style={[
                                    styles.checkboxContainer,
                                    {
                                        borderColor: rememberMe ? theme.primary : theme.border,
                                        backgroundColor: rememberMe ? theme.primary : 'transparent'
                                    }
                                ]}>
                                    {rememberMe ? (
                                        <Ionicons name="checkmark" size={16} color="#FFF" />
                                    ) : null}
                                </View>
                                <Text style={[styles.rememberMeText, { color: theme.textSecondary }]}>Remember me</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleForgotPassword}>
                                <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Forgot password?</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, { backgroundColor: theme.primary }]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.loginButtonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.socialLoginContainer}>
                        <Text style={[styles.orText, { color: theme.textSecondary }]}>Or sign in with</Text>

                        <View style={styles.socialButtonsRow}>
                            <TouchableOpacity
                                style={[styles.socialButton, { borderColor: theme.border, backgroundColor: theme.card }]}
                                onPress={handleGoogleSignIn}
                            >
                                <Ionicons name="logo-google" size={20} color="#DB4437" />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.socialButton, { borderColor: theme.border, backgroundColor: theme.card }]}>
                                <Ionicons name="logo-facebook" size={20} color="#4267B2" />
                            </TouchableOpacity>

                            {appleSignInAvailable && (
                                <TouchableOpacity
                                    style={[styles.socialButton, { borderColor: theme.border, backgroundColor: theme.card }]}
                                    onPress={handleAppleSignIn}
                                >
                                    <Ionicons name="logo-apple" size={20} color={isDarkMode ? '#FFF' : '#000'} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.signupPromptContainer}>
                        <Text style={[styles.signupPromptText, { color: theme.textSecondary }]}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                            <Text style={[styles.signupPromptLink, { color: theme.primary }]}>Sign Up</Text>
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
        marginBottom: 16,
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
    visibilityToggle: {
        padding: 8,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkboxContainer: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rememberMeText: {
        fontSize: 16,
        color: '#666',
    },
    forgotPasswordText: {
        fontSize: 16,
        color: '#8A1C22',
    },
    loginButton: {
        backgroundColor: '#8A1C22',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    loginButtonText: {
        fontSize: 17.5,
        fontWeight: 'bold',
        color: '#FFF',
    },
    socialLoginContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    orText: {
        fontSize: 16,
        color: '#999',
        marginBottom: 16,
    },
    socialButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    socialButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#EEE',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10,
    },
    signupPromptContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    signupPromptText: {
        fontSize: 16,
        color: '#666',
    },
    signupPromptLink: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#8A1C22',
    },
});

export default LoginScreen;