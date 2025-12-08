// TourTooltip.js - Tooltip bubble with arrow and dynamic positioning
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOOLTIP_MARGIN = 20;
const ARROW_SIZE = 10;
const TOOLTIP_MAX_WIDTH = SCREEN_WIDTH - (TOOLTIP_MARGIN * 2);

const TourTooltip = ({ step, stepIndex, totalSteps, targetMeasurement, theme }) => {
    const [tooltipHeight, setTooltipHeight] = useState(0);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Reset and animate when step changes
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            delay: 150,
            useNativeDriver: true,
        }).start();
    }, [stepIndex, fadeAnim]);

    if (!step || !targetMeasurement) {
        return null;
    }

    const { title, description, tooltipPosition: preferredPosition } = step;
    const { x: targetX, y: targetY, width: targetWidth, height: targetHeight } = targetMeasurement;

    // Calculate tooltip position
    const calculatePosition = () => {
        let position = preferredPosition || 'bottom';

        // Check if there's enough space above/below
        const spaceAbove = targetY;
        const spaceBelow = SCREEN_HEIGHT - (targetY + targetHeight);
        const estimatedHeight = tooltipHeight || 120;

        if (position === 'top' && spaceAbove < estimatedHeight + ARROW_SIZE + TOOLTIP_MARGIN) {
            position = 'bottom';
        } else if (position === 'bottom' && spaceBelow < estimatedHeight + ARROW_SIZE + TOOLTIP_MARGIN) {
            position = 'top';
        }

        // Calculate X position (center tooltip on target)
        let tooltipX = targetX + (targetWidth / 2) - (TOOLTIP_MAX_WIDTH / 2);

        // Clamp to screen bounds
        tooltipX = Math.max(TOOLTIP_MARGIN, Math.min(tooltipX, SCREEN_WIDTH - TOOLTIP_MAX_WIDTH - TOOLTIP_MARGIN));

        // Calculate Y position
        let tooltipY;
        if (position === 'top') {
            tooltipY = targetY - estimatedHeight - ARROW_SIZE - 8;
        } else {
            tooltipY = targetY + targetHeight + ARROW_SIZE + 8;
        }

        // Calculate arrow X position relative to tooltip
        const arrowX = targetX + (targetWidth / 2) - tooltipX - (ARROW_SIZE / 2);

        return { tooltipX, tooltipY, position, arrowX };
    };

    const { tooltipX, tooltipY, position, arrowX } = calculatePosition();

    const cardColor = theme?.card || '#1E1E1E';
    const textColor = theme?.text || '#FFFFFF';
    const textSecondaryColor = theme?.textSecondary || '#B8B8B8';
    const primaryColor = theme?.primary || '#FF6B00';

    const isLastStep = stepIndex === totalSteps - 1;
    const isTabStep = step?.isTabStep === true;

    // Determine the tap hint text
    const getTapHintText = () => {
        if (isLastStep) return 'Tap to finish';
        if (isTabStep) return 'Tap the tab to continue';
        return 'Tap to continue';
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    left: tooltipX,
                    top: tooltipY,
                    opacity: fadeAnim,
                    transform: [{
                        translateY: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [position === 'top' ? 10 : -10, 0],
                        })
                    }]
                }
            ]}
            onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                if (height !== tooltipHeight) {
                    setTooltipHeight(height);
                }
            }}
        >
            {/* Arrow pointing up (when tooltip is below target) */}
            {position === 'bottom' && (
                <View
                    style={[
                        styles.arrowUp,
                        {
                            left: Math.max(20, Math.min(arrowX, TOOLTIP_MAX_WIDTH - 40)),
                            borderBottomColor: cardColor,
                        }
                    ]}
                />
            )}

            {/* Tooltip content */}
            <View style={[styles.tooltip, { backgroundColor: cardColor }]}>
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: primaryColor + '20' }]}>
                        <Ionicons name="basketball" size={20} color={primaryColor} />
                    </View>
                    <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                </View>

                <Text style={[styles.description, { color: textSecondaryColor }]}>
                    {description}
                </Text>

                <View style={styles.footer}>
                    <View style={[styles.tapHint, { backgroundColor: primaryColor + '15' }]}>
                        <Ionicons name="finger-print-outline" size={16} color={primaryColor} />
                        <Text style={[styles.tapHintText, { color: primaryColor }]}>
                            {getTapHintText()}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Arrow pointing down (when tooltip is above target) */}
            {position === 'top' && (
                <View
                    style={[
                        styles.arrowDown,
                        {
                            left: Math.max(20, Math.min(arrowX, TOOLTIP_MAX_WIDTH - 40)),
                            borderTopColor: cardColor,
                        }
                    ]}
                />
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: TOOLTIP_MAX_WIDTH,
        zIndex: 1000,
    },
    tooltip: {
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    tapHintText: {
        fontSize: 13,
        fontWeight: '600',
    },
    arrowUp: {
        position: 'absolute',
        top: -ARROW_SIZE,
        width: 0,
        height: 0,
        borderLeftWidth: ARROW_SIZE,
        borderRightWidth: ARROW_SIZE,
        borderBottomWidth: ARROW_SIZE,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    arrowDown: {
        position: 'absolute',
        bottom: -ARROW_SIZE,
        width: 0,
        height: 0,
        borderLeftWidth: ARROW_SIZE,
        borderRightWidth: ARROW_SIZE,
        borderTopWidth: ARROW_SIZE,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
});

export default TourTooltip;
