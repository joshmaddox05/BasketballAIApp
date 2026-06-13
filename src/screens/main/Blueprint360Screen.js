import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

const DAYS = ['M', 'T', 'W', 'T', 'F'];

export default function Blueprint360Screen({ navigation }) {
  const { theme, isDarkMode, userData, blueprint360Plan, evalRankScore } = useAppContext();
  const subscription = userData?.subscription || 'free';
  const hasAccess = canAccessFeature('blueprint360', subscription);

  const todayWorkout = blueprint360Plan?.todayWorkout || { title: 'Shooting Form Fundamentals', category: 'Shooting', duration: 30 };
  const daysCompleted = blueprint360Plan?.weekProgress || 2;
  const monthlyObjective = blueprint360Plan?.monthlyObjective || 'Improve shooting accuracy from 65% to 75% and build a 5-day training streak';

  const weaknessAlerts = [];
  if (evalRankScore?.skillGrades) {
    Object.entries(evalRankScore.skillGrades).forEach(([k, v]) => {
      if (v === 'C' || v === 'D' || v === 'C+') weaknessAlerts.push({ skill: k, grade: v });
    });
  }
  if (weaknessAlerts.length === 0) {
    weaknessAlerts.push({ skill: 'Defense', grade: 'C+' }, { skill: 'Basketball IQ', grade: 'B-' });
  }

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Blueprint360™</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.lockCenter}>
          <Ionicons name="lock-closed" size={48} color={theme.textSecondary} />
          <Text style={[styles.lockTitle, { color: theme.text }]}>Blueprint360™</Text>
          <Text style={[styles.lockSubtitle, { color: theme.textSecondary }]}>Upgrade to Basic to unlock your personalized development plan.</Text>
          <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('Subscription')}>
            <Text style={styles.upgradeBtnText}>Upgrade to Basic</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Blueprint360™</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Your Development Plan</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Today's Focus */}
        <View style={[styles.todayCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.todayLabel}>TODAY'S FOCUS</Text>
          <Text style={styles.todayTitle}>{todayWorkout.title}</Text>
          <View style={styles.todayMeta}>
            <View style={styles.todayChip}>
              <Text style={styles.todayChipText}>{todayWorkout.category}</Text>
            </View>
            <View style={styles.todayChip}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.todayChipText}>{todayWorkout.duration} min</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => navigation.navigate('WorkoutDetail', { workout: todayWorkout })}
            activeOpacity={0.85}
          >
            <Text style={[styles.startBtnText, { color: theme.primary }]}>Start Now</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Week Progress */}
        <View style={[styles.weekCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>This Week</Text>
          <View style={styles.daysRow}>
            {DAYS.map((d, i) => (
              <View key={i} style={[styles.dayDot, { backgroundColor: i < daysCompleted ? theme.primary : theme.border }]}>
                <Text style={[styles.dayLabel, { color: i < daysCompleted ? '#fff' : theme.textSecondary }]}>{d}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.weekNote, { color: theme.textSecondary }]}>{daysCompleted}/5 training days completed</Text>
        </View>

        {/* Monthly Objective */}
        <View style={[styles.objectiveCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.objectiveHeader}>
            <Ionicons name="flag-outline" size={18} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Monthly Objective</Text>
          </View>
          <Text style={[styles.objectiveText, { color: theme.textSecondary }]}>{monthlyObjective}</Text>
        </View>

        {/* Weakness Alerts */}
        {weaknessAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Weakness Alerts</Text>
            {weaknessAlerts.slice(0, 2).map((w, i) => (
              <View key={i} style={[styles.alertCard, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B40' }]}>
                <Ionicons name="warning-outline" size={18} color="#F59E0B" />
                <View style={styles.alertInfo}>
                  <Text style={[styles.alertSkill, { color: theme.text }]}>{w.skill}</Text>
                  <Text style={[styles.alertGrade, { color: '#F59E0B' }]}>Grade: {w.grade} — Needs work</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('EvalRankDetail')}>
                  <Text style={{ color: theme.primary, fontSize: 12 }}>View</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('Blueprint360PlanDetail')}>
          <Text style={styles.primaryBtnText}>View Full Plan</Text>
          <Ionicons name="calendar-outline" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.primary }]} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={16} color={theme.primary} />
          <Text style={[styles.outlineBtnText, { color: theme.primary }]}>Regenerate Plan</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  scroll: { padding: 16, gap: 16 },
  lockCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  lockTitle: { fontSize: 22, fontWeight: '700' },
  lockSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  upgradeBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  todayCard: { borderRadius: 20, padding: 20 },
  todayLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  todayTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  todayMeta: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  todayChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  todayChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start' },
  startBtnText: { fontSize: 14, fontWeight: '700' },
  weekCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  daysRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  dayDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontSize: 13, fontWeight: '700' },
  weekNote: { fontSize: 12 },
  objectiveCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  objectiveHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  objectiveText: { fontSize: 14, lineHeight: 20 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  alertInfo: { flex: 1 },
  alertSkill: { fontSize: 14, fontWeight: '600' },
  alertGrade: { fontSize: 12, marginTop: 2 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  outlineBtnText: { fontSize: 15, fontWeight: '600' },
});
