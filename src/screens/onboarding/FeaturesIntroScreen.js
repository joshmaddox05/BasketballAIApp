// FeaturesIntroScreen.js — first-run feature carousel.
//
// Ported onto the burgundy system: theme colours (this screen used to be a hard-coded
// white slab that ignored dark mode entirely), TYPE presets, SHAPE radii, the dbe
// button voices, and no shadow.
//
// IMAGERY: each slide used to declare a `source` image, but the render checked
// `item.image` — a key that never existed — so the photography never appeared and every
// slide fell through to a flat colour placeholder. The four assets are also byte-
// identical (one file copied under four names), so wiring `source` in would have shown
// the same picture four times. The icon-led hero is deliberate until distinct per-feature
// artwork exists; reintroduce it here when it does.
import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Animated,
    Dimensions,
    SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import { PrimaryButton, OutlineButton } from '../../components/dbe';
import { TYPE, SHAPE } from '../../utils/typography';

const { width, height } = Dimensions.get('window');

// No per-feature colour: differentiation is the icon and the words. Four hues here
// (green / blue / purple alongside the burgundy) was the multicolour-category-tile
// pattern the design system names as its anti-reference.
const FEATURES = [
    {
        id: '1',
        title: 'AI Shooting Analysis',
        description: 'Get professional feedback on your shooting form with our AI-powered analysis. Upload a video and receive personalized tips to improve your technique.',
        icon: 'analytics',
    },
    {
        id: '2',
        title: 'Personalized Training',
        description: 'Access custom workout plans based on your skill level, goals, and schedule. Each training plan is designed to help you improve efficiently.',
        icon: 'fitness',
    },
    {
        id: '3',
        title: 'Progress Tracking',
        description: 'Monitor your improvement with detailed statistics and visualizations. Set goals, track achievements, and see your skills develop over time.',
        icon: 'stats-chart',
    },
    {
        id: '4',
        title: 'Community & Challenges',
        description: 'Join a community of basketball enthusiasts, participate in challenges, and learn from others. Share your progress and get motivated!',
        icon: 'people',
    }
];

const FeaturesIntroScreen = ({ navigation }) => {
    const { theme, isDarkMode } = useAppContext();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const isLast = currentIndex === FEATURES.length - 1;

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

    const renderFeatureItem = ({ item }) => {
        return (
            <View style={styles.featureItem}>
                {/* Hero panel — the system's burgundy gradient, one voice for every
                    slide. The icon appears once, here; it used to be repeated at 30dp
                    in the card below as well. */}
                <LinearGradient
                    colors={theme.heroGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featureHero}
                >
                    <Ionicons name={item.icon} size={60} color="#FFFFFF" />
                </LinearGradient>

                <View
                    style={[
                        styles.featureInfo,
                        { backgroundColor: theme.surface, borderColor: theme.hairline },
                    ]}
                >
                    <Text style={[TYPE.screenTitle, styles.featureTitle, { color: theme.text }]}>
                        {item.title}
                    </Text>
                    <Text style={[TYPE.tooltipBody, styles.featureDescription, { color: theme.textMuted }]}>
                        {item.description}
                    </Text>
                </View>
            </View>
        );
    };

    const renderPagination = () => {
        return (
            <View
                style={[
                    styles.paginationContainer,
                    { backgroundColor: theme.background, borderTopColor: theme.hairline },
                ]}
            >
                <View
                    style={styles.dotsContainer}
                    accessibilityRole="adjustable"
                    accessibilityLabel={`Page ${currentIndex + 1} of ${FEATURES.length}`}
                >
                    {FEATURES.map((_, index) => {
                        const inputRange = [
                            (index - 1) * width,
                            index * width,
                            (index + 1) * width
                        ];

                        // scaleX off a fixed 16dp base rather than animating `width`.
                        // Driving width from scroll position forced the whole scroll
                        // Animated.event off the native driver, so every scroll frame
                        // crossed the bridge and relaid out the dot row.
                        const dotScaleX = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.5, 1, 0.5],
                            extrapolate: 'clamp'
                        });

                        const dotOpacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp'
                        });

                        // One dot colour, with opacity carrying active/inactive. The old
                        // version snapped backgroundColor off `currentIndex` while the
                        // width interpolated, so the colour jumped mid-swipe.
                        return (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        // accentText, not primary: burgundy on the dark
                                        // room is 2.05:1 — effectively invisible. This token
                                        // is burgundy on light and Signal Rose on dark.
                                        backgroundColor: theme.accentText,
                                        opacity: dotOpacity,
                                        transform: [{ scaleX: dotScaleX }]
                                    }
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Affirmative action is the solid primary and sits on the right. */}
                <View style={styles.paginationButtons}>
                    {isLast ? (
                        <PrimaryButton
                            label="Get Started"
                            onPress={handleNext}
                            style={styles.fullWidthButton}
                            accessibilityHint="Finishes the introduction"
                        />
                    ) : (
                        <>
                            <OutlineButton
                                label="Skip"
                                onPress={handleSkip}
                                style={styles.splitButton}
                                accessibilityHint="Jumps to the last feature"
                            />
                            <View style={{ width: SHAPE.gridGap }} />
                            <PrimaryButton
                                label="Next"
                                iconRight="arrow-forward"
                                onPress={handleNext}
                                style={styles.splitButton}
                            />
                        </>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* expo-status-bar takes `style`, not RN's `barStyle` — the old prop was
                silently ignored, so the bar never followed the theme. */}
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

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
                    { useNativeDriver: true }
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
    },
    flatListContent: {
        // Cross-axis stretch, not center: centering left a dead band of room above the
        // hero, so the burgundy plane floated with a hard edge instead of anchoring.
        alignItems: 'stretch',
    },
    featureItem: {
        width: width,
        height: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    featureHero: {
        width: '100%',
        // 0.52, not 0.45: with the item top-anchored the shorter hero left a band of
        // dead room between the card and the control bar that read as unfinished.
        height: height * 0.52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureInfo: {
        width: '90%',
        borderRadius: SHAPE.radiusHero,
        borderWidth: 1,
        padding: 24,
        marginTop: -30,
        alignItems: 'center',
    },
    featureTitle: {
        marginBottom: 12,
        textAlign: 'center',
    },
    featureDescription: {
        textAlign: 'center',
    },
    paginationContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: SHAPE.screenPadding,
        paddingVertical: 20,
        borderTopWidth: 1,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    dot: {
        width: 16, // fixed base; the inactive state is scaleX 0.5 of this
        height: 8,
        borderRadius: SHAPE.radiusPill,
        marginHorizontal: 4,
    },
    paginationButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // minHeight clears the 44pt touch-target floor on its own.
    splitButton: { flex: 1, minHeight: 44 },
    fullWidthButton: { flex: 1, minHeight: 44 },
});

export default FeaturesIntroScreen;
