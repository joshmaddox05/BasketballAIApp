// LoginScreen.js
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
import { useAppContext } from '../../context/AppContext';
import { signInWithEmail, signInWithGoogle, resetPassword } from '../../services/authService';
import { getTheme } from '../../utils/theme';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState(''); // Remove demo data for production
    const [password, setPassword] = useState(''); // Remove demo data for production
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const { theme: contextTheme, isDarkMode } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

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
            // For now, show a message that Google Sign-In is coming soon
            Alert.alert(
                'Coming Soon',
                'Google Sign-In will be available in the next update. Please use email/password for now.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Google sign-in error:', error);
            Alert.alert('Error', 'Google Sign-In is not available yet');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        navigation.navigate('PasswordReset');
    };

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
                        <Text style={styles.title}>Welcome back!</Text>
                        <Text style={styles.subtitle}>Sign in to continue your training journey</Text>
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
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
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
                                    color="#999"
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
                                        borderColor: rememberMe ? '#FF6B00' : '#CCC',
                                        backgroundColor: rememberMe ? '#FF6B00' : 'transparent'
                                    }
                                ]}>
                                    {rememberMe ? (
                                        <Ionicons name="checkmark" size={16} color="#FFF" />
                                    ) : null}
                                </View>
                                <Text style={styles.rememberMeText}>Remember me</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleForgotPassword}>
                                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.loginButton}
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
                        <Text style={styles.orText}>Or sign in with</Text>

                        <View style={styles.socialButtonsRow}>
                            <TouchableOpacity 
                                style={styles.socialButton}
                                onPress={handleGoogleSignIn}
                            >
                                <Ionicons name="logo-google" size={20} color="#DB4437" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.socialButton}>
                                <Ionicons name="logo-facebook" size={20} color="#4267B2" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.socialButton}>
                                <Ionicons name="logo-apple" size={20} color="#000" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.signupPromptContainer}>
                        <Text style={styles.signupPromptText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                            <Text style={styles.signupPromptLink}>Sign Up</Text>
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
        fontSize: 16,
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
        fontSize: 16,
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
        fontSize: 14,
        color: '#666',
    },
    forgotPasswordText: {
        fontSize: 14,
        color: '#FF6B00',
    },
    loginButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    socialLoginContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    orText: {
        fontSize: 14,
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
        fontSize: 14,
        color: '#666',
    },
    signupPromptLink: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF6B00',
    },
});

export default LoginScreen;