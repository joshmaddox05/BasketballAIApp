// ShotAnalysisResultsSimple.js - Player-friendly shot analysis (DBE burgundy redesign, mock 11a)
// Presentation only: score pop, metric bars that fill, recent-session rows.
// All data plumbing (results shape, onClose/onTryAgain) unchanged.
import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import { Entrance, BarFill, SectionLabel } from '../dbe';
import { getConfidenceTip } from '../../utils/shotAnalysisMapper';

// Actionable feedback messages for each metric based on status
const METRIC_FEEDBACK = {
    release_angle: {
        good: { message: "Great release angle!", tip: "Keep shooting with this same motion." },
        improve: { message: "Release could be higher", tip: "Try to release the ball at the top of your jump for better arc." },
        poor: { message: "Release angle needs work", tip: "Focus on getting more arc - aim for the ball to drop into the basket from above." }
    },
    elbow_flare: {
        good: { message: "Elbow nicely tucked!", tip: "Your alignment is creating a straight shot path." },
        improve: { message: "Elbow drifting outward", tip: "Practice keeping your elbow directly under the ball as you shoot." },
        poor: { message: "Elbow flaring out", tip: "Your elbow is causing the ball to curve. Try the 'Wall Elbow Slides' drill." }
    },
    knee_load: {
        good: { message: "Strong leg power!", tip: "You're generating good power from your legs." },
        improve: { message: "Could use more leg power", tip: "Bend your knees a bit more before shooting to add power." },
        poor: { message: "Not enough leg drive", tip: "Your shot is mostly arms. Bend deeper and push up through your legs." }
    },
    hip_shoulder_alignment: {
        good: { message: "Body well aligned!", tip: "Your shoulders and hips are square to the basket." },
        improve: { message: "Slight body rotation", tip: "Try to keep your shoulders square to the basket." },
        poor: { message: "Body twisting during shot", tip: "Face the basket directly and keep your core stable." }
    },
    base_width: {
        good: { message: "Stable stance!", tip: "Your feet are well positioned for balance." },
        improve: { message: "Stance slightly off", tip: "Position your feet about shoulder-width apart." },
        poor: { message: "Unstable base", tip: "Your stance is affecting your balance. Set feet shoulder-width, shooting foot slightly forward." }
    },
    lateral_sway: {
        good: { message: "Rock solid balance!", tip: "You're staying centered throughout your shot." },
        improve: { message: "Some side movement", tip: "Focus on going straight up and down." },
        poor: { message: "Too much lateral movement", tip: "You're drifting sideways. Practice shooting while focusing on landing in the same spot." }
    },
    arc_trajectory: {
        good: { message: "Beautiful arc!", tip: "Your shot has great trajectory into the basket." },
        improve: { message: "Arc could be higher", tip: "Aim for the ball to peak above the rim and drop in." },
        poor: { message: "Shot is too flat", tip: "Line drives are hard to make. Focus on 'shooting over the rim' for better arc." }
    }
};

// Get status label for display
const getStatusLabel = (status) => {
    switch (status) {
        case 'good': return 'Great';
        case 'improve': return 'Work on it';
        case 'poor': return 'Focus here';
        default: return 'Check';
    }
};

// Get status icon
const getStatusIcon = (status) => {
    switch (status) {
        case 'good': return 'checkmark-circle';
        case 'improve': return 'arrow-up-circle';
        case 'poor': return 'alert-circle';
        default: return 'help-circle';
    }
};

