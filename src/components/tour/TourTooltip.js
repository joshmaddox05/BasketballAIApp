// TourTooltip.js - DBE-styled tour card (design handoff 14h/14i)
// surface2 card, radius 18, big soft shadow, rotated-square tail.
// Row order: step counter + voice toggle + Skip / title / body /
// progress dots + buttons (Got it on tab steps, Back+Next on content steps).
// Positioning mechanics (top/bottom flip + clamping) are unchanged.
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { useTour } from './TourProvider';
import { Entrance, PrimaryButton, OutlineButton } from '../dbe';
import { TYPE, FONTS } from '../../utils/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOOLTIP_MARGIN = 20;
const TAIL_SIZE = 16;
const TAIL_OFFSET = TAIL_SIZE / 2; // how far the rotated square pokes out
const TOOLTIP_MAX_WIDTH = SCREEN_WIDTH - (TOOLTIP_MARGIN * 2);

const TourTooltip = ({ step, stepIndex, totalSteps, targetMeasurement, theme, onSkip }) => {
    const [tooltipHeight, setTooltipHeight] = useState(0);
    const { voiceMuted, toggleVoiceMuted } = useAppContext();
    const { goToNextStep, goToPreviousStep, isTransitioning } = useTour();

    if (!step || !targetMeasurement) {
        return null;
    }

    const { title, description, tooltipPosition: preferredPosition } = step;
    const { x: targetX, y: targetY, width: targetWidth, height: targetHeight } = targetMeasurement;

    // Calculate tooltip position (mechanics unchanged from the pre-restyle version)
    const calculatePosition = () => {
        let position = preferredPosition || 'bottom';

        // Check if there's enough space above/below
        const spaceAbove = targetY;
        const spaceBelow = SCREEN_HEIGHT - (targetY + targetHeight);
        const estimatedHeight = tooltipHeight || 150;
        const needed = estimatedHeight + TAIL_OFFSET + TOOLTIP_MARGIN;

        if (position === 'top' && spaceAbove < needed) {
            position = 'bottom';
        } else if (position === 'bottom' && spaceBelow < needed) {
            position = 'top';
        }

        // Calculate X position (center tooltip on target)
        let tooltipX = targetX + (targetWidth / 2) - (TOOLTIP_MAX_WIDTH / 2);

        // Clamp to screen bounds
        tooltipX = Math.max(TOOLTIP_MARGIN, Math.min(tooltipX, SCREEN_WIDTH - TOOLTIP_MAX_WIDTH - TOOLTIP_MARGIN));

        // Calculate Y position
        let tooltipY;
        if (position === 'top') {
            tooltipY = targetY - estimatedHeight - TAIL_OFFSET - 8;
        } else {
            tooltipY = targetY + targetHeight + TAIL_OFFSET + 8;
        }

        // Clamp Y so tooltip stays within safe screen bounds:
        // - Top: below the status bar area
        // - Bottom: above the tab bar (~90px from bottom)
        const safeTop = 70;
        const safeBottom = SCREEN_HEIGHT - estimatedHeight - 90;
        tooltipY = Math.max(safeTop, Math.min(tooltipY, safeBottom));

        return { tooltipX, tooltipY, position };
    };

    const { tooltipX, tooltipY, position } = calculatePosition();

    const surface2 = theme?.surface2 || '#242427';
    const textColor = theme?.text || '#E9E9ED';
    const mutedColor = theme?.textMuted || '#B4B4BB';
    const dimColor = theme?.textDim || '#7C7C86';
    const steelColor = theme?.steel || '#9AA0AC';
    const accentText = theme?.accentText || '#D4707A';
    const trackColor = theme?.track || 'rgba(233, 233, 237, 0.10)';

    const isTabStep = step?.isTabStep === true;

    return (
        <View
            style={[styles.container, { left: tooltipX, top: tooltipY }]}
            onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                if (height !== tooltipHeight) {
                    setTooltipHeight(height);
                }
            }}
        >
            {/* Re-keyed per step so the pop entrance replays on each step change */}
            <Entrance variant="pop" key={stepIndex}>
                <View style={[styles.card, { backgroundColor: surface2 }]}>
                    {/* Row 1: step counter + voice toggle + Skip */}
                    <View style={styles.headerRow}>
                        <Text style={[TYPE.tooltipStep, { color: accentText }]}>
                            {`STEP ${stepIndex + 1} OF ${totalSteps}`}
                        </Text>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                onPress={toggleVoiceMuted}
                                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                                accessibilityLabel={voiceMuted ? 'Unmute tour voice' : 'Mute tour voice'}
                            >
                                <Ionicons
                                    name={voiceMuted ? 'volume-mute-outline' : 'volume-medium-outline'}
                                    size={15}
                                    color={voiceMuted ? dimColor : steelColor}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onSkip}
                                hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
                                accessibilityLabel="Skip tour"
                            >
                                <Text style={[styles.skipText, { color: dimColor }]}>Skip</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Row 2: title */}
                    <Text style={[TYPE.tooltipTitle, styles.title, { color: textColor }]}>
                        {title}
                    </Text>

                    {/* Row 3: body */}
                    <Text style={[TYPE.tooltipBody, styles.body, { color: mutedColor }]}>
                        {description}
                    </Text>

                    {/* Row 4: progress dots left, buttons right */}
                    <View style={styles.footerRow}>
                        <View style={styles.dots}>
                            {Array.from({ length: totalSteps }).map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        i === stepIndex
                                            ? { width: 16, backgroundColor: accentText }
                                            : { width: 5, backgroundColor: trackColor },
                                    ]}
                                />
                            ))}
                        </View>
                        {isTabStep ? (
                            <PrimaryButton
                                label="Got it"
                                onPress={goToNextStep}
                                disabled={isTransitioning}
                                style={styles.btnPrimary}
                            />
                        ) : (
                            <View style={styles.btnRow}>
                                {stepIndex > 0 && (
                                    <OutlineButton
                                        label="Back"
                                        onPress={goToPreviousStep}
                                        style={styles.btnOutline}
                                    />
                                )}
                                <PrimaryButton
                                    label="Next"
                                    onPress={goToNextStep}
                                    disabled={isTransitioning}
                                    style={styles.btnPrimary}
                                />
                            </View>
                        )}
                    </View>
                </View>

                {/* Tail: rotated square in surface2. Bottom-center when the
                    tooltip sits above the target; 38px from the left when below. */}
                <View
                    style={[
                        styles.tail,
                        { backgroundColor: surface2 },
                        position === 'top' ? styles.tailBottom : styles.tailTop,
                    ]}
                    pointerEvents="none"
                />
            </Entrance>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: TOOLTIP_MAX_WIDTH,
        zIndex: 1000,
    },
    card: {
        borderRadius: 18,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
    },
    skipText: {
        fontFamily: FONTS.bodySemiBold,
        fontSize: 10.5,
    },
    title: {
        marginTop: 9,
    },
    body: {
        marginTop: 5,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
    },
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    dot: {
        height: 5,
        borderRadius: 3,
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    btnPrimary: {
        paddingVertical: 9,
        paddingHorizontal: 18,
        borderRadius: 12,
    },
    btnOutline: {
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 12,
    },
    tail: {
        position: 'absolute',
        width: TAIL_SIZE,
        height: TAIL_SIZE,
        transform: [{ rotate: '45deg' }],
    },
    tailBottom: {
        bottom: -TAIL_OFFSET,
        left: '50%',
        marginLeft: -TAIL_OFFSET,
    },
    tailTop: {
        top: -TAIL_OFFSET,
        left: 38,
    },
});

export default TourTooltip;
