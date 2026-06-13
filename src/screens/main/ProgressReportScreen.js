// ProgressReportScreen.js - Parent view of linked child's EvalRank + Blueprint360 progress
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const MOCK_SKILLS = [
  { label: 'Shooting', pct: 72, grade: 'B+' },
  { label: 'Dribbling', pct: 65, grade: 'B' },
  { label: 'Defense', pct: 54, grade: 'C+' },
  { label: 'Basketball IQ', pct: 78, grade: 'B+' },
  { label: 'Athleticism', pct: 81, grade: 'A-' },
];

const MOCK_MILESTONES = [
  { id: 'm1', label: '5-Day Training Streak', date: 'Jun 10', done: true },
  { id: 'm2', label: 'First EvalRank Assessment', date: 'Jun 6', done: true },
  { id: 'm3', label: 'Blueprint360 Plan Started', date: 'Jun 1', done: true },
  { id: 'm4', label: 'ShotDNA Archetype Unlocked', date: 'Upcoming', done: false },
];

function SkillBar({ skill, theme }) {
  const gradeColor =
    skill.pct >= 80 ? '#22C55E' :
    skill.pct >= 65 ? theme.primary :
    '#F59E0B';

  return (
    <View style={styles.skillRow}>
      <View style={styles.skillLabelRow}>
        <Text style={[styles.skillLabel, { color: theme.text }]}>{skill.label}</Text>
        <View style={styles.skillRightRow}>
          <Text style={[styles.skillPct, { color: gradeColor }]}>{skill.pct}%</Text>
          <View style={[styles.gradePill, { backgroundColor: gradeColor + '18' }]}>
            <Text style={[styles.gradeText, { color: gradeColor }]}>{skill.grade}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.skillTrack, { backgroundColor: theme.border }]}>
        <View style={[styles.skillFill, { width: `${skill.pct}%`, backgroundColor: gradeColor }]} />
      </View>
    </View>
  );
}

export default function ProgressReportScreen({ navigation }) {
  const { userData, theme, isDarkMode, evalRankScore, blueprint360Plan } = useAppContext();

  const childName = userData?.linkedChildName || 'Your Child';
  const overallGrade = evalRankScore?.overallGrade || 'B+';
  const gradeColor = overallGrade.startsWith('A') ? '#22C55E' : overallGrade.startsWith('B') ? theme.primary : '#F59E0B';

  const skillGrades = evalRankScore?.skillGrades;
  const skills = skillGrades
    ? Object.entries(skillGrades).map(([label, grade]) => ({
        label,
        grade,
        pct: grade.startsWith('A') ? 85 : grade.startsWith('B') ? 72 : 54,
      }))
    : MOCK_SKILLS;

  const todayWorkout = blueprint360Plan?.todayWorkout?.title || 'Shooting Form Fundamentals';
  const daysCompleted = blueprint360Plan?.weekProgress || 3;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Progress Report</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{childName}</Text>
        </View>
        <TouchableOpacity
          style={[styles.messageBtn, { backgroundColor: theme.primary + '18' }]}
          onPress={() => navigation.navigate('Messaging')}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

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
                Based on latest evaluation across all skill areas
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('EvalRank')}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewLink, { color: theme.primary }]}>View Full Evaluation →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Skill Breakdown */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Skill Breakdown</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {skills.slice(0, 5).map((s) => (
            <SkillBar key={s.label} skill={s} theme={theme} />
          ))}
        </View>

        {/* Blueprint360 Summary */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Blueprint360™ Plan</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.planRow}>
            <View style={[styles.planIcon, { backgroundColor: '#22C55E18' }]}>
              <Ionicons name="map-outline" size={20} color="#22C55E" />
            </View>
            <View style={styles.planInfo}>
              <Text style={[styles.planLabel, { color: theme.text }]}>Today's Focus</Text>
              <Text style={[styles.planTitle, { color: theme.primary }]}>{todayWorkout}</Text>
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
        </View>

        {/* Recent Milestones */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Milestones</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {MOCK_MILESTONES.map((m, i) => (
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
              {i < MOCK_MILESTONES.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
            </View>
          ))}
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
});