const formatSessionDate = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const ShotAnalysisResultsSimple = ({ results, onClose, onTryAgain, history = [] }) => {
    const { theme } = useAppContext();
    const [showDetails, setShowDetails] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const videoRef = useRef(null);

    // Extract data from results
    const score = results.overallScore || 0;
    const grade = results.grade || '';
    const confidence = results.confidence || 0.85;
    const metrics = results.metrics || [];
    const coachingCues = results.coachingCues || [];
    const visualizationUrl = results.visualizationVideoUrl;

    const mapConfidenceScore = (s) => {
        if (s >= 0.8) return 'High';
        if (s >= 0.6) return 'Medium';
        return 'Low';
    };
    const confidenceLabel = mapConfidenceScore(confidence);
    const confidenceTip = getConfidenceTip(confidenceLabel, []);

    // Metric bar color voice (11d convention): strong → accent, mid → steel, weak → dim.
    const barColorFor = (status) =>
        status === 'good' ? theme.primary : status === 'improve' ? theme.steel : theme.textDim;

    const statusColorFor = (status) =>
        status === 'good' ? theme.success : status === 'improve' ? theme.warning : theme.error;

    const recentSessions = (history || []).slice(-3).reverse();

    const renderScore = () => (
        <Entrance variant="pop" delay={450} style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ fontFamily: FONTS.heading, fontSize: 50, lineHeight: 50, color: theme.text }}>
                {score}
            </Text>
            <Text
                style={{
                    fontFamily: FONTS.bodyBold,
                    fontSize: 10.5,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    color: theme.steel,
                    marginTop: 3,
                }}
            >
                {`Shot Score${grade ? ` · ${grade}` : ''}`}
            </Text>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 9,
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                    borderRadius: SHAPE.radiusBadge,
                    backgroundColor: confidenceLabel === 'High' ? theme.badgeFill : theme.steelFill,
                }}
            >
                <Ionicons
                    name="shield-checkmark"
                    size={11}
                    color={confidenceLabel === 'High' ? theme.accentText : theme.steel}
                />
                <Text
                    style={[
                        TYPE.chip,
                        { color: confidenceLabel === 'High' ? theme.accentText : theme.steel },
                    ]}
                >
                    {confidenceLabel} confidence
                </Text>
            </View>
            {confidenceTip ? (
                <Text
                    style={[
                        TYPE.rowMeta,
                        { color: theme.textDim, marginTop: 7, textAlign: 'center' },
                    ]}
                >
                    {confidenceTip}
                </Text>
            ) : null}
        </Entrance>
    );

    const renderMetricBars = () => {
        if (metrics.length === 0) return null;
        return (
            <View style={{ marginTop: 20, gap: 11 }}>
                {metrics.map((metric, index) => (
                    <View
                        key={metric.id}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                        <Text
                            numberOfLines={1}
                            style={{
                                fontFamily: FONTS.bodySemiBold,
                                fontSize: 11.5,
                                color: theme.textMuted,
                                width: 98,
                            }}
                        >
                            {metric.name}
                        </Text>
                        <BarFill
                            pct={Math.min(metric.score * 10, 100) / 100}
                            color={barColorFor(metric.status)}
                            trackColor={theme.track}
                            height={6}
                            delay={100 + index * 100}
                            style={{ flex: 1 }}
                        />
                        <Text
                            style={{
                                fontFamily: FONTS.bodyBold,
                                fontSize: 12,
                                color: theme.text,
                                width: 26,
                                textAlign: 'right',
                            }}
                        >
                            {Math.round(Math.min(metric.score * 10, 100))}
                        </Text>
                    </View>
                ))}
            </View>
        );
    };

    // Render visualization video section (restyled chrome only)
    const renderVisualizationVideo = () => {
        if (!visualizationUrl) return null;
        return (
            <View style={{ marginTop: 20 }}>
                <SectionLabel>Shot replay</SectionLabel>
                <View
                    style={{
                        backgroundColor: '#000',
                        borderRadius: SHAPE.radiusCard,
                        overflow: 'hidden',
                        aspectRatio: 16 / 9,
                    }}
                >
                    {isVideoLoading && (
                        <View
                            style={{
                                ...StyleSheet.absoluteFillObject,
                                backgroundColor: theme.surface2,
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1,
                            }}
                        >
                            <ActivityIndicator size="large" color={theme.primary} />
                        </View>
                    )}
                    <Video
                        ref={videoRef}
                        source={{ uri: visualizationUrl }}
                        style={{ flex: 1, width: '100%', height: '100%' }}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping
                        onLoadStart={() => setIsVideoLoading(true)}
                        onLoad={() => setIsVideoLoading(false)}
                        onPlaybackStatusUpdate={() => {}}
                        onError={(error) => {
                            console.log('Video error:', error);
                            setIsVideoLoading(false);
                        }}
                    />
                </View>
            </View>
        );
    };

    // Top coaching fixes — numbered burgundy badges, compact rows
    const renderKeyFixes = () => {
        const topCues = coachingCues.slice(0, 3);
        if (topCues.length === 0) return null;
        return (
            <View style={{ marginTop: 20 }}>
                <SectionLabel>Top fixes</SectionLabel>
                <View style={{ gap: SHAPE.cardGap }}>
                    {topCues.map((cue, index) => (
                        <Entrance
                            key={index}
                            variant="cardIn"
                            delay={200 + index * 100}
                            style={{
                                backgroundColor: theme.surface,
                                borderRadius: SHAPE.radiusTile,
                                padding: SHAPE.cardPadding,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        backgroundColor: index === 0 ? theme.primary : theme.badgeFill,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Text
                                        style={[
                                            TYPE.chip,
                                            { color: index === 0 ? '#FFFFFF' : theme.accentText },
                                        ]}
                                    >
                                        {index + 1}
                                    </Text>
                                </View>
                                <Text style={[TYPE.rowTitle, { color: theme.text, flex: 1 }]}>
                                    {cue.cue || cue.title}
                                </Text>
                            </View>
                            {cue.description ? (
                                <Text style={[TYPE.rowMeta, { color: theme.textDim, marginTop: 6, lineHeight: 15 }]}>
                                    {cue.description}
                                </Text>
                            ) : null}
                            {cue.drill ? (
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginTop: 8,
                                        alignSelf: 'flex-start',
                                        backgroundColor: theme.badgeFill,
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: SHAPE.radiusBadge,
                                    }}
                                >
                                    <Ionicons name="fitness" size={12} color={theme.accentText} />
                                    <Text style={[TYPE.chip, { color: theme.accentText }]}>{cue.drill}</Text>
                                </View>
                            ) : null}
                            {cue.visualCue ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 }}>
                                    <Ionicons name="eye-outline" size={12} color={theme.textDim} />
                                    <Text style={[TYPE.rowMeta, { color: theme.textDim, flex: 1, marginTop: 0 }]}>
                                        {cue.visualCue}
                                    </Text>
                                </View>
                            ) : null}
                        </Entrance>
                    ))}
                </View>
            </View>
        );
    };

    // Recent sessions — score badge + date rows (mock 11a "Recent sessions")
    const renderRecentSessions = () => {
        if (recentSessions.length === 0) return null;
        return (
            <View style={{ marginTop: 20 }}>
                <SectionLabel>Recent sessions</SectionLabel>
                {recentSessions.map((session, index) => (
                    <View
                        key={`${session.date}-${index}`}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            paddingVertical: 9,
                            borderBottomWidth: index < recentSessions.length - 1 ? 1 : 0,
                            borderBottomColor: theme.hairline,
                        }}
                    >
                        <View
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 9,
                                backgroundColor: theme.badgeFill,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: FONTS.bodyExtraBold,
                                    fontSize: 11.5,
                                    color: theme.accentText,
                                }}
                            >
                                {session.score}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 13, color: theme.text }}>
                                Shot analysis
                            </Text>
                            <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>
                                {formatSessionDate(session.date)}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    // Full breakdown — status message + tip per metric (gated behind the toggle)
    const renderMetricCards = () => {
        if (!showDetails) return null;
        return (
            <View style={{ marginTop: 14, gap: SHAPE.cardGap }}>
                {metrics.map((metric) => {
                    const feedback = METRIC_FEEDBACK[metric.id] || {};
                    const statusFeedback = feedback[metric.status] || { message: metric.feedback, tip: '' };
                    const statusColor = statusColorFor(metric.status);
                    return (
                        <View
                            key={metric.id}
                            style={{
                                backgroundColor: theme.surface,
                                borderRadius: SHAPE.radiusTile,
                                padding: SHAPE.cardPadding,
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                                <Ionicons name={getStatusIcon(metric.status)} size={18} color={statusColor} />
                                <Text style={[TYPE.rowTitle, { color: theme.text, flex: 1 }]}>
                                    {metric.name}
                                </Text>
                                <Text style={[TYPE.chip, { color: statusColor }]}>
                                    {getStatusLabel(metric.status)}
                                </Text>
                            </View>
                            <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginTop: 6 }]}>
                                {statusFeedback.message}
                            </Text>
                            {statusFeedback.tip && metric.status !== 'good' ? (
                                <Text style={[TYPE.rowMeta, { color: theme.textDim, marginTop: 4, lineHeight: 15 }]}>
                                    {statusFeedback.tip}
                                </Text>
                            ) : null}
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={{ paddingHorizontal: SHAPE.screenPadding, paddingTop: 14 }}>
            {renderScore()}
            {renderMetricBars()}
            {renderVisualizationVideo()}
            {renderKeyFixes()}
            {renderRecentSessions()}

            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowDetails(!showDetails)}
                style={{
                    marginTop: 18,
                    backgroundColor: theme.primary,
                    borderRadius: SHAPE.radiusTile,
                    paddingVertical: 15,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Text style={{ fontFamily: FONTS.bodyExtraBold, fontSize: 14.5, color: '#FFFFFF' }}>
                    {showDetails ? 'Hide full report' : 'View full report'}
                </Text>
                <Ionicons name={showDetails ? 'chevron-up' : 'arrow-forward'} size={16} color="#FFFFFF" />
            </TouchableOpacity>

            {renderMetricCards()}
        </View>
    );
};

export default ShotAnalysisResultsSimple;
