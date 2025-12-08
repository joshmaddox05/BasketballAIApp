// TourOverlay.js - Main overlay with spotlight effect
import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Text,
    Animated,
    Alert
} from 'react-native';
import { useTour } from './TourProvider';
import TourTooltip from './TourTooltip';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_BORDER_RADIUS = 12;

const TourOverlay = ({ theme }) => {
    const {
        isTourActive,
        currentStep,
        currentStepIndex,
        totalSteps,
        targetMeasurement,
        isTransitioning,
        goToNextStep,
        skipTour
    } = useTour();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const spotlightAnim = useRef(new Animated.Value(0)).current;

    // Fade in/out animation
    useEffect(() => {
        if (isTourActive) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [isTourActive, fadeAnim]);

    // Spotlight transition animation
    useEffect(() => {
        if (targetMeasurement) {
            Animated.timing(spotlightAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    }, [targetMeasurement, spotlightAnim]);

    const handleSkip = () => {
        Alert.alert(
            'Skip Tour?',
            'You can always access the tour later from your Profile.',
            [
                { text: 'Continue Tour', style: 'cancel' },
                { text: 'Skip', style: 'destructive', onPress: skipTour }
            ]
        );
    };

    const handleSpotlightTap = () => {
        if (!isTransitioning) {
            goToNextStep();
        }
    };

    if (!isTourActive || !currentStep) {
        return null;
    }

    // Check if this is a tab step (user needs to tap the actual tab)
    const isTabStep = currentStep?.isTabStep === true;

    // Calculate spotlight dimensions with padding
    const spotlightX = targetMeasurement ? targetMeasurement.x - SPOTLIGHT_PADDING : 0;
    const spotlightY = targetMeasurement ? targetMeasurement.y - SPOTLIGHT_PADDING : 0;
    const spotlightWidth = targetMeasurement ? targetMeasurement.width + (SPOTLIGHT_PADDING * 2) : 0;
    const spotlightHeight = targetMeasurement ? targetMeasurement.height + (SPOTLIGHT_PADDING * 2) : 0;

    const overlayColor = theme?.overlay || 'rgba(0, 0, 0, 0.85)';
    const primaryColor = theme?.primary || '#FF6B00';

    return (
        <Animated.View
            style={[styles.container, { opacity: fadeAnim }]}
            pointerEvents={isTabStep ? "box-none" : "auto"}
        >
            {targetMeasurement && (
                <>
                    {/* Top overlay - pass through touches for tab steps */}
                    <View
                        style={[
                            styles.overlay,
                            {
                                backgroundColor: overlayColor,
                                top: 0,
                                left: 0,
                                right: 0,
                                height: spotlightY,
                            }
                        ]}
                        pointerEvents={isTabStep ? "none" : "auto"}
                    />

                    {/* Left overlay - pass through touches for tab steps */}
                    <View
                        style={[
                            styles.overlay,
                            {
                                backgroundColor: overlayColor,
                                top: spotlightY,
                                left: 0,
                                width: spotlightX,
                                height: spotlightHeight,
                            }
                        ]}
                        pointerEvents={isTabStep ? "none" : "auto"}
                    />

                    {/* Right overlay - pass through touches for tab steps */}
                    <View
                        style={[
                            styles.overlay,
                            {
                                backgroundColor: overlayColor,
                                top: spotlightY,
                                left: spotlightX + spotlightWidth,
                                right: 0,
                                height: spotlightHeight,
                            }
                        ]}
                        pointerEvents={isTabStep ? "none" : "auto"}
                    />

                    {/* Bottom overlay - pass through touches for tab steps */}
                    <View
                        style={[
                            styles.overlay,
                            {
                                backgroundColor: overlayColor,
                                top: spotlightY + spotlightHeight,
                                left: 0,
                                right: 0,
                                bottom: 0,
                            }
                        ]}
                        pointerEvents={isTabStep ? "none" : "auto"}
                    />

                    {/* Spotlight border (visual highlight) */}
                    <View
                        style={[
                            styles.spotlightBorder,
                            {
                                top: spotlightY - 2,
                                left: spotlightX - 2,
                                width: spotlightWidth + 4,
                                height: spotlightHeight + 4,
                                borderColor: primaryColor,
                            }
                        ]}
                        pointerEvents="none"
                    />

                    {/* Touchable spotlight area - only for non-tab steps */}
                    {!isTabStep && (
                        <TouchableWithoutFeedback onPress={handleSpotlightTap}>
                            <View
                                style={[
                                    styles.spotlightTouchable,
                                    {
                                        top: spotlightY,
                                        left: spotlightX,
                                        width: spotlightWidth,
                                        height: spotlightHeight,
                                    }
                                ]}
                            />
                        </TouchableWithoutFeedback>
                    )}

                    {/* Tooltip */}
                    <TourTooltip
                        step={currentStep}
                        stepIndex={currentStepIndex}
                        totalSteps={totalSteps}
                        targetMeasurement={{
                            x: spotlightX,
                            y: spotlightY,
                            width: spotlightWidth,
                            height: spotlightHeight,
                        }}
                        theme={theme}
                    />
                </>
            )}

            {/* Skip button */}
            <TouchableOpacity
                style={[styles.skipButton, { backgroundColor: theme?.card || '#1E1E1E' }]}
                onPress={handleSkip}
                activeOpacity={0.7}
            >
                <Text style={[styles.skipText, { color: theme?.textSecondary || '#B8B8B8' }]}>
                    Skip Tour
                </Text>
            </TouchableOpacity>

            {/* Step counter */}
            <View style={[styles.stepCounter, { backgroundColor: theme?.card || '#1E1E1E' }]}>
                <Text style={[styles.stepCounterText, { color: theme?.text || '#FFFFFF' }]}>
                    {currentStepIndex + 1} of {totalSteps}
                </Text>
            </View>

            {/* Loading state while transitioning */}
            {isTransitioning && !targetMeasurement && (
                <View style={[styles.loadingOverlay, { backgroundColor: overlayColor }]} />
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        elevation: 9999,
    },
    overlay: {
        position: 'absolute',
    },
    spotlightBorder: {
        position: 'absolute',
        borderWidth: 2,
        borderRadius: SPOTLIGHT_BORDER_RADIUS + 2,
    },
    spotlightTouchable: {
        position: 'absolute',
        borderRadius: SPOTLIGHT_BORDER_RADIUS,
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    stepCounter: {
        position: 'absolute',
        top: 60,
        left: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    stepCounterText: {
        fontSize: 13,
        fontWeight: '600',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});

export default TourOverlay;
