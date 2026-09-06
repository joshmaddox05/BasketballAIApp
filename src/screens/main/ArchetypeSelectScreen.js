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
import { PILLAR_ROWS } from '../../services/blueprint/evalRankPresenter';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import logger from '../../utils/logger';
import { ONBOARDING_NARRATION } from '../../config/onboardingNarration';
import { useScreenNarration } from '../../hooks/useScreenNarration';
import NarrationToggle from '../../components/shared/NarrationToggle';
import {
  ScreenHeader,
  SectionLabel,
  Entrance,
  PrimaryButton,
  OutlineButton,
  useToast,
} from '../../components/dbe';

const CONFIDENCE_COPY = {
  none: 'A starting point, not a verdict — we have nothing on you yet.',
  low: 'One signal to go on so far.',
  medium: 'A few signals agree on this.',
  high: 'Everything we know about you points here.',
};

// Archetype labels are slash-compounds: "Defensive Anchor / Rim Protector". The
// second half is a gloss for coaches, and as a heading it forces the title onto
// two lines. The card leads with the name and lets the description do the rest.
const shortLabel = (label = '') => label.split(' / ')[0];

// "Progression gate: SRS ≥ 65" was rendered verbatim. SRS means nothing to a
// sixteen-year-old on their third minute in the app.
const gateSentence = (gate) => {
  if (!gate?.metric) return null;
  const pillar = PILLAR_ROWS.find((p) => p.key === gate.metric);
  return `You'll graduate this archetype at ${pillar?.label || gate.metric} ${gate.min}.`;
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
      <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 13, color: text }}>
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
            <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 13.5, color: text }}>
              {shotName(s)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * @param {boolean} compact onboarding pass — drops the coach-facing detail
 *   (shot menu, progression gate, restricted skills) and shows at most two
 *   reasons. That block is genuinely useful on the profile, where someone opened
 *   this screen on purpose; at minute three of a first session it is a wall of
 *   vocabulary nobody has been taught yet, and it is what squeezed every other
 *   line on this card down to label sizes.
 */
function ArchetypeCard({ archetypeId, selected, recommended, reasons, onSelect, theme, delay, compact }) {
  const d = describeArchetype(archetypeId);
  if (!d) return null;

  // Two reasons is the most anyone reads on a card they are about to tap. The
  // third is always the weakest signal — the engine ranks them.
  const shownReasons = compact ? (reasons || []).slice(0, 2) : reasons;

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
            <Text style={[TYPE.tooltipTitle, { color: theme.text }]}>
              {compact ? shortLabel(d.label) : d.label}
            </Text>
            {/* Was TYPE.statCaption — an 11.5pt UPPERCASE label preset with 1.1
                tracking, applied to a full sentence. That single misuse is most
                of why this screen reads as small, shouty and dense. */}
            <Text style={[TYPE.tooltipBody, { color: theme.textMuted, marginTop: 4 }]}>
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

        {shownReasons?.length ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            {shownReasons.map((r, i) => (
              <View key={i} style={styles.reasonRow}>
                <Ionicons name="ellipse" size={5} color={theme.accentText} style={{ marginTop: 8 }} />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: FONTS.body,
                    fontSize: 15,
                    lineHeight: 21,
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
          <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: theme.hairline, paddingTop: 12 }}>
            {/* The one line that matters on either pass: what this archetype
                actually asks you to get good at. */}
            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 13.5, color: theme.textDim }}>
              What you'll work on
            </Text>
            <Text
              style={{
                fontFamily: FONTS.bodySemiBold,
                fontSize: 16,
                lineHeight: 22,
                color: theme.text,
                marginTop: 3,
              }}
            >
              {d.coreSkills.map((sk) => sk.label).join(', ')}
            </Text>

            {/* Everything below is coach vocabulary. It belongs on the profile,
                where this screen was opened deliberately — not in onboarding. */}
            {!compact ? (
              <>
                {d.restrictedSkills.length ? (
                  <Text style={[TYPE.tooltipBody, { color: theme.textDim, marginTop: 8 }]}>
                    Trained lightly: {d.restrictedSkills.map((sk) => sk.label).join(', ')}
                  </Text>
                ) : null}
                {gateSentence(d.gate) ? (
                  <Text style={[TYPE.tooltipBody, { color: theme.textDim, marginTop: 4 }]}>
                    {gateSentence(d.gate)}
                  </Text>
                ) : null}

                <Text
                  style={{
                    fontFamily: FONTS.bodySemiBold,
                    fontSize: 13.5,
                    color: theme.textDim,
                    marginTop: 14,
                  }}
                >
                  Your shot menu
                </Text>
                <ShotMenuRow tone="green" shots={d.shotMenu.green} theme={theme} />
                <ShotMenuRow tone="yellow" shots={d.shotMenu.yellow} theme={theme} />
                <ShotMenuRow tone="red" shots={d.shotMenu.red} theme={theme} />
              </>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>
    </Entrance>
  );
}

/**
 * Doubles as an onboarding step (`route.params.onboarding`). The screen already
 * derives, presents and persists an archetype; the onboarding pass differs only
 * in where it goes afterwards and in leading with a confirmation rather than a
 * catalogue. Registering the same component twice beats a second near-identical
 * screen that would drift from this one the first time the engine changes.
 */
export default function ArchetypeSelectScreen({ navigation, route }) {
  const onboarding = !!route?.params?.onboarding;
  const { userData, user, theme, isDarkMode, updateUserDataLocally, setEvalRankScore, setBlueprint360Plan } =
    useAppContext();
  const showToast = useToast();

  // Only in the onboarding pass. Reached later from the profile, this is a screen
  // the athlete chose to open — narrating it there would be talking over someone
  // who already knows why they came.
  useScreenNarration(ONBOARDING_NARRATION.archetype, { enabled: onboarding });

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
      if (onboarding) {
        navigation.navigate('FeaturesIntro');
      } else {
        navigation.goBack();
      }
    } catch (error) {
      logger.error('Archetype confirm failed', error);
      showToast('Could not save your archetype right now');
      // Mid-onboarding this must never be a dead end. The archetype was already
      // written from PersonalizationScreen, so continuing loses the confirmation
      // stamp and nothing else — far better than trapping someone on step 4.
      if (onboarding) navigation.navigate('FeaturesIntro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title="Your Archetype"
        subtitle={onboarding ? 'Based on your position and size' : 'What you are being developed into'}
        onBack={onboarding ? undefined : () => navigation.goBack()}
      />
      {onboarding && (
        <NarrationToggle color={theme.textSecondary} fill={theme.surface} border={theme.hairline} />
      )}

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
          <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 16, color: theme.text }}>
            {derived.ambiguous ? 'Two archetypes fit you equally well' : 'Your best match'}
          </Text>
          {/* Another sentence that was set in the uppercase label preset. */}
          <Text style={[TYPE.tooltipBody, { color: theme.textMuted, marginTop: 4 }]}>
            {CONFIDENCE_COPY[derived.confidence]}
          </Text>

          {/* `needs` is about sharpening this later — real, but not something to
              hand someone before they have confirmed anything. It stays on the
              profile pass. */}
          {!onboarding && derived.needs.length ? (
            <View style={{ marginTop: 10, gap: 5 }}>
              {derived.needs.map((n) => (
                <Text key={n} style={[TYPE.tooltipBody, { color: theme.textDim }]}>
                  • {n}
                </Text>
              ))}
            </View>
          ) : null}

          {/* Onboarding just asked for position and height, and EditProfile is not
              reachable from the onboarding stack — so this prompt only makes sense
              for someone whose profile is genuinely missing them. */}
          {!onboarding && (derived.signalsMissing.includes('position') || derived.signalsMissing.includes('height')) ? (
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
          {onboarding && !showAll ? (
            <Text style={[TYPE.tooltipBody, { color: theme.textDim, marginBottom: 8 }]}>
              Tap it to see what you'll be working on.
            </Text>
          ) : null}
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
                compact={onboarding}
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
          label={saving ? 'Saving…' : onboarding ? "That's me — continue" : 'Confirm archetype'}
          disabled={saving || !selected}
          onPress={handleConfirm}
          style={{ marginTop: SHAPE.sectionGap }}
        />
        <Text style={[TYPE.tooltipBody, { color: theme.textDim, marginTop: 10, textAlign: 'center' }]}>
          {onboarding
            ? 'You can change this any time.'
            : 'Changing this rebuilds your plan and re-scores your shot menu.'}
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
