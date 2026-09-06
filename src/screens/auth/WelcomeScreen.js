// WelcomeScreen.js
// Cinematic welcome: the promo reel plays full-bleed behind a burgundy scrim,
// with the brand, feature list and CTAs stacked on top. The reel is muted,
// looping and decorative — the layout is identical if video never starts.
//
// There is no poster image. A still frame under a moving reel reads as a stutter
// on the cut-over no matter how long the cross-fade, and the JPEG was a second
// asset to keep in sync with the video. What holds the frame instead is a static
// burgundy gradient — the same ramp as the scrim above the video, so the screen
// is on-brand from the first paint whether or not the reel ever decodes.
import React, { useEffect, useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Platform,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Entrance } from '../../components/dbe';
import { TYPE, MOTION } from '../../utils/typography';
import { useReduceMotion } from '../../hooks/useReduceMotion';

const PROMO_VIDEO = require('../../../assets/welcome-promo.mp4');

// Pre-auth screen: no theme context yet, and a video hero is dark by nature.
// These are the dark-palette burgundy tokens, inlined deliberately.
const C = {
    ink: '#0B0B0F',
    primary: '#8A1C22',
    primaryLight: '#A3232B',
    accentText: '#D4707A',
    text: '#FFFFFF',
    textMuted: 'rgba(255, 255, 255, 0.66)',
    textDim: 'rgba(255, 255, 255, 0.55)',
    hairline: 'rgba(255, 255, 255, 0.14)',
    surface: 'rgba(255, 255, 255, 0.07)',
    badgeFill: 'rgba(212, 112, 122, 0.16)',
};

const FEATURES = [
    { icon: 'analytics', title: 'AI Shot Analysis', description: 'Pro-level form feedback from any video' },
    { icon: 'basketball', title: 'Blueprint360 Training', description: 'Plans that adapt as you improve' },
    { icon: 'people', title: 'HoopCommunity', description: 'Compete, track, connect with coaches' },
];

// Slow drift across the reel so a short loop still feels alive (Ken Burns).
function useKenBurns(enabled) {
    const drift = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!enabled) return undefined;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(drift, {
                    toValue: 1,
                    duration: 18000,
                    easing: MOTION.easeInOut,
                    useNativeDriver: true,
                }),
                Animated.timing(drift, {
                    toValue: 0,
                    duration: 18000,
                    easing: MOTION.easeInOut,
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [enabled]);
    return drift;
}

