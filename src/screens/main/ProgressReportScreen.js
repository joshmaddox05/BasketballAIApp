// ProgressReportScreen.js - Linked athlete/child progress report (13c redesign).
// EvalRank + Blueprint360 + session trend; data loading unchanged.
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getLinkedPlayers, getLinkedPlayerSummary } from '../../services/firestoreService';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import {
  Entrance,
  BarFill,
  Sparkline,
  ScreenHeader,
  HeaderIconButton,
  SectionLabel,
  Avatar,
  PrimaryButton,
  EmptyState,
  LoadingState,
} from '../../components/dbe';

// ─────────────────────────────────────────────────────────────────────────────
// Data mapping helpers (Firestore docs -> presentational shapes)
// ─────────────────────────────────────────────────────────────────────────────

// Grade → palette voice: strong grades speak steel (neutral), weak grades speak
// the burgundy attention accent.
const gradeIsStrong = (grade) => {
  const g = (grade || '').toUpperCase();
  return g.startsWith('A') || g.startsWith('B');
};

// Fallback percentage when an EvalRank skill has no numeric score
const gradeToPct = (grade) => {
  const g = (grade || '').toUpperCase();
  if (g.startsWith('A')) return 88;
  if (g.startsWith('B')) return 74;
  if (g.startsWith('C')) return 58;
  if (g.startsWith('D')) return 42;
  return 50;
};

