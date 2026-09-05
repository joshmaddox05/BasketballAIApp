// ShotDNAScreen.js - ShotDNA main hub screen (12a — archetype & mechanics radar)
import React, { useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polygon, Line, Circle } from 'react-native-svg';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';
// LockedFeatureCard is a default export — importing it as a named binding resolved
// to undefined and crashed this screen for any free-tier user.
import LockedFeatureCard from '../../components/features/LockedFeatureCard';
import {
  Entrance,
  Float,
  Shimmer,
  useMotionActive,
  ScreenHeader,
  HeaderIconButton,
  SectionLabel,
  Avatar,
  Row,
  EmptyState,
} from '../../components/dbe';
import { TYPE, SHAPE, FONTS, MOTION } from '../../utils/typography';

// The five axes the biomechanics backend reports. These are real, fixed
// dimensions of the analysis — they exist so the radar has a shape to draw
// before the athlete has been measured, and every score is zero until one is.
// (This replaced a mock that carried invented scores of 78/65/82/71/88, which
// the screen showed to anyone who had never analysed a shot. `hasProfile`
// already renders '--' and empty bars; the mock was the only thing stopping it.)
const MECHANIC_DIMENSIONS = [
  'Release Angle',
  'Footwork',
  'Consistency',
  'Arc Height',
  'Follow-Through',
].map((label) => ({ label, score: 0 }));

// Short axis captions for the radar (mock: RELEASE / FOOT / CONSIST / ARC / FOLLOW).
const SHORT_LABELS = {
  'Release Angle': 'RELEASE',
  Footwork: 'FOOT',
  Consistency: 'CONSIST',
  'Arc Height': 'ARC',
  'Follow-Through': 'FOLLOW',
};
const shortLabel = (label) =>
  SHORT_LABELS[label] || String(label).split(/[\s-]/)[0].slice(0, 7).toUpperCase();