const WelcomeScreen = ({ navigation }) => {
    // Respect the OS "reduce motion" setting — the reel holds on a still frame.
    const reduceMotion = useReduceMotion();
    const [videoReady, setVideoReady] = useState(false);
    const fadeIn = useRef(new Animated.Value(0)).current;

    const player = useVideoPlayer(PROMO_VIDEO, (p) => {
        p.loop = true;
        p.muted = true; // never open the app with sound
        p.play();
    });

    // Pause the reel when motion is reduced, and hard-stop it on unmount so it
    // does not keep decoding behind the signup stack.
    useEffect(() => {
        if (!player) return undefined;
        try {
            if (reduceMotion) player.pause();
            else player.play();
        } catch (e) {
            // player already released — nothing to do
        }
        return () => {
            try {
                player.pause();
            } catch (e) {
                // already released
            }
        };
    }, [player, reduceMotion]);

    // Cross-fade the reel in over the poster once it is actually rendering.
    useEffect(() => {
        const t = setTimeout(() => setVideoReady(true), 220);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!videoReady) return;
        Animated.timing(fadeIn, {
            toValue: 1,
            duration: 600,
            easing: MOTION.easeOut,
            useNativeDriver: true,
        }).start();
    }, [videoReady]);

    const drift = useKenBurns(!reduceMotion);
    const driftStyle = {
        transform: [
            { scale: 1.08 },
            { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) },
            { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [6, -6] }) },
        ],
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Burgundy ground. Holds the frame until the reel paints, and stays
                the whole backdrop if it never does. */}
            <LinearGradient
                colors={[C.ink, '#2A0A0E', C.primary]}
                locations={[0, 0.55, 1]}
                style={styles.media}
                pointerEvents="none"
            />

            <Animated.View
                pointerEvents="none"
                style={[styles.media, driftStyle, { opacity: fadeIn }]}
            >
                <VideoView
                    style={styles.media}
                    player={player}
                    nativeControls={false}
                    contentFit="cover"
                />
            </Animated.View>

            {/* Burgundy scrim — keeps every bit of copy legible over motion */}
            <LinearGradient
                colors={['rgba(11,11,15,0.55)', 'rgba(11,11,15,0.86)', 'rgba(76,15,20,0.94)']}
                locations={[0, 0.52, 1]}
                style={styles.media}
                pointerEvents="none"
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                    {/* Brand */}
                    <View style={styles.brandContainer}>
                        <Entrance variant="pop">
                            <LinearGradient
                                colors={[C.primaryLight, C.primary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.logoBadge}
                            >
                                <Ionicons name="basketball" size={40} color={C.text} />
                            </LinearGradient>
                        </Entrance>

                        <Entrance variant="up" delay={120}>
                            <Text style={styles.appName}>Basketball Training</Text>
                        </Entrance>

                        <Entrance variant="up" delay={220}>
                            <Text style={styles.tagline}>
                                The complete basketball development ecosystem
                            </Text>
                        </Entrance>
                    </View>

                    {/* Features */}
                    <View style={styles.featuresContainer}>
                        {FEATURES.map((feature, i) => (
                            <Entrance key={feature.title} variant="slideIn" delay={340 + i * 110}>
                                <View style={styles.featureItem}>
                                    <View style={styles.featureIconContainer}>
                                        <Ionicons name={feature.icon} size={20} color={C.accentText} />
                                    </View>
                                    <View style={styles.featureTextContainer}>
                                        <Text style={styles.featureTitle}>{feature.title}</Text>
                                        <Text style={styles.featureDescription}>
                                            {feature.description}
                                        </Text>
                                    </View>
                                </View>
                            </Entrance>
                        ))}
                    </View>

                    {/* Actions */}
                    <Entrance variant="up" delay={700}>
                        <View style={styles.buttonsContainer}>
                            <TouchableOpacity
                                activeOpacity={0.9}
                                accessibilityRole="button"
                                onPress={() => navigation.navigate('Signup')}
                            >
                                <LinearGradient
                                    colors={[C.primaryLight, C.primary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.getStartedButton}
                                >
                                    <Text style={styles.getStartedButtonText}>Get Started</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* The landing page tells an athlete without the app
                                to install it and then enter their code. This is
                                the only route to that screen on a fresh install —
                                without it, that instruction goes nowhere. */}
                            <TouchableOpacity
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                style={styles.loginButton}
                                onPress={() => navigation.navigate('JoinWithCode')}
                            >
                                <Text style={styles.loginButtonText}>I have an invite code</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                style={styles.loginButton}
                                onPress={() => navigation.navigate('Login')}
                            >
                                <Text style={styles.loginButtonText}>I already have an account</Text>
                            </TouchableOpacity>
                        </View>
                    </Entrance>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.ink,
    },
    media: {
        ...StyleSheet.absoluteFillObject,
    },
    safeArea: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 32,
    },
    brandContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoBadge: {
        width: 88,
        height: 88,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 22,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 22,
        elevation: 12,
    },
    appName: {
        fontFamily: TYPE.screenTitle.fontFamily,
        fontSize: 31,
        color: C.text,
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: 0.2,
    },
    tagline: {
        fontFamily: TYPE.tooltipBody.fontFamily,
        fontSize: 16.5,
        lineHeight: 22,
        color: C.textMuted,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    featuresContainer: {
        marginBottom: 28,
        gap: 10,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.hairline,
        borderRadius: 16,
        padding: 13,
    },
    featureIconContainer: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: C.badgeFill,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 13,
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        fontFamily: TYPE.rowTitle.fontFamily,
        fontSize: 16.5,
        color: C.text,
        marginBottom: 2,
    },
    featureDescription: {
        fontFamily: TYPE.rowMeta.fontFamily,
        fontSize: 14.5,
        lineHeight: 18,
        color: C.textDim,
    },
    buttonsContainer: {
        gap: 12,
    },
    getStartedButton: {
        paddingVertical: 17,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
    },
    getStartedButtonText: {
        fontFamily: TYPE.buttonPrimary.fontFamily,
        fontSize: 18,
        color: C.text,
        letterSpacing: 0.3,
    },
    loginButton: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: C.hairline,
    },
    loginButtonText: {
        fontFamily: TYPE.buttonSecondary.fontFamily,
        fontSize: 16.5,
        color: 'rgba(255, 255, 255, 0.85)',
    },
});

export default WelcomeScreen;
