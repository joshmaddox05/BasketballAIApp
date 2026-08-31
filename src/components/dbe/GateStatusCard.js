// GateStatusCard.js — the transparency layer (readiness item 2.4):
// "what's blocked & why, what unlocks it".
//
// The card's whole job is a distinction the raw engine output does not make.
// `checkHardGates` reads `Number(vector[dim] ?? 0)`, so an unmeasured dimension
// arrives as a blocking failure — rendered naively, every new player would read as
// comprehensively blocked. `evalRankPresenter.toUiGates` partitions failures by
// coverage; this card keeps the three groups visually distinct so a player can tell
// "you fell short" from "we haven't measured this yet".
//
// Colour follows the never-a-rainbow rule (see utils/gradeTone.js): no red/amber/
// green status scale. Blocking speaks in the accent voice because it is the thing
// asking for attention, on-hold in the steel second-opinion voice, and unmeasured
// in the dim voice — the product reports, it does not scold.

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import { Entrance } from './motion';
import { SectionLabel } from './primitives';

const toneFor = (kind, theme) => {
  if (kind === 'blocking') return { fill: theme.badgeFill, text: theme.accentText, icon: 'lock-closed' };
  if (kind === 'delayed') return { fill: theme.steelFill, text: theme.steel, icon: 'time-outline' };
  return { fill: theme.track, text: theme.textDim, icon: 'ellipse-outline' };
};

function GateRow({ label, detail, unlocks, kind, theme, delay }) {
  const tone = toneFor(kind, theme);
  return (
    <Entrance variant="cardIn" delay={delay} style={{ flexDirection: 'row', gap: 11, marginBottom: 14 }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tone.fill,
        }}
      >
        <Ionicons name={tone.icon} size={13} color={tone.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 13, color: theme.text }}>{label}</Text>
        {detail ? (
          <Text style={[TYPE.statCaption, { color: theme.textMuted, marginTop: 3 }]}>{detail}</Text>
        ) : null}
        {unlocks ? (
          <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 3 }]}>{unlocks}</Text>
        ) : null}
      </View>
    </Entrance>
  );
}

/**
 * @param {object}   props
 * @param {object}   props.gates          `toUiGates` output: {blocking, delayed, unmeasured, allClear}
 * @param {object}   props.coverage       `toUiEval().coverage`
 * @param {object}   props.certification  `toUiCertification` output
 * @param {object}   props.exposure       `toUiEval().exposure`
 * @param {string}   [props.title]
 */
export default function GateStatusCard({ gates, coverage, certification, exposure, title = 'What unlocks next' }) {
  const { theme } = useAppContext();
  if (!gates) return null;

  const { blocking = [], delayed = [], unmeasured = [], allClear } = gates;
  const nothingToSay = !blocking.length && !delayed.length && !unmeasured.length && !certification?.next;
  if (nothingToSay) return null;

  let delay = 0;
  const nextDelay = () => {
    delay += 60;
    return delay;
  };

  return (
    <View style={{ marginTop: SHAPE.sectionGap }}>
      <SectionLabel>{title}</SectionLabel>
      <View
        style={{
          borderRadius: SHAPE.radiusCard,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.hairline,
          padding: 16,
          paddingBottom: 4,
        }}
      >
        {allClear ? (
          <GateRow
            label="Every exposure gate is clear"
            detail="Nothing is holding your recruiting visibility back."
            kind="delayed"
            theme={theme}
            delay={nextDelay()}
          />
        ) : null}

        {blocking.map((g) => (
          <GateRow
            key={`block-${g.dim}`}
            kind="blocking"
            label={`${g.label} — ${g.value} of ${g.min}`}
            detail={g.note}
            unlocks={g.unlocks}
            theme={theme}
            delay={nextDelay()}
          />
        ))}

        {delayed.map((g) => (
          <GateRow
            key={`delay-${g.dim}`}
            kind="delayed"
            label={`${g.label} — on hold at ${g.value}`}
            detail={g.note}
            unlocks={g.unlocks}
            theme={theme}
            delay={nextDelay()}
          />
        ))}

        {/* Not a failure — an absence. Every row says what would fill it. */}
        {unmeasured.map((g) => (
          <GateRow
            key={`unmeasured-${g.dim}`}
            kind="unmeasured"
            label={`${g.label} — not yet measured`}
            detail={g.measureAction}
            theme={theme}
            delay={nextDelay()}
          />
        ))}

        {certification?.next ? (
          <GateRow
            kind="unmeasured"
            label={`Next certification: ${certification.nextLabel}`}
            detail={describeMissing(certification.nextMissing)}
            theme={theme}
            delay={nextDelay()}
          />
        ) : null}

        {exposure && !exposure.assessable ? (
          <GateRow
            kind="unmeasured"
            label="Exposure readiness"
            detail={exposure.message}
            theme={theme}
            delay={nextDelay()}
          />
        ) : null}

        {coverage?.label ? (
          <Text
            style={[
              TYPE.statCaption,
              { color: theme.textDim, marginTop: 2, marginBottom: 12 },
            ]}
          >
            {coverage.label}
            {coverage.unmeasured?.length
              ? ` · ${coverage.unmeasured.length} still to measure`
              : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// Separates "you are below this line" from "this line has not been tested", so a
// locked rung never implies the player fell short of something never measured.
const describeMissing = (missing = []) => {
  if (!missing.length) return 'All requirements met.';
  const short = missing
    .filter((m) => m.measured)
    .map((m) => `${m.label} ${m.min} (you: ${m.value})`);
  const untested = missing.filter((m) => !m.measured).map((m) => m.label);

  const parts = [];
  if (short.length) parts.push(`Needs ${short.join(', ')}`);
  if (untested.length) parts.push(`Not yet measured: ${untested.join(', ')}`);
  return parts.join(' · ');
};
