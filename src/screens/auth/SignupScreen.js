// SignupScreen.js
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
    Alert,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const SignupScreen = ({ navigation }) => {
    const [name, setName] = useState('John Doe'); // Pre-filled for demo
    const [email, setEmail] = useState('demo@example.com'); // Pre-filled for demo
    const [password, setPassword] = useState('Password123'); // Pre-filled for demo
    const [confirmPassword, setConfirmPassword] = useState('Password123'); // Pre-filled for demo
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(true); // Pre-checked for demo

    const { register } = useAppContext();

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

        // Simulate signup API call
        setTimeout(() => {
            setIsLoading(false);

            // Call register with the user info
            // This sets isAuthenticated to true and onboardingCompleted to false
            register({ name });

            console.log('Registration successful! AppNavigator will navigate to onboarding.');
            // AppNavigator will automatically navigate to onboarding

        }, 1500);
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
                    style={{ flex: 1 }}
                >
                    <ScrollView style={styles.content}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>Create an account</Text>
                            <Text style={styles.subtitle}>Start your basketball journey today</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Full Name"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

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

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm Password"
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
                                        color="#999"
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.passwordRequirements}>
                                <Text style={styles.passwordRequirementsTitle}>Password must:</Text>
                                <View style={styles.passwordRequirementItem}>
                                    <Ionicons
                                        name={password.length >= 8 ? "checkmark-circle" : "checkmark-circle-outline"}
                                        size={16}
                                        color={password.length >= 8 ? "#4CAF50" : "#CCC"}
                                    />
                                    <Text
                                        style={[
                                            styles.passwordRequirementText,
                                            password.length >= 8 && styles.passwordRequirementMet
                                        ]}
                                    >
                                        Be at least 8 characters
                                    </Text>
                                </View>
                                <View style={styles.passwordRequirementItem}>
                                    <Ionicons
                                        name={/[A-Z]/.test(password) ? "checkmark-circle" : "checkmark-circle-outline"}
                                        size={16}
                                        color={/[A-Z]/.test(password) ? "#4CAF50" : "#CCC"}
                                    />
                                    <Text
                                        style={[
                                            styles.passwordRequirementText,
                                            /[A-Z]/.test(password) && styles.passwordRequirementMet
                                        ]}
                                    >
                                        Include an uppercase letter
                                    </Text>
                                </View>
                                <View style={styles.passwordRequirementItem}>
                                    <Ionicons
                                        name={/[a-z]/.test(password) ? "checkmark-circle" : "checkmark-circle-outline"}
                                        size={16}
                                        color={/[a-z]/.test(password) ? "#4CAF50" : "#CCC"}
                                    />
                                    <Text
                                        style={[
                                            styles.passwordRequirementText,
                                            /[a-z]/.test(password) && styles.passwordRequirementMet
                                        ]}
                                    >
                                        Include a lowercase letter
                                    </Text>
                                </View>
                                <View style={styles.passwordRequirementItem}>
                                    <Ionicons
                                        name={/\d/.test(password) ? "checkmark-circle" : "checkmark-circle-outline"}
                                        size={16}
                                        color={/\d/.test(password) ? "#4CAF50" : "#CCC"}
                                    />
                                    <Text
                                        style={[
                                            styles.passwordRequirementText,
                                            /\d/.test(password) && styles.passwordRequirementMet
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
                                        borderColor: agreeToTerms ? '#FF6B00' : '#CCC',
                                        backgroundColor: agreeToTerms ? '#FF6B00' : 'transparent'
                                    }
                                ]}>
                                    {agreeToTerms ? (
                                        <Ionicons name="checkmark" size={16} color="#FFF" />
                                    ) : null}
                                </View>
                                <Text style={styles.termsText}>
                                    I agree to the{' '}
                                    <Text style={styles.termsLink}>
                                        Terms of Service
                                    </Text>
                                    {' '}and{' '}
                                    <Text style={styles.termsLink}>
                                        Privacy Policy
                                    </Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.signupButton}
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
                            <Text style={styles.orText}>Or sign up with</Text>

                            <View style={styles.socialButtonsRow}>
                                <TouchableOpacity style={styles.socialButton}>
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

                        <View style={styles.loginPromptContainer}>
                            <Text style={styles.loginPromptText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                <Text style={styles.loginPromptLink}>Sign In</Text>
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
    passwordRequirements: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    passwordRequirementsTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    passwordRequirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    passwordRequirementText: {
        fontSize: 12,
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
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    termsLink: {
        color: '#FF6B00',
        fontWeight: '500',
    },
    signupButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    signupButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    socialSignupContainer: {
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
    loginPromptContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 30,
    },
    loginPromptText: {
        fontSize: 14,
        color: '#666',
    },
    loginPromptLink: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF6B00',
    },
});

export default SignupScreen;