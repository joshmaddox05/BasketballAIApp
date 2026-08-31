// ArchetypeSelectScreen.js — derive an archetype, explain the reasoning, let the
// player confirm or override.
//
// The archetype is the entry point of the whole engine: it sets the green/yellow/red
// shot menu, the drill volume Blueprint360 allocates, and the progression gate
// EvalRank checks. Nothing downstream can be computed until it exists.
//
// The engine proposes and the player decides. A confirmed archetype is never
// silently overwritten by a later derivation — it is a decision, not a guess.
import React, { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { updateUserProfile } from '../../services/firestoreService';
import { recomputeEvalRank } from '../../services/evalRankService';
import { generateAndSavePlan } from '../../services/blueprint360Service';
import { deriveArchetype, describeArchetype } from '../../services/blueprint/archetypeAssignment';
import { ALL_ARCHETYPE_IDS } from '../../services/blueprint/archetypes';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import logger from '../../utils/logger';
import {
  ScreenHeader,
  SectionLabel,
  Entrance,
  PrimaryButton,
  OutlineButton,
  useToast,
} from '../../components/dbe';

const CONFIDENCE_COPY = {
  none: 'No profile data yet — this is a starting point, not a verdict',
  low: 'Low confidence — based on one signal',
  medium: 'Moderate confidence — a few signals agree',
  high: 'High confidence — profile and measured data agree',
};

const PERMISSION_TONE = {
  green: { label: 'Green — expected', key: 'green' },
  yellow: { label: 'Yellow — situational', key: 'yellow' },
  red: { label: 'Red — prohibited', key: 'red' },
};

// Shot-type ids are the engine's vocabulary; these are the player-facing names.
const SHOT_LABELS = {
  catchAndShoot: 'Catch & shoot',
  cornerThree: 'Corner three',
  spotUpThree: 'Spot-up three',
  relocationThree: 'Relocation three',
  offScreen: 'Off-screen',
  curl: 'Curl',
  oneDribblePullup: 'One-dribble pull-up',
  pullupMid: 'Mid-range pull-up',
  stepBack: 'Step-back',
  isoPullup: 'Iso pull-up',
  pnrPullup: 'Pick-and-roll pull-up',
  drivingLayup: 'Driving layup',
  paintFinish: 'Paint finish',
  rollFinish: 'Roll finish',
  postUp: 'Post-up',
  closeoutAttack: 'Closeout attack',
};

const shotName = (id) => SHOT_LABELS[id] || id;

function ShotMenuRow({ tone, shots, theme }) {
  if (!shots?.length) return null;
  const fill =
    tone === 'green' ? theme.badgeFill : tone === 'yellow' ? theme.steelFill : theme.track;
  const text = tone === 'green' ? theme.accentText : tone === 'yellow' ? theme.steel : theme.textDim;

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 10.5, color: text }}>
        {PERMISSION_TONE[tone].label}
      </Text>
      <View style={styles.chipWrap}>
        {shots.map((s) => (
          <View
            key={s}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: SHAPE.radiusBadge,
              backgroundColor: fill,
            }}
          >
            <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 10.5, color: text }}>
              {shotName(s)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ArchetypeCard({ archetypeId, selected, recommended, reasons, onSelect, theme, delay }) {
  const d = describeArchetype(archetypeId);
  if (!d) return null;

  return (
    <Entrance variant="cellIn" delay={delay}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onSelect(archetypeId)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={{
          borderRadius: SHAPE.radiusTile,
          backgroundColor: theme.surface,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? theme.primary : theme.hairline,
          padding: 14,
        }}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[TYPE.rowTitle, { color: theme.text }]}>{d.label}</Text>
            <Text style={[TYPE.statCaption, { color: theme.textMuted, marginTop: 3 }]}>
              {d.description}
            </Text>
          </View>
          <Ionicons
            name={selected ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={selected ? theme.primary : theme.textDim}
          />
        </View>

        {recommended ? (
          <View style={[styles.recommendedPill, { backgroundColor: theme.badgeFill }]}>
            <Ionicons name="sparkles-outline" size={11} color={theme.accentText} />
            <Text style={[TYPE.chip, { color: theme.accentText }]}>Recommended</Text>
          </View>
        ) : null}

        {reasons?.length ? (
          <View style={{ marginTop: 10, gap: 5 }}>
            {reasons.map((r, i) => (
              <View key={i} style={styles.reasonRow}>
                <Ionicons name="ellipse" size={5} color={theme.accentText} style={{ marginTop: 6 }} />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: FONTS.body,
                    fontSize: 11.5,
                    lineHeight: 16,
                    color: theme.textMuted,
                  }}
                >
                  {r}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {selected ? (
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: theme.hairline, paddingTop: 10 }}>
            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 11, color: theme.text }}>
              Must master: {d.coreSkills.map((s) => s.label).join(', ')}
            </Text>
            {d.restrictedSkills.length ? (
              <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 3 }]}>
                Trained minimally: {d.restrictedSkills.map((s) => s.label).join(', ')}
              </Text>
            ) : null}
            <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 3 }]}>
              Progression gate: {d.gate.metric} ≥ {d.gate.min}
            </Text>

            <Text
              style={{
                fontFamily: FONTS.bodySemiBold,
                fontSize: 11,
                color: theme.text,
                marginTop: 10,
              }}
            >
              Shot menu
            </Text>
            <ShotMenuRow tone="green" shots={d.shotMenu.green} theme={theme} />
            <ShotMenuRow tone="yellow" shots={d.shotMenu.yellow} theme={theme} />
            <ShotMenuRow tone="red" shots={d.shotMenu.red} theme={theme} />
          </View>
        ) : null}
      </TouchableOpacity>
    </Entrance>
  );
}