// EvalRank skillGrades may be an array of { label, grade, score } (canonical)
// or an object of { label: grade }. Normalise both to { label, grade, pct }.
const mapSkills = (evalRank) => {
  const raw = evalRank?.skillGrades;
  if (Array.isArray(raw)) {
    return raw.map((s) => ({
      label: s.label,
      grade: s.grade,
      pct: typeof s.score === 'number' ? s.score : gradeToPct(s.grade),
    }));
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([label, grade]) => ({ label, grade, pct: gradeToPct(grade) }));
  }
  return [];
};

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatWhen = (value) => {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const mapMilestones = (achievements) =>
  (achievements || []).slice(0, 5).map((a) => ({
    id: a.id,
    label: a.title || a.name || 'Achievement',
    date: formatWhen(a.unlockedAt) || 'Earned',
    done: true,
  }));

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Sessions per week over the last 4 weeks (oldest → newest), plus the change
// vs the prior 4-week window when one exists.
const mapSessionTrend = (activities) => {
  const now = Date.now();
  const counts = [0, 0, 0, 0];
  let prior = 0;
  (activities || []).forEach((a) => {
    const d = toDate(a.createdAt);
    if (!d) return;
    const weeksAgo = Math.floor((now - d.getTime()) / WEEK_MS);
    if (weeksAgo >= 0 && weeksAgo < 4) counts[3 - weeksAgo] += 1;
    else if (weeksAgo >= 4 && weeksAgo < 8) prior += 1;
  });
  const current = counts.reduce((s, n) => s + n, 0);
  let delta = null;
  if (prior > 0) delta = Math.round(((current - prior) / prior) * 100);
  return { counts, current, delta };
};

// Total logged minutes in the last 4 weeks (only if durations exist on activities).
const mapCourtHours = (activities) => {
  const cutoff = Date.now() - 4 * WEEK_MS;
  let mins = 0;
  (activities || []).forEach((a) => {
    const d = toDate(a.createdAt);
    if (!d || d.getTime() < cutoff) return;
    mins += Number(a.duration || a.durationMinutes || 0) || 0;
  });
  return mins > 0 ? `${(mins / 60).toFixed(1)}h` : null;
};

const computeAdherence = (profile, activities) => {
  const weekAgo = Date.now() - WEEK_MS;
  const recent = (activities || []).filter((a) => {
    const d = toDate(a.createdAt);
    return d && d.getTime() >= weekAgo;
  }).length;
  const goal = profile?.preferences?.trainingDays?.length || 5;
  return Math.min(100, Math.round((recent / goal) * 100));
};

const initialsOf = (name) =>
  (name || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCell({ value, label, accent, theme }) {
  return (
    <View style={[styles.statCell, { backgroundColor: theme.surface }]}>
      <Text style={[TYPE.statNumberMedium, { color: accent ? theme.accentText : theme.text }]}>
        {value}
      </Text>
      <Text style={[styles.statCellLabel, { color: theme.textDim }]}>{label}</Text>
    </View>
  );
}

function SkillBar({ skill, theme, delay }) {
  const strong = gradeIsStrong(skill.grade);
  const color = strong ? theme.steel : theme.primary;
  const textColor = strong ? theme.steel : theme.accentText;
  return (
    <View style={styles.skillRow}>
      <Text numberOfLines={1} style={[styles.skillLabel, { color: theme.textMuted }]}>
        {skill.label}
      </Text>
      <BarFill
        pct={skill.pct / 100}
        color={color}
        trackColor={theme.track}
        height={6}
        duration={700}
        delay={delay}
        style={{ flex: 1 }}
      />
      <Text style={[styles.skillValue, { color: textColor }]}>{skill.grade || `${skill.pct}%`}</Text>
    </View>
  );
}

function EmptyHint({ text, theme }) {
  return <Text style={[TYPE.tooltipBody, { color: theme.textDim }]}>{text}</Text>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ProgressReportScreen({ navigation }) {
  const { user, theme, isDarkMode, selectedChildUid } = useAppContext();
  const parentUid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState(null);
  const [evalRank, setEvalRank] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [activities, setActivities] = useState([]);

  const loadChild = useCallback(async () => {
    if (!parentUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const linkedPlayers = await getLinkedPlayers(parentUid);
      const linked = linkedPlayers.find((c) => c.uid === selectedChildUid) || linkedPlayers[0];
      if (!linked) {
        setChild(null);
        return;
      }
      const summary = await getLinkedPlayerSummary(linked.uid);
      const profile = summary.profile || {};
      setChild({
        name: profile.displayName || linked.name || 'Your Child',
        position: profile.position || '',
        level: typeof profile.level === 'number' ? profile.level : 1,
        profile,
      });
      setEvalRank(summary.evalRank);
      setBlueprint(summary.blueprint);
      setMilestones(mapMilestones(summary.achievements));
      setActivities(summary.activities || []);
    } finally {
      setLoading(false);
    }
  }, [parentUid, selectedChildUid]);

  useFocusEffect(
    useCallback(() => {
      loadChild();
    }, [loadChild])
  );

  const header = (
    <ScreenHeader
      title="Progress Report"
      onBack={() => navigation.goBack()}
      right={<HeaderIconButton icon="chatbubble-outline" onPress={() => navigation.navigate('Messaging')} />}
    />
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {header}
        <LoadingState />
      </SafeAreaView>
    );
  }

  // Empty state — no linked child
  if (!child) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {header}
        <View style={styles.centered}>
          <EmptyState
            icon="people-outline"
            title="Link your child"
            sub="Connect to your child's account with their invite code to follow their training and progress."
            ctaLabel="Link Your Child"
            onPress={() => navigation.navigate('LinkAccount', { onLinked: loadChild })}
          />
        </View>
      </SafeAreaView>
    );
  }

  const overallGrade = evalRank?.overallGrade || '—';
  const skills = mapSkills(evalRank);
  const todayWorkout = blueprint?.todayWorkout?.title;
  const daysCompleted = blueprint?.weekProgress ?? 0;
  const trend = mapSessionTrend(activities);
  const courtHours = mapCourtHours(activities);
  const adherence = computeAdherence(child.profile, activities);
  const chartWidth = Dimensions.get('window').width - SHAPE.screenPadding * 2 - 28;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {header}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Identity row: avatar · name/meta · EvalRank grade */}
        <Entrance variant="up" delay={0}>
          <View style={styles.identityRow}>
            <Avatar initials={initialsOf(child.name)} size={56} tone="accent" />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={[styles.childName, { color: theme.text }]}>
                {child.name}
              </Text>
              <Text style={[styles.childMeta, { color: theme.textDim }]}>
                {[child.position, `Level ${child.level}`, '4-week window'].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.gradeBlock}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('EvalRank')}
            >
              <Text style={[styles.gradeValue, { color: theme.text }]}>{overallGrade}</Text>
              <Text style={[styles.gradeCaption, { color: theme.textDim }]}>EVALRANK</Text>
            </TouchableOpacity>
          </View>
        </Entrance>

        {/* Sessions logged — 4-week sparkline */}
        <Entrance variant="cardIn" delay={80}>
          <View style={[styles.trendCard, { backgroundColor: theme.surface }]}>
            <View style={styles.trendHeader}>
              <Text style={[TYPE.sectionLabel, { color: theme.textDim }]}>Sessions logged</Text>
              {trend.delta !== null ? (
                <Text
                  style={[
                    styles.trendDelta,
                    { color: trend.delta < 0 ? theme.accentText : theme.steel },
                  ]}
                >
                  {trend.delta < 0 ? '↓' : '↑'} {Math.abs(trend.delta)}% vs prior
                </Text>
              ) : null}
            </View>
            <Sparkline
              data={trend.counts}
              width={chartWidth}
              height={72}
              color={theme.primary}
              strokeWidth={2.6}
              style={{ marginTop: 10 }}
            />
            <View style={styles.weekLabels}>
              {['W1', 'W2', 'W3', 'W4'].map((w) => (
                <Text key={w} style={[styles.weekLabel, { color: theme.textDim }]}>
                  {w}
                </Text>
              ))}
            </View>
          </View>
        </Entrance>

        {/* Stat tiles */}
        <Entrance variant="cardIn" delay={160}>
          <View style={styles.statRow}>
            <StatCell value={trend.current} label="WORKOUTS" theme={theme} />
            <StatCell value={courtHours || '—'} label="ON COURT" theme={theme} />
            <StatCell value={`${adherence}%`} label="ADHERENCE" accent={adherence < 50} theme={theme} />
          </View>
        </Entrance>

        {/* Skill breakdown */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel action="Full evaluation" onAction={() => navigation.navigate('EvalRank')}>
            Skill breakdown
          </SectionLabel>
          {skills.length > 0 ? (
            skills.slice(0, 5).map((s, i) => (
              <SkillBar key={s.label} skill={s} theme={theme} delay={100 + i * 100} />
            ))
          ) : (
            <EmptyHint
              text="No skill evaluation yet. An EvalRank assessment unlocks this section."
              theme={theme}
            />
          )}
        </View>

        {/* Blueprint360 plan */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel>Blueprint360™ plan</SectionLabel>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            {blueprint ? (
              <>
                <View style={styles.planRow}>
                  <View style={[styles.planIcon, { backgroundColor: theme.badgeFill }]}>
                    <Ionicons name="map-outline" size={18} color={theme.accentText} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[TYPE.rowMeta, { color: theme.textDim, marginTop: 0 }]}>Today's focus</Text>
                    <Text numberOfLines={1} style={[TYPE.rowTitle, { color: theme.text, marginTop: 2 }]}>
                      {todayWorkout || 'Rest day'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
                <View style={styles.weekRow}>
                  <Text style={[TYPE.rowMeta, { color: theme.textDim, marginTop: 0 }]}>This week</Text>
                  <View style={styles.dots}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          { backgroundColor: i < daysCompleted ? theme.primary : theme.track },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.weekCount, { color: theme.accentText }]}>{daysCompleted}/5</Text>
                </View>
              </>
            ) : (
              <EmptyHint text="No active training plan yet." theme={theme} />
            )}
          </View>
        </View>

        {/* Recent milestones */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel>Recent milestones</SectionLabel>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            {milestones.length > 0 ? (
              milestones.map((m, i) => (
                <View key={m.id}>
                  <View style={styles.milestoneRow}>
                    <View style={[styles.milestoneIcon, { backgroundColor: theme.steelFill }]}>
                      <Ionicons name="checkmark" size={15} color={theme.steel} />
                    </View>
                    <Text numberOfLines={1} style={[TYPE.rowTitle, { color: theme.text, flex: 1 }]}>
                      {m.label}
                    </Text>
                    <Text style={[TYPE.rowMeta, { color: theme.textDim, marginTop: 0 }]}>{m.date}</Text>
                  </View>
                  {i < milestones.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
                  )}
                </View>
              ))
            ) : (
              <EmptyHint text="No milestones earned yet." theme={theme} />
            )}
          </View>
        </View>

        {/* Message coach CTA */}
        <PrimaryButton
          label="Message Coach"
          icon="chatbubble-outline"
          onPress={() => navigation.navigate('Messaging')}
          style={{ marginTop: SHAPE.sectionGap }}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center' },
  scroll: { paddingHorizontal: SHAPE.screenPadding, paddingTop: 14 },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  childName: { fontFamily: FONTS.heading, fontSize: 19, lineHeight: 21 },
  childMeta: { fontFamily: FONTS.bodyMedium, fontSize: 11.5, marginTop: 4 },
  gradeBlock: { alignItems: 'flex-end' },
  gradeValue: { fontFamily: FONTS.heading, fontSize: 26, lineHeight: 26 },
  gradeCaption: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9.5,
    letterSpacing: 1,
    marginTop: 2,
  },

  trendCard: { marginTop: 16, borderRadius: 20, padding: 14 },
  trendHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  trendDelta: { fontFamily: FONTS.bodyBold, fontSize: 11 },
  weekLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  weekLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 9.5 },

  statRow: { flexDirection: 'row', gap: SHAPE.cardGap, marginTop: 16 },
  statCell: { flex: 1, borderRadius: SHAPE.radiusCard, padding: SHAPE.cardPadding },
  statCellLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9.5,
    letterSpacing: 1,
    marginTop: 5,
  },

  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  skillLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 11.5, width: 86 },
  skillValue: { fontFamily: FONTS.bodyBold, fontSize: 11, width: 32, textAlign: 'right' },

  card: { borderRadius: SHAPE.radiusCard, padding: 13 },
  divider: { height: 1, marginVertical: 10 },

  planRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  weekCount: { fontFamily: FONTS.bodyBold, fontSize: 12 },

  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  milestoneIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
