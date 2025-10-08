// WelcomeScreen.js
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Dimensions,
    ImageBackground,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import welcomeBackground from '../../../assets/welcome-background.jpg'

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
    return (
        <ImageBackground
            source={welcomeBackground}
            style={styles.backgroundImage}
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={styles.container}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Ionicons name="basketball" size={60} color="#FFF" />
                    </View>
                    <Text style={styles.appName}>Basketball Training</Text>
                    <Text style={styles.tagline}>Elevate your game to the next level</Text>
                </View>

                <View style={styles.featuresContainer}>
                    <View style={styles.featureItem}>
                        <View style={styles.featureIconContainer}>
                            <Ionicons name="analytics" size={24} color="#FF6B00" />
                        </View>
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>AI-Powered Analysis</Text>
                            <Text style={styles.featureDescription}>Get professional feedback on your shooting form</Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={styles.featureIconContainer}>
                            <Ionicons name="trophy" size={24} color="#FF6B00" />
                        </View>
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>Personalized Training</Text>
                            <Text style={styles.featureDescription}>Custom workouts tailored to your skill level</Text>
                        </View>
                    </View>

                    <View style={styles.featureItem}>
                        <View style={styles.featureIconContainer}>
                            <Ionicons name="people" size={24} color="#FF6B00" />
                        </View>
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>Community Challenges</Text>
                            <Text style={styles.featureDescription}>Compete with others and track your progress</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={styles.getStartedButton}
                        onPress={() => navigation.navigate('Signup')}
                    >
                        <Text style={styles.getStartedButtonText}>Get Started</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.loginButtonText}>I already have an account</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: height * 0.1,
        marginBottom: height * 0.08,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    featuresContainer: {
        paddingHorizontal: 24,
        marginBottom: height * 0.08,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    featureIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    buttonsContainer: {
        paddingHorizontal: 24,
        marginTop: 'auto',
        marginBottom: height * 0.05,
    },
    getStartedButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        marginBottom: 16,
    },
    getStartedButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    loginButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
    },
    loginButtonText: {
        fontSize: 16,
        color: '#FFF',
    },
});

export default WelcomeScreen;