export default function ArchetypeSelectScreen({ navigation }) {
  const { userData, user, theme, isDarkMode, updateUserDataLocally, setEvalRankScore, setBlueprint360Plan } =
    useAppContext();
  const showToast = useToast();

  const derived = useMemo(
    () =>
      deriveArchetype({
        position: userData?.position,
        height: userData?.height,
        gradeLevel: userData?.gradeLevel,
        focusAreas: userData?.preferences?.focusAreas,
        selfReport: userData?.archetypeSelfReport || null,
      }),
    [userData]
  );

  const [selected, setSelected] = useState(userData?.archetypeId || derived.best.archetypeId);
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const reasonsById = useMemo(
    () => Object.fromEntries(derived.ranked.map((r) => [r.archetypeId, r.reasons])),
    [derived]
  );

  // When the top two are within a hair of each other, showing one "answer" would
  // overstate what the evidence supports — present both.
  const highlighted = derived.ambiguous && derived.runnerUp
    ? [derived.best.archetypeId, derived.runnerUp.archetypeId]
    : [derived.best.archetypeId];

  const visibleIds = showAll
    ? derived.ranked.map((r) => r.archetypeId)
    : highlighted;

  const handleConfirm = async () => {
    if (!user?.uid || saving || !selected) return;
    setSaving(true);

    const isOverride = selected !== derived.best.archetypeId;
    const update = {
      archetypeId: selected,
      archetypeLabel: describeArchetype(selected)?.label || selected,
      secondaryArchetypeId: derived.runnerUp?.archetypeId || null,
      archetypeSource: isOverride ? 'override' : 'confirmed',
      archetypeConfirmedAt: new Date().toISOString(),
      archetypeDerivation: {
        confidence: derived.confidence,
        reasons: derived.best.reasons,
        signalsUsed: derived.signalsUsed,
        engineVersion: 1,
      },
    };

    try {
      await updateUserProfile(user.uid, update);
      updateUserDataLocally(update);

      // The archetype changes shot menus and drill volume, so both derived artefacts
      // are stale the moment it changes. Recompute before the player sees them again.
      const { record } = await recomputeEvalRank(user.uid, { source: 'archetypeChange', force: true });
      if (record) setEvalRankScore(record);

      const plan = await generateAndSavePlan(user.uid, {
        profile: { ...userData, ...update },
        evalRecord: record,
        subscription: userData?.subscription || 'free',
        force: true,
      });
      if (plan) setBlueprint360Plan(plan);

      showToast('Archetype set — your plan has been rebuilt');
      navigation.goBack();
    } catch (error) {
      logger.error('Archetype confirm failed', error);
      showToast('Could not save your archetype right now');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title="Your Archetype"
        subtitle="What you are being developed into"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Entrance
          variant="cardIn"
          style={{
            borderRadius: SHAPE.radiusCard,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.hairline,
            padding: 14,
          }}
        >
          <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 12, color: theme.text }}>
            {derived.ambiguous ? 'Two archetypes fit you equally well' : 'Best match'}
          </Text>
          <Text style={[TYPE.statCaption, { color: theme.textMuted, marginTop: 4 }]}>
            {CONFIDENCE_COPY[derived.confidence]}
          </Text>

          {derived.needs.length ? (
            <View style={{ marginTop: 10, gap: 4 }}>
              {derived.needs.map((n) => (
                <Text key={n} style={[TYPE.statCaption, { color: theme.textDim }]}>
                  • {n}
                </Text>
              ))}
            </View>
          ) : null}

          {derived.signalsMissing.includes('position') || derived.signalsMissing.includes('height') ? (
            <OutlineButton
              icon="person-outline"
              label="Add position & height"
              onPress={() => navigation.navigate('EditProfile')}
              style={{ marginTop: 12 }}
            />
          ) : null}
        </Entrance>

        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel>{showAll ? 'All archetypes' : 'Suggested'}</SectionLabel>
          <View style={{ gap: 11 }}>
            {visibleIds.map((id, i) => (
              <ArchetypeCard
                key={id}
                archetypeId={id}
                selected={selected === id}
                recommended={id === derived.best.archetypeId}
                reasons={reasonsById[id]}
                onSelect={setSelected}
                theme={theme}
                delay={60 + i * 50}
              />
            ))}
          </View>
        </View>

        <OutlineButton
          icon={showAll ? 'chevron-up-outline' : 'list-outline'}
          label={showAll ? 'Show suggested only' : `Choose from all ${ALL_ARCHETYPE_IDS.length}`}
          onPress={() => setShowAll((v) => !v)}
          style={{ marginTop: SHAPE.cardGap }}
        />

        <PrimaryButton
          icon="checkmark-circle-outline"
          label={saving ? 'Saving…' : 'Confirm archetype'}
          disabled={saving || !selected}
          onPress={handleConfirm}
          style={{ marginTop: SHAPE.sectionGap }}
        />
        <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 8, textAlign: 'center' }]}>
          You can change this later. Changing it rebuilds your plan and re-scores your shot menu.
        </Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
    paddingBottom: 40,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  recommendedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SHAPE.radiusBadge,
  },
  reasonRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  bottomSpacer: { height: 20 },
});
