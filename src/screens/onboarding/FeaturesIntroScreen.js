// FeaturesIntroScreen.js
import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Animated,
    Dimensions,
    Image,
    SafeAreaView,
    Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import welcomeBackground from '../../../assets/welcome-background.jpg'
import featureTraining from '../../../assets/feature-training.jpg'
import featureProgress from '../../../assets/feature-progress.jpg'
import featureCommunity from '../../../assets/feature-community.jpg'

const { width, height } = Dimensions.get('window');

const FEATURES = [
    {
        id: '1',
        title: 'AI Shooting Analysis',
        description: 'Get professional feedback on your shooting form with our AI-powered analysis. Upload a video and receive personalized tips to improve your technique.',
        icon: 'analytics',
        color: '#FF6B00',
        source: welcomeBackground
    },
    {
        id: '2',
        title: 'Personalized Training',
        description: 'Access custom workout plans based on your skill level, goals, and schedule. Each training plan is designed to help you improve efficiently.',
        icon: 'fitness',
        color: '#4CAF50',
        source: featureTraining
    },
    {
        id: '3',
        title: 'Progress Tracking',
        description: 'Monitor your improvement with detailed statistics and visualizations. Set goals, track achievements, and see your skills develop over time.',
        icon: 'stats-chart',
        color: '#2196F3',
        source: featureProgress
    },
    {
        id: '4',
        title: 'Community & Challenges',
        description: 'Join a community of basketball enthusiasts, participate in challenges, and learn from others. Share your progress and get motivated!',
        icon: 'people',
        color: '#9C27B0',
        source: featureCommunity
    }
];

const FeaturesIntroScreen = ({ navigation }) => {
    const { completeOnboarding } = useAppContext();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleNext = () => {
        if (currentIndex < FEATURES.length - 1) {
            flatListRef.current.scrollToIndex({
                index: currentIndex + 1,
                animated: true
            });
        } else {
            // Navigate to welcome complete screen
            navigation.navigate('WelcomeComplete');
        }
    };


    const handleSkip = () => {
        // Skip to the last slide
        flatListRef.current.scrollToIndex({
            index: FEATURES.length - 1,
            animated: true
        });
    };

    const renderFeatureItem = ({ item, index }) => {
        return (
            <View style={styles.featureItem}>
                <View style={styles.featureImageContainer}>
                    {item.image ? (
                        <Image source={item.image} style={styles.featureImage} />
                    ) : (
                        <View style={[styles.featureImagePlaceholder, { backgroundColor: item.color }]}>
                            <Ionicons name={item.icon} size={60} color="#FFF" />
                        </View>
                    )}
                </View>

                <View style={styles.featureInfo}>
                    <View
                        style={[
                            styles.featureIconContainer,
                            { backgroundColor: `${item.color}20` }
                        ]}
                    >
                        <Ionicons name={item.icon} size={30} color={item.color} />
                    </View>
                    <Text style={styles.featureTitle}>{item.title}</Text>
                    <Text style={styles.featureDescription}>{item.description}</Text>
                </View>
            </View>
        );
    };

    const renderPagination = () => {
        return (
            <View style={styles.paginationContainer}>
                <View style={styles.dotsContainer}>
                    {FEATURES.map((_, index) => {
                        const inputRange = [
                            (index - 1) * width,
                            index * width,
                            (index + 1) * width
                        ];

                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 16, 8],
                            extrapolate: 'clamp'
                        });

                        const dotOpacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp'
                        });

                        return (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        width: dotWidth,
                                        opacity: dotOpacity,
                                        backgroundColor: currentIndex === index ? '#FF6B00' : '#CCC'
                                    }
                                ]}
                            />
                        );
                    })}
                </View>

                <View style={styles.paginationButtons}>
                    {currentIndex < FEATURES.length - 1 ? (
                        <>
                            <TouchableOpacity
                                style={styles.skipButton}
                                onPress={handleSkip}
                            >
                                <Text style={styles.skipButtonText}>Skip</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={handleNext}
                            >
                                <Text style={styles.nextButtonText}>Next</Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={styles.getStartedButton}
                            onPress={handleNext}
                        >
                            <Text style={styles.getStartedButtonText}>Get Started</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            <Animated.FlatList
                ref={flatListRef}
                data={FEATURES}
                renderItem={renderFeatureItem}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
                scrollEventThrottle={16}
                contentContainerStyle={styles.flatListContent}
            />

            {renderPagination()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    flatListContent: {
        alignItems: 'center',
    },
    featureItem: {
        width: width,
        height: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    featureImageContainer: {
        width: '100%',
        height: height * 0.45,
    },
    featureImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    featureImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureInfo: {
        width: '90%',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 24,
        marginTop: -30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        alignItems: 'center',
    },
    featureIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    featureTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    featureDescription: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    paginationContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingVertical: 20,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    paginationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skipButton: {
        paddingVertical: 12,
    },
    skipButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF6B00',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginRight: 8,
    },
    getStartedButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 16,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
    },
    getStartedButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
});

export default FeaturesIntroScreen;