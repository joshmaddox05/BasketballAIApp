// SignupScreen.js
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
    Alert,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { registerWithEmail } from '../../services/authService';
import { signInWithGoogle } from '../../services/googleAuthService';
import { signInWithApple, isAppleSignInAvailable } from '../../services/appleAuthService';
import { getTheme } from '../../utils/theme';
import { track, EVENTS } from '../../services/analytics';

const SignupScreen = ({ navigation }) => {
    const [name, setName] = useState(''); // Remove demo data for production
    const [email, setEmail] = useState(''); // Remove demo data for production
    const [password, setPassword] = useState(''); // Remove demo data for production
    const [confirmPassword, setConfirmPassword] = useState(''); // Remove demo data for production
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false); // Remove pre-check for production
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

    const validatePassword = (password) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
        return re.test(password);
    };

    const handleSignup = async () => {
        // Validate inputs
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return;
        }

        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email');
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        if (!password.trim()) {
            Alert.alert('Error', 'Please enter a password');
            return;
        }

        if (!validatePassword(password)) {
            Alert.alert(
                'Password Requirements',
                'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number.'
            );
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (!agreeToTerms) {
            Alert.alert('Error', 'You must agree to the Terms and Privacy Policy');
            return;
        }

        // Show loading state
        setIsLoading(true);

        try {
            // Firebase registration
            const result = await registerWithEmail(email.trim(), password, name.trim());
            
            if (result.user && result.profile) {
                console.log('Registration successful!', result.user.email);
                
                track(EVENTS.SIGNUP_COMPLETED, { method: 'email' });

                Alert.alert(
                    'Account Created!',
                    'Your account has been created successfully. Please check your email to verify your account.',
                    [{ text: 'OK' }]
                );
                
                // AppContext will handle the auth state change automatically
                // AppNavigator will navigate to onboarding
            }
        } catch (error) {
            console.error('Registration error:', error);
            Alert.alert('Registration Failed', error.message);
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
                // AppNavigator will navigate to the appropriate screen (onboarding for new users)
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
                // AppNavigator will navigate to the appropriate screen (onboarding for new users)
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
                    style={{ flex: 1 }}
                >
                    <ScrollView style={styles.content}>
                        <View style={styles.titleContainer}>
                            <Text style={[styles.title, { color: theme.text }]}>Create an account</Text>
                            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Start your basketball journey today</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={[styles.inputContainer, { backgroundColor: theme.input }]}>
                                <Ionicons name="person-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="Full Name"
                                    placeholderTextColor={theme.inputPlaceholder}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

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

                            <View style={[styles.inputContainer, { backgroundColor: theme.input }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="Confirm Password"
                                    placeholderTextColor={theme.inputPlaceholder}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!isConfirmPasswordVisible}
                                />
                                <TouchableOpacity
                                    style={styles.visibilityToggle}
                                    onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                                >
                                    <Ionicons
                                        name={isConfirmPasswordVisible ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={theme.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.passwordRequirements}>
                                <Text style={[styles.passwordRequirementsTitle, { color: theme.textSecondary }]}>Password must:</Text>
                                <View style={styles.passwordRequirementItem}>
                                    <Ionicons
                                        name={password.length >= 8 ? "checkmark-circle" : "checkmark-circle-outline"}
                                        size={16}
                                        color={password.length >= 8 ? theme.success : theme.border}
                                    />
                                    <Text
                                        style={[
                                            styles.passwordRequirementText,
                                            { color: password.length >= 8 ? theme.success : theme.textTertiary }
                                        ]}
                                    >
                                        Be at least 8 characters
                                    </Text>
                                </View>
                                <View style={styles.passwordRequirementItem}>
                                    <Ionicons
                                        name={/[A-Z]/.test(password) ? "checkmark-circle" : "checkmark-circle-outline"}
                                        size={16}
                                        color={/[A-Z]/.test(password) ? theme.success : theme.border}
                                    />
                                    <Text
                                        style={[
                                            styles.passwordRequirementText,
                                            { color: /[A-Z]/.test(password) ? theme.success : theme.textTertiary }
                                        ]}
                                    >
                                        Include an uppercase letter
                                    </Text>
                                </View>
                                <View style={styles.passwordRequirementItem}>
                                    <Ionicons
                                        name={/[a-z]/.test(password) ? "checkmark-circle" : "checkmark-circle-outline"}
                                        size={16}
                                        color={/[a-z]/.test(password) ? theme.success : theme.border}
                                    />
                                    <Text
                                        style={[
                                            styles.passwordRequirementText,
                                            { color: /[a-z]/.test(password) ? theme.success : theme.textTertiary }
                                        ]}
                                    >
                                        Include a lowercase letter
                                    </Text>
                                </View>
                                <View style={styles.passwordRequirementItem}>
                                    <Ionicons
                                        name={/\d/.test(password) ? "checkmark-circle" : "checkmark-circle-outline"}
                                        size={16}
                                        color={/\d/.test(password) ? theme.success : theme.border}
                                    />
                                    <Text
                                        style={[
                                            styles.passwordRequirementText,
                                            { color: /\d/.test(password) ? theme.success : theme.textTertiary }
                                        ]}
                                    >
                                        Include a number
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.termsContainer}
                                onPress={() => setAgreeToTerms(!agreeToTerms)}
                            >
                                <View style={[
                                    styles.checkboxContainer,
                                    {
                                        borderColor: agreeToTerms ? theme.primary : theme.border,
                                        backgroundColor: agreeToTerms ? theme.primary : 'transparent'
                                    }
                                ]}>
                                    {agreeToTerms ? (
                                        <Ionicons name="checkmark" size={16} color="#FFF" />
                                    ) : null}
                                </View>
                                <Text style={[styles.termsText, { color: theme.textSecondary }]}>
                                    I agree to the{' '}
                                    <Text style={[styles.termsLink, { color: theme.primary }]}>
                                        Terms of Service
                                    </Text>
                                    {' '}and{' '}
                                    <Text style={[styles.termsLink, { color: theme.primary }]}>
                                        Privacy Policy
                                    </Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.signupButton, { backgroundColor: theme.primary }]}
                                onPress={handleSignup}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.signupButtonText}>Create Account</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.socialSignupContainer}>
                            <Text style={[styles.orText, { color: theme.textSecondary }]}>Or sign up with</Text>

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

                        <View style={styles.loginPromptContainer}>
                            <Text style={[styles.loginPromptText, { color: theme.textSecondary }]}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={[styles.loginPromptLink, { color: theme.primary }]}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
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
        marginBottom: 30,
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
    passwordRequirements: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    passwordRequirementsTitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
    },
    passwordRequirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    passwordRequirementText: {
        fontSize: 14,
        color: '#999',
        marginLeft: 6,
    },
    passwordRequirementMet: {
        color: '#4CAF50',
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    checkboxContainer: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1,
        marginRight: 8,
        marginTop: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    termsText: {
        flex: 1,
        fontSize: 16,
        color: '#666',
        lineHeight: 21,
    },
    termsLink: {
        color: '#8A1C22',
        fontWeight: '500',
    },
    signupButton: {
        backgroundColor: '#8A1C22',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    signupButtonText: {
        fontSize: 17.5,
        fontWeight: 'bold',
        color: '#FFF',
    },
    socialSignupContainer: {
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
    loginPromptContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
    },
    loginPromptText: {
        fontSize: 16,
        color: '#666',
    },
    loginPromptLink: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#8A1C22',
    },
});

export default SignupScreen;