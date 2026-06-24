// ProgressReportScreen.js - Parent view of the linked child's EvalRank + Blueprint360 progress
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getLinkedPlayers, getLinkedPlayerSummary } from '../../services/firestoreService';

// ─────────────────────────────────────────────────────────────────────────────
// Data mapping helpers (Firestore docs -> presentational shapes)
// ─────────────────────────────────────────────────────────────────────────────

const gradeColorFor = (grade, theme) => {
  const g = (grade || '').toUpperCase();
  if (g.startsWith('A')) return '#22C55E';
  if (g.startsWith('B')) return theme.primary;
  if (g.startsWith('C')) return '#F59E0B';
  if (g.startsWith('D')) return '#EF4444';
  return theme.textSecondary;
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

function SkillBar({ skill, theme }) {
  const color = gradeColorFor(skill.grade, theme);
  return (
    <View style={styles.skillRow}>
      <View style={styles.skillLabelRow}>
        <Text style={[styles.skillLabel, { color: theme.text }]}>{skill.label}</Text>
        <View style={styles.skillRightRow}>
          <Text style={[styles.skillPct, { color }]}>{skill.pct}%</Text>
          <View style={[styles.gradePill, { backgroundColor: color + '18' }]}>
            <Text style={[styles.gradeText, { color }]}>{skill.grade}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.skillTrack, { backgroundColor: theme.border }]}>
        <View style={[styles.skillFill, { width: `${skill.pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function EmptyHint({ text, theme }) {
  return <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>{text}</Text>;
}

export default function ProgressReportScreen({ navigation }) {
  const { user, theme, isDarkMode } = useAppContext();
  const parentUid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState(null);
  const [evalRank, setEvalRank] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [milestones, setMilestones] = useState([]);

  const loadChild = useCallback(async () => {
    if (!parentUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const linkedPlayers = await getLinkedPlayers(parentUid);
      const linked = linkedPlayers[0];
      if (!linked) {
        setChild(null);
        return;
      }
      const summary = await getLinkedPlayerSummary(linked.uid);
      setChild({ name: summary.profile?.displayName || linked.name || 'Your Child' });
      setEvalRank(summary.evalRank);
      setBlueprint(summary.blueprint);
      setMilestones(mapMilestones(summary.achievements));
    } finally {
      setLoading(false);
    }
  }, [parentUid]);

  useFocusEffect(
    useCallback(() => {
      loadChild();
    }, [loadChild])
  );

  const renderHeader = (subtitle) => (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <View>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Progress Report</Text>
        {subtitle ? <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      <TouchableOpacity
        style={[styles.messageBtn, { backgroundColor: theme.primary + '18' }]}
        onPress={() => navigation.navigate('Messaging')}
        activeOpacity={0.7}
      >
        <Ionicons name="chatbubble-outline" size={20} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Empty state — no linked child
  if (!child) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {renderHeader()}
        <View style={styles.centered}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.primary + '18' }]}>
            <Ionicons name="people-outline" size={36} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Link your child</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Connect to your child's account with their invite code to follow their training and progress.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('LinkAccount', { onLinked: loadChild })}
            activeOpacity={0.85}
          >
            <Ionicons name="link" size={18} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Link Your Child</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const overallGrade = evalRank?.overallGrade || '--';
  const gradeColor = gradeColorFor(overallGrade, theme);
  const skills = mapSkills(evalRank);
  const todayWorkout = blueprint?.todayWorkout?.title;
  const daysCompleted = blueprint?.weekProgress ?? 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {renderHeader(child.name)}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Overall EvalRank Grade */}
        <View style={[styles.gradeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.gradeCardInner}>
            <View style={[styles.gradeCircle, { borderColor: gradeColor, backgroundColor: gradeColor + '12' }]}>
              <Text style={[styles.gradeValue, { color: gradeColor }]}>{overallGrade}</Text>
              <Text style={[styles.gradeSubLabel, { color: gradeColor }]}>EvalRank</Text>
            </View>
            <View style={styles.gradeInfo}>
              <Text style={[styles.gradeTitle, { color: theme.text }]}>Overall Grade</Text>
              <Text style={[styles.gradeDesc, { color: theme.textSecondary }]}>
                {evalRank
                  ? 'Based on latest evaluation across all skill areas'
                  : 'No evaluation completed yet'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('EvalRank')} activeOpacity={0.7}>
                <Text style={[styles.viewLink, { color: theme.primary }]}>View Full Evaluation →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Skill Breakdown */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Skill Breakdown</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {skills.length > 0 ? (
            skills.slice(0, 5).map((s) => <SkillBar key={s.label} skill={s} theme={theme} />)
          ) : (
            <EmptyHint text="No skill evaluation yet. Encourage your child to complete an EvalRank assessment." theme={theme} />
          )}
        </View>

        {/* Blueprint360 Summary */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Blueprint360™ Plan</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {blueprint ? (
            <>
              <View style={styles.planRow}>
                <View style={[styles.planIcon, { backgroundColor: '#22C55E18' }]}>
                  <Ionicons name="map-outline" size={20} color="#22C55E" />
                </View>
                <View style={styles.planInfo}>
                  <Text style={[styles.planLabel, { color: theme.text }]}>Today's Focus</Text>
                  <Text style={[styles.planTitle, { color: theme.primary }]}>
                    {todayWorkout || 'Rest day'}
                  </Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.weekRow}>
                <Text style={[styles.weekLabel, { color: theme.textSecondary }]}>This Week</Text>
                <View style={styles.dots}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[styles.dot, { backgroundColor: i < daysCompleted ? theme.primary : theme.border }]}
                    />
                  ))}
                </View>
                <Text style={[styles.weekCount, { color: theme.primary }]}>{daysCompleted}/5 days</Text>
              </View>
            </>
          ) : (
            <EmptyHint text="No active training plan yet." theme={theme} />
          )}
        </View>

        {/* Recent Milestones */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Milestones</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {milestones.length > 0 ? (
            milestones.map((m, i) => (
              <View key={m.id}>
                <View style={styles.milestoneRow}>
                  <View style={[styles.milestoneDot, { backgroundColor: m.done ? '#22C55E18' : theme.border + '40' }]}>
                    <Ionicons name={m.done ? 'checkmark-circle' : 'time-outline'} size={18} color={m.done ? '#22C55E' : theme.textSecondary} />
                  </View>
                  <View style={styles.milestoneInfo}>
                    <Text style={[styles.milestoneLabel, { color: m.done ? theme.text : theme.textSecondary }]}>
                      {m.label}
                    </Text>
                    <Text style={[styles.milestoneDate, { color: theme.textSecondary }]}>{m.date}</Text>
                  </View>
                </View>
                {i < milestones.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              </View>
            ))
          ) : (
            <EmptyHint text="No milestones earned yet." theme={theme} />
          )}
        </View>

        {/* Message Coach CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('Messaging')}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          <Text style={styles.ctaBtnText}>Message Coach</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  messageBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 16, gap: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 16 },

  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 4 },
  divider: { height: 1, marginVertical: 10 },

  emptyHint: { fontSize: 13, lineHeight: 19 },

  gradeCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 4 },
  gradeCardInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  gradeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeValue: { fontSize: 26, fontWeight: '900', lineHeight: 30 },
  gradeSubLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  gradeInfo: { flex: 1 },
  gradeTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  gradeDesc: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  viewLink: { fontSize: 13, fontWeight: '600' },

  skillRow: { marginBottom: 12 },
  skillLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  skillLabel: { fontSize: 14, fontWeight: '600' },
  skillRightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillPct: { fontSize: 13, fontWeight: '700' },
  gradePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  gradeText: { fontSize: 11, fontWeight: '700' },
  skillTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  skillFill: { height: 7, borderRadius: 4 },

  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  planIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  planInfo: { flex: 1 },
  planLabel: { fontSize: 12, fontWeight: '600' },
  planTitle: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekLabel: { fontSize: 12 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  weekCount: { fontSize: 12, fontWeight: '700' },

  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  milestoneDot: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  milestoneInfo: { flex: 1 },
  milestoneLabel: { fontSize: 14, fontWeight: '600' },
  milestoneDate: { fontSize: 11, marginTop: 2 },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Loading / empty states
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