// Radar geometry — center (100,92), outer radius 72 in a 200×184 viewBox (mock 12a).
const CX = 100;
const CY = 92;
const RMAX = 72;
const radarPoint = (i, r) => {
  const a = ((-90 + i * 72) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
};
const ringPoints = (r) =>
  [0, 1, 2, 3, 4].map((i) => radarPoint(i, r).map((v) => v.toFixed(1)).join(',')).join(' ');

// Label slots around the radar, per mock (absolute within the full-width wrapper).
const LABEL_SLOTS = [
  { top: 0, left: 0, right: 0, textAlign: 'center' },
  { top: 66, right: 0 },
  { bottom: 20, right: 4 },
  { bottom: 20, left: 2 },
  { top: 66, left: 0 },
];

/** Rotating sweep line (mock baiSweepRot, 5.5s linear loop). */
function RadarSweep({ color }) {
  const t = useRef(new Animated.Value(0)).current;
  // Perpetual decoration: stop it when the screen is blurred (React Navigation keeps
  // it mounted) or when the OS asks for reduced motion.
  const active = useMotionActive();
  useEffect(() => {
    if (!active) return undefined;
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 5500, easing: MOTION.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [active]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: 206,
        height: 190,
        transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    >
      <Svg width={206} height={190} viewBox="0 0 200 184">
        <Line x1={CX} y1={CY} x2={CX} y2={18} stroke={color} strokeWidth={1.6} opacity={0.75} />
      </Svg>
    </Animated.View>
  );
}

/** Orbiting satellite decoration on the hero card (mock baiOrbit, 14s linear). */
function OrbitDecor() {
  const t = useRef(new Animated.Value(0)).current;
  const active = useMotionActive();
  useEffect(() => {
    if (!active) return undefined;
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 14000, easing: MOTION.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [active]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -40,
        right: -30,
        width: 150,
        height: 150,
        transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    >
      <Svg width={150} height={150} viewBox="0 0 150 150">
        <Circle cx={75} cy={75} r={60} stroke="rgba(255,255,255,0.22)" strokeWidth={1} strokeDasharray="5 9" fill="none" />
        <Circle cx={75} cy={15} r={4} fill="rgba(255,255,255,0.55)" />
      </Svg>
    </Animated.View>
  );
}

/** Five-axis mechanics radar (12a). Falls back to grid-only when no profile. */
function MechanicsRadar({ mechanics, hasProfile, theme }) {
  const dataPoints = useMemo(
    () => mechanics.map((m, i) => radarPoint(i, (Math.max(0, Math.min(100, m.score)) / 100) * RMAX)),
    [mechanics],
  );
  return (
    <View style={styles.radarWrap}>
      <View style={{ width: 206, height: 190 }}>
        <Svg width={206} height={190} viewBox="0 0 200 184" style={StyleSheet.absoluteFill}>
          <Polygon points={ringPoints(RMAX)} fill="none" stroke={theme.track} strokeWidth={1} />
          <Polygon points={ringPoints(RMAX / 2)} fill="none" stroke={theme.track} strokeWidth={1} />
          {[0, 1, 2, 3, 4].map((i) => {
            const [x, y] = radarPoint(i, RMAX);
            return <Line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke={theme.track} strokeWidth={1} />;
          })}
        </Svg>
        <RadarSweep color={theme.accentText} />
        {hasProfile ? (
          <Entrance variant="pop" delay={250} style={StyleSheet.absoluteFill}>
            <Svg width={206} height={190} viewBox="0 0 200 184">
              <Polygon
                points={dataPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
                fill={theme.primary + '6B'}
                stroke={theme.primary}
                strokeWidth={2}
              />
              {dataPoints.map(([x, y], i) => (
                <Circle key={i} cx={x} cy={y} r={3.4} fill={theme.accentText} />
              ))}
            </Svg>
          </Entrance>
        ) : null}
      </View>
      {mechanics.map((m, i) => (
        <Text
          key={m.label}
          style={[styles.radarLabel, LABEL_SLOTS[i], { color: theme.textMuted }]}
        >
          {shortLabel(m.label)} {hasProfile ? m.score : '--'}
        </Text>
      ))}
    </View>
  );
}

function MechanicBars({ mechanics, hasProfile, theme }) {
  // Fallback layout when the profile has a non-standard axis count.
  return (
    <View style={{ marginTop: 10, gap: 10 }}>
      {mechanics.map((m) => (
        <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[TYPE.rowMeta, { color: theme.textMuted, width: 108, marginTop: 0 }]}>{m.label}</Text>
          <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: theme.track, overflow: 'hidden' }}>
            <View
              style={{
                width: `${hasProfile ? Math.max(0, Math.min(100, m.score)) : 0}%`,
                height: '100%',
                borderRadius: 3,
                backgroundColor: theme.primary,
              }}
            />
          </View>
          <Text style={[TYPE.rowTitle, { color: hasProfile ? theme.text : theme.textDim, width: 28, textAlign: 'right' }]}>
            {hasProfile ? m.score : '--'}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function ShotDNAScreen({ navigation }) {
  const { userData, theme, isDarkMode, shotDNAProfile } = useAppContext();
  const userSubscription = userData?.subscription || 'free';
  const hasAccess = canAccessFeature('shotDNA', userSubscription);

  const archetype = shotDNAProfile?.archetype || null;
  const position = shotDNAProfile?.positionProjection || 'SG / SF';
  const mechanics =
    shotDNAProfile?.mechanics && shotDNAProfile.mechanics.length
      ? shotDNAProfile.mechanics
      : MECHANIC_DIMENSIONS;
  // No fallback: an athlete with no analyses sees the EmptyState below, not a
  // list of shots they never took.
  const recentAnalyses = shotDNAProfile?.recentAnalyses || [];
  const lineage = shotDNAProfile?.historicalComparisons || [];
  const avg = Math.round(mechanics.reduce((s, m) => s + (m.score || 0), 0) / (mechanics.length || 1));

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ScreenHeader title="ShotDNA™" subtitle="Your Basketball Identity" />
        <View style={styles.lockedContent}>
          <LockedFeatureCard
            featureName="shotDNA"
            displayName="ShotDNA™"
            description="Biomechanical shot analysis that reveals your unique shooting identity, archetype, and development path."
            icon="analytics"
            colors={theme.heroGradient}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title="ShotDNA™"
        subtitle="Your Basketball Identity"
        right={<HeaderIconButton icon="time-outline" onPress={() => navigation.navigate('ShotDNAHistory')} />}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Archetype hero */}
        <Entrance variant="cardIn">
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={!archetype}
            onPress={() => navigation.navigate('ShotDNAArchetype', { profile: shotDNAProfile })}
          >
            <LinearGradient
              colors={theme.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <OrbitDecor />
              <Float duration={3400}>
                <View style={styles.heroIconCircle}>
                  <Ionicons name="basketball-outline" size={30} color="#FFFFFF" />
                </View>
              </Float>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>YOUR ARCHETYPE</Text>
                <Text style={styles.heroName}>{archetype || 'Analyze a shot to unlock'}</Text>
                {archetype ? (
                  <View style={styles.heroPositionRow}>
                    <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.heroPosition}>{position} projection</Text>
                  </View>
                ) : null}
              </View>
              {archetype ? (
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
              ) : null}
            </LinearGradient>
          </TouchableOpacity>
        </Entrance>

        {/* Mechanics profile */}
        <Entrance variant="cardIn" delay={90} style={[styles.mechCard, { backgroundColor: theme.surface }]}>
          <View style={styles.mechHeader}>
            <Text style={[TYPE.sectionLabel, { color: theme.textDim }]}>Mechanics profile</Text>
            {shotDNAProfile ? (
              <Text style={{ fontFamily: FONTS.bodyExtraBold, fontSize: 15, color: theme.accentText }}>
                {avg} avg
              </Text>
            ) : null}
          </View>
          {mechanics.length === 5 ? (
            <MechanicsRadar mechanics={mechanics} hasProfile={!!shotDNAProfile} theme={theme} />
          ) : (
            <MechanicBars mechanics={mechanics} hasProfile={!!shotDNAProfile} theme={theme} />
          )}
        </Entrance>

        {/* Historical lineage */}
        {lineage.length > 0 ? (
          <View style={{ marginTop: SHAPE.sectionGap }}>
            <SectionLabel action={`${lineage.length} player${lineage.length === 1 ? '' : 's'}`}>
              Historical lineage
            </SectionLabel>
            {lineage.map((p, i) => (
              <Entrance key={p.name || i} variant="slideIn" delay={350 + i * 150}>
                <Row
                  style={i > 0 ? { marginTop: 8 } : null}
                  leading={
                    <Avatar
                      tone="steel"
                      size={34}
                      initials={(p.name || '?')
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    />
                  }
                  title={p.name}
                  meta={p.era}
                  trailing={
                    p.similarity != null ? (
                      <Text style={{ fontFamily: FONTS.bodyExtraBold, fontSize: 15, color: theme.accentText }}>
                        {p.similarity}%
                      </Text>
                    ) : null
                  }
                />
              </Entrance>
            ))}
          </View>
        ) : null}

        {/* Recent analyses */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel action="See all" onAction={() => navigation.navigate('ShotDNAHistory')}>
            Recent analyses
          </SectionLabel>
          {recentAnalyses.length > 0 ? (
            recentAnalyses.slice(0, 3).map((item, i) => (
              <Entrance key={item.id} variant="slideIn" delay={400 + i * 120}>
                <Row
                  style={i > 0 ? { marginTop: 8 } : null}
                  leading={
                    <View style={[styles.scoreBadge, { backgroundColor: theme.badgeFill }]}>
                      <Text style={[TYPE.statNumberMedium, { fontSize: 17.5, lineHeight: 19, color: theme.accentText }]}>
                        {item.score}
                      </Text>
                    </View>
                  }
                  title={item.type}
                  meta={item.date}
                  trailing={<Ionicons name="chevron-forward" size={15} color={theme.textDim} />}
                />
              </Entrance>
            ))
          ) : (
            <EmptyState
              icon="camera-outline"
              title="No analyses yet"
              sub="Scan a shot to build your ShotDNA profile."
              style={{ paddingVertical: 24 }}
            />
          )}
        </View>

        {/* CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ShootingAnalysis')}
          style={[styles.cta, { backgroundColor: theme.primary }]}
        >
          <Shimmer color={theme.shimmer} bandWidth={60} duration={3200} />
          <Text style={styles.ctaText}>Analyze a new shot</Text>
          <Ionicons name="camera-outline" size={17} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SHAPE.screenPadding, paddingTop: 14, paddingBottom: 40 },
  lockedContent: { flex: 1, paddingHorizontal: SHAPE.screenPadding, justifyContent: 'center' },
  hero: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    overflow: 'hidden',
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.65)',
  },
  heroName: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    lineHeight: 23,
    color: '#FFFFFF',
    marginTop: 4,
  },
  heroPositionRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  heroPosition: { fontFamily: FONTS.bodySemiBold, fontSize: 13.5, color: 'rgba(255,255,255,0.85)' },
  mechCard: {
    marginTop: 16,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  mechHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  radarWrap: { height: 190, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  radarLabel: { position: 'absolute', fontFamily: FONTS.bodyBold, fontSize: 11.5 },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: SHAPE.radiusTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    marginTop: SHAPE.sectionGap,
    borderRadius: SHAPE.radiusTile,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  ctaText: { fontFamily: FONTS.bodyExtraBold, fontSize: 16, color: '#FFFFFF' },
});
