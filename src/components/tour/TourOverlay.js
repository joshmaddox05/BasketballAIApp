// TourOverlay.js - Main overlay with spotlight effect (DBE burgundy restyle)
// Scrim + cutout mechanics are unchanged; only the appearance changed:
// theme.scrim overlay, radius-16 cutout, pulsing spotRing halo (baiSpot),
// and all chrome (step counter / skip / mute) moved into the tooltip card.
import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableWithoutFeedback,
    Animated,
    Alert
} from 'react-native';
import { useTour } from './TourProvider';
import { PulseHalo } from '../dbe';
import TourTooltip from './TourTooltip';

const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_BORDER_RADIUS = 16;

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

    const overlayColor = theme?.scrim || 'rgba(6, 6, 8, 0.76)';
    const ringColor = theme?.spotRing || 'rgba(212, 112, 122, 0.5)';

    // PulseHalo scales uniformly, so derive the max scale from the smaller
    // dimension to get roughly the mock's ~10px ring growth (baiSpot),
    // clamped so wide targets don't fling the halo too far sideways.
    const minDim = Math.max(1, Math.min(spotlightWidth, spotlightHeight));
    const haloMaxScale = Math.min(1.2, Math.max(1.06, 1 + 20 / minDim));

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

                    {/* Pulsing spotlight ring (baiSpot): expanding halo in
                        theme.spotRing fading to transparent, 2.5s loop, plus a
                        thin static ring to frame the cutout between pulses.
                        Renders above the scrim, below the tooltip. */}
                    <View
                        style={{
                            position: 'absolute',
                            top: spotlightY,
                            left: spotlightX,
                            width: spotlightWidth,
                            height: spotlightHeight,
                        }}
                        pointerEvents="none"
                    >
                        <PulseHalo
                            color={ringColor}
                            borderRadius={SPOTLIGHT_BORDER_RADIUS}
                            maxScale={haloMaxScale}
                            duration={2500}
                        />
                        <View style={[styles.spotlightRing, { borderColor: ringColor }]} />
                    </View>

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
                        onSkip={handleSkip}
                    />
                </>
            )}

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
    spotlightRing: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 2,
        borderRadius: SPOTLIGHT_BORDER_RADIUS,
    },
    spotlightTouchable: {
        position: 'absolute',
        borderRadius: SPOTLIGHT_BORDER_RADIUS,
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
