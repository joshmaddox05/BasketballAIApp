// AssignWorkoutScreen.js - Coach assigns a workout or SimCoach scenario to a
// linked athlete (13e redesign). Presentation only: the selection model stays
// single-athlete because assignToAthlete() writes one assignment per call.
import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import { getLinkedPlayers, assignToAthlete } from '../../services/firestoreService';
import { comprehensiveWorkouts } from '../../data/workouts';
import { SIM_COACH_SCENARIO_LIST } from '../../data/simCoachScenarios';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import {
  Entrance,
  Shimmer,
  ScreenHeader,
  SectionLabel,
  Avatar,
  EmptyState,
  LoadingState,
} from '../../components/dbe';

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

/** Checkbox square: filled burgundy with a check when selected, hairline when not. */
function CheckBox({ checked, theme }) {
  return (
    <View
      style={[
        styles.checkbox,
        checked
          ? { backgroundColor: theme.primary }
          : { borderWidth: 1.5, borderColor: theme.hairline },
      ]}
    >
      {checked ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
    </View>
  );
}

function SelectRow({ checked, theme, delay, onPress, leading, title, meta }) {
  return (
    <Entrance variant="cellIn" delay={delay}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          styles.selectRow,
          checked
            ? { backgroundColor: theme.attentionFill, borderWidth: 1, borderColor: theme.attentionBorder }
            : { borderWidth: 1, borderColor: 'transparent' },
        ]}
      >
        <CheckBox checked={checked} theme={theme} />
        {leading}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={[styles.selectTitle, { color: theme.text }]}>
            {title}
          </Text>
          {meta ? (
            <Text numberOfLines={1} style={[styles.selectMeta, { color: theme.textDim }]}>
              {meta}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </Entrance>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function AssignWorkoutScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const coachUid = user?.uid;
  const coachName = userData?.displayName || userData?.name || 'Coach';

  // A specific athlete may be passed in (from a roster row); otherwise pick one.
  const preAthlete = route.params?.athlete || null;

  const [athletes, setAthletes] = useState(preAthlete ? [preAthlete] : []);
  const [loadingRoster, setLoadingRoster] = useState(!preAthlete);
  const [selectedAthleteUid, setSelectedAthleteUid] = useState(preAthlete?.uid || null);
  const [assignType, setAssignType] = useState('workout'); // 'workout' | 'scenario'
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preAthlete || !coachUid) return;
    (async () => {
      setLoadingRoster(true);
      const linked = await getLinkedPlayers(coachUid);
      setAthletes(linked);
      if (linked.length === 1) setSelectedAthleteUid(linked[0].uid);
      setLoadingRoster(false);
    })();
  }, [coachUid, preAthlete]);

  const items =
    assignType === 'workout'
      ? comprehensiveWorkouts.map((w) => ({
          id: w.id,
          title: w.title,
          meta: w.category || w.difficulty,
          // Hero facts (13e): duration · drill count · level, all from the local library.
          facts: [w.duration, w.steps?.length ? `${w.steps.length} drills` : null, w.level].filter(Boolean),
        }))
      : SIM_COACH_SCENARIO_LIST.map((s) => ({
          id: s.id,
          title: s.title,
          meta: `${s.category} · ${s.steps} steps`,
          facts: [s.category, `${s.steps} steps`].filter(Boolean),
        }));

  const chosen = items.find((i) => i.id === selectedItemId) || null;
  const canSubmit = selectedAthleteUid && selectedItemId && !submitting;

  const handleAssign = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const picked = items.find((i) => i.id === selectedItemId);
      const athlete = athletes.find((a) => a.uid === selectedAthleteUid);
      await assignToAthlete(
        selectedAthleteUid,
        { uid: coachUid, displayName: coachName },
        {
          type: assignType,
          title: picked?.title || (assignType === 'workout' ? 'Workout' : 'Scenario'),
          refId: selectedItemId,
          note: note.trim(),
        }
      );
      Alert.alert(
        'Assigned',
        `Sent "${picked?.title}" to ${athlete?.name || 'your athlete'}.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', 'Could not assign. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, items, athletes, selectedItemId, selectedAthleteUid, assignType, note, coachUid, coachName, navigation]);

  const athleteName = athletes.find((a) => a.uid === selectedAthleteUid)?.name;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScreenHeader title="Assign Workout" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Selected item hero */}
        <Entrance variant="cardIn">
          {chosen ? (
            <LinearGradient
              colors={theme.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroLabel}>
                {assignType === 'workout' ? 'SELECTED WORKOUT' : 'SELECTED SCENARIO'}
              </Text>
              <Text numberOfLines={2} style={styles.heroTitle}>
                {chosen.title}
              </Text>
              <View style={styles.heroFacts}>
                {chosen.facts.map((f) => (
                  <Text key={f} style={styles.heroFact}>
                    {f}
                  </Text>
                ))}
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.hero, { backgroundColor: theme.surface }]}>
              <Text style={[styles.heroLabel, { color: theme.textDim }]}>
                {assignType === 'workout' ? 'SELECTED WORKOUT' : 'SELECTED SCENARIO'}
              </Text>
              <Text style={[styles.heroTitle, { color: theme.textMuted }]}>Nothing picked yet</Text>
              <View style={styles.heroFacts}>
                <Text style={[styles.heroFact, { color: theme.textDim }]}>
                  Choose one below
                </Text>
              </View>
            </View>
          )}
        </Entrance>

        {/* Type toggle */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel>What to assign</SectionLabel>
          <View style={styles.typeRow}>
            {[
              { id: 'workout', label: 'Workout', icon: 'barbell-outline' },
              { id: 'scenario', label: 'IQ Scenario', icon: 'bulb-outline' },
            ].map((t) => {
              const active = assignType === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    setAssignType(t.id);
                    setSelectedItemId(null);
                  }}
                  style={[
                    styles.typeChip,
                    active
                      ? { backgroundColor: theme.primary }
                      : { backgroundColor: theme.surface },
                  ]}
                >
                  <Ionicons name={t.icon} size={16} color={active ? '#FFFFFF' : theme.steel} />
                  <Text
                    style={[styles.typeChipText, { color: active ? '#FFFFFF' : theme.textMuted }]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Athlete picker */}
        {!preAthlete && (
          <View style={{ marginTop: SHAPE.sectionGap }}>
            <SectionLabel action={selectedAthleteUid ? '1 selected' : undefined}>
              Assign to
            </SectionLabel>
            {loadingRoster ? (
              <LoadingState style={styles.inlineLoading} />
            ) : athletes.length === 0 ? (
              <EmptyState
                icon="person-add-outline"
                title="No linked athletes"
                sub="Add an athlete with their invite code before assigning work."
                ctaLabel="Add athlete"
                onPress={() => navigation.navigate('LinkAccount')}
              />
            ) : (
              athletes.map((a, i) => (
                <SelectRow
                  key={a.uid}
                  checked={selectedAthleteUid === a.uid}
                  theme={theme}
                  delay={50 + i * 80}
                  onPress={() => setSelectedAthleteUid(a.uid)}
                  leading={
                    <Avatar
                      initials={initialsOf(a.name)}
                      size={30}
                      tone={selectedAthleteUid === a.uid ? 'accent' : 'steel'}
                    />
                  }
                  title={a.name || 'Athlete'}
                  meta={[a.position, typeof a.level === 'number' ? `Level ${a.level}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))
            )}
          </View>
        )}

        {/* Item picker */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel>{assignType === 'workout' ? 'Workouts' : 'Scenarios'}</SectionLabel>
          {items.map((item, i) => (
            <SelectRow
              key={item.id}
              checked={selectedItemId === item.id}
              theme={theme}
              delay={50 + Math.min(i, 8) * 60}
              onPress={() => setSelectedItemId(item.id)}
              title={item.title}
              meta={item.meta}
            />
          ))}
        </View>

        {/* Note */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel>Note (optional)</SectionLabel>
          <TextInput
            style={[styles.noteInput, { backgroundColor: theme.surface, color: theme.text }]}
            value={note}
            onChangeText={setNote}
            placeholder="Add a message for your athlete…"
            placeholderTextColor={theme.textDim}
            multiline
            maxLength={200}
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.hairline, backgroundColor: theme.background }]}>
        <TouchableOpacity
          onPress={handleAssign}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={[
            styles.assignBtn,
            { backgroundColor: canSubmit ? theme.primary : theme.buttonDisabled || theme.surface },
          ]}
        >
          {canSubmit ? <Shimmer color="rgba(255,255,255,0.22)" bandWidth={60} duration={3200} /> : null}
          <Text
            style={[
              styles.assignBtnText,
              { color: canSubmit ? '#FFFFFF' : theme.textDim },
            ]}
          >
            {submitting
              ? 'Assigning…'
              : athleteName
              ? `Assign to ${athleteName.split(' ')[0]}`
              : 'Assign'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={canSubmit ? '#FFFFFF' : theme.textDim}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: SHAPE.screenPadding, paddingTop: 10 },
  inlineLoading: { flex: 0, paddingVertical: 24 },

  // Hero
  hero: { borderRadius: SHAPE.radiusHero, padding: 15, overflow: 'hidden' },
  heroLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.65)',
  },
  heroTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    lineHeight: 21,
    color: '#FFFFFF',
    marginTop: 5,
  },
  heroFacts: { flexDirection: 'row', gap: 14, marginTop: 9 },
  heroFact: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },

  // Type toggle
  typeRow: { flexDirection: 'row', gap: SHAPE.cardGap },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: SHAPE.radiusTile,
  },
  typeChipText: { fontFamily: FONTS.bodyBold, fontSize: 12.5 },

  // Select rows
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: SHAPE.radiusTile,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectTitle: { fontFamily: FONTS.bodyBold, fontSize: 12.5 },
  selectMeta: { fontFamily: FONTS.body, fontSize: 10.5, marginTop: 2 },

  noteInput: {
    borderRadius: SHAPE.radiusTile,
    padding: 12,
    fontFamily: FONTS.body,
    fontSize: 13,
    minHeight: 72,
    textAlignVertical: 'top',
  },

  footer: { paddingHorizontal: SHAPE.screenPadding, paddingVertical: 12, borderTopWidth: 1 },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: SHAPE.radiusTile,
    overflow: 'hidden',
  },
  assignBtnText: { fontFamily: FONTS.bodyExtraBold, fontSize: 14.5 },
});